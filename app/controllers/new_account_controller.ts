import User from '#models/user'
import { APPROVAL_STATUSES, USER_ROLES } from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import { DateTime } from 'luxon'

export default class NewAccountController {
  async store({ request, serialize }: HttpContext) {
    const { fullName, email, password, avatarUrl } = await request.validateUsing(signupValidator)

    const user = await User.create({
      fullName,
      email,
      password,
      avatarUrl: avatarUrl ?? null,
      role: USER_ROLES.DRIVER,
      approvalStatus: APPROVAL_STATUSES.PENDING,
      approvedAt: null,
      approvedBy: null,
    })

    return serialize({
      user: UserTransformer.transform(user),
      status: 'pending_approval',
      message:
        'Tu solicitud de registro fue enviada y está pendiente de aprobación por un administrador.',
      requestedAt: DateTime.now().toISO(),
    })
  }
}
