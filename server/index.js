import http from 'node:http'
import mysql from 'mysql2/promise'
import { URL } from 'node:url'

const {
  MYSQL_HOST = 'localhost',
  MYSQL_PORT = '3306',
  MYSQL_USER = 'root',
  MYSQL_PASSWORD = '12345',
} = process.env

const DATABASE_NAME = 'innerai'
const DEFAULT_DATA = {
  clients: ['日昇科技', '遠誠貿易', '星河設計', '宏達建設'],
  vendors: ['青雲材料', '耀達製造', '風尚供應', '遠景工廠'],
  products: ['智慧儀表 X1', '節能模組 A3', '自動化平台 Pro', '雲端控制盒'],
  task_tags: ['客戶跟進', '客戶匯報', '需求整理', '合約追蹤'],
}

const TABLES = {
  client: 'clients',
  vendor: 'vendors',
  product: 'products',
  tag: 'task_tags',
}

const withCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const sendJson = (res, status, payload) => {
  withCors(res)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

const parseBody = async (req) => {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  if (chunks.length === 0) return null
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return null
  }
}

const createConnection = async (withDatabase = false) => {
  return mysql.createConnection({
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT),
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: withDatabase ? DATABASE_NAME : undefined,
  })
}

const ensureDatabase = async () => {
  const connection = await createConnection(false)
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DATABASE_NAME}\``)
  await connection.end()
}

const ensureTables = async (connection) => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS clients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS vendors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS task_tags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ]
  for (const statement of statements) {
    await connection.query(statement)
  }
}

const seedDefaults = async (connection) => {
  for (const [table, values] of Object.entries(DEFAULT_DATA)) {
    const [rows] = await connection.query(`SELECT COUNT(*) as count FROM \`${table}\``)
    const count = rows[0]?.count ?? 0
    if (count > 0) continue
    for (const value of values) {
      await connection.query(`INSERT INTO \`${table}\` (name) VALUES (?)`, [value])
    }
  }
}

const initDatabase = async () => {
  await ensureDatabase()
  const connection = await createConnection(true)
  await ensureTables(connection)
  await seedDefaults(connection)
  return connection
}

let dbConnection = null

const getConnection = async () => {
  if (!dbConnection) {
    dbConnection = await initDatabase()
  }
  return dbConnection
}

const handleGetOptions = async (type, res) => {
  const table = TABLES[type]
  if (!table) {
    sendJson(res, 400, { message: 'Unknown option type' })
    return
  }
  try {
    const connection = await getConnection()
    const [rows] = await connection.query(`SELECT name FROM \`${table}\` ORDER BY name ASC`)
    sendJson(res, 200, rows.map((row) => row.name))
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { message: 'Failed to load options' })
  }
}

const handlePostOptions = async (type, req, res) => {
  const table = TABLES[type]
  if (!table) {
    sendJson(res, 400, { message: 'Unknown option type' })
    return
  }
  const body = await parseBody(req)
  const { name } = body ?? {}
  if (!name || typeof name !== 'string') {
    sendJson(res, 400, { message: 'Name is required' })
    return
  }
  try {
    const connection = await getConnection()
    await connection.query(`INSERT INTO \`${table}\` (name) VALUES (?)`, [name.trim()])
    sendJson(res, 201, { name: name.trim() })
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      sendJson(res, 409, { message: 'Name already exists' })
      return
    }
    console.error(error)
    sendJson(res, 500, { message: 'Failed to add option' })
  }
}

const start = async () => {
  await getConnection()
  const port = process.env.PORT || 3001
  const server = http.createServer(async (req, res) => {
    withCors(res)
    if (!req.url) {
      sendJson(res, 404, { message: 'Not found' })
      return
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }
    const url = new URL(req.url, `http://${req.headers.host}`)
    if (url.pathname.startsWith('/api/options/')) {
      const type = url.pathname.split('/').pop()
      if (req.method === 'GET') {
        await handleGetOptions(type, res)
        return
      }
      if (req.method === 'POST') {
        await handlePostOptions(type, req, res)
        return
      }
    }
    sendJson(res, 404, { message: 'Not found' })
  })
  server.listen(port, () => {
    console.log(`Server listening on ${port}`)
  })
}

start().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
