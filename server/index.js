import fs from 'node:fs/promises'
import http from 'node:http'
import mysql from 'mysql2/promise'
import crypto from 'node:crypto'
import { URL } from 'node:url'

const loadEnvFile = async (path) => {
  const content = await fs.readFile(path, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    if (!key) continue
    const value = rest.join('=').trim()
    if (key && value && !process.env[key]) {
      process.env[key] = value
    }
  }
}

await loadEnvFile(new URL('../.env', import.meta.url))

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
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
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mail VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      password_salt VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL DEFAULT 'hi',
      role VARCHAR(50) NOT NULL DEFAULT 'normal',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_name VARCHAR(255),
      vendor_name VARCHAR(255),
      product_name VARCHAR(255),
      tag_name VARCHAR(255),
      scheduled_at DATETIME,
      location VARCHAR(255),
      follow_up TEXT,
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
const verificationCodes = new Map()

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

const handleDeleteOptions = async (type, req, res) => {
  const table = TABLES[type]
  if (!table) {
    sendJson(res, 400, { message: 'Unknown option type' })
    return
  }
  const url = new URL(req.url, `http://${req.headers.host}`)
  const name = url.searchParams.get('name')
  if (!name) {
    sendJson(res, 400, { message: 'Name is required' })
    return
  }
  try {
    const connection = await getConnection()
    await connection.query(`DELETE FROM \`${table}\` WHERE name = ?`, [name])
    sendJson(res, 200, { name })
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { message: 'Failed to delete option' })
  }
}

const handlePostTask = async (req, res) => {
  const body = await parseBody(req)
  if (!body) {
    sendJson(res, 400, { message: 'Payload is required' })
    return
  }
  const {
    client,
    vendor,
    product,
    tag,
    scheduled_at: scheduledAt,
    location,
    follow_up: followUp,
  } = body
  try {
    const connection = await getConnection()
    await connection.query(
      `INSERT INTO tasks
      (client_name, vendor_name, product_name, tag_name, scheduled_at, location, follow_up)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [client || null, vendor || null, product || null, tag || null, scheduledAt || null, location || null, followUp || null]
    )
    sendJson(res, 201, { message: 'Task created' })
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { message: 'Failed to create task' })
  }
}

const hashPassword = async (password, salt) => {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }
      resolve(derivedKey.toString('hex'))
    })
  })
}

const requestVerificationCode = async (req, res) => {
  const body = await parseBody(req)
  const email = body?.email?.trim()
  if (!email) {
    sendJson(res, 400, { message: 'Email is required' })
    return
  }
  const existing = verificationCodes.get(email)
  const now = Date.now()
  if (existing?.lastSentAt && now - existing.lastSentAt < 60 * 1000) {
    const waitSeconds = Math.ceil((60 * 1000 - (now - existing.lastSentAt)) / 1000)
    sendJson(res, 429, { message: `請${waitSeconds}秒後再試` })
    return
  }
  const code = Math.floor(1000 + Math.random() * 9000).toString()
  const expiresAt = now + 60 * 1000
  verificationCodes.set(email, { code, expiresAt, lastSentAt: now })
  console.log(`Verification code for ${email}: ${code} (valid 60s)`)
  sendJson(res, 200, { message: 'Verification code sent' })
}

const registerUser = async (req, res) => {
  const body = await parseBody(req)
  const email = body?.email?.trim()
  const password = body?.password
  const code = body?.code?.trim()
  if (!email || !password || !code) {
    sendJson(res, 400, { message: 'Email, password, and code are required' })
    return
  }
  const record = verificationCodes.get(email)
  if (!record) {
    sendJson(res, 400, { message: 'Verification code is invalid or expired' })
    return
  }
  if (record.expiresAt < Date.now()) {
    verificationCodes.delete(email)
    sendJson(res, 400, { message: 'Verification code is invalid or expired' })
    return
  }
  if (record.code !== code) {
    sendJson(res, 400, { message: 'Verification code is invalid or expired' })
    return
  }
  try {
    const salt = crypto.randomBytes(16).toString('hex')
    const passwordHash = await hashPassword(password, salt)
    const connection = await getConnection()
    await connection.query(
      'INSERT INTO users (mail, password_hash, password_salt, username, role) VALUES (?, ?, ?, ?, ?)',
      [email, passwordHash, salt, 'hi', 'normal']
    )
    verificationCodes.delete(email)
    sendJson(res, 201, { message: 'User registered' })
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      sendJson(res, 409, { message: 'Email already registered' })
      return
    }
    console.error(error)
    sendJson(res, 500, { message: 'Failed to register' })
  }
}

const loginUser = async (req, res) => {
  const body = await parseBody(req)
  const email = body?.email?.trim()
  const password = body?.password
  if (!email || !password) {
    sendJson(res, 400, { message: 'Email and password are required' })
    return
  }
  try {
    const connection = await getConnection()
    const [rows] = await connection.query(
      'SELECT mail, password_hash, password_salt, username, role FROM users WHERE mail = ? LIMIT 1',
      [email]
    )
    const user = rows[0]
    if (!user) {
      sendJson(res, 401, { message: 'Invalid credentials' })
      return
    }
    const passwordHash = await hashPassword(password, user.password_salt)
    if (passwordHash !== user.password_hash) {
      sendJson(res, 401, { message: 'Invalid credentials' })
      return
    }
    sendJson(res, 200, { mail: user.mail, username: user.username, role: user.role })
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { message: 'Failed to login' })
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
      if (req.method === 'DELETE') {
        await handleDeleteOptions(type, req, res)
        return
      }
    }
    if (url.pathname === '/api/tasks' && req.method === 'POST') {
      await handlePostTask(req, res)
      return
    }
    if (url.pathname === '/api/auth/request-code' && req.method === 'POST') {
      await requestVerificationCode(req, res)
      return
    }
    if (url.pathname === '/api/auth/register' && req.method === 'POST') {
      await registerUser(req, res)
      return
    }
    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      await loginUser(req, res)
      return
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
