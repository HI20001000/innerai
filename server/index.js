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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
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
      icon VARCHAR(16) NOT NULL DEFAULT '🙂',
      icon_bg VARCHAR(32) NOT NULL DEFAULT '#e2e8f0',
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
    `CREATE TABLE IF NOT EXISTS task_submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_name VARCHAR(255) NOT NULL,
      vendor_name VARCHAR(255) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      tag_name VARCHAR(255) NOT NULL,
      scheduled_at DATETIME NOT NULL,
      location VARCHAR(255) NOT NULL,
      follow_up TEXT NOT NULL,
      created_by_email VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_task_submissions_created_at (created_at)
    )`,
    `CREATE TABLE IF NOT EXISTS auth_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mail VARCHAR(255) NOT NULL,
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ]
  for (const statement of statements) {
    await connection.query(statement)
  }
  try {
    await connection.query("ALTER TABLE users ADD COLUMN icon VARCHAR(16) NOT NULL DEFAULT '🙂'")
  } catch (error) {
    if (error?.code !== 'ER_DUP_FIELDNAME') {
      throw error
    }
  }
  try {
    await connection.query(
      "ALTER TABLE users ADD COLUMN icon_bg VARCHAR(32) NOT NULL DEFAULT '#e2e8f0'"
    )
  } catch (error) {
    if (error?.code !== 'ER_DUP_FIELDNAME') {
      throw error
    }
  }
  try {
    await connection.query('ALTER TABLE task_submissions ADD COLUMN follow_up TEXT')
  } catch (error) {
    if (error?.code !== 'ER_DUP_FIELDNAME') {
      throw error
    }
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

const getAuthenticatedUser = async (req) => {
  const token = getBearerToken(req)
  if (!token) return null
  const tokenHash = hashToken(token)
  const connection = await getConnection()
  await connection.query('DELETE FROM auth_tokens WHERE expires_at < NOW()')
  const [rows] = await connection.query(
    `SELECT auth_tokens.expires_at, users.mail
     FROM auth_tokens
     JOIN users ON users.mail = auth_tokens.mail
     WHERE auth_tokens.token_hash = ? AND auth_tokens.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  )
  return rows[0] ?? null
}

const getRequiredAuthUser = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      sendJson(res, 401, { success: false, message: '請先登入' })
      return null
    }
    return user
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { success: false, message: '驗證登入資訊失敗' })
    return null
  }
}

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0

const normalizeScheduledAt = (value) => {
  if (!value.includes('T')) return value
  return `${value.replace('T', ' ')}${value.length === 16 ? ':00' : ''}`
}

