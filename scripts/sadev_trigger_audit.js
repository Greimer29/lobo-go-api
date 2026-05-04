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

async function main() {
  const pool = await sql.connect(cfg)
  try {
    const tableTriggers = await pool.request().query(`
      SELECT
        t.name AS trigger_name,
        OBJECT_SCHEMA_NAME(t.parent_id) AS table_schema,
        OBJECT_NAME(t.parent_id) AS table_name,
        t.is_disabled,
        m.definition
      FROM sys.triggers t
      JOIN sys.sql_modules m ON m.object_id = t.object_id
      WHERE OBJECT_NAME(t.parent_id) = 'SADEV'
      ORDER BY t.name
    `)

    const dbTriggersMentioning = await pool.request().query(`
      SELECT
        t.name AS trigger_name,
        t.is_disabled,
        m.definition
      FROM sys.triggers t
      JOIN sys.sql_modules m ON m.object_id = t.object_id
      WHERE m.definition LIKE '%SADEV%'
         OR m.definition LIKE '%Status%'
         OR m.definition LIKE '% 9%'
      ORDER BY t.name
    `)

    console.log('---SADEV table triggers---')
    console.log(JSON.stringify(tableTriggers.recordset, null, 2))
    console.log('---DB triggers mentioning SADEV/Status/9---')
    console.log(JSON.stringify(dbTriggersMentioning.recordset, null, 2))
  } finally {
    await pool.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
