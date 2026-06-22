FROM mirror.gcr.io/library/php:8.3-apache

RUN a2enmod rewrite headers

WORKDIR /var/www/html

COPY . .

RUN mkdir -p storage/exports && chown -R www-data:www-data storage

COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf

EXPOSE 80
