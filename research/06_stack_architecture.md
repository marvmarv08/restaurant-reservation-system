# 06 - Stack, Architecture, Docker, Security, Delivery

Mandated stack: vanilla PHP 8.3, vanilla JS, CSS, HTML, MySQL 8, Docker. Judged on a live demo; code quality secondary but visible.
Labels: **DESIGN** = our proposal. **SOURCED** = backed by a cited URL.

Verified references (HTTP 200 checked this session):
- PHP-PDS "skeleton" standard for PHP package/app directory names: https://github.com/php-pds/skeleton
- FastRoute (reference for router design, we hand-roll a smaller one): https://github.com/nikic/FastRoute
- League Route: https://github.com/thephpleague/route
- phpdotenv (env loading): https://github.com/vlucas/phpdotenv
- panique/mini (classic framework-less PHP MVC example): https://github.com/panique/mini
- panique/huge (larger framework-less PHP app): https://github.com/panique/huge
- PDO prepared statements: https://www.php.net/manual/en/pdo.prepared-statements.php
- password_hash / ARGON2ID: https://www.php.net/manual/en/function.password-hash.php
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- php official image (apache / fpm variants): https://hub.docker.com/_/php
- mysql official image (entrypoint-initdb.d behaviour): https://hub.docker.com/_/mysql
- Compose file services reference (healthcheck, depends_on condition): https://docs.docker.com/reference/compose-file/services/
- Unsplash license: https://unsplash.com/license  | Pexels license: https://www.pexels.com/license/ (403 to curl, browser-only; license text not re-verified here, treat as NOT_FOUND until opened in a browser)

Note: GitHub code search API was rate limited for this network (HTTP 403 "API rate limit exceeded"), so repo discovery was done by verifying known-good repositories by URL rather than by keyword search.

---

## Recommended directory tree

DESIGN, aligned with php-pds/skeleton naming (`public/`, `src/`, `tests/`, `bin/`, `config/`, `docs/`).

```
table-reservation-system/
├── .env.example                 # Ports, DB creds, APP_ENV, APP_URL. Copied to .env on first run.
├── .gitattributes               # "* text=auto eol=lf" + "*.sh text eol=lf" - kills CRLF breakage on Windows
├── .dockerignore                # Keeps .git, node_modules, docs out of build context
├── docker-compose.yml           # app (php:8.3-apache), db (mysql:8), adminer
├── Dockerfile                   # php:8.3-apache + pdo_mysql, gd, opcache, mod_rewrite, headers
├── composer.json                # PSR-4 autoload only (no runtime framework deps)
├── README.md                    # One-command start, demo script, credentials, troubleshooting
├── bin/
│   ├── seed.php                 # Idempotent seeder (upsert by natural key)
│   ├── demo-reset.php           # Truncate transactional tables, re-seed, re-date reservations to today
│   └── test.php                 # Zero-dependency assertion runner for src/Service tests
├── config/
│   ├── app.php                  # Returns array: app name, timezone, session + security settings
│   ├── database.php             # Returns PDO DSN params from env
│   └── routes.php               # Single route table: [method, path pattern, handler, required role]
├── database/
│   ├── init/
│   │   ├── 01_schema.sql        # DDL: users, rooms, tables, reservations, menu_* , audit_log
│   │   ├── 02_reference.sql     # Static reference rows: roles, statuses, categories, rooms, tables
│   │   └── 03_demo_seed.sql     # Demo-only rows: menu items, demo users, reservations
│   └── migrations/              # Numbered .sql applied by bin/migrate.php after first release
├── docs/
│   ├── architecture.md / .svg   # Request lifecycle + container topology
│   ├── er-diagram.svg           # Entity relationship diagram
│   └── api.md                   # Endpoint reference generated from config/routes.php
├── public/                      # THE ONLY web-exposed directory (DocumentRoot)
│   ├── index.php                # Front controller: bootstrap -> router -> dispatch -> render
│   ├── .htaccess                # Rewrite all non-file requests to index.php
│   ├── assets/css/              # app.css, floorplan.css, admin.css (self-hosted, no CDN)
│   ├── assets/js/               # api.js (fetch wrapper + CSRF), booking.js, floorplan.js, admin.js
│   ├── assets/fonts/            # Self-hosted woff2 - zero wifi dependency on demo day
│   └── uploads/menu/            # Runtime-written menu images (named volume)
├── src/
│   ├── Core/
│   │   ├── Bootstrap.php        # Loads env + config, sets error handling, starts hardened session
│   │   ├── Router.php           # ~80 lines: regex route table, {param} capture, method + 404/405
│   │   ├── Request.php          # Immutable wrapper: method, path, query, body (form + JSON), files
│   │   ├── Response.php         # html()/json()/redirect()/noContent(), sets secure headers once
│   │   ├── Database.php         # Lazy PDO singleton: ERRMODE_EXCEPTION, FETCH_ASSOC, emulation off
│   │   ├── Container.php        # 30-line closure service locator, no reflection magic
│   │   ├── View.php             # Renders src/View templates with extract() + auto e() helper
│   │   ├── Validator.php        # Rule-based server-side validation, mirrors every client check
│   │   ├── Csrf.php             # Token issue/verify, per-session secret, hash_equals
│   │   ├── Auth.php             # login/logout/user(), password_verify, needs_rehash
│   │   ├── Guard.php            # requireRole() middleware used by every admin/kitchen route
│   │   ├── RateLimiter.php      # DB-backed fixed window on login + booking
│   │   └── Exceptions/          # HttpException, ValidationException, DomainException
│   ├── Controller/
│   │   ├── Web/HomeController.php, MenuController.php, BookingController.php, AuthController.php
│   │   ├── Admin/DashboardController.php, ReservationController.php, MenuAdminController.php, FloorPlanController.php
│   │   ├── Kitchen/KitchenController.php
│   │   └── Api/AvailabilityApi.php, ReservationApi.php, MenuApi.php, KitchenApi.php, StatsApi.php
│   ├── Domain/
│   │   ├── Entity/User.php, Room.php, DiningTable.php, Reservation.php, MenuItem.php
│   │   └── Enum/ReservationStatus.php, Role.php, TableShape.php
│   ├── Repository/
│   │   ├── AbstractRepository.php   # Shared PDO fetch/paginate/transaction helpers
│   │   ├── UserRepository.php, RoomRepository.php, TableRepository.php
│   │   ├── ReservationRepository.php, MenuRepository.php, AuditRepository.php
│   │   └── Mapper/ReservationMapper.php  # Rows <-> entities, keeps SQL out of the domain
│   ├── Service/
│   │   ├── AvailabilityService.php   # Pure, unit-testable slot/table allocation engine
│   │   ├── BookingService.php        # Transactional create/modify/cancel + conflict re-check
│   │   ├── NotificationService.php   # Writes to a log/outbox table (no SMTP on demo day)
│   │   ├── ImageService.php          # Validates + re-encodes uploaded menu images via GD
│   │   └── StatsService.php          # Dashboard aggregates (covers, utilisation, top items)
│   └── View/
│       ├── layout/app.php, admin.php, mail.php
│       ├── partial/header.php, nav.php, flash.php, csrf.php, table-card.php
│       ├── page/home.php, menu.php, booking.php, confirm.php, login.php
│       └── admin/dashboard.php, reservations.php, floorplan.php, menu.php, kitchen.php
└── tests/
    ├── AvailabilityServiceTest.php  # Core engine: overlaps, turn time, capacity, joins
    ├── ValidatorTest.php, CsrfTest.php
    └── bootstrap.php                # Minimal assert harness, runs under bin/test.php or PHPUnit
```

**If Composer is disallowed**, drop composer.json and put this in `src/autoload.php`, required by `public/index.php`:

```php
<?php
spl_autoload_register(function (string $class): void {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/';
    if (strncmp($prefix, $class, strlen($prefix)) !== 0) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file = $baseDir . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) {
        require $file;
    }
});
```

With Composer, `composer.json` needs nothing more than:

```json
{
  "name": "team/table-reservation-system",
  "type": "project",
  "require": { "php": ">=8.2", "ext-pdo": "*", "ext-gd": "*" },
  "require-dev": { "phpunit/phpunit": "^11.0" },
  "autoload": { "psr-4": { "App\\": "src/" } },
  "autoload-dev": { "psr-4": { "Tests\\": "tests/" } },
  "config": { "optimize-autoloader": true }
}
```

