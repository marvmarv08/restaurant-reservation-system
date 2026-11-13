<?php
declare(strict_types=1);
namespace App\Service;

use App\Core\StaffAccess;
use App\Domain\BookingError;
use PDO;

final class StaffAccountRequestService
{
    public const ACKNOWLEDGEMENT = 'Request received. Staff access stays locked until your administrator approves and shares a private activation link.';

    public function __construct(private readonly PDO $pdo, private readonly BookingClock $clock) {}

    private function ready(): void
    {
        $q = $this->pdo->query("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='staff_account_requests'");
        if ((int)$q->fetchColumn() !== 1) {
            throw new BookingError('account_requests_unavailable', 'Account requests are not configured yet. Contact your administrator.', 503);
        }
    }

    private static function email(string $email): string
    {
        $email = strtolower(trim($email));
        if (strlen($email) > 190 || !filter_var($email, FILTER_VALIDATE_EMAIL) || !str_ends_with($email, '@gmail.com')) {
            throw new BookingError('account_request_invalid', 'Enter a valid Gmail address.');
        }
        return $email;
    }

    public function request(string $email, string $name, string $ip): array
    {
        $email = self::email($email);
        $name = trim($name);
        if ($name === '' || strlen($name) > 120 || preg_match('/[\x00-\x1F\x7F]/', $name) || !preg_match('//u', $name)) {
            throw new BookingError('account_request_invalid', 'Enter your full name using at most 120 bytes.');
        }
        $this->ready();
        $result = (new BookingTransaction($this->pdo))->run(function () use ($email, $name, $ip): array {
            // Serialize against invitation/approval so requests cannot race account creation.
            $this->pdo->query('SELECT id FROM staff_security_lock WHERE id=1 FOR UPDATE')->fetchColumn();
            $now = $this->clock->now();
            $limits = [hash('sha256', 'account-request:ip:'.$ip) => [5, '-1 hour'], hash('sha256', 'account-request:global') => [100, '-1 day']];
            ksort($limits);
            foreach ($limits as $key => [$limit, $window]) {
                $this->pdo->prepare('INSERT IGNORE INTO staff_login_limits (key_hash,window_started_at) VALUES (?,?)')->execute([$key,$now->format('Y-m-d H:i:s')]);
                $q = $this->pdo->prepare('SELECT attempts,window_started_at FROM staff_login_limits WHERE key_hash=? FOR UPDATE');
                $q->execute([$key]); $row = $q->fetch();
                if ($row['window_started_at'] <= $now->modify($window)->format('Y-m-d H:i:s')) {
                    $this->pdo->prepare('UPDATE staff_login_limits SET attempts=0,window_started_at=? WHERE key_hash=?')->execute([$now->format('Y-m-d H:i:s'),$key]);
                    $row['attempts'] = 0;
                }
                if ((int)$row['attempts'] >= $limit) {
                    return ['limited' => true];
                }
            }
            foreach ($limits as $key => $unused) {
                $this->pdo->prepare('UPDATE staff_login_limits SET attempts=attempts+1 WHERE key_hash=?')->execute([$key]);
            }
            $q = $this->pdo->prepare('SELECT id FROM users WHERE email=?');
            $q->execute([$email]);
            if (!$q->fetchColumn()) {
                // A public retry must never replace a name that an operator may already have reviewed.
                $this->pdo->prepare('INSERT INTO staff_account_requests (email,full_name,created_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE id=id')->execute([$email,$name,$now->format('Y-m-d H:i:s')]);
            }
            return ['message' => self::ACKNOWLEDGEMENT];
        });
        if (isset($result['limited'])) {
            throw new BookingError('rate_limited', 'Too many requests. Please try again later.', 429);
        }
        return $result;
    }

    private static function requireConsole(): void
    {
        if (PHP_SAPI !== 'cli') {
            throw new BookingError('console_required', 'Account request approval is available only through the local console.', 403);
        }
    }

    public function pending(): array
    {
        self::requireConsole();
        $this->ready();
        return $this->pdo->query("SELECT id,email,full_name,created_at FROM staff_account_requests WHERE status='pending' ORDER BY id")->fetchAll();
    }

    public function approve(string $email, string $role): array
    {
        self::requireConsole();
        $email = self::email($email);
        if (!array_key_exists($role, StaffAccess::PERMISSIONS)) {
            throw new BookingError('staff_input_invalid', 'Choose a supported staff role.');
        }
        $this->ready();
        return (new BookingTransaction($this->pdo))->run(function () use ($email, $role): array {
            $this->pdo->query('SELECT id FROM staff_security_lock WHERE id=1 FOR UPDATE')->fetchColumn();
            $q = $this->pdo->prepare('SELECT * FROM staff_account_requests WHERE email=? FOR UPDATE');
            $q->execute([$email]); $request = $q->fetch();
            if (!$request) {
                throw new BookingError('account_request_missing', 'No pending request exists for that Gmail address.', 404);
            }
            if ($request['status'] !== 'pending') {
                throw new BookingError('account_request_approved', 'This request was already approved. Use the existing invitation workflow if a replacement link is needed.', 409);
            }
            $q = $this->pdo->prepare('SELECT id FROM users WHERE email=? FOR UPDATE');
            $q->execute([$email]);
            if ($q->fetchColumn()) {
                throw new BookingError('account_request_existing', 'An account already exists for this address. Manage it through the existing staff account workflow.', 409);
            }
            $auth = new StaffAuthService($this->pdo, $this->clock);
            // Invitation and approval commit together; failed approval must not leave an account or token.
            $invitation = $auth->issue($email, $request['full_name'], $role);
            $this->pdo->prepare("UPDATE staff_account_requests SET status='approved',approved_at=? WHERE id=?")->execute([$this->clock->now()->format('Y-m-d H:i:s'),$request['id']]);
            $auth->audit(null, 'staff.account_request_approved', 'account_request', (string)$request['id'], null, ['email'=>$email,'role'=>$role]);
            return $invitation;
        });
    }
}
