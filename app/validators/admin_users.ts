import vine from '@vinejs/vine'
import { USER_ROLES } from '#models/user'

const password = () => vine.string().minLength(8).maxLength(64)

export const adminCreateUserValidator = vine.create({
  fullName: vine.string().trim().minLength(2).maxLength(120).nullable(),
  email: vine.string().trim().email().maxLength(254).unique({ table: 'users', column: 'email' }),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
  role: vine.enum([USER_ROLES.ADMIN, USER_ROLES.SUPERVISOR, USER_ROLES.DRIVER] as const),
})