const handlePostTaskSubmission = async (req, res) => {
  const body = await parseBody(req)
  if (!body) {
    sendJson(res, 400, { success: false, message: '需要提供表單資料' })
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
  if (
    !isNonEmptyString(client) ||
    !isNonEmptyString(vendor) ||
    !isNonEmptyString(product) ||
    !isNonEmptyString(tag) ||
    !isNonEmptyString(scheduledAt) ||
    !isNonEmptyString(location) ||
    !isNonEmptyString(followUp)
  ) {
    sendJson(res, 400, { success: false, message: '所有欄位皆為必填' })
    return
  }
  if (
    client.length > 255 ||
    vendor.length > 255 ||
    product.length > 255 ||
    tag.length > 255 ||
    location.length > 255
  ) {
    sendJson(res, 400, { success: false, message: '欄位長度超過限制' })
    return
  }
  if (followUp.length > 2000) {
    sendJson(res, 400, { success: false, message: '需跟進內容長度過長' })
    return
  }
  if (Number.isNaN(Date.parse(scheduledAt))) {
    sendJson(res, 400, { success: false, message: '時間格式不正確' })
    return
  }
  const normalizedScheduledAt = normalizeScheduledAt(scheduledAt)
  const user = await getRequiredAuthUser(req, res)
  if (!user) {
    return
  }
  let connection = null
  try {
    connection = await getConnection()
    await connection.beginTransaction()
    const [result] = await connection.query(
      `INSERT INTO task_submissions
        (client_name, vendor_name, product_name, tag_name, scheduled_at, location, follow_up, created_by_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client.trim(),
        vendor.trim(),
        product.trim(),
        tag.trim(),
        normalizedScheduledAt,
        location.trim(),
        followUp.trim(),
        user.mail,
      ]
    )
    await connection.commit()
    sendJson(res, 201, {
      success: true,
      message: '任務建立成功',
      data: { id: result.insertId },
    })
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback()
      } catch (rollbackError) {
        console.error(rollbackError)
      }
    }
    console.error(error)
    sendJson(res, 500, { success: false, message: '任務建立失敗：伺服器錯誤' })
  }
}

const handleGetTaskSubmissions = async (req, res) => {
  const user = await getRequiredAuthUser(req, res)
  if (!user) return
  try {
    const connection = await getConnection()
    const [rows] = await connection.query(
      `SELECT id, client_name, vendor_name, product_name, tag_name, scheduled_at,
        location, follow_up, created_by_email, created_at
       FROM task_submissions
       ORDER BY created_at DESC`
    )
    sendJson(res, 200, { success: true, data: rows })
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback()
      } catch (rollbackError) {
        console.error(rollbackError)
      }
    }
    console.error(error)
    sendJson(res, 500, { success: false, message: '無法讀取任務資料' })
  }
}

const handleUpdateTaskSubmission = async (req, res, id) => {
  const user = await getRequiredAuthUser(req, res)
  if (!user) return
  const body = await parseBody(req)
  if (!body) {
    sendJson(res, 400, { success: false, message: '需要提供更新資料' })
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
  if (
    !isNonEmptyString(client) ||
    !isNonEmptyString(vendor) ||
    !isNonEmptyString(product) ||
    !isNonEmptyString(tag) ||
    !isNonEmptyString(scheduledAt) ||
    !isNonEmptyString(location) ||
    !isNonEmptyString(followUp)
  ) {
    sendJson(res, 400, { success: false, message: '所有欄位皆為必填' })
    return
  }
  if (
    client.length > 255 ||
    vendor.length > 255 ||
    product.length > 255 ||
    tag.length > 255 ||
    location.length > 255
  ) {
    sendJson(res, 400, { success: false, message: '欄位長度超過限制' })
    return
  }
  if (followUp.length > 2000) {
    sendJson(res, 400, { success: false, message: '需跟進內容長度過長' })
    return
  }
  if (Number.isNaN(Date.parse(scheduledAt))) {
    sendJson(res, 400, { success: false, message: '時間格式不正確' })
    return
  }
  const normalizedScheduledAt = normalizeScheduledAt(scheduledAt)
  try {
    const connection = await getConnection()
    const [result] = await connection.query(
      `UPDATE task_submissions
       SET client_name = ?, vendor_name = ?, product_name = ?, tag_name = ?,
           scheduled_at = ?, location = ?, follow_up = ?
       WHERE id = ?`,
      [
        client.trim(),
        vendor.trim(),
        product.trim(),
        tag.trim(),
        normalizedScheduledAt,
        location.trim(),
        followUp.trim(),
        id,
      ]
    )
    if (result.affectedRows === 0) {
      sendJson(res, 404, { success: false, message: '找不到任務資料' })
      return
    }
    sendJson(res, 200, { success: true, message: '任務更新成功' })
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { success: false, message: '任務更新失敗' })
  }
}

const handleDeleteTaskSubmission = async (req, res, id) => {
  const user = await getRequiredAuthUser(req, res)
  if (!user) return
  try {
    const connection = await getConnection()
    const [result] = await connection.query('DELETE FROM task_submissions WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      sendJson(res, 404, { success: false, message: '找不到任務資料' })
      return
    }
    sendJson(res, 200, { success: true, message: '任務已刪除' })
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { success: false, message: '任務刪除失敗' })
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

const TOKEN_TTL_MS = 60 * 60 * 1000

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) return null
  return authHeader.slice(7).trim()
}

const createAuthToken = async (email) => {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)
  const connection = await getConnection()
  await connection.query('DELETE FROM auth_tokens WHERE mail = ? OR expires_at < NOW()', [email])
  await connection.query('INSERT INTO auth_tokens (mail, token_hash, expires_at) VALUES (?, ?, ?)', [
    email,
    tokenHash,
    expiresAt,
  ])
  return { token, expiresAt: expiresAt.toISOString() }
}

const requestVerificationCode = async (req, res) => {
  const body = await parseBody(req)
  const email = body?.email?.trim()
  if (!email) {
    sendJson(res, 400, { message: 'Email is required' })
    return
  }
  console.log(`Verification code request received for ${email}`)
  const existing = verificationCodes.get(email)
  const now = Date.now()
  if (existing?.lastSentAt && now - existing.lastSentAt < 60 * 1000) {
    const waitSeconds = Math.ceil((60 * 1000 - (now - existing.lastSentAt)) / 1000)
    console.log(`Verification code cooldown for ${email}: ${waitSeconds}s remaining`)
    sendJson(res, 429, { message: `請${waitSeconds}秒後再試` })
    return
  }
  const code = Math.floor(1000 + Math.random() * 9000).toString()
  const expiresAt = now + 60 * 1000
  verificationCodes.set(email, { code, expiresAt, lastSentAt: now })
  console.log(
    `Verification code for ${email}: ${code} (valid 60s, expires at ${new Date(expiresAt).toISOString()})`
  )
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
      'INSERT INTO users (mail, password_hash, password_salt, icon, icon_bg, username, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [email, passwordHash, salt, '🙂', '#e2e8f0', 'hi', 'normal']
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
      'SELECT mail, password_hash, password_salt, icon, icon_bg, username, role FROM users WHERE mail = ? LIMIT 1',
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
    const tokenData = await createAuthToken(user.mail)
    sendJson(res, 200, {
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
      user: {
        mail: user.mail,
        icon: user.icon,
        icon_bg: user.icon_bg,
        username: user.username,
        role: user.role,
      },
    })
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { message: 'Failed to login' })
  }
}

const verifyAuthToken = async (req, res) => {
  const token = getBearerToken(req)
  if (!token) {
    sendJson(res, 401, { message: 'Auth token is required' })
    return
  }
  try {
    const tokenHash = hashToken(token)
    const connection = await getConnection()
    await connection.query('DELETE FROM auth_tokens WHERE expires_at < NOW()')
    const [rows] = await connection.query(
      `SELECT auth_tokens.expires_at, users.mail, users.icon, users.icon_bg, users.username, users.role
       FROM auth_tokens
       JOIN users ON users.mail = auth_tokens.mail
       WHERE auth_tokens.token_hash = ? AND auth_tokens.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    )
    const record = rows[0]
    if (!record) {
      sendJson(res, 401, { message: 'Invalid or expired token' })
      return
    }
    sendJson(res, 200, {
      expiresAt: new Date(record.expires_at).toISOString(),
      user: {
        mail: record.mail,
        icon: record.icon,
        icon_bg: record.icon_bg,
        username: record.username,
        role: record.role,
      },
    })
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { message: 'Failed to verify token' })
  }
}

