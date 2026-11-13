<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';
use App\Core\Database;
use App\Domain\BookingError;
use App\Service\BookingClock;
use App\Service\StaffAccountRequestService;
use App\Service\StaffAuthService;

$config = require dirname(__DIR__) . '/config/database.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || getenv('ACCOUNT_REQUEST_TEST') !== 'disposable' || $config['database'] !== 'tablebook_p3_test') {
    throw new RuntimeException('Requires the disposable account-request test database.');
}
function checked(string $name, bool $ok): void {
    if (!$ok) { fwrite(STDERR, 'FAIL '.$name."\n"); exit(1); }
    echo 'PASS '.$name."\n";
}
checked('Account request service is implemented', class_exists(StaffAccountRequestService::class));
$pdo = Database::connect($config);
$time = new DateTimeImmutable('2030-05-01 12:00:00', new DateTimeZone('Asia/Manila'));
$clock = new BookingClock($pdo, function () use (&$time) { return $time; });
$service = new StaffAccountRequestService($pdo, $clock);
$auth = new StaffAuthService($pdo, $clock);
$suffix = bin2hex(random_bytes(5));
$email = 'bella.request.'.$suffix.'@gmail.com';
$q = fn(string $sql, array $args=[]) => (function () use ($pdo,$sql,$args) { $s=$pdo->prepare($sql);$s->execute($args);return $s; })();
function denied(string $code, callable $work): bool {
    try { $work(); } catch (BookingError $e) { return $e->errorCode === $code; }
    return false;
}
$before = (int)$q('SELECT COUNT(*) FROM users')->fetchColumn();
$response = $service->request($email, 'Test Requester', 'request-ip-'.$suffix);
checked('Submission returns only a generic acknowledgement', $response === ['message'=>StaffAccountRequestService::ACKNOWLEDGEMENT]);
checked('Pending request creates no login account', (int)$q('SELECT COUNT(*) FROM users')->fetchColumn()===$before);
checked('Pending request is visible only to local approval tooling', in_array($email,array_column($service->pending(),'email'),true));
checked('Pending requester cannot sign in', denied('login_failed',fn()=>$auth->login($email,'A long pending test password','login-ip-'.$suffix)));
checked('Duplicate request cannot overwrite the approved identity', $service->request(strtoupper($email),'Untrusted replacement','request-ip-'.$suffix)===$response && $q('SELECT full_name FROM staff_account_requests WHERE email=?',[$email])->fetchColumn()==='Test Requester');
checked('Invalid email and non-Gmail domains are rejected', denied('account_request_invalid',fn()=>$service->request('bad','Name','invalid-ip')) && denied('account_request_invalid',fn()=>$service->request('test@example.test','Name','invalid-ip')));
checked('Blank and control-character names are rejected', denied('account_request_invalid',fn()=>$service->request($email,'  ','invalid-ip')) && denied('account_request_invalid',fn()=>$service->request($email,"Bad\nName",'invalid-ip')));
checked('Missing request cannot be approved', denied('account_request_missing',fn()=>$service->approve('not.pending.'.$suffix.'@gmail.com','host')));
checked('Invalid role cannot be approved', denied('staff_input_invalid',fn()=>$service->approve($email,'superadmin')));
$invitation=$service->approve($email,'host');
checked('Approval produces a one-use activation link, not an active account', str_starts_with($invitation['activation_path'],'/staff/activate#token=') && (int)$q('SELECT is_active FROM users WHERE email=?',[$email])->fetchColumn()===0);
$token=substr($invitation['activation_path'],strlen('/staff/activate#token='));
checked('Activation token is stored only as a hash', $q('SELECT token_hash FROM staff_activation_tokens WHERE user_id=(SELECT id FROM users WHERE email=?) ORDER BY id DESC LIMIT 1',[$email])->fetchColumn()===hash('sha256',$token));
checked('Approval marks the request and removes it from pending list', $q('SELECT status FROM staff_account_requests WHERE email=?',[$email])->fetchColumn()==='approved' && !in_array($email,array_column($service->pending(),'email'),true));
checked('Repeated approval cannot change role or mint another token', denied('account_request_approved',fn()=>$service->approve($email,'admin')) && (int)$q('SELECT COUNT(*) FROM staff_activation_tokens WHERE user_id=(SELECT id FROM users WHERE email=?)',[$email])->fetchColumn()===1);
checked('Re-submission after approval cannot reset token or request', $service->request($email,'Changed after approval','post-approval-'.$suffix)===$response && $q('SELECT status FROM staff_account_requests WHERE email=?',[$email])->fetchColumn()==='approved');
checked('Approval alone does not grant login access', denied('login_failed',fn()=>$auth->login($email,'A long pending test password','login-ip-'.$suffix)));
$password='A private activation test phrase 2030!';
$active=$auth->activate($token,$password);
checked('Activation uses only the operator-selected role', $active['role']==='host' && (int)$active['is_active']===1);
checked('Activated requester can sign in with the new password', $auth->login($email,$password,'activated-ip-'.$suffix)['role']==='host');
checked('Activation token cannot be reused', denied('activation_invalid',fn()=>$auth->activate($token,$password)));
checked('Requesting an existing active account never changes credentials', $service->request($email,'Account takeover attempt','existing-ip-'.$suffix)===$response && $auth->login($email,$password,'existing-login-'.$suffix)['role']==='host');
$expired='bella.expiry.'.$suffix.'@gmail.com';$service->request($expired,'Expiry Test','expiry-'.$suffix);$link=$service->approve($expired,'kitchen');
$time=$time->modify('+25 hours');
checked('Approved activation link expires after 24 hours', denied('activation_invalid',fn()=>$auth->activate(substr($link['activation_path'],strlen('/staff/activate#token=')),$password)));
$limited='rate-'.$suffix;
for($i=0;$i<5;$i++)$service->request('bella.rate.'.$suffix.'.'.$i.'@gmail.com','Rate Test',$limited);
checked('IP request rate is limited even for new addresses', denied('rate_limited',fn()=>$service->request('bella.rate.extra.'.$suffix.'@gmail.com','Rate Test',$limited)));
$time=$time->modify('+61 minutes');
checked('IP request limit expires', $service->request('bella.rate.after.'.$suffix.'@gmail.com','Rate Test',$limited)===$response);
$blocked='bella.existing.'.$suffix.'@gmail.com';$service->request($blocked,'Original Request','blocked-'.$suffix);
$auth->issue($blocked,'Already invited','admin');
checked('Approval cannot replace a separately invited existing account', denied('account_request_existing',fn()=>$service->approve($blocked,'host')) && $q('SELECT status FROM staff_account_requests WHERE email=?',[$blocked])->fetchColumn()==='pending');

