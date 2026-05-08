import { TRANSPORT_FEEDBACK_REACTIONS } from '#constants/transport_feedback'
import vine from '@vinejs/vine'

export const claimTrackingOrderValidator = vine.create({
  numeroDocumento: vine.string().trim().minLength(1).maxLength(64),
})

export const storeTransportObservationValidator = vine.create({
  body: vine.string().trim().minLength(1).maxLength(2000),
})

export const updateTransportReactionValidator = vine.create({
  numeroDocumento: vine.string().trim().minLength(1).maxLength(64),
  reaction: vine.enum(TRANSPORT_FEEDBACK_REACTIONS).nullable(),
})

export const updateDestinationValidator = vine.create({
  numeroDocumento: vine.string().trim().minLength(1).maxLength(64),
  destinationAddress: vine.string().trim().maxLength(500).nullable(),
  googleMapsLink: vine.string().trim().maxLength(1200).optional(),
  destinationLat: vine.number().min(-90).max(90).optional(),
  destinationLng: vine.number().min(-180).max(180).optional(),
  destinationSource: vine.enum(['admin_map', 'admin_link', 'admin_address']).optional(),
  destinationNote: vine.string().trim().maxLength(500).nullable(),
})
