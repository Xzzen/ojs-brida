#!/usr/bin/env bash
set -e

PORT="${PORT:-10000}"

# Bind Apache dynamically to Render's $PORT
sed -ri "s/Listen 80/Listen ${PORT}/g" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/g" /etc/apache2/sites-available/000-default.conf

# If Aiven / Cloud MySQL CA certificate content is provided via env var, write it to disk
if [ -n "${MYSQL_ATTR_SSL_CA_CONTENT}" ]; then
  printf "%s\n" "${MYSQL_ATTR_SSL_CA_CONTENT}" > /tmp/cloud-db-ca.pem
  export MYSQL_ATTR_SSL_CA="/tmp/cloud-db-ca.pem"
fi

# Ensure APP_KEY is set in proper Laravel format
if [ -z "${APP_KEY}" ]; then
  export APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
fi

# Ensure storage symlink exists (for local disk fallback)
php artisan storage:link --force 2>/dev/null || true

# Clear stale caches so cloud environment variables take immediate effect
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

# Auto-run database migrations & idempotent initial seeding (never overwrites existing data)
if [ "${AUTO_MIGRATE:-true}" = "true" ]; then
  echo "[OJS-BRIDA] Menjalankan migrasi database cloud..."
  php artisan migrate --force
  echo "[OJS-BRIDA] Menjalankan CloudBootstrapSeeder (idempotent)..."
  php artisan db:seed --class=CloudBootstrapSeeder --force
fi

echo "[OJS-BRIDA] Backend Laravel siap melayani di port ${PORT}!"
exec apache2-foreground
