import type { PedidoCompuesto } from '#services/sadev_service'
import saDevService from '#services/sadev_service'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

type FailedInvoiceRow = {
  invoice: PedidoCompuesto
  attemptCount: number
  nextAttemptAt: string
  lastError: string
}

type BridgeState = {
  lastSuccessfulSyncAt: string | null
}

const BRIDGE_DIR = app.makePath('_bridge_queue')
const FAILED_QUEUE_PATH = app.makePath('_bridge_queue', 'failed_invoices.json')
const STATE_PATH = app.makePath('_bridge_queue', 'state.json')
const LOG_PATH = app.makePath('storage', 'logs', 'bridge.log')

class BridgeService {
  private async ensureBridgeDirs() {
    await mkdir(BRIDGE_DIR, { recursive: true })
    await mkdir(app.makePath('storage', 'logs'), { recursive: true })
  }

  private async writeLog(message: string) {
    await this.ensureBridgeDirs()
    const line = `[${DateTime.now().toISO()}] ${message}\n`
    let current = ''
    try {
      current = await readFile(LOG_PATH, 'utf8')
    } catch {}
    await writeFile(LOG_PATH, current + line, 'utf8')
  }

  private async readJsonFile<T>(path: string, fallback: T): Promise<T> {
    try {
      const raw = await readFile(path, 'utf8')
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }

  private async writeJsonFile(path: string, payload: unknown) {
    await this.ensureBridgeDirs()
    await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  }

  private maxRetries() {
    const value = env.get('BRIDGE_MAX_RETRIES')
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.min(10, Math.max(1, Math.trunc(value)))
    }
    return 5
  }

  private pullLimit() {
    const value = env.get('BRIDGE_PULL_LIMIT')
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.min(500, Math.max(1, Math.trunc(value)))
    }
    return 100
  }

  private railwayBaseUrl() {
    return (
      env.get('BRIDGE_RAILWAY_BASE_URL')?.trim() ||
      env.get('PUBLIC_TRACKING_BASE_URL')?.trim() ||
      ''
    )
  }

  private railwayApiKey() {
    return env.get('BRIDGE_RAILWAY_API_KEY')?.trim() || env.get('PUBLIC_TRACKING_API_KEY')?.trim() || ''
  }

  private async readState(): Promise<BridgeState> {
    return this.readJsonFile<BridgeState>(STATE_PATH, {
      lastSuccessfulSyncAt: null,
    })
  }

  private async saveState(state: BridgeState) {
    await this.writeJsonFile(STATE_PATH, state)
  }

  private async readFailedQueue() {
    return this.readJsonFile<FailedInvoiceRow[]>(FAILED_QUEUE_PATH, [])
  }

  private async saveFailedQueue(rows: FailedInvoiceRow[]) {
    await this.writeJsonFile(FAILED_QUEUE_PATH, rows)
  }

  private backoffSeconds(attemptCount: number) {
    // 1s, 2s, 4s, 8s, 16s, 32s
    return Math.min(32, 2 ** Math.max(0, attemptCount - 1))
  }

  async fetchPendingInvoicesFromSqlServer(): Promise<PedidoCompuesto[]> {
    const state = await this.readState()
    await this.writeLog(
      `fetchPendingInvoicesFromSqlServer start lastSuccessfulSyncAt=${state.lastSuccessfulSyncAt ?? 'null'}`
    )

    const rows = await saDevService.listPedidosCompuestos({
      limit: this.pullLimit(),
      corporateStatuses: [0, 1],
      excludeDeliveredCorporateRows: true,
      excludeHandoffCorporateRows: false,
    })

    await this.writeLog(`fetchPendingInvoicesFromSqlServer ok rows=${rows.length}`)
    return rows
  }

  async pushToRailway(invoice: PedidoCompuesto) {
    const baseUrl = this.railwayBaseUrl()
    if (!baseUrl) {
      throw new Error('BRIDGE_RAILWAY_BASE_URL o PUBLIC_TRACKING_BASE_URL no configurada')
    }

    const apiKey = this.railwayApiKey()
    if (!apiKey) {
      throw new Error('BRIDGE_RAILWAY_API_KEY o PUBLIC_TRACKING_API_KEY no configurada')
    }

    const target = `${baseUrl.replace(/\/+$/, '')}/api/v1/internal/orders/from-corporate`
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-bridge-api-key': apiKey,
      },
      body: JSON.stringify({ invoice }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${body}`)
    }

    await this.writeLog(`pushToRailway ok numeroDocumento=${invoice.numeroDocumento}`)
  }

  async handleRetry(invoice: PedidoCompuesto, error: unknown, attemptCount = 1) {
    const message = error instanceof Error ? error.message : String(error)
    const nextAttemptAt = DateTime.now().plus({ seconds: this.backoffSeconds(attemptCount) }).toISO()!

    const queue = await this.readFailedQueue()
    queue.push({
      invoice,
      attemptCount,
      nextAttemptAt,
      lastError: message,
    })
    await this.saveFailedQueue(queue)

    await this.writeLog(
      `handleRetry queued numeroDocumento=${invoice.numeroDocumento} attempts=${attemptCount} nextAttemptAt=${nextAttemptAt} error=${message}`
    )
  }

  private async processQueue() {
    const now = DateTime.now()
    const maxRetries = this.maxRetries()
    const queue = await this.readFailedQueue()
    const keep: FailedInvoiceRow[] = []

    for (const row of queue) {
      const due = DateTime.fromISO(row.nextAttemptAt)
      if (!due.isValid || due > now) {
        keep.push(row)
        continue
      }

      if (row.attemptCount > maxRetries) {
        await this.writeLog(
          `processQueue drop numeroDocumento=${row.invoice.numeroDocumento} attempts=${row.attemptCount} reason=max_retries`
        )
        continue
      }

      try {
        await this.pushToRailway(row.invoice)
      } catch (error) {
        const nextAttempt = row.attemptCount + 1
        if (nextAttempt > maxRetries) {
          await this.writeLog(
            `processQueue exhausted numeroDocumento=${row.invoice.numeroDocumento} attempts=${nextAttempt}`
          )
          continue
        }
        const nextRetryAt = DateTime.now().plus({ seconds: this.backoffSeconds(nextAttempt) }).toISO()!
        keep.push({
          invoice: row.invoice,
          attemptCount: nextAttempt,
          nextAttemptAt: nextRetryAt,
          lastError: error instanceof Error ? error.message : String(error),
        })
        await this.writeLog(
          `processQueue retry numeroDocumento=${row.invoice.numeroDocumento} attempts=${nextAttempt} nextAttemptAt=${nextRetryAt}`
        )
      }
    }

    await this.saveFailedQueue(keep)
  }

  async runCycle() {
    await this.processQueue()
    const invoices = await this.fetchPendingInvoicesFromSqlServer()
    let sent = 0
    for (const invoice of invoices) {
      try {
        await this.pushToRailway(invoice)
        sent++
      } catch (error) {
        await this.handleRetry(invoice, error, 1)
      }
    }

    await this.saveState({
      lastSuccessfulSyncAt: DateTime.now().toISO(),
    })
    await this.writeLog(`runCycle complete sent=${sent} fetched=${invoices.length}`)

    return {
      fetched: invoices.length,
      sent,
    }
  }

  intervalSeconds() {
    const value = env.get('BRIDGE_INTERVAL_SECONDS')
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.max(5, Math.min(300, Math.trunc(value)))
    }
    return 30
  }
}

export default new BridgeService()
