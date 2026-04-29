import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'

export const USER_ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  DRIVER: 'driver',
} as const

export const APPROVAL_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  static accessTokens = DbAccessTokensProvider.forModel(User)
  declare currentAccessToken?: AccessToken

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }

  get isAdmin() {
    return this.role === USER_ROLES.ADMIN
  }

  /** Observaciones del traslado (modal CRUD): admin o supervisor. */
  get canManageTransportFeedback() {
    return this.role === USER_ROLES.ADMIN || this.role === USER_ROLES.SUPERVISOR
  }

  /** Asignar o quitar reacción al traslado: solo administrador. */
  get canAssignTransportReaction() {
    return this.role === USER_ROLES.ADMIN
  }

  get isDriver() {
    return this.role === USER_ROLES.DRIVER
  }

  get isApproved() {
    return this.approvalStatus === APPROVAL_STATUSES.APPROVED
  }
}
