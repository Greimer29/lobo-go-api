import User from '#models/user'
import { APPROVAL_STATUSES } from '#models/user'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

export default class AccessTokenController {
  async store({ request, serialize, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)
    if (!user.isApproved) {
      if (user.approvalStatus === APPROVAL_STATUSES.PENDING) {
        return response.forbidden({
          message: 'Tu usuario está pendiente de aprobación por un administrador',
          code: 'USER_PENDING_APPROVAL',
        })
      }
      return response.forbidden({
        message: 'Tu usuario fue rechazado. Contacta a un administrador',
        code: 'USER_REJECTED',
      })
    }

    const token = await User.accessTokens.create(user)

    return serialize({
      user: UserTransformer.transform(user),
      token: token.value!.release(),
    })
  }

  async destroy({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }

    return {
      message: 'Logged out successfully',
    }
  }
}
