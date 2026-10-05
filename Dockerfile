FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql opcache \
    && a2enmod rewrite headers

COPY docker/apache.conf /etc/apache2/conf-available/tablebook.conf
RUN a2enconf tablebook \
    && sed -ri 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/*.conf

COPY docker/php.ini /usr/local/etc/php/conf.d/99-tablebook.ini
WORKDIR /var/www/html
COPY . .
