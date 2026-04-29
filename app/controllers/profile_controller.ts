import UserTransformer from '#transformers/user_transformer'
import TrackingOrder from '#models/tracking_order'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  async show({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()

    const [totalOrders, pendingOrders, inProgressOrders, completedOrders] = await Promise.all([
      TrackingOrder.query().count('* as total').first(),
      TrackingOrder.query().where('status', 0).count('* as total').first(),
      TrackingOrder.query().where('status', 1).count('* as total').first(),
      TrackingOrder.query().where('status', 2).count('* as total').first(),
    ])

    return serialize({
      user: UserTransformer.transform(user),
      metrics: {
        totalOrders: Number(totalOrders?.$extras.total ?? 0),
        pendingOrders: Number(pendingOrders?.$extras.total ?? 0),
        inProgressOrders: Number(inProgressOrders?.$extras.total ?? 0),
        completedOrders: Number(completedOrders?.$extras.total ?? 0),
      },
    })
  }
}
