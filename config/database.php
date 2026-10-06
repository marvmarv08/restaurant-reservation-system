<?php
declare(strict_types=1);

return [
    'host' => getenv('DB_HOST') ?: '',
    'port' => getenv('DB_PORT') ?: '3306',
    'database' => getenv('DB_DATABASE') ?: '',
    'username' => getenv('DB_USERNAME') ?: '',
    'password' => getenv('DB_PASSWORD') ?: '',
    'ssl_ca' => getenv('DB_SSL_CA') ?: '',
    'ssl_ca_base64' => getenv('DB_SSL_CA_BASE64') ?: '',
];
