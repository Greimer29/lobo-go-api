class TrackingPublicSyncService {
  async flushOutbound(limit = 50) {
    return {
      sent: 0,
      failed: 0,
      skipped: true,
      reason: `Outbound legacy desactivado (limit=${limit})`,
    }
  }
}

export default new TrackingPublicSyncService()
