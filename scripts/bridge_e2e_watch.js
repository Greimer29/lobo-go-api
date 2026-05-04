import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import sql from 'mssql'

const timeoutSeconds = Number(process.argv[2] ?? 180)
const pollSeconds = Number(process.argv[3] ?? 10)

const cfg = {
  server: process.env.SQLSERVER_HOST,
  port: Number(process.env.SQLSERVER_PORT),
  database: process.env.SQLSERVER_DATABASE,
  user: process.env.SQLSERVER_USER,
  password: process.env.SQLSERVER_PASSWORD,
  options: {
    encrypt: String(process.env.SQLSERVER_ENCRYPT).toLowerCase() === 'true',
    trustServerCertificate: String(process.env.SQLSERVER_ENCRYPT).toLowerCase() !== 'true',
  },
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchPendingDoc(pool) {
  const q = await pool
    .request()
    .query('SELECT TOP 1 NumeroD, Status, Descrip FROM dbo.SADEV WHERE Status=0 ORDER BY NumeroD DESC')
  return q.recordset[0] ?? null
}

async function fetchDocStatus(pool, numeroD) {
  const q = await pool
    .request()
    .input('doc', sql.VarChar, numeroD)
    .query('SELECT NumeroD, Status, Descrip FROM dbo.SADEV WHERE NumeroD = @doc')
  return q.recordset[0] ?? null
}

async function main() {
  const pool = await sql.connect(cfg)
  try {
    const startedAt = Date.now()
    let found = null

    while (Date.now() - startedAt < timeoutSeconds * 1000) {
      found = await fetchPendingDoc(pool)
      if (found) break
      console.log(`poll: no pending status=0 yet; sleeping ${pollSeconds}s`)
      await sleep(pollSeconds * 1000)
    }

    if (!found) {
      console.log(
        JSON.stringify(
          {
            ok: false,
            reason: 'timeout_without_pending_status_0',
            timeoutSeconds,
          },
          null,
          2
        )
      )
      return
    }

    console.log(`pending found: ${found.NumeroD}`)

    const bridge = spawnSync('node', ['ace', 'bridge:run', '--once'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
    })
    console.log('bridge stdout:')
    console.log(bridge.stdout ?? '')
    if (bridge.status !== 0) {
      console.log('bridge stderr:')
      console.log(bridge.stderr ?? '')
      console.log(
        JSON.stringify(
          {
            ok: false,
            reason: 'bridge_failed',
            exitCode: bridge.status,
          },
          null,
          2
        )
      )
      return
    }

    const after = await fetchDocStatus(pool, found.NumeroD)
    const encoded = encodeURIComponent(found.NumeroD)
    const timelineResp = await fetch(
      `${process.env.PUBLIC_TRACKING_BASE_URL.replace(/\/+$/, '')}/api/v1/public/orders/${encoded}/timeline?limit=3`
    )
    const timelineText = await timelineResp.text()

    console.log(
      JSON.stringify(
        {
          ok: true,
          numeroD: found.NumeroD,
          beforeStatus: found.Status,
          afterStatus: after?.Status ?? null,
          railwayTimelineStatus: timelineResp.status,
          railwayTimelineBodySample: timelineText.slice(0, 800),
        },
        null,
        2
      )
    )
  } finally {
    await pool.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
