import TrackingOrder from '#models/tracking_order'
import User, { APPROVAL_STATUSES, USER_ROLES } from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class AdminStatsController {
  async users({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (!user.isAdmin) {
      return response.forbidden({ message: 'Acceso restringido a administradores' })
    }

    const [
      totalUsers,
      totalAdmins,
      totalSupervisors,
      totalDrivers,
      pendingApprovalUsers,
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedOrders,
    ] = await Promise.all([
      User.query().count('* as total').first(),
      User.query().where('role', USER_ROLES.ADMIN).count('* as total').first(),
      User.query().where('role', USER_ROLES.SUPERVISOR).count('* as total').first(),
      User.query().where('role', USER_ROLES.DRIVER).count('* as total').first(),
      User.query().where('approvalStatus', APPROVAL_STATUSES.PENDING).count('* as total').first(),
      TrackingOrder.query().count('* as total').first(),
      TrackingOrder.query().where('status', 0).count('* as total').first(),
      TrackingOrder.query().where('status', 1).count('* as total').first(),
      TrackingOrder.query().where('status', 2).count('* as total').first(),
    ])

    const drivers = await User.query().where('role', USER_ROLES.DRIVER)
    const driversByApproval = drivers.reduce(
      (acc, row) => {
        const key = row.approvalStatus || 'unknown'
        acc[key] = (acc[key] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return response.ok({
      users: {
        total: Number(totalUsers?.$extras.total ?? 0),
        admins: Number(totalAdmins?.$extras.total ?? 0),
        supervisors: Number(totalSupervisors?.$extras.total ?? 0),
        drivers: Number(totalDrivers?.$extras.total ?? 0),
        pendingApproval: Number(pendingApprovalUsers?.$extras.total ?? 0),
        driversByApproval,
      },
      orders: {
        total: Number(totalOrders?.$extras.total ?? 0),
        pending: Number(pendingOrders?.$extras.total ?? 0),
        inProgress: Number(inProgressOrders?.$extras.total ?? 0),
        completed: Number(completedOrders?.$extras.total ?? 0),
      },
    })
  }
}