$rollback='bella.rollback.'.$suffix.'@gmail.com';
$service->request($rollback,'Rollback Test','rollback-'.$suffix);
$tokensBefore=(int)$q('SELECT COUNT(*) FROM staff_activation_tokens')->fetchColumn();
$auditBefore=(int)$q('SELECT COUNT(*) FROM audit_log')->fetchColumn();
$pdo->exec("CREATE TRIGGER activation_request_force_rollback BEFORE UPDATE ON staff_account_requests FOR EACH ROW BEGIN IF NEW.email=".$pdo->quote($rollback)." THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Intentional disposable rollback test'; END IF; END");
$failed=false;
try { $service->approve($rollback,'host'); } catch (PDOException $e) { $failed=$e->getCode()==='45000'; }
finally { $pdo->exec('DROP TRIGGER activation_request_force_rollback'); }
checked('Failure after invitation rolls back user, token, audit and request approval', $failed && (int)$q('SELECT COUNT(*) FROM users WHERE email=?',[$rollback])->fetchColumn()===0 && (int)$q('SELECT COUNT(*) FROM staff_activation_tokens')->fetchColumn()===$tokensBefore && (int)$q('SELECT COUNT(*) FROM audit_log')->fetchColumn()===$auditBefore && $q('SELECT status FROM staff_account_requests WHERE email=?',[$rollback])->fetchColumn()==='pending');
$race='bella.race.'.$suffix.'@gmail.com';$service->request($race,'Concurrent Approval Test','race-'.$suffix);
$processes=[];
for($i=0;$i<2;$i++){
 $pipes=[];$process=proc_open([PHP_BINARY,dirname(__DIR__).'/bin/staff-account-requests.php','approve',$race,'host'],[1=>['pipe','w'],2=>['pipe','w']],$pipes);
 if(!is_resource($process))throw new RuntimeException('Cannot start concurrent approval process.');
 $processes[]=[$process,$pipes];
}
$codes=[];
foreach($processes as [$process,$pipes]){stream_get_contents($pipes[1]);stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);$codes[]=proc_close($process);}
sort($codes);
checked('Concurrent approvals issue exactly one invitation', $codes===[0,1] && (int)$q('SELECT COUNT(*) FROM staff_activation_tokens WHERE user_id=(SELECT id FROM users WHERE email=?)',[$race])->fetchColumn()===1 && $q('SELECT status FROM staff_account_requests WHERE email=?',[$race])->fetchColumn()==='approved');
$key=hash('sha256','account-request:global');
$q('UPDATE staff_login_limits SET attempts=100,window_started_at=? WHERE key_hash=?',[$time->format('Y-m-d H:i:s'),$key]);
checked('Global daily request cap rejects fresh-IP submissions', denied('rate_limited',fn()=>$service->request('bella.global.'.$suffix.'@gmail.com','Global Rate Test','fresh-global-'.$suffix)));
$time=$time->modify('+25 hours');
checked('Global request cap expires after a day', $service->request('bella.global.after.'.$suffix.'@gmail.com','Global Rate Test','fresh-global-after-'.$suffix)===$response);
$bulk=$pdo->prepare('INSERT INTO staff_account_requests(email,full_name) VALUES (?,?)');
for($i=0;$i<101;$i++)$bulk->execute(['bella.bulk.'.$suffix.'.'.$i.'@gmail.com','Bulk Listing Test']);
checked('New pending requests remain visible beyond 100 older entries',in_array('bella.bulk.'.$suffix.'.100@gmail.com',array_column($service->pending(),'email'),true));
echo "All account request service scenarios passed.\n";
