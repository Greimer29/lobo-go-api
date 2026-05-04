import 'dotenv/config'
import sql from 'mssql'

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

async function safeQuery(pool, title, query) {
  try {
    const result = await pool.request().query(query)
    console.log(`---${title}---`)
    console.log(JSON.stringify(result.recordset, null, 2))
  } catch (error) {
    console.log(`---${title} (error)---`)
    console.log(String(error?.message ?? error))
  }
}

async function main() {
  const pool = await sql.connect(cfg)
  try {
    await safeQuery(
      pool,
      'modules_with_update_sadev_status_9',
      `
      SELECT
        o.type_desc,
        SCHEMA_NAME(o.schema_id) AS schema_name,
        o.name AS object_name,
        m.definition
      FROM sys.sql_modules m
      JOIN sys.objects o ON o.object_id = m.object_id
      WHERE m.definition LIKE '%UPDATE%SADEV%'
        AND m.definition LIKE '%Status%'
        AND m.definition LIKE '%9%'
      ORDER BY o.type_desc, schema_name, object_name
      `
    )

    await safeQuery(
      pool,
      'modules_with_sadev_status_assignment',
      `
      SELECT
        o.type_desc,
        SCHEMA_NAME(o.schema_id) AS schema_name,
        o.name AS object_name,
        m.definition
      FROM sys.sql_modules m
      JOIN sys.objects o ON o.object_id = m.object_id
      WHERE m.definition LIKE '%SADEV%'
        AND (
          m.definition LIKE '%SET Status%'
          OR m.definition LIKE '%Status =%'
          OR m.definition LIKE '%STATUS=%'
        )
      ORDER BY o.type_desc, schema_name, object_name
      `
    )

    await safeQuery(
      pool,
      'sql_agent_jobs',
      `
      SELECT TOP 200
        j.name AS job_name,
        j.enabled,
        s.step_id,
        s.step_name,
        s.subsystem,
        s.command
      FROM msdb.dbo.sysjobs j
      JOIN msdb.dbo.sysjobsteps s ON s.job_id = j.job_id
      WHERE s.command LIKE '%SADEV%'
         OR s.command LIKE '%Status%'
         OR s.command LIKE '%UPDATE%'
      ORDER BY j.name, s.step_id
      `
    )
  } finally {
    await pool.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