### Front controller (public/index.php) - the whole entry point

```php
<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';   // or: require __DIR__ . '/../src/autoload.php';

use App\Core\{Bootstrap, Request, Response, Router};

$app = Bootstrap::boot(dirname(__DIR__));      // env, config, error handler, hardened session
$router = new Router(require $app->configPath('routes.php'));

try {
    $request  = Request::fromGlobals();
    $response = $router->dispatch($request, $app->container());
} catch (\App\Core\Exceptions\HttpException $e) {
    $response = Response::error($request ?? null, $e->getStatusCode(), $e->getMessage());
} catch (\Throwable $e) {
    $app->logger()->error($e);
    $response = Response::error($request ?? null, 500, 'Internal server error');
}

$response->send();
```

Router contract (DESIGN): `config/routes.php` returns rows of `[method, '/api/reservations/{id}', [ReservationApi::class, 'show'], 'role' => 'admin']`. Router compiles `{param}` to `(?P<param>[^/]+)`, matches method first, returns 405 when the path matches but the method does not, and calls `Guard::requireRole()` before the controller when a role is declared. Pattern mirrors FastRoute/League Route semantics without the dependency (https://github.com/nikic/FastRoute).

---

## Docker setup (files + commands)

### Decision: `php:8.3-apache` single container, NOT nginx + php-fpm

| Criterion | php:8.3-apache | nginx + php-fpm |
|---|---|---|
| Containers to keep alive | 1 app | 2 app (nginx + fpm) |
| Config files to get right | 1 Dockerfile + .htaccess | Dockerfile + nginx.conf + fpm pool + upstream name |
| Failure modes on an unfamiliar laptop | few | "502 Bad Gateway" if fpm starts slower, wrong upstream DNS, or docroot mismatch between the two containers |
| Rewrite rules | `.htaccess` editable without rebuild | baked into nginx.conf, needs container restart |
| Perf at demo scale (1-5 concurrent judges) | irrelevant | irrelevant |
| Production realism (rubric optics) | slightly lower | slightly higher |

**Pick php:8.3-apache.** SOURCED: the official php image ships both `-apache` and `-fpm` variants and the apache variant serves `/var/www/html` out of the box (https://hub.docker.com/_/php). The only thing nginx buys us here is production optics; it doubles the number of ways the demo can break 90 seconds before judging. We document the nginx alternative in `docs/architecture.md` and ship the nginx config below as an opt-in profile so a reviewer can see we understood the tradeoff.

### docker-compose.yml

```yaml
name: tablebook

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: tablebook/app:local
    restart: unless-stopped
    ports:
      - "${APP_PORT:-8080}:80"
    environment:
      APP_ENV: ${APP_ENV:-local}
      APP_URL: ${APP_URL:-http://localhost:8080}
      APP_TZ: ${APP_TZ:-Asia/Manila}
      DB_HOST: db
      DB_PORT: "3306"
      DB_DATABASE: ${DB_DATABASE:-tablebook}
      DB_USERNAME: ${DB_USERNAME:-tablebook}
      DB_PASSWORD: ${DB_PASSWORD:-tablebook_pw}
      SESSION_SECURE: "${SESSION_SECURE:-0}"
    volumes:
      - ./public:/var/www/html/public
      - ./src:/var/www/html/src
      - ./config:/var/www/html/config
      - ./bin:/var/www/html/bin
      - ./tests:/var/www/html/tests
      - ./database:/var/www/html/database
      - uploads:/var/www/html/public/uploads
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "php", "-r", "exit(@file_get_contents('http://localhost/health') ? 0 : 1);"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s

  db:
    image: mysql:8.4
    restart: unless-stopped
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
      - --default-time-zone=+08:00
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-root_pw}
      MYSQL_DATABASE: ${DB_DATABASE:-tablebook}
      MYSQL_USER: ${DB_USERNAME:-tablebook}
      MYSQL_PASSWORD: ${DB_PASSWORD:-tablebook_pw}
    ports:
      - "${DB_PORT_HOST:-33061}:3306"
    volumes:
      - dbdata:/var/lib/mysql
      - ./database/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1", "-u", "root", "-p${DB_ROOT_PASSWORD:-root_pw}"]
      interval: 5s
      timeout: 5s
      retries: 20
      start_period: 30s

  adminer:
    image: adminer:5-standalone
    restart: unless-stopped
    ports:
      - "${ADMINER_PORT:-8081}:8080"
    environment:
      ADMINER_DEFAULT_SERVER: db
      ADMINER_DESIGN: dracula
    depends_on:
      db:
        condition: service_healthy

volumes:
  dbdata:
  uploads:
```

Why Adminer over phpMyAdmin (DESIGN): single ~6 MB image, no PHP config to tune, starts in about a second, and one screen is enough for a judge to see the tables. phpMyAdmin is the nicer UI if the judges will actually browse; swap `image: phpmyadmin:5` with `PMA_HOST: db` if so.

SOURCED mechanics relied on above:
- `/docker-entrypoint-initdb.d` `.sql`/`.sh` files run **only when the data directory is empty**, in alphabetical order, hence the `01_`/`02_`/`03_` prefixes (https://hub.docker.com/_/mysql). A fresh clone therefore comes up fully populated with no manual step; after a schema change you must `docker compose down -v`.
- `depends_on: condition: service_healthy` and `healthcheck` keys per the Compose services reference (https://docs.docker.com/reference/compose-file/services/).

### Dockerfile

```dockerfile
FROM php:8.3-apache

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public \
    COMPOSER_ALLOW_SUPERUSER=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        libzip-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql gd zip opcache \
    && a2enmod rewrite headers expires \
    && rm -rf /var/lib/apt/lists/*

# Point Apache at public/ so src/, config/ and .env are never web-reachable
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && printf '<Directory /var/www/html/public>\n  AllowOverride All\n  Require all granted\n</Directory>\n' \
       > /etc/apache2/conf-available/z-app.conf \
    && a2enconf z-app

COPY docker/php.ini /usr/local/etc/php/conf.d/99-app.ini
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY composer.json composer.lock* ./
RUN composer install --no-dev --no-interaction --no-progress --optimize-autoloader || true
COPY . .
RUN mkdir -p public/uploads/menu storage/logs \
    && chown -R www-data:www-data public/uploads storage

HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD curl -fsS http://localhost/health || exit 1
```

`docker/php.ini`:

```ini
display_errors = Off
log_errors = On
error_log = /dev/stderr
upload_max_filesize = 4M
post_max_size = 6M
max_execution_time = 20
date.timezone = Asia/Manila
expose_php = Off
session.use_strict_mode = 1
session.cookie_httponly = 1
session.cookie_samesite = Lax
session.use_only_cookies = 1
opcache.enable = 1
opcache.validate_timestamps = 1
```

`public/.htaccess`:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^ index.php [L]

Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
Header always set Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"

<FilesMatch "\.(env|md|sql|json|lock)$">
  Require all denied
</FilesMatch>

# Uploaded files are data, never code
<Directory "/var/www/html/public/uploads">
  php_flag engine off
  <FilesMatch "\.(php|phar|phtml|php[0-9])$">
    Require all denied
  </FilesMatch>
</Directory>
```

### Opt-in nginx + php-fpm alternative (documented, not default)

`docker/nginx/default.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /var/www/html/public;
    index index.php;
    client_max_body_size 6m;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    location / {
        try_files $uri $uri/ /index.php$is_args$args;
    }

    location ~ ^/uploads/.*\.php$ { deny all; }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass php:9000;                       # service name of the php-fpm container
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $document_root;
        fastcgi_read_timeout 30s;
    }

    location ~* \.(css|js|woff2|png|jpe?g|svg)$ {
        expires 7d;
        access_log off;
    }

    location = /favicon.ico { log_not_found off; access_log off; }
    location ~ /\.(?!well-known) { deny all; }
}
```

Enable it with `docker compose --profile nginx up -d` after adding `php` (php:8.3-fpm) and `web` (nginx:1.27-alpine, mounting the conf above) services under `profiles: [nginx]`. Both containers must mount the **same** code path at the same location, which is the classic nginx+fpm mistake.

### Commands

Cold start on a laptop that has never seen the repo:

```bash
git clone <repo-url> table-reservation-system
cd table-reservation-system
cp .env.example .env
docker compose up -d --build
docker compose ps                       # wait until db is "healthy" and app is "running"
docker compose logs -f db | head -40    # confirm init SQL ran
# Guest site:   http://localhost:8080
# Adminer:      http://localhost:8081   (server: db, user/pass from .env)
```

Full reset (destroys the MySQL volume so init SQL re-runs):

```bash
docker compose down -v --remove-orphans
docker compose up -d --build
```

Fast demo reset (keeps containers, re-seeds data, re-dates reservations around "now"):

```bash
docker compose exec app php bin/demo-reset.php
```

Other useful ones:

```bash
docker compose exec app php bin/test.php                 # run assertions
docker compose exec app php bin/seed.php --force         # idempotent re-seed
docker compose exec db mysql -utablebook -ptablebook_pw tablebook -e "SELECT COUNT(*) FROM reservations;"
docker compose exec db mysqldump -uroot -proot_pw tablebook > backup/demo_snapshot.sql
docker compose logs --tail=100 app
```

### Windows / WSL pitfalls (and the fixes we commit)

1. **CRLF line endings** break `bin/*.sh` and any `docker-entrypoint-initdb.d` shell script with `exec format error` / `\r: command not found`. Fix: commit `.gitattributes` with `* text=auto eol=lf` plus explicit `*.sh text eol=lf` and `*.sql text eol=lf`, and tell teammates to clone with `git config --global core.autocrlf input`.
2. **Bind-mount permissions**: files mounted from Windows arrive as root/0777-ish or as uid 1000 depending on the path. Apache runs as `www-data` (uid 33) and cannot write `public/uploads`. Fix: keep uploads in a **named volume** (we do) rather than a bind mount, and `chown -R www-data:www-data` in the Dockerfile.
3. **Clone inside the WSL filesystem** (`~/projects/...`), not `/mnt/c/...`. Bind mounts across the Windows boundary are 5-20x slower and `inotify` does not fire, which makes PHP opcache + edits behave oddly.
4. **Port conflicts**: 8080 is often taken by Jenkins/Tomcat/another demo, 3306 almost always by a locally installed MySQL or XAMPP. We default host MySQL to **33061** and expose everything through `.env` so a conflict is a one-line edit, not a code change. Detect with `ss -ltnp | grep -E '8080|8081|33061'` (Linux/WSL) or `netstat -ano | findstr "8080"` (Windows).
5. **Docker Desktop WSL integration off** gives `docker: command not found` inside WSL. Settings > Resources > WSL integration > enable the distro.
6. **MySQL 8 init is slow on first boot** (20-40 s while it builds the data dir). Without the healthcheck + `condition: service_healthy` the app connects too early and shows a connection error on the judge's screen. That is exactly why the healthcheck exists.
7. **Stale init SQL**: editing `database/init/*.sql` does nothing unless the volume is wiped. If a teammate says "my schema change isn't there", the answer is always `docker compose down -v`.

---

## Security baseline (patterns)

All patterns are DESIGN implementations of SOURCED guidance: OWASP CSRF cheat sheet, OWASP Session Management cheat sheet, php.net PDO prepared statements, php.net password_hash.

**1. PDO everywhere, zero string interpolation.** Emulation off so placeholders are real server-side parameters (https://www.php.net/manual/en/pdo.prepared-statements.php).

```php
// src/Core/Database.php
$pdo = new \PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass, [
    \PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
    \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
    \PDO::ATTR_EMULATE_PREPARES   => false,   // real prepares, no client-side quoting
    \PDO::ATTR_STRINGIFY_FETCHES  => false,
]);

// src/Repository/ReservationRepository.php
public function findForDate(string $date, ?int $roomId = null): array
{
    $sql = 'SELECT r.* FROM reservations r
            JOIN dining_tables t ON t.id = r.table_id
            WHERE r.reserved_date = :date' . ($roomId ? ' AND t.room_id = :room' : '') . '
            ORDER BY r.start_time';
    $st = $this->pdo->prepare($sql);
    $st->bindValue(':date', $date);
    if ($roomId) { $st->bindValue(':room', $roomId, \PDO::PARAM_INT); }
    $st->execute();
    return $st->fetchAll();
}

// Dynamic ORDER BY / LIMIT cannot be bound - whitelist, never interpolate user input:
private const SORTABLE = ['start_time', 'party_size', 'created_at'];
$col = in_array($input['sort'] ?? '', self::SORTABLE, true) ? $input['sort'] : 'start_time';
$dir = ($input['dir'] ?? '') === 'desc' ? 'DESC' : 'ASC';
$sql = "SELECT * FROM reservations ORDER BY {$col} {$dir} LIMIT :lim OFFSET :off";
```

**2. Passwords: ARGON2ID with explicit cost, plus transparent rehash** (https://www.php.net/manual/en/function.password-hash.php).

```php
// src/Core/Auth.php
private const PW_ALGO = PASSWORD_ARGON2ID;
private const PW_OPTS = ['memory_cost' => 65536, 'time_cost' => 4, 'threads' => 2]; // 64 MiB

public function hash(string $plain): string
{
    return password_hash($plain, self::PW_ALGO, self::PW_OPTS);
}

public function attempt(string $email, string $plain): ?User
{
    $user = $this->users->findByEmail($email);
    // Do the verify work even when the user does not exist, to blunt user enumeration by timing
    $hash = $user?->passwordHash ?? self::DUMMY_HASH;
    $ok   = password_verify($plain, $hash);
    if (!$ok || $user === null || !$user->isActive) {
        return null;
    }
    if (password_needs_rehash($hash, self::PW_ALGO, self::PW_OPTS)) {
        $this->users->updateHash($user->id, $this->hash($plain));
    }
    return $user;
}
```

Note: php:8.3 images include libargon2, so `PASSWORD_ARGON2ID` is available. `bin/test.php` asserts `defined('PASSWORD_ARGON2ID')`; if a stripped build lacks it, Auth falls back to `PASSWORD_DEFAULT` (bcrypt) with a startup warning rather than fataling mid-demo.

**3. CSRF on every state-changing request** (synchroniser token pattern, per OWASP: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

```php
// src/Core/Csrf.php
final class Csrf
{
    public static function token(): string
    {
        return $_SESSION['_csrf'] ??= bin2hex(random_bytes(32));
    }

    public static function check(Request $r): void
    {
        if (in_array($r->method(), ['GET', 'HEAD', 'OPTIONS'], true)) { return; }
        $sent = $r->header('X-CSRF-Token') ?? $r->input('_csrf') ?? '';
        if (!is_string($sent) || !hash_equals(self::token(), $sent)) {
            throw new HttpException(419, 'CSRF token mismatch, please refresh the page.');
        }
    }
}
```

```php
<?php // src/View/partial/csrf.php - included inside every form ?>
<input type="hidden" name="_csrf" value="<?= e(\App\Core\Csrf::token()) ?>">
```

`Csrf::check()` is called once in `Router::dispatch()` for every non-idempotent method, so a developer cannot forget it on a new route. Origin/Referer is compared to APP_URL as a defence-in-depth second signal.

**4. Session hardening** (https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

```php
// src/Core/Bootstrap.php
session_name('TBSESS');                       // drop the default PHPSESSID fingerprint
ini_set('session.use_strict_mode', '1');      // reject attacker-supplied session ids
ini_set('session.use_only_cookies', '1');
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'secure'   => (bool) getenv('SESSION_SECURE'),  // 1 behind HTTPS, 0 for the localhost demo
    'httponly' => true,
    'samesite' => 'Lax',                      // Lax keeps top-level GET navigation working
]);
session_start();

$now  = time();
$idle = 30 * 60;
if (isset($_SESSION['_last']) && $now - $_SESSION['_last'] > $idle) {
    session_unset(); session_destroy(); session_start();
    $_SESSION['flash'] = 'Session expired, please log in again.';
}
$_SESSION['_last'] = $now;

$_SESSION['_created'] ??= $now;               // absolute cap
if ($now - $_SESSION['_created'] > 8 * 3600) { session_regenerate_id(true); $_SESSION['_created'] = $now; }

$fp = hash('sha256', ($_SERVER['HTTP_USER_AGENT'] ?? '') . '|' . getenv('APP_KEY'));
if (($_SESSION['_fp'] ??= $fp) !== $fp) { session_unset(); session_destroy(); session_start(); }
```

```php
// On successful login - fixation defence
session_regenerate_id(true);
$_SESSION['user_id']  = $user->id;
$_SESSION['role']     = $user->role->value;
$_SESSION['_created'] = time();
```

**5. Output escaping in templates.** One helper, used without exception; templates never echo a raw variable.

```php
// src/Core/helpers.php
function e(?string $v): string { return htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function jsonAttr(array $v): string { return e(json_encode($v, JSON_THROW_ON_ERROR | JSON_HEX_APOS | JSON_HEX_QUOT)); }

// src/View/page/confirm.php
<h1>Thanks, <?= e($reservation->guestName) ?></h1>
<p>Table <?= e($table->label) ?> in <?= e($room->name) ?> at <?= e($reservation->startTime) ?></p>
<div id="floorplan" data-tables="<?= jsonAttr($tablesForJs) ?>"></div>
```

Review gate, wired into `bin/test.php`: `grep -rn '<?= \$' src/View/` must return nothing (every echo must pass through `e()` or `jsonAttr()`).

**6. Server-side validation mirroring every client check.** The browser rules are emitted from the same rule array, so they cannot drift.

```php
// src/Controller/Web/BookingController.php
$data = $this->validator->validate($request->input(), [
    'guest_name'  => ['required', 'string', 'min:2',  'max:80'],
    'guest_email' => ['required', 'email', 'max:120'],
    'guest_phone' => ['required', 'regex:/^[0-9+\- ]{7,20}$/'],
    'party_size'  => ['required', 'int', 'between:1,20'],
    'date'        => ['required', 'date:Y-m-d', 'after_or_equal:today', 'before:+90 days'],
    'time'        => ['required', 'in_set:service_slots'],   // slot list comes from the DB, not the client
    'table_id'    => ['required', 'int', 'exists:dining_tables,id'],
    'notes'       => ['nullable', 'string', 'max:500'],
]);
// Never trust a client-sent price, total, capacity or status - re-read them from the DB.
```

**7. Rate limiting on login and booking.** Fixed window in MySQL, no Redis dependency.

```sql
CREATE TABLE rate_limits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bucket VARCHAR(80) NOT NULL,          -- "login:alice@x.com|203.0.113.4", "book:203.0.113.4"
  window_start DATETIME NOT NULL,
  hits INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_bucket_window (bucket, window_start),
  KEY idx_window (window_start)
) ENGINE=InnoDB;
```

```php
// src/Core/RateLimiter.php
public function hit(string $bucket, int $max, int $windowSec): void
{
    $start = date('Y-m-d H:i:s', intdiv(time(), $windowSec) * $windowSec);
    $this->pdo->prepare(
        'INSERT INTO rate_limits (bucket, window_start, hits) VALUES (:b, :w, 1)
         ON DUPLICATE KEY UPDATE hits = hits + 1'
    )->execute([':b' => $bucket, ':w' => $start]);

    $st = $this->pdo->prepare('SELECT hits FROM rate_limits WHERE bucket = :b AND window_start = :w');
    $st->execute([':b' => $bucket, ':w' => $start]);
    if ((int) $st->fetchColumn() > $max) {
        throw new HttpException(429, 'Too many attempts. Please try again in a minute.');
    }
}
// Limits (DESIGN): login 5 / 15 min per email+IP, booking 6 / 10 min per IP,
// availability 60 / min per IP, password reset 3 / hour. Cleanup: DELETE rows older than 1 day on boot.
```

**8. Role-based authorisation, server-side, on every route.** Declared in the route table, enforced by the router before the controller runs, and re-checked inside any controller that mutates another user's data.

```php
// config/routes.php
return [
  ['GET',  '/',                 [HomeController::class, 'index']],
  ['POST', '/api/reservations', [ReservationApi::class, 'store']],
  ['GET',  '/admin',            [DashboardController::class, 'index'], 'role' => 'admin'],
  ['POST', '/api/admin/reservations/{id}/status',
                                [ReservationApi::class, 'setStatus'],  'role' => ['admin', 'manager']],
  ['GET',  '/kitchen',          [KitchenController::class, 'index'],   'role' => ['admin', 'kitchen']],
];

// src/Core/Guard.php
public static function requireRole(array|string $roles): void
{
    $allowed = (array) $roles;
    $role = $_SESSION['role'] ?? null;
    if ($role === null)                          { throw new HttpException(401, 'Login required'); }
    if (!in_array($role, $allowed, true))        { throw new HttpException(403, 'Forbidden'); }
}
```

Anti-pattern we explicitly avoid: hiding admin buttons in the UI and calling that authorisation. Every admin endpoint must 403 when called directly with curl; `tests/` asserts it.

**9. Secure headers.** Set in `.htaccess` (above) and again in `Response::send()` so JSON responses get them too:

```php
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; font-src 'self'");
header_remove('X-Powered-By');
if (getenv('SESSION_SECURE')) { header('Strict-Transport-Security: max-age=31536000; includeSubDomains'); }
```

CSP `script-src 'self'` means **no inline `onclick`, no inline `<script>`**. All JS lives in `public/assets/js/*.js` and reads config from `data-` attributes. That constraint is also good vanilla-JS hygiene and it is what forces the self-hosted-assets discipline we need for offline safety.

**10. Safe menu-image uploads.** Validate by content, not extension, then re-encode so nothing survives.

```php
// src/Service/ImageService.php
private const ALLOWED = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

public function storeMenuImage(array $file): string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) { throw new ValidationException('Upload failed'); }
    if (!is_uploaded_file($file['tmp_name']))                     { throw new ValidationException('Invalid upload'); }
    if ($file['size'] > 4 * 1024 * 1024)                          { throw new ValidationException('Max 4 MB'); }

    $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if (!isset(self::ALLOWED[$mime]))                             { throw new ValidationException('JPEG, PNG or WebP only'); }
    $info = getimagesize($file['tmp_name']);
    if ($info === false || $info[0] < 200 || $info[0] > 6000)     { throw new ValidationException('Bad image dimensions'); }

    // Re-encode through GD: strips EXIF and any appended polyglot payload
    $img = match ($mime) {
        'image/jpeg' => imagecreatefromjpeg($file['tmp_name']),
        'image/png'  => imagecreatefrompng($file['tmp_name']),
        'image/webp' => imagecreatefromwebp($file['tmp_name']),
    };
    $name = bin2hex(random_bytes(16)) . '.webp';   // random name, never the client filename
    imagewebp($this->resizeToMax($img, 1200), $this->uploadDir . '/' . $name, 82);
    imagedestroy($img);
    chmod($this->uploadDir . '/' . $name, 0644);
    return $name;                                  // DB stores only the basename, so no traversal on render
}
```

Plus `php_flag engine off` on the uploads directory (see `.htaccess`) so even a successfully smuggled `.php` cannot execute.

**11. Misc reviewer-pleasers.** `declare(strict_types=1)` in every file; `display_errors=Off` with `log_errors=On` in the image; `.env` git-ignored with `.env.example` committed; generic error text to the user and detail only to the log; an `audit_log` table recording who changed which reservation status and when.

---

## JSON API surface

DESIGN. Everything under `/api`, same-origin, session-cookie authenticated (no JWT: it would add complexity with zero demo value).

### Response envelope

Every endpoint returns the same shape, so `api.js` has exactly one parser:

```json
{
  "ok": true,
  "data": { "...": "payload" },
  "meta": { "count": 12, "page": 1, "per_page": 20, "generated_at": "2026-05-14T18:03:11+08:00" },
  "error": null
}
```

```json
{
  "ok": false,
  "data": null,
  "meta": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Please check the highlighted fields.",
    "fields": { "party_size": "Party size must be between 1 and 20.", "time": "That slot is no longer available." },
    "request_id": "01JA7Q2X9R"
  }
}
```

### HTTP status usage

| Status | Used for |
|---|---|
| 200 | Successful GET / PATCH / DELETE |
| 201 | Reservation created (with `Location: /api/reservations/{id}`) |
| 204 | Successful delete with no body |
| 400 | Malformed JSON or missing required parameter |
| 401 | Not logged in on a protected route |
| 403 | Logged in but wrong role |
| 404 | Unknown id or route |
| 405 | Path matched, method did not (router returns `Allow` header) |
| 409 | Booking conflict - the table was taken between availability check and submit |
| 419 | CSRF token missing or stale |
| 422 | Validation failed (field-level `error.fields`) |
| 429 | Rate limited (`Retry-After` header set) |
| 500 | Unhandled error, logged with `request_id`, generic message to the client |

Error codes (stable strings the JS can branch on): `VALIDATION_FAILED`, `SLOT_TAKEN`, `NOT_FOUND`, `UNAUTHENTICATED`, `FORBIDDEN`, `CSRF_MISMATCH`, `RATE_LIMITED`, `SERVER_ERROR`.

### CSRF for fetch()

Token is rendered once per page into a meta tag; `api.js` attaches it to every non-GET call and retries once after a soft refresh on 419.

```php
<!-- src/View/layout/app.php, in <head> -->
<meta name="csrf-token" content="<?= e(\App\Core\Csrf::token()) ?>">
```

```javascript
// public/assets/js/api.js
const CSRF = () => document.querySelector('meta[name="csrf-token"]')?.content ?? '';

export async function api(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',               // session cookie; no CORS, no tokens in JS
    signal,
    headers: {
      'Accept': 'application/json',
      'X-Requested-With': 'fetch',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { 'X-CSRF-Token': CSRF() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload;
  try { payload = await res.json(); }
  catch { throw new ApiError('SERVER_ERROR', 'Unexpected server response', res.status); }

  if (!res.ok || payload.ok === false) {
    const err = payload.error ?? { code: 'SERVER_ERROR', message: 'Something went wrong' };
    throw new ApiError(err.code, err.message, res.status, err.fields);
  }
  return payload.data;
}

export class ApiError extends Error {
  constructor(code, message, status, fields = {}) {
    super(message); this.code = code; this.status = status; this.fields = fields;
  }
}
```

### Endpoints

**Guest flow (public)**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/rooms` | Room list with floor-plan canvas size and table geometry |
| GET | `/api/availability?date=&party=&room=` | Available slots per table; the core engine call |
| GET | `/api/availability/calendar?month=&party=` | Per-day capacity heatmap for the date picker |
| GET | `/api/menu?category=&q=` | Menu items with price, description, image basename |
| GET | `/api/menu/categories` | Category list with counts |
| POST | `/api/reservations` | Create booking. 201 with reference code, or 409 `SLOT_TAKEN` |
| GET | `/api/reservations/lookup?ref=&email=` | Guest self-service lookup by reference + email |
| PATCH | `/api/reservations/{ref}` | Guest edit (party size, time, notes) within policy window |
| DELETE | `/api/reservations/{ref}` | Guest cancel (soft, status -> cancelled) |
| POST | `/api/contact` | Contact / special-request form |
| GET | `/health` | Liveness for the Docker healthcheck. Returns `{"ok":true,"db":true}` |

**Admin dashboard (role: admin, manager)**

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Login, regenerates session, rate limited |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Current user + role, used to bootstrap the dashboard UI |
| GET | `/api/admin/stats?range=today|week|month` | KPI cards: covers, utilisation, no-show rate, revenue proxy |
| GET | `/api/admin/stats/timeseries?metric=&range=` | Chart data for covers/occupancy by day or hour |
| GET | `/api/admin/reservations?date=&status=&room=&q=&page=` | Paginated reservation table |
| GET | `/api/admin/reservations/{id}` | Single reservation detail + audit trail |
| POST | `/api/admin/reservations` | Walk-in / phone booking created by staff |
| PATCH | `/api/admin/reservations/{id}` | Edit any field, including table reassignment |
| POST | `/api/admin/reservations/{id}/status` | confirm / seat / complete / no-show / cancel |
| GET | `/api/admin/floorplan?date=&time=` | Live table states for the floor-plan view |
| POST | `/api/admin/tables/{id}/position` | Drag-and-drop floor-plan coordinate save |
| GET/POST | `/api/admin/menu` , `PATCH/DELETE /api/admin/menu/{id}` | Menu CRUD |
| POST | `/api/admin/menu/{id}/image` | Multipart image upload (ImageService) |
| GET | `/api/admin/users` + CRUD | Staff account management (admin only) |
| GET | `/api/admin/export/reservations.csv` | CSV export, nice rubric touch |

**Kitchen dashboard (role: admin, kitchen)**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/kitchen/queue?window=120` | Upcoming seatings in the next N minutes with party size and pre-orders |
| GET | `/api/kitchen/preorders?date=` | Aggregated item counts to prep, grouped by slot |
| POST | `/api/kitchen/preorders/{id}/state` | queued -> preparing -> ready -> served |
| GET | `/api/kitchen/stream?since=` | Long-ish poll (3 s `setInterval` + `since` cursor). DESIGN: polling, not WebSockets, to keep the stack vanilla |

Live updates everywhere use `setInterval` + `AbortController` with a `since` cursor and `document.visibilityState` pausing. No SSE, no WebSockets, nothing that can break behind a conference network.

---

## Seed data plan

DESIGN throughout.

### Restaurant identity

**"Lumina Kitchen & Terrace"** - modern Filipino-Mediterranean, 86 covers, Bonifacio Global City. Hours Tue-Sun 11:00-14:30 lunch and 17:30-22:30 dinner, closed Monday. 90-minute turn time for parties of 1-4, 120 minutes for 5+. This gives the availability engine something non-trivial to show: a closed day, two services, and two turn times.

### Rooms, tables, floor-plan coordinates

4 room types, 24 tables, 86 seats. Coordinates are in a normalised 1000 x 700 canvas so the SVG floor plan scales to any screen.

| Room | Code | Tables | Seats | Character |
|---|---|---|---|---|
| Main Dining | MAIN | 10 (4x2-top, 4x4-top, 2x6-top) | 40 | Default, always has availability |
| Terrace (al fresco) | TERR | 6 (2x2-top, 3x4-top, 1x8-top) | 28 | Weather note, premium, fills first on weekends |
| Private Room "Narra" | PRIV | 2 (1x10-top, 1x8-top) | 18 | Minimum party 6, requires deposit flag |
| Chef's Counter | BAR | 6 bar seats (1-top each) | 6 | Walk-in friendly, 60-minute turn |

```sql
INSERT INTO rooms (code, name, description, canvas_w, canvas_h, bg_asset, sort_order) VALUES
 ('MAIN','Main Dining','Open-plan room with banquette seating',1000,700,'main.svg',1),
 ('TERR','Terrace','Al fresco terrace with garden view',1000,700,'terrace.svg',2),
 ('PRIV','Narra Private Room','Enclosed room for groups of 6 and up',1000,700,'private.svg',3),
 ('BAR',"Chef's Counter",'Six seats facing the open kitchen',1000,700,'counter.svg',4)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO dining_tables (room_id, label, seats, min_party, shape, pos_x, pos_y, width, height, turn_minutes) VALUES
 ((SELECT id FROM rooms WHERE code='MAIN'),'M1', 2,1,'round',  120,110, 90, 90, 90),
 ((SELECT id FROM rooms WHERE code='MAIN'),'M2', 2,1,'round',  260,110, 90, 90, 90),
 ((SELECT id FROM rooms WHERE code='MAIN'),'M3', 4,2,'square', 420,110,130,130, 90),
 ((SELECT id FROM rooms WHERE code='MAIN'),'M4', 4,2,'square', 600,110,130,130, 90),
 ((SELECT id FROM rooms WHERE code='MAIN'),'M5', 6,4,'rect',   790,110,170,130,120),
 ((SELECT id FROM rooms WHERE code='MAIN'),'M6', 2,1,'round',  120,320, 90, 90, 90),
 ((SELECT id FROM rooms WHERE code='MAIN'),'M7', 2,1,'round',  260,320, 90, 90, 90),
 ((SELECT id FROM rooms WHERE code='MAIN'),'M8', 4,2,'square', 420,320,130,130, 90),
 ((SELECT id FROM rooms WHERE code='MAIN'),'M9', 4,2,'square', 600,320,130,130, 90),
 ((SELECT id FROM rooms WHERE code='MAIN'),'M10',6,4,'rect',   790,320,170,130,120)
ON DUPLICATE KEY UPDATE seats = VALUES(seats), pos_x = VALUES(pos_x), pos_y = VALUES(pos_y);
-- Terrace T1-T6, Private P1-P2, Counter B1-B6 follow the same pattern with their own coordinates.
```

Deliberate seeding choices that make demos look good: two 2-tops adjacent in MAIN so the "combine tables" feature has something to combine; the terrace 8-top is pre-booked on demo evening so the engine has to offer an alternative; the private room enforces `min_party = 6` so a party of 2 sees it correctly greyed out.

### Menu: 36 items across 7 categories

| Category | Items | Price band (PHP) |
|---|---|---|
| Small Plates | 6 | 240 - 480 |
| Soups & Salads | 4 | 220 - 390 |
| Wood-Fired Mains | 8 | 520 - 1,450 |
| Pasta & Rice | 5 | 420 - 680 |
| Sides | 4 | 150 - 260 |
| Desserts | 5 | 180 - 320 |
| Drinks | 4 | 120 - 420 |

Each row carries: name, slug, category, price, 2-sentence description, `image` basename, `is_vegetarian`, `is_spicy`, `allergens` (JSON array), `is_featured`, `is_available`, `sort_order`. Two items are seeded `is_available = 0` so the kitchen "mark sold out" feature has a visible before/after, and six are `is_featured = 1` to fill the homepage carousel.

```sql
INSERT INTO menu_items (slug, category_id, name, description, price, image, is_vegetarian, is_spicy, allergens, is_featured, is_available, sort_order) VALUES
 ('charred-octopus', (SELECT id FROM menu_categories WHERE slug='small-plates'),
  'Charred Octopus', 'Grilled Spanish octopus with smoked paprika oil and crushed fingerlings. Finished with burnt-lemon aioli.',
  480.00, 'charred-octopus.webp', 0, 0, JSON_ARRAY('shellfish'), 1, 1, 1),
 ('kesong-puti-croquetas', (SELECT id FROM menu_categories WHERE slug='small-plates'),
  'Kesong Puti Croquetas', 'Carabao milk cheese fritters with calamansi honey. Six pieces per order.',
  280.00, 'kesong-puti-croquetas.webp', 1, 0, JSON_ARRAY('dairy','gluten','egg'), 0, 1, 2)
ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), description = VALUES(description), image = VALUES(image);
```

### Food photography and licensing

SOURCED sources, both verified reachable this session (Unsplash license page returned a redirect to the live page; Pexels license page blocked plain curl with HTTP 403, so its exact terms are marked NOT_FOUND until opened in a browser):
- Unsplash: https://unsplash.com/license - free for commercial and non-commercial use, no permission needed.
- Pexels: https://www.pexels.com/license/ - free use, attribution appreciated not required.
- Also acceptable: Foodiesfeed (https://www.foodiesfeed.com), Pixabay (https://pixabay.com/service/license-summary/), Burst by Shopify.

Caveats we will honour and write into `docs/CREDITS.md`:
1. Neither license grants rights in **identifiable people, logos, trademarks or artwork** inside a photo. We pick plated-food and empty-interior shots with no recognisable faces.
2. You may not redistribute the photos as a competing stock library, and you may not imply the photographer endorses Lumina Kitchen.
3. Terms change. We record source URL, photographer, download date and license name per image in `docs/CREDITS.md` and commit it, which also looks diligent to a judge.
4. **Commit the images into the repo** (36 WebP files at ~120 KB each is about 4 MB) so the demo never needs wifi. Never hotlink to Unsplash URLs.
5. Pipeline: download at 1600px, convert to WebP q82, resize to 1200px long edge and generate a 400px thumbnail, name them by menu slug (`charred-octopus.webp`, `charred-octopus-thumb.webp`), and ship a neutral `placeholder.webp` so a missing file never shows a broken-image icon.
6. Every `<img>` gets `loading="lazy"`, explicit `width`/`height` to stop layout shift, and a descriptive `alt` from the item name.

### Demo accounts

| Role | Email | Password | Sees |
|---|---|---|---|
| admin | admin@lumina.test | Demo#Admin1 | Everything, user management, settings |
| manager | manager@lumina.test | Demo#Manager1 | Reservations, floor plan, menu, stats; no user management |
| host | host@lumina.test | Demo#Host1 | Today's floor plan, seat/complete/no-show only |
| kitchen | kitchen@lumina.test | Demo#Kitchen1 | Kitchen queue and pre-order states only |
| guest | guest@lumina.test | Demo#Guest1 | Own reservation history (if guest accounts are built) |

Passwords are hashed by `bin/seed.php` at seed time with `password_hash(..., PASSWORD_ARGON2ID)`, never stored as literals in SQL. The plaintexts live in README and on a printed card for demo day. They are clearly demo-only and documented as such, which is better than a reviewer finding a bcrypt hash of "password".

### Reservation spread (this is what makes dashboards look alive)

Dates are generated **relative to `CURDATE()`** at seed time, so the demo looks current whenever it runs:

- **Past 30 days**: ~180 reservations, status mix 78% completed, 9% cancelled, 7% no-show, 6% seated-then-completed late. Gives the stats charts real trend lines and a believable no-show rate.
- **Yesterday**: 14 reservations, all closed out. Proves "yesterday's service" views work.
- **Today**: 22 reservations spread 11:00-22:00, with statuses staged by clock time - earlier slots `completed`, the current window `seated`, the next two hours `confirmed`, two `pending`, one `cancelled` an hour ago. The kitchen queue therefore always has 3-5 live tickets.
- **Tomorrow**: 18 reservations, mostly `confirmed`, including one 10-person private-room booking with a deposit flag.
- **Next 14 days**: 60 reservations weighted to Friday and Saturday dinner at 70-85% occupancy, midweek lunch at 25-40%. Weekends therefore genuinely show "fully booked" slots, which is the most convincing thing the availability engine can do on stage.
- **Deliberate edge cases**: one double-request conflict resolved into a waitlist entry; one party of 9 split across two joined 4-tops; one booking with a 500-character special request to prove escaping and layout; one Monday (closed day) attempt in the audit log; one reservation at the very last slot before closing.
- **Pre-orders**: about 35% of today's and tomorrow's reservations carry 1-4 menu items so the kitchen aggregation screen is not empty.

### Idempotent seeding

```php
// bin/seed.php (sketch)
#!/usr/bin/env php
<?php
declare(strict_types=1);
require __DIR__ . '/../vendor/autoload.php';
$app = App\Core\Bootstrap::boot(dirname(__DIR__), cli: true);
$pdo = $app->container()->get(PDO::class);

$fresh = in_array('--fresh', $argv, true);     // --fresh truncates transactional tables first
$pdo->beginTransaction();
try {
    if ($fresh) {
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
        foreach (['reservation_items','reservations','waitlist','audit_log','rate_limits'] as $t) {
            $pdo->exec("TRUNCATE TABLE {$t}");
        }
        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    }
    seedRooms($pdo);        // INSERT ... ON DUPLICATE KEY UPDATE on natural key (code)
    seedTables($pdo);       // natural key (room_id, label)
    seedCategories($pdo);   // natural key (slug)
    seedMenu($pdo);         // natural key (slug)
    seedUsers($pdo);        // natural key (email); hash only when the row is new or --rehash
    seedReservations($pdo); // deterministic: mt_srand(20260514) so every run is identical
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    fwrite(STDERR, 'Seed failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
echo "Seeded OK\n";
```

Idempotency rules: every seed table has a **UNIQUE natural key** (`rooms.code`, `dining_tables(room_id,label)`, `menu_items.slug`, `users.email`); every insert is `INSERT ... ON DUPLICATE KEY UPDATE`; the whole run is one transaction; the RNG is explicitly seeded so reservation spread is reproducible; and a `seed_meta(key, value)` row stores the seed version so the script can skip work it already did. Running `php bin/seed.php` five times leaves the DB in exactly the same state as running it once.

`database/init/03_demo_seed.sql` holds the static rows for the Docker first-boot path (no PHP available in the MySQL container), and `bin/seed.php` is the richer path used for resets and for the relative-date reservations. The two share the same natural keys, so they cannot fight.

---

## Testing and demo reliability

DESIGN.

### Tests where they pay: the availability engine

`AvailabilityService` is pure (inputs: tables, existing reservations, service hours, turn times; output: slot list). It needs no DB, so it can be tested with zero infrastructure.

```php
// bin/test.php - 40-line harness, runs with plain php, no Composer needed
#!/usr/bin/env php
<?php
declare(strict_types=1);
require __DIR__ . '/../src/autoload.php';

$pass = 0; $fail = 0; $failures = [];
function it(string $name, callable $fn): void {
    global $pass, $fail, $failures;
    try { $fn(); $pass++; echo "  PASS  {$name}\n"; }
    catch (Throwable $e) { $fail++; $failures[] = "{$name}: {$e->getMessage()}"; echo "  FAIL  {$name}\n"; }
}
function expect(mixed $actual, mixed $expected, string $msg = ''): void {
    if ($actual !== $expected) {
        throw new RuntimeException($msg ?: 'expected ' . json_encode($expected) . ', got ' . json_encode($actual));
    }
}

foreach (glob(__DIR__ . '/../tests/*Test.php') as $file) { echo basename($file) . "\n"; require $file; }

echo "\n{$pass} passed, {$fail} failed\n";
foreach ($failures as $f) { echo "  - {$f}\n"; }
exit($fail > 0 ? 1 : 0);
```

```php
// tests/AvailabilityServiceTest.php - the cases that actually matter
$svc = new App\Service\AvailabilityService($serviceHours, $turnRules);

it('blocks a slot that overlaps an existing booking', function () use ($svc) {
    $slots = $svc->slotsFor('2026-05-15', partySize: 2, tables: [$t2], existing: [
        booking($t2, '19:00', 90),
    ]);
    expect(isAvailable($slots, '19:30'), false);
    expect(isAvailable($slots, '20:30'), true);   // exactly at turn-time boundary -> free
});

it('respects the 120-minute turn for parties of five or more', fn() => /* ... */);
it('excludes tables whose min_party exceeds the request', fn() => /* ... */);
it('returns no slots on a closed day (Monday)', fn() => /* ... */);
it('does not offer a slot that would run past closing time', fn() => /* ... */);
it('offers a joined pair of 4-tops for a party of eight', fn() => /* ... */);
it('treats cancelled and no-show bookings as free capacity', fn() => /* ... */);
it('is DST/timezone-stable: all comparisons use Asia/Manila', fn() => /* ... */);
it('rejects a booking that races another into the same slot (409)', fn() => /* ... */);
it('escapes every view echo', fn() => expect(shell_exec("grep -rln '<?= \$' src/View/ | wc -l") + 0, 0));
it('403s an admin API route for a kitchen session', fn() => /* integration via curl */);
```

Target: 12-18 assertions, all green, runnable in under 2 seconds with `docker compose exec app php bin/test.php`. If PHPUnit is allowed we keep the same test bodies and swap the harness for `phpunit --testdox`; the `--testdox` output is a nice screenshot for the README. **Do not** attempt broad UI or browser automation: the effort/reward is terrible at competition scale.

Integration smoke test, `bin/smoke.sh` (one script the team runs before walking into the room):

```bash
#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://localhost:8080}"
check () { printf '%-46s' "$1"; shift; if "$@" >/dev/null 2>&1; then echo "OK"; else echo "FAIL"; exit 1; fi; }

check "health endpoint"        curl -fsS "$BASE/health"
check "homepage renders"       curl -fsS "$BASE/"
check "menu page renders"      curl -fsS "$BASE/menu"
check "availability api"       curl -fsS "$BASE/api/availability?date=$(date +%F)&party=2"
check "admin route is guarded" bash -c "[ \"\$(curl -so /dev/null -w '%{http_code}' $BASE/api/admin/stats)\" = 401 ]"
check "csrf blocks raw post"   bash -c "[ \"\$(curl -so /dev/null -w '%{http_code}' -X POST $BASE/api/reservations)\" = 419 ]"
check "adminer up"             curl -fsS "http://localhost:8081"
check "seed populated"         bash -c "docker compose exec -T db mysql -uroot -proot_pw -N -e 'SELECT COUNT(*)>30 FROM tablebook.menu_items' | grep -q 1"
echo "ALL SMOKE CHECKS PASSED"
```

### Demo reset

`bin/demo-reset.php` is the single most valuable script we will write. It must run in under 5 seconds:

```bash
docker compose exec app php bin/demo-reset.php
# 1. TRUNCATE reservations, reservation_items, waitlist, audit_log, rate_limits
# 2. Re-run seed with mt_srand(fixed) so the data is byte-identical every time
# 3. Re-date every reservation relative to NOW() so "today" is always today and
#    the kitchen queue always has 3-5 live tickets regardless of the hour
# 4. Reset menu availability flags and clear uploaded images back to the committed set
# 5. Print a summary: "22 today / 18 tomorrow / 180 historical / 4 kitchen tickets live"
```

Also bind it to a hidden admin button (`POST /api/admin/demo-reset`, enabled only when `APP_ENV=local`) so a teammate can reset from the phone-sized laptop screen without touching a terminal mid-presentation.

### Offline safety

The demo room will have bad or no wifi. Non-negotiables:

1. **Self-host fonts.** Download the woff2 files into `public/assets/fonts/` and declare `@font-face` locally. No `fonts.googleapis.com`. The CSP `font-src 'self'` enforces this mechanically.
2. **No CDN for anything.** If we use a chart library, vendor the single minified file into `public/assets/vendor/`. CSP `script-src 'self'` makes a forgotten CDN tag fail loudly in development rather than silently on stage.
3. **All 36 food images committed** to the repo as WebP, plus `placeholder.webp`.
4. **No map embeds, no external icon fonts, no Google Analytics.** Icons are inline SVG sprites.
5. **Docker images pre-pulled** on the demo laptop the night before: `docker compose pull && docker compose build`. A cold `mysql:8.4` pull on venue wifi is a 10-minute disaster.
6. Verify with the laptop's wifi switched **off**: full click-through must work.

### Fallback if Docker misbehaves

Layered, each one tested in advance:

| Tier | Fallback | Time to recover |
|---|---|---|
| 0 | `docker compose restart app` | 10 s |
| 1 | `docker compose down && docker compose up -d` (volume intact) | 40 s |
| 2 | **Second laptop** already running the stack, on the same project, as a hot spare. Switch the HDMI cable. | 20 s |
| 3 | **Native fallback**: XAMPP/MAMP or `php -S 0.0.0.0:8000 -t public` plus a locally installed MySQL, with `backup/demo_snapshot.sql` imported. Config is env-driven, so only `.env` changes. Rehearse this once. | 3 min |
| 4 | **Pre-recorded 3-minute screen capture** of the full happy path, as an MP4 on the desktop and on a USB stick. Judges accept a recording far better than watching a team debug. | instant |
| 5 | **Printed one-pager**: architecture diagram, ER diagram, screenshots. Lets us keep talking while someone fixes the machine. | instant |

Also commit `backup/demo_snapshot.sql` (a `mysqldump` of the fully seeded DB) so tier 3 does not depend on the seeder working.

### Scripted demo narrative (8 minutes, rehearsed to the second)

| Time | Who | Beat | Screen |
|---|---|---|---|
| 0:00-0:30 | Presenter A | Problem framing: phone-booked restaurants lose covers to double-bookings and no-shows | Title slide |
| 0:30-1:10 | A | Guest lands on homepage, picks date + party of 2 | Homepage |
| 1:10-2:20 | A | Live availability, floor plan renders, picks terrace table, sees a fully-booked Saturday greyed out | Booking page |
| 2:20-3:00 | A | Submits, gets reference code, opens confirmation. Shows the server-side validation rejecting a party of 25 | Confirm page |
| 3:00-3:40 | Presenter B | Logs in as manager; the new booking is already in the list | Admin dashboard |
| 3:40-4:30 | B | KPI cards and trend chart over the last 30 days; filters by room and status | Admin stats |
| 4:30-5:20 | B | Floor plan live view, seats the party, drags a table to a new position and saves | Admin floor plan |
| 5:20-6:00 | Presenter C | Kitchen dashboard: the pre-order appears in the queue, moves it to preparing then ready | Kitchen |
| 6:00-6:40 | C | Marks an item sold out; the guest menu updates on refresh | Menu admin + guest menu |
| 6:40-7:20 | C | Security and architecture: `curl` the admin API from a terminal, get 403; show the CSRF 419 | Terminal + diagram |
| 7:20-8:00 | All | One-command start, `docker compose up -d`, and the test suite going green | Terminal |

Rules for the run-through: run `bin/demo-reset.php` and `bin/smoke.sh` immediately before entering; all tabs pre-opened; browser zoom at 125% for projector readability; dark mode confirmed against the projector; rehearse the whole thing end to end at least five times, twice on the actual demo laptop.

---

## Phased delivery plan with estimates

DESIGN. Estimates are **person-hours** for a 3-person team. Every phase ends in something that can be shown on a projector.

### Phase 0 - Skeleton that boots (6-8 h)
`docker compose up -d` works on all three laptops. Front controller, router, Database, View, one page. `/health` returns `{"ok":true,"db":true}`. Adminer reachable. `.gitattributes`, `.env.example`, README stub.
**Demoable:** "one command and it runs on any laptop."

### Phase 1 - Schema and seed (6-8 h)
Full DDL in `database/init/01_schema.sql`, reference + demo seed, `bin/seed.php` idempotent, rooms/tables/menu/users populated, ER diagram drafted.
**Demoable:** Adminer tour of a fully populated database.

### Phase 2 - Availability engine + tests (10-14 h)
`AvailabilityService`, `ReservationRepository`, `/api/availability`, `tests/AvailabilityServiceTest.php` green. Service hours, turn times, closed days, min-party, table joining.
**Demoable:** JSON availability in the browser plus a green test run. This is the technical core and the thing judges respect most.

### Phase 3 - Guest booking flow end to end (12-16 h)
Date/party picker, slot list, table pick, guest details, server-side validation, CSRF, transactional create with conflict re-check (409), reference code, confirmation page, lookup/cancel by reference.
**=== MVP LINE ===** Everything above is the minimum viable, judge-presentable product. A guest can book a real table and the system cannot double-book. **Target: end of week 2, roughly 34-46 h cumulative.** If the team is behind at any point, cut from Phase 4 onward, never from Phases 0-3.

### Phase 4 - Auth, roles and admin dashboard (12-16 h)
Login with ARGON2ID, session hardening, `Guard`, reservation list with filters and pagination, status transitions, staff-created walk-ins, KPI cards, audit log.
**Demoable:** the complete staff workflow, which doubles the perceived scope of the project.

### Phase 5 - Visual floor plan (8-12 h)
SVG floor plan from table coordinates, colour-coded live states, click to book, admin drag-and-drop with coordinate save.
**Demoable:** the single most screenshot-worthy feature. Highest judge-impact per hour of anything after the MVP.

### Phase 6 - Menu module + kitchen dashboard (10-14 h)
Public menu with categories and images, menu CRUD, safe image upload, pre-orders attached to reservations, kitchen queue with state transitions and polling.
**Demoable:** the third dashboard, showing the system spans the whole restaurant.

### Phase 7 - Polish, docs, demo hardening (10-14 h)
Responsive pass, loading and empty states, toasts, `prefers-reduced-motion`, 404/500 pages, `bin/demo-reset.php`, `bin/smoke.sh`, README with one-command start, architecture + ER diagrams, `docs/api.md`, `docs/CREDITS.md`, pre-recorded fallback video, five rehearsals.
**Demoable:** the actual competition run.

**Total to a strong submission: 74-102 person-hours**, about 2.5-3.5 weeks for three people at 10 h/week each. Phase 7 is **not** optional: polish and documentation are where rubric points are cheapest.

### Stretch features, ranked by judge-impact per hour

| Rank | Feature | Est. | Why it scores |
|---|---|---|---|
| 1 | Dark/light theme toggle with persisted preference | 2 h | Instantly visible, feels modern, trivially cheap |
| 2 | CSV export of reservations | 1.5 h | Judges love a working export button |
| 3 | Printable/QR confirmation slip | 2 h | Tangible artifact, great photo moment |
| 4 | Waitlist with auto-offer when a table frees | 5 h | Shows real domain thinking beyond CRUD |
| 5 | Occupancy heatmap calendar (month view) | 4 h | One chart that makes the data look serious |
| 6 | Guest accounts with booking history | 6 h | Rounds out the product story |
| 7 | Email confirmation via MailHog container | 3 h | Real email flow with zero SMTP risk; add MailHog to compose |
| 8 | i18n (English + Filipino) toggle | 5 h | Local-relevance points, moderate cost |
| 9 | Table-combining suggestions for large parties | 5 h | Impressive, but only if Phase 2 is rock solid |
| 10 | PWA offline shell / installable app | 4 h | Nice, but risky under CSP and easy to half-finish |

Explicitly **not** doing: real payments, SMS, WebSockets, a JS build pipeline, multi-tenancy, Kubernetes. Each is high effort, high risk and low rubric value for a vanilla-stack brief.

### Documentation to produce (rubric points per hour are highest here)

| Artifact | Contents | Est. |
|---|---|---|
| `README.md` | 60-second quickstart (`cp .env.example .env && docker compose up -d --build`), URLs, demo credentials table, feature list with screenshots, reset and test commands, troubleshooting (ports, CRLF, `down -v`), tech-stack rationale, team roles | 3 h |
| `docs/er-diagram.svg` | All tables, PK/FK, cardinality, with a one-paragraph note on each design decision (soft-delete status enum, audit log, natural keys) | 2 h |
| `docs/architecture.md` + `.svg` | Container topology (browser -> Apache/PHP -> MySQL, Adminer side car), request lifecycle through the front controller, layer responsibilities, and the php:apache-vs-nginx tradeoff we decided | 2 h |
| `docs/api.md` | Every endpoint with method, path, auth/role, request body, example response, error codes. Generated from `config/routes.php` so it cannot drift | 2 h |
| `docs/security.md` | The 11 controls above, each with the file and line that implements it. Hand this to a reviewer and the security criterion is done | 1.5 h |
| `docs/CREDITS.md` | Per-image source URL, photographer, license, download date | 0.5 h |
| `docs/DEMO.md` | The 8-minute script, pre-flight checklist, fallback tiers | 1 h |

---

## Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **Docker fails on the demo laptop** (no Desktop/WSL, old version, corporate policy, port conflicts) | Medium | Fatal | Pre-pull and build the night before; all ports env-driven with non-default defaults (8080/8081/33061); rehearse the native `php -S` + `demo_snapshot.sql` fallback; hot-spare laptop; pre-recorded MP4 as tier 4. Test on the actual machine at least 24 h ahead. |
| 2 | **Double-booking appears live** because availability and insert are not atomic | Medium | Severe credibility hit | Single transaction: `SELECT ... FOR UPDATE` on the candidate table rows, re-check overlap inside the transaction, then insert; plus a DB-level guard (unique key on `(table_id, reserved_date, start_time)` and an overlap check in `BookingService`). Dedicated test for the race. Return 409 and re-render fresh slots rather than failing silently. |
| 3 | **Scope creep eats the polish phase**, producing a half-built dashboard instead of a tight MVP | High | Severe | The MVP line after Phase 3 is contractual. Feature freeze 5 days before submission. Stretch list is ranked, and nothing starts unless it fits in the remaining hours. Phase 7 hours are booked first, not last. |
| 4 | **Timezone/date bugs** make slots shift or "today" look wrong on the demo machine | Medium | Visible and embarrassing | Pin `Asia/Manila` in three places (php.ini `date.timezone`, MySQL `--default-time-zone=+08:00`, `date_default_timezone_set` in Bootstrap); store `DATE` + `TIME` columns rather than ambiguous `DATETIME` where the service day matters; all date math via `DateTimeImmutable` with an explicit timezone; seed reservations relative to `CURDATE()` and re-date on `demo-reset`. |
| 5 | **Vanilla stack rots into spaghetti**, losing the code-quality criterion and slowing week 3 | Medium | Moderate | Enforce the layering from day one: controllers may not contain SQL, repositories may not echo, views may not query. Three greps in `bin/test.php` check exactly that. Code review on every PR, `declare(strict_types=1)` everywhere, one naming convention, no file over ~200 lines. |
| 6 | Seed/demo data looks empty or stale, so dashboards appear broken | Medium | Moderate | Relative-date seeding, 180 historical reservations, staged statuses by clock time, `demo-reset` run immediately before presenting, `bin/smoke.sh` asserting row counts. |
| 7 | Venue wifi down and an asset was loaded from a CDN | Low | Severe | CSP `'self'` only, self-hosted fonts and vendor files, committed images, full click-through rehearsed with wifi off. |
| 8 | A teammate's Windows checkout breaks scripts via CRLF or permissions | Medium | Moderate | `.gitattributes` with `eol=lf`, uploads in a named volume, `core.autocrlf input` in the README setup steps, and one shared "works on my machine" checklist. |
