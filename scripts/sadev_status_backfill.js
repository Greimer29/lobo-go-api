import 'dotenv/config'
import sql from 'mssql'

function hasFlag(flag) {
  return process.argv.includes(flag)
}

function readNumberArg(name, fallback) {
  const prefix = `${name}=`
  const raw = process.argv.find((arg) => arg.startsWith(prefix))
  if (!raw) return fallback
  const value = Number(raw.slice(prefix.length))
  return Number.isFinite(value) ? value : fallback
}

async function main() {
  const apply = hasFlag('--apply')
  const onlyStarDocs = !hasFlag('--all-docs')
  const fromStatus = readNumberArg('--from', 9)
  const toStatus = readNumberArg('--to', 1)

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

  const pool = await sql.connect(cfg)
  try {
    const scopeWhere = onlyStarDocs ? " AND NumeroD LIKE '*%'" : ''
    const preCount = await pool
      .request()
      .input('fromStatus', sql.Int, fromStatus)
      .query(
        `SELECT COUNT(*) AS total FROM dbo.SADEV WHERE Status = @fromStatus${scopeWhere}`
      )
    const preSample = await pool
      .request()
      .input('fromStatus', sql.Int, fromStatus)
      .query(
        `SELECT TOP 20 NumeroD, Status, Descrip FROM dbo.SADEV WHERE Status = @fromStatus${scopeWhere} ORDER BY NumeroD DESC`
      )

    console.log('---dry-run scope---')
    console.log(
      JSON.stringify(
        {
          apply,
          fromStatus,
          toStatus,
          onlyStarDocs,
          candidateCount: Number(preCount.recordset?.[0]?.total ?? 0),
        },
        null,
        2
      )
    )
    console.log('---dry-run sample---')
    console.log(JSON.stringify(preSample.recordset, null, 2))

    if (!apply) {
      console.log('No changes applied. Run with --apply to execute update.')
      return
    }

    const updateResult = await pool
      .request()
      .input('fromStatus', sql.Int, fromStatus)
      .input('toStatus', sql.Int, toStatus)
      .query(
        `UPDATE dbo.SADEV SET Status = @toStatus WHERE Status = @fromStatus${scopeWhere}`
      )

    const postCount = await pool
      .request()
      .input('fromStatus', sql.Int, fromStatus)
      .query(
        `SELECT COUNT(*) AS total FROM dbo.SADEV WHERE Status = @fromStatus${scopeWhere}`
      )
    const postToCount = await pool
      .request()
      .input('toStatus', sql.Int, toStatus)
      .query(
        `SELECT COUNT(*) AS total FROM dbo.SADEV WHERE Status = @toStatus${scopeWhere}`
      )

    console.log('---apply result---')
    console.log(
      JSON.stringify(
        {
          rowsAffected: Number(updateResult.rowsAffected?.[0] ?? 0),
          remainingFromStatus: Number(postCount.recordset?.[0]?.total ?? 0),
          nowToStatus: Number(postToCount.recordset?.[0]?.total ?? 0),
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
