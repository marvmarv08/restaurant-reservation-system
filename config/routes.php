<?php
declare(strict_types=1);

use App\Controller\HealthController;
use App\Controller\HomeController;
use App\Controller\BookingController;
use App\Controller\ManagementController;
use App\Controller\StaffController;
use App\Controller\OrderController;

return [
    ['GET', '/server', [OrderController::class, 'serverPage']],
    ['GET', '/kitchen', [OrderController::class, 'kitchenPage']],
    ['GET', '/api/service/menu', [OrderController::class, 'menu']],
    ['GET', '/api/service/orders', [OrderController::class, 'orders']],
    ['GET', '/api/service/order', [OrderController::class, 'detail']],
    ['GET', '/api/kitchen/tickets', [OrderController::class, 'kitchen']],
    ['POST', '/api/service/orders/action', [OrderController::class, 'mutate']],
    ['GET', '/', [HomeController::class, 'index']],
    ['GET', '/manage', [HomeController::class, 'manage']],
    ['GET', '/health', [HealthController::class, 'show']],
    ['GET', '/api/session', [BookingController::class, 'session']],
    ['GET', '/api/availability', [BookingController::class, 'availability']],
    ['GET', '/api/catalog', [BookingController::class, 'catalog']],
    ['GET', '/api/holds', [BookingController::class, 'inspect']],
    ['POST', '/api/holds', [BookingController::class, 'hold']],
    ['POST', '/api/holds/release', [BookingController::class, 'release']],
    ['POST', '/api/reservations', [BookingController::class, 'confirm']],
    ['GET', '/api/manage', [ManagementController::class, 'show']],
    ['GET', '/api/manage/availability', [ManagementController::class, 'availability']],
    ['POST', '/api/manage/cancel', [ManagementController::class, 'cancel']],
    ['POST', '/api/manage/modify', [ManagementController::class, 'modify']],
    ['GET', '/staff/login', [StaffController::class, 'loginPage']],
    ['GET', '/staff/activate', [StaffController::class, 'activationPage']],
    ['GET', '/admin', [StaffController::class, 'adminPage']],
    ['GET', '/api/auth/me', [StaffController::class, 'me']],
    ['POST', '/api/auth/login', [StaffController::class, 'login']],
    ['POST', '/api/auth/activate', [StaffController::class, 'activate']],
    ['POST', '/api/auth/logout', [StaffController::class, 'logout']],
    ['GET', '/api/admin/dashboard', [StaffController::class, 'dashboard']],
    ['GET', '/api/admin/request', [StaffController::class, 'requestStatus']],
    ['GET', '/api/admin/reservation', [StaffController::class, 'detail']],
    ['GET', '/api/admin/availability', [StaffController::class, 'availability']],
    ['POST', '/api/admin/reservations', [StaffController::class, 'create']],
    ['POST', '/api/admin/reservations/status', [StaffController::class, 'status']],
    ['POST', '/api/admin/reservations/modify', [StaffController::class, 'modify']],
    ['POST', '/api/admin/waitlist', [StaffController::class, 'enqueue']],
    ['POST', '/api/admin/waitlist/promote', [StaffController::class, 'promote']],
    ['GET', '/api/admin/settings', [StaffController::class, 'settings']],
    ['POST', '/api/admin/settings', [StaffController::class, 'saveSettings']],
    ['POST', '/api/admin/blackouts', [StaffController::class, 'blackout']],
    ['GET', '/api/admin/staff', [StaffController::class, 'staff']],
    ['POST', '/api/admin/staff/invite', [StaffController::class, 'invite']],
    ['POST', '/api/admin/staff/change', [StaffController::class, 'changeStaff']],
    ['GET', '/api/admin/audit', [StaffController::class, 'audit']],
    ['GET', '/api/admin/outbox', [StaffController::class, 'outbox']],
];
