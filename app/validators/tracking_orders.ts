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
  googleMapsLink: vine.string().trim().minLength(1).maxLength(1200),
})
