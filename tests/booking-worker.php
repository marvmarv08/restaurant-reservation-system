<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/autoload.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || getenv('DB_DATABASE') !== 'tablebook_p3_test') {
    throw new RuntimeException('Race worker requires the isolated test database');
}
$job = json_decode(stream_get_contents(STDIN), true, 8, JSON_THROW_ON_ERROR);
$pdo = \App\Core\Database::connect(require dirname(__DIR__) . '/config/database.php');
$service = new \App\Service\BookingService($pdo, new \App\Service\BookingClock($pdo));
$management = new \App\Service\ManagementService($pdo, new \App\Service\BookingClock($pdo));
while (microtime(true) < $job['at']) {
    usleep(1000);
}
try {
    $result = match ($job['op']) {
        'policy_cancel' => (new App\Service\BookingService($pdo,new App\Service\BookingClock($pdo,fn()=>new DateTimeImmutable($job['when'],new DateTimeZone('Asia/Manila')))))->cancel($job['id'],'Isolated cancellation race'),
        'policy_release' => (new App\Service\ReservationPolicyService($pdo,new App\Service\BookingClock($pdo,fn()=>new DateTimeImmutable($job['when'],new DateTimeZone('Asia/Manila')))))->reconcile(),
        'policy_seat' => (new App\Service\StaffReservationService($pdo,new App\Service\BookingClock($pdo,fn()=>new DateTimeImmutable($job['when'],new DateTimeZone('Asia/Manila')))))->transition($job['actor'],$job['code'],$job['version'],'seat','Isolated arrival race'),
        'policy_staff_midnight' => (new App\Service\StaffReservationService($pdo,new App\Service\BookingClock($pdo,static fn()=> (new DateTimeImmutable($job['clock_base'],new DateTimeZone('Asia/Manila')))->modify('+'.max(0,(int)floor(microtime(true)-$job['at'])).' seconds'))))->modify($job['actor'],$job['input']),
        'policy_modify_cutoff' => (new App\Service\ManagementService($pdo,new App\Service\BookingClock($pdo,static fn()=> (new DateTimeImmutable($job['clock_base'],new DateTimeZone('Asia/Manila')))->modify('+'.max(0,(int)floor(microtime(true)-$job['at'])).' seconds'))))->modify($job['code'],$job['token'],1,$job['date'],'13:00',5,'bv_family',null,null,'',$job['ack']),
        'preorder_edit_cutoff' => (new App\Service\ManagementService($pdo,new App\Service\BookingClock($pdo,static fn()=> (new DateTimeImmutable($job['clock_base'],new DateTimeZone('Asia/Manila')))->modify('+'.max(0,(int)floor(microtime(true)-$job['at'])).' seconds'))))->preorder($job['code'],$job['token'],null,$job['version'],$job['preorder']),
        'preorder_edit' => $management->preorder($job['code'],$job['token'],null,$job['version'],$job['preorder']),
        'preorder_confirm' => $service->confirm($job['token'],$job['guest'],$job['owner'],$job['preorder']),
        'billing' => (new App\Service\BillingService($pdo,new App\Service\BookingClock($pdo)))->mutate($job['actor'],$job['id'],$job['action'],$job['revision'],$job['key'],$job['data']),
        'order_mutate' => (new App\Service\OrderService($pdo, new App\Service\BookingClock($pdo)))->mutate($job['actor'], $job['id'], $job['version'], $job['action'], $job['key'], $job['data'] ?? []),
        'staff_activate' => (new App\Service\StaffAuthService($pdo, new App\Service\BookingClock($pdo)))->activate($job['token'], $job['password']),
        'staff_create' => (new App\Service\StaffReservationService($pdo, new App\Service\BookingClock($pdo)))->create($job['actor'], $job['input'], $job['waitlist'] ?? false),
        'staff_delete' => (new App\Service\StaffReservationService($pdo, new App\Service\BookingClock($pdo)))->delete($job['actor'], $job['code'], $job['version']),
        'staff_transition' => (new App\Service\StaffReservationService($pdo, new App\Service\BookingClock($pdo)))->transition($job['actor'], $job['code'], $job['version'], $job['action'], 'Isolated race test'),
        'hold' => $service->hold($job['date'], $job['time'], $job['party'], $job['room'], $job['owner'], $job['kind'] ?? null, $job['id'] ?? null),
        'confirm' => $service->confirm($job['token'], ['full_name' => 'Race Guest', 'phone' => '+639000000002'], $job['owner']),
        'modify' => $management->modify($job['code'], $job['token'], $job['version'], $job['date'], $job['time'],
            $job['party'], $job['room'], $job['kind'] ?? null, $job['id'] ?? null, ''),
        'cancel' => $management->cancel($job['code'], $job['token'], $job['version']),
        default => throw new RuntimeException('Unknown race operation'),
    };
    // Test output intentionally excludes hold tokens and guest details.
    echo json_encode(['ok' => true, 'code' => is_array($result)?($result['code']??null):null, 'created' => is_array($result)?($result['created']??null):null], JSON_THROW_ON_ERROR);
} catch (\App\Domain\BookingError $error) {
    echo json_encode(['ok' => false, 'error' => $error->errorCode, 'status' => $error->httpStatus], JSON_THROW_ON_ERROR);
}
