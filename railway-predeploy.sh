#!/bin/sh
# Railway pre-deploy: corre en el contenedor antes del tráfico nuevo.
# Migraciones + seeders demo (solo si RUN_DEMO_SEED_ON_BOOT=true).
set -e
cd /app || exit 1
node build/ace.js migration:run --force
if [ "${RUN_DEMO_SEED_ON_BOOT:-false}" = "true" ]; then
  node build/ace.js db:seed --files database/seeders/demo_user_seeder
  node build/ace.js db:seed --files database/seeders/warehouse_seeder
fi
