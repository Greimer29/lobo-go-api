import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Compatibilidad: puede existir en `adonis_schema` sin archivo en el repo.
 * La columna `vehicles.image_url` la define `1769205000000_add_vehicle_image_url`.
 * Este archivo permite `migration:rollback` / `migration:refresh` sin error.
 */
export default class extends BaseSchema {
  async up() {
    /* no-op: ver 1769205000000_add_vehicle_image_url */
  }

  async down() {
    /* no-op */
  }
}
