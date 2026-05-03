import User, { APPROVAL_STATUSES } from '#models/user'
import trackingPublicEventService from '#services/tracking_public_event_service'
import {
  TRACKING_EVENT_TYPES,
  createTrackingDomainEvent,
} from '#services/tracking_public_event_contract'
import { adminCreateUserValidator } from '#validators/admin_users'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

/** Objeto JSON plano (evita que el transformer no se serialice bien en `response.ok`). */
function userToListDto(user: User) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    approvalStatus: user.approvalStatus,
    approvedBy: user.approvedBy,
    approvedAt: user.approvedAt?.toISO() ?? null,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISO(),
    updatedAt: user.updatedAt?.toISO() ?? null,
    initials: user.initials,
  }
}

export default class AdminUsersController {
  private async emitUserSynced(user: User, metadata?: Record<string, unknown>) {
    const event = createTrackingDomainEvent(TRACKING_EVENT_TYPES.USER_UPSERTED, {
      source: 'internal',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        approvalStatus: user.approvalStatus,
        approvedBy: user.approvedBy,
        approvedAt: user.approvedAt?.toISO() ?? null,
        avatarUrl: user.avatarUrl,
        passwordHash: user.password,
        createdAt: user.createdAt.toISO(),
        updatedAt: user.updatedAt?.toISO() ?? user.createdAt.toISO(),
      },
      metadata: metadata ?? {},
    })
    await trackingPublicEventService.receiveInbound(event)
    await trackingPublicEventService.enqueueOutbound(event)
  }

  private ensureAdmin({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (!user.isAdmin) {
      response.forbidden({ message: 'Acceso restringido a administradores' })
      return null
    }
    return user
  }

  async index(ctx: HttpContext) {
    const admin = this.ensureAdmin(ctx)
    if (!admin) return

    const users = await User.query().orderBy('createdAt', 'desc')
    const data = users.map((u) => userToListDto(u))
    return ctx.response.ok({
      total: data.length,
      pending: users.filter((u) => u.approvalStatus === APPROVAL_STATUSES.PENDING).length,
      data,
    })
  }

  async store(ctx: HttpContext) {
    const admin = this.ensureAdmin(ctx)
    if (!admin) return

    const payload = await ctx.request.validateUsing(adminCreateUserValidator)
    const user = await User.create({
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      approvalStatus: APPROVAL_STATUSES.APPROVED,
      approvedBy: admin.id,
      approvedAt: DateTime.now(),
    })
    await this.emitUserSynced(user, {
      channel: 'admin:user-store',
      triggeredByUserId: admin.id,
    })

    return ctx.response.created({
      message: 'Usuario creado',
      data: user.serialize(),
    })
  }

  async approve(ctx: HttpContext) {
    const admin = this.ensureAdmin(ctx)
    if (!admin) return

    const id = Number(ctx.params.id)
    const user = await User.find(id)
    if (!user) {
      return ctx.response.notFound({ message: 'Usuario no encontrado' })
    }
    user.approvalStatus = APPROVAL_STATUSES.APPROVED
    user.approvedBy = admin.id
    user.approvedAt = DateTime.now()
    await user.save()
    await this.emitUserSynced(user, {
      channel: 'admin:user-approve',
      triggeredByUserId: admin.id,
    })

    return ctx.response.ok({
      message: 'Usuario aprobado',
      data: user.serialize(),
    })
  }

  async reject(ctx: HttpContext) {
    const admin = this.ensureAdmin(ctx)
    if (!admin) return

    const id = Number(ctx.params.id)
    const user = await User.find(id)
    if (!user) {
      return ctx.response.notFound({ message: 'Usuario no encontrado' })
    }
    user.approvalStatus = APPROVAL_STATUSES.REJECTED
    user.approvedBy = admin.id
    user.approvedAt = DateTime.now()
    await user.save()
    await this.emitUserSynced(user, {
      channel: 'admin:user-reject',
      triggeredByUserId: admin.id,
    })

    return ctx.response.ok({
      message: 'Usuario rechazado',
      data: user.serialize(),
    })
  }
}
