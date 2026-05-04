class TrackingPublicReconcileService {
  async pullEventsFromPublic(sinceIso?: string) {
    return {
      applied: 0,
      skipped: true,
      reason: `Reconcile legacy desactivado${sinceIso ? ` (since=${sinceIso})` : ''}`,
    }
  }

  async pullLocationsFromPublic(sinceIso?: string) {
    return this.pullEventsFromPublic(sinceIso)
  }
}

export default new TrackingPublicReconcileService()
