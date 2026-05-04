import Warehouse from '#models/warehouse'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

const warehouseCreateValidator = vine.compile(
  vine.object({
    code: vine.string().trim().minLength(1).maxLength(10),
    name: vine.string().trim().minLength(1).maxLength(100),
    address: vine.string().trim().maxLength(255).optional().nullable(),
    latitude: vine.number().min(-90).max(90).optional().nullable(),
    longitude: vine.number().min(-180).max(180).optional().nullable(),
    isActive: vine.boolean().optional(),
  })
)

const warehouseUpdateValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
    address: vine.string().trim().maxLength(255).optional().nullable(),
    latitude: vine.number().min(-90).max(90).optional().nullable(),
    longitude: vine.number().min(-180).max(180).optional().nullable(),
    isActive: vine.boolean().optional(),
  })
)

export default class AdminWarehousesController {
  /**
   * GET /api/v1/admin/warehouses
   * Lista todos los depósitos (activos e inactivos), ordenados por código.
   */
  async index({ response }: HttpContext) {
    const warehouses = await Warehouse.query().orderBy('code', 'asc')
    return response.ok({ data: warehouses })
  }

  /**
   * GET /api/v1/admin/warehouses/:id
   */
  async show({ params, response }: HttpContext) {
    const warehouse = await Warehouse.find(params.id)
    if (!warehouse) {
      return response.notFound({ message: 'Depósito no encontrado' })
    }
    return response.ok({ data: warehouse })
  }

  /**
   * POST /api/v1/admin/warehouses
   * Crea un depósito nuevo. El código debe ser único.
   */
  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(warehouseCreateValidator)

    const existing = await Warehouse.findBy('code', payload.code)
    if (existing) {
      return response.conflict({
        message: `Ya existe un depósito con código ${payload.code}`,
      })
    }

    const warehouse = await Warehouse.create({
      code: payload.code,
      name: payload.name,
      address: payload.address ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      isActive: payload.isActive ?? true,
    })

    return response.created({ data: warehouse })
  }

  /**
   * PUT /api/v1/admin/warehouses/:id
   * Actualiza un depósito existente. NO permite cambiar el código
   * (porque rompería la relación con SQL Server).
   */
  async update({ params, request, response }: HttpContext) {
    const warehouse = await Warehouse.find(params.id)
    if (!warehouse) {
      return response.notFound({ message: 'Depósito no encontrado' })
    }

    const payload = await request.validateUsing(warehouseUpdateValidator)

    warehouse.merge({
      name: payload.name ?? warehouse.name,
      address: payload.address !== undefined ? payload.address : warehouse.address,
      latitude: payload.latitude !== undefined ? payload.latitude : warehouse.latitude,
      longitude: payload.longitude !== undefined ? payload.longitude : warehouse.longitude,
      isActive: payload.isActive ?? warehouse.isActive,
    })

    await warehouse.save()
    return response.ok({ data: warehouse })
  }

  /**
   * DELETE /api/v1/admin/warehouses/:id
   * Soft delete: marca como inactivo. NO elimina físicamente para
   * preservar referencias en pedidos históricos.
   */
  async destroy({ params, response }: HttpContext) {
    const warehouse = await Warehouse.find(params.id)
    if (!warehouse) {
      return response.notFound({ message: 'Depósito no encontrado' })
    }

    warehouse.isActive = false
    await warehouse.save()

    return response.ok({
      message: 'Depósito desactivado',
      data: warehouse,
    })
  }
}
