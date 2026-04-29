#!/bin/sh
set -e
if [ "${RUN_MIGRATIONS_ON_BOOT:-true}" = "true" ]; then
  node build/ace.js migration:run --force
fi
if [ "${RUN_DEMO_SEED_ON_BOOT:-false}" = "true" ]; then
  node build/ace.js db:seed --files database/seeders/demo_user_seeder
fi
exec "$@"
