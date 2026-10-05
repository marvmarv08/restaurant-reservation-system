<?php
declare(strict_types=1);

namespace App\Service;

use PDO;

final class CatalogService
{
    public function __construct(private readonly PDO $pdo, private readonly BookingClock $clock)
    {
    }

    public function get(): array
    {
        $policy = new BookingPolicy($this->pdo);
        $now = $this->clock->now();
        return [
            'today' => $now->format('Y-m-d'), 'server_time_epoch' => $now->getTimestamp(),
            'max_date' => $now->modify('+' . $policy->number('max_lead_time_days') . ' days')->format('Y-m-d'),
            'max_party' => min(16, $policy->number('max_party_online')),
            'cancel_cutoff_min' => $policy->number('cancel_cutoff_min'),
            'hold_ttl_sec' => $policy->number('hold_ttl_sec'),
            'min_lead_time_min' => $policy->number('min_lead_time_min'),
            'manager_approval_party_min' => $policy->number('manager_approval_party_min'),
            'timezone' => 'Asia/Manila', 'room_types' => $policy->roomTypes,
            'opening_hours' => $this->pdo->query('SELECT weekday, open_time, close_time, is_closed FROM opening_hours WHERE room_type_id IS NULL ORDER BY weekday')->fetchAll(),
            'rooms' => $this->pdo->query('SELECT id, room_type_id, name, code, floor_x, floor_y, floor_w, floor_h FROM rooms WHERE is_active = 1')->fetchAll(),
            'tables' => $this->pdo->query('SELECT id, room_id, code, label, capacity_min, capacity_max, shape, pos_x, pos_y, pos_w, pos_h, radius FROM `tables` WHERE is_active = 1')->fetchAll(),
            'categories' => $this->pdo->query('SELECT id, name, note FROM menu_categories WHERE is_active = 1 ORDER BY sort_order')->fetchAll(),
            'menu' => $this->pdo->query('SELECT m.id, m.category_id, m.name, m.description, m.price_cents, m.tags_json, m.is_available
                FROM menu_items m JOIN menu_categories c ON c.id = m.category_id WHERE c.is_active = 1 ORDER BY c.sort_order, m.sort_order')->fetchAll(),
        ];
    }
}
