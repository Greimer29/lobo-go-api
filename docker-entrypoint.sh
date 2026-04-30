#!/bin/sh
set -e
# Migration and seeder execution disabled — server starts immediately.
# To re-enable, set RUN_MIGRATIONS_ON_BOOT=true or RUN_DEMO_SEED_ON_BOOT=true
# and uncomment the blocks below.
#
# if [ "${RUN_MIGRATIONS_ON_BOOT:-false}" = "true" ]; then
#   node build/ace.js migration:run --force
# fi
# if [ "${RUN_DEMO_SEED_ON_BOOT:-false}" = "true" ]; then
#   node build/ace.js db:seed --files database/seeders/demo_user_seeder
# fi
exec "$@"