const updateUser = async (req, res) => {
  const body = await parseBody(req)
  const email = body?.email?.trim()
  if (!email) {
    sendJson(res, 400, { message: 'Email is required' })
    return
  }
  const currentPassword = body?.currentPassword
  const newPassword = body?.newPassword
  const updates = []
  const values = []
  if (body.icon) {
    updates.push('icon = ?')
    values.push(body.icon)
  }
  if (body.icon_bg) {
    updates.push('icon_bg = ?')
    values.push(body.icon_bg)
  }
  if (body.username) {
    updates.push('username = ?')
    values.push(body.username)
  }
  if (body.role) {
    updates.push('role = ?')
    values.push(body.role)
  }
  if (newPassword || currentPassword) {
    if (!currentPassword || !newPassword) {
      sendJson(res, 400, { message: 'Current and new password are required' })
      return
    }
    const connection = await getConnection()
    const [rows] = await connection.query(
      'SELECT password_hash, password_salt FROM users WHERE mail = ? LIMIT 1',
      [email]
    )
    const user = rows[0]
    if (!user) {
      sendJson(res, 404, { message: 'User not found' })
      return
    }
    const currentHash = await hashPassword(currentPassword, user.password_salt)
    if (currentHash !== user.password_hash) {
      sendJson(res, 401, { message: 'Current password is incorrect' })
      return
    }
    const salt = crypto.randomBytes(16).toString('hex')
    const passwordHash = await hashPassword(newPassword, salt)
    updates.push('password_hash = ?', 'password_salt = ?')
    values.push(passwordHash, salt)
  }
  if (updates.length === 0) {
    sendJson(res, 400, { message: 'No updates provided' })
    return
  }
  try {
    const connection = await getConnection()
    values.push(email)
    await connection.query(`UPDATE users SET ${updates.join(', ')} WHERE mail = ?`, values)
    sendJson(res, 200, { message: 'User updated' })
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { message: 'Failed to update user' })
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
    if (url.pathname === '/api/task-submissions') {
      if (req.method === 'POST') {
        await handlePostTaskSubmission(req, res)
        return
      }
      if (req.method === 'GET') {
        await handleGetTaskSubmissions(req, res)
        return
      }
    }
    if (url.pathname.startsWith('/api/task-submissions/')) {
      const id = Number(url.pathname.split('/').pop())
      if (!Number.isFinite(id)) {
        sendJson(res, 400, { success: false, message: '任務 ID 無效' })
        return
      }
      if (req.method === 'PUT') {
        await handleUpdateTaskSubmission(req, res, id)
        return
      }
      if (req.method === 'DELETE') {
        await handleDeleteTaskSubmission(req, res, id)
        return
      }
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
    if (url.pathname === '/api/auth/verify' && req.method === 'POST') {
      await verifyAuthToken(req, res)
      return
    }
    if (url.pathname === '/api/users/update' && req.method === 'POST') {
      await updateUser(req, res)
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
