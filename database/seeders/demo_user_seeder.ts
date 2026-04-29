import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import { APPROVAL_STATUSES, USER_ROLES } from '#models/user'
import Vehicle from '#models/vehicle'

/**
 * Usuario local/demo para panel (Docker y dev). Idempotente.
 * Email: demo@local.test — contraseña: demo1234
 */
export default class extends BaseSeeder {
  async run() {
    const email = 'demo@local.test'
    const existing = await User.findBy('email', email)
    if (existing) {
      existing.merge({
        role: USER_ROLES.ADMIN,
        approvalStatus: APPROVAL_STATUSES.APPROVED,
      })
      await existing.save()
    } else {
      await User.create({
        email,
        fullName: 'Usuario demo',
        password: 'demo1234',
        role: USER_ROLES.ADMIN,
        approvalStatus: APPROVAL_STATUSES.APPROVED,
      })
    }

    const fleet = [
      { code: 'MC-01', name: 'Motocarrucha 01' },
      { code: 'MC-02', name: 'Motocarrucha 02' },
    ]
    for (const unit of fleet) {
      const found = await Vehicle.findBy('code', unit.code)
      if (!found) {
        await Vehicle.create(unit)
      }
    }

    const repEmail = 'repartidor@local.test'
    const repExisting = await User.findBy('email', repEmail)
    if (repExisting) {
      repExisting.merge({
        role: USER_ROLES.DRIVER,
        approvalStatus: APPROVAL_STATUSES.APPROVED,
      })
      await repExisting.save()
    } else {
      await User.create({
        email: repEmail,
        fullName: 'Repartidor demo',
        password: 'repartidor1234',
        role: USER_ROLES.DRIVER,
        approvalStatus: APPROVAL_STATUSES.APPROVED,
      })
    }
  }
}
