/** Reacciones tipo Facebook/Instagram (traslado). */
export const TRANSPORT_FEEDBACK_REACTIONS = [
  'like',
  'love',
  'care',
  'haha',
  'wow',
  'sad',
  'angry',
] as const

export type TransportFeedbackReaction = (typeof TRANSPORT_FEEDBACK_REACTIONS)[number]
