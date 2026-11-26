FROM php:8.2-apache

# Install system libraries & PHP extensions required by Laravel + OJS DOCX IMRAD Validator
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    unzip \
    curl \
    libzip-dev \
    libonig-dev \
    ca-certificates \
    && docker-php-ext-install pdo_mysql zip mbstring bcmath \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

# Raise PHP upload limits for 20MB PDF/DOCX manuscript uploads
RUN { \
    echo "upload_max_filesize=25M"; \
    echo "post_max_size=30M"; \
    echo "memory_limit=256M"; \
    echo "max_execution_time=120"; \
    } > /usr/local/etc/php/conf.d/ojs-uploads.ini

# Configure Apache DocumentRoot -> Laravel /public & non-root compatibility (Hugging Face Spaces + Render + Cloud Run)
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
ENV APACHE_RUN_DIR=/tmp
ENV APACHE_PID_FILE=/tmp/apache2.pid
ENV APACHE_LOCK_DIR=/tmp
ENV APACHE_LOG_DIR=/tmp

RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && sed -ri -e 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf \
    && sed -ri -e 's/Listen 80/Listen 7860/g' /etc/apache2/ports.conf \
    && sed -ri -e 's/<VirtualHost \*:80>/<VirtualHost *:7860>/g' /etc/apache2/sites-available/000-default.conf \
    && echo "ServerName localhost" >> /etc/apache2/apache2.conf \
    && chmod -R 777 /etc/apache2/ports.conf /etc/apache2/sites-available /var/run/apache2 /var/lock/apache2 /var/log/apache2

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy dependency manifests first for Docker layer caching
COPY composer.json composer.lock* ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

# Copy full application code
COPY . .

# Normalize line endings & ensure writable directories for non-root UID 1000
RUN sed -i 's/\r$//' /var/www/html/docker/start.sh \
    && chmod +x /var/www/html/docker/start.sh \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs storage/app/public/submissions bootstrap/cache \
    && chmod -R 777 storage bootstrap/cache public

EXPOSE 7860

CMD ["/var/www/html/docker/start.sh"]
