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
  DIFY_URL = '',
  DIFY_API_KEY = '',
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
      scheduled_at DATETIME,
      location VARCHAR(255),
      follow_up TEXT,
      recorded_at DATETIME,
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
    `CREATE TABLE IF NOT EXISTS task_submission_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      submission_id INT NOT NULL,
      user_mail VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_task_submission_users_submission (submission_id),
      INDEX idx_task_submission_users_user (user_mail)
    )`,
    `CREATE TABLE IF NOT EXISTS task_submission_tags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      submission_id INT NOT NULL,
      tag_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_task_submission_tags_submission (submission_id)
    )`,
    `CREATE TABLE IF NOT EXISTS task_submission_followups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      submission_id INT NOT NULL,
      content TEXT NOT NULL,
      status_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_task_submission_followups_submission (submission_id)
    )`,
    `CREATE TABLE IF NOT EXISTS follow_up_statuses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS meeting_folders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_name VARCHAR(255) NOT NULL,
      vendor_name VARCHAR(255) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      meeting_time DATETIME NOT NULL,
      created_by_email VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS meeting_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      folder_id INT NOT NULL,
      file_name VARCHAR(512) NOT NULL,
      file_path VARCHAR(1024),
      mime_type VARCHAR(255),
      file_content LONGBLOB,
      content_text LONGTEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_meeting_records_folder (folder_id)
    )`,
    `CREATE TABLE IF NOT EXISTS client_vendor_links (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_name VARCHAR(255) NOT NULL,
      vendor_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_client_vendor (client_name, vendor_name)
    )`,
    `CREATE TABLE IF NOT EXISTS vendor_product_links (
      id INT AUTO_INCREMENT PRIMARY KEY,
      vendor_name VARCHAR(255) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_vendor_product (vendor_name, product_name)
    )`,
    `CREATE TABLE IF NOT EXISTS product_meeting_links (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_name VARCHAR(255) NOT NULL,
      meeting_folder_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_product_meeting (product_name, meeting_folder_id)
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
    await connection.query('ALTER TABLE task_submissions MODIFY scheduled_at DATETIME NULL')
  } catch (error) {
    if (error?.code !== 'ER_INVALID_USE_OF_NULL' && error?.code !== 'ER_BAD_FIELD_ERROR') {
      throw error
    }
  }
  try {
    await connection.query('ALTER TABLE task_submissions MODIFY location VARCHAR(255) NULL')
  } catch (error) {
    if (error?.code !== 'ER_INVALID_USE_OF_NULL' && error?.code !== 'ER_BAD_FIELD_ERROR') {
      throw error
    }
  }
  try {
    await connection.query('ALTER TABLE meeting_records ADD COLUMN content_text LONGTEXT')
  } catch (error) {
    if (error?.code !== 'ER_DUP_FIELDNAME') {
      throw error
    }
  }
  try {
    await connection.query('ALTER TABLE task_submission_followups ADD COLUMN status_id INT NULL')
  } catch (error) {
    if (error?.code !== 'ER_DUP_FIELDNAME') {
      throw error
    }
  }
  try {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS follow_up_statuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    )
  } catch (error) {
    throw error
  }
  try {
    await connection.query('ALTER TABLE task_submissions ADD COLUMN recorded_at DATETIME')
  } catch (error) {
    if (error?.code !== 'ER_DUP_FIELDNAME') {
      throw error
    }
  }
  try {
    await connection.query("ALTER TABLE meeting_folders ADD COLUMN client_name VARCHAR(255) NOT NULL")
  } catch (error) {
    if (error?.code !== 'ER_DUP_FIELDNAME') {
      throw error
    }
  }
  try {
    await connection.query("ALTER TABLE meeting_folders ADD COLUMN vendor_name VARCHAR(255) NOT NULL")
  } catch (error) {
    if (error?.code !== 'ER_DUP_FIELDNAME') {
      throw error
    }
  }
  try {
    await connection.query("ALTER TABLE meeting_folders ADD COLUMN product_name VARCHAR(255) NOT NULL")
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

const formatToTaipeiDateTime = (date) => {
  const taipeiMs = date.getTime() + 8 * 60 * 60 * 1000
  const taipei = new Date(taipeiMs)
  const pad = (value) => String(value).padStart(2, '0')
  return `${taipei.getUTCFullYear()}-${pad(taipei.getUTCMonth() + 1)}-${pad(
    taipei.getUTCDate()
  )} ${pad(taipei.getUTCHours())}:${pad(taipei.getUTCMinutes())}:${pad(taipei.getUTCSeconds())}`
}

const normalizeScheduledAt = (value) => {
  if (typeof value !== 'string') return value
  if (value.includes('.')) {
    const [base] = value.split('.')
    if (base) return normalizeScheduledAt(base)
  }
  if (value.endsWith('Z')) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return formatToTaipeiDateTime(parsed)
    }
  }
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
    related_user_mail: relatedUserMail,
    scheduled_at: scheduledAt,
    recorded_at: recordedAt,
    location,
    follow_up: followUp,
  } = body
  if (!isNonEmptyString(client) || !isNonEmptyString(vendor) || !isNonEmptyString(product)) {
    sendJson(res, 400, { success: false, message: '客戶、廠家、產品為必填' })
    return
  }
  const tags = Array.isArray(tag)
    ? tag.map((item) => String(item).trim()).filter(Boolean)
    : isNonEmptyString(tag)
      ? [tag.trim()]
      : []
  if (tags.length === 0) {
    sendJson(res, 400, { success: false, message: '任務標籤為必填' })
    return
  }
  const relatedUserMails = Array.isArray(relatedUserMail)
    ? relatedUserMail.map((mail) => String(mail).trim()).filter(Boolean)
    : null
  if (!relatedUserMails || relatedUserMails.length === 0) {
    sendJson(res, 400, { success: false, message: '關聯用戶為必填' })
    return
  }
  if (
    client.length > 255 ||
    vendor.length > 255 ||
    product.length > 255 ||
    tags.some((tagName) => tagName.length > 255) ||
    (location && location.length > 255)
  ) {
    sendJson(res, 400, { success: false, message: '欄位長度超過限制' })
    return
  }
  const followUps = Array.isArray(followUp)
    ? followUp.map((item) => String(item).trim()).filter(Boolean)
    : isNonEmptyString(followUp)
      ? [followUp.trim()]
      : []
  if (followUps.some((item) => item.length > 2000)) {
    sendJson(res, 400, { success: false, message: '需跟進內容長度過長' })
    return
  }
  if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) {
    sendJson(res, 400, { success: false, message: '時間格式不正確' })
    return
  }
  if (recordedAt && Number.isNaN(Date.parse(recordedAt))) {
    sendJson(res, 400, { success: false, message: '記錄時間格式不正確' })
    return
  }
  const normalizedScheduledAt = scheduledAt ? normalizeScheduledAt(scheduledAt) : null
  const normalizedRecordedAt = recordedAt ? normalizeScheduledAt(recordedAt) : null
  const user = await getRequiredAuthUser(req, res)
  if (!user) {
    return
  }
  let connection = null
  try {
    connection = await getConnection()
    await connection.beginTransaction()
    const [users] = await connection.query('SELECT mail FROM users WHERE mail IN (?)', [
      relatedUserMails,
    ])
    if (users.length !== relatedUserMails.length) {
      await connection.rollback()
      sendJson(res, 400, { success: false, message: '關聯用戶不存在' })
      return
    }
    const [result] = await connection.query(
      `INSERT INTO task_submissions
        (client_name, vendor_name, product_name, scheduled_at, location, recorded_at, created_by_email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        client.trim(),
        vendor.trim(),
        product.trim(),
        normalizedScheduledAt,
        location ? location.trim() : null,
        normalizedRecordedAt,
        user.mail,
      ]
    )
    const relationValues = relatedUserMails.map((mail) => [result.insertId, mail])
    await connection.query(
      'INSERT INTO task_submission_users (submission_id, user_mail) VALUES ?',
      [relationValues]
    )
    const tagValues = tags.map((tagName) => [result.insertId, tagName])
    await connection.query(
      'INSERT INTO task_submission_tags (submission_id, tag_name) VALUES ?',
      [tagValues]
    )
    if (followUps.length > 0) {
      const followUpValues = followUps.map((item) => [result.insertId, item])
      await connection.query(
        'INSERT INTO task_submission_followups (submission_id, content) VALUES ?',
        [followUpValues]
      )
    }
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
      `SELECT task_submissions.id, task_submissions.client_name, task_submissions.vendor_name,
        task_submissions.product_name, task_submissions.scheduled_at,
        task_submissions.location, task_submissions.recorded_at, task_submissions.created_by_email,
        task_submissions.created_at,
        users.mail as related_mail, users.icon as related_icon, users.icon_bg as related_icon_bg,
        users.username as related_username
       FROM task_submissions
       LEFT JOIN task_submission_users ON task_submission_users.submission_id = task_submissions.id
       LEFT JOIN users ON users.mail = task_submission_users.user_mail
       ORDER BY task_submissions.created_at DESC`
    )
    const [tagRows] = await connection.query(
      'SELECT submission_id, tag_name FROM task_submission_tags'
    )
    const [followRows] = await connection.query(
      'SELECT submission_id, content FROM task_submission_followups'
    )
    const grouped = new Map()
    for (const row of rows) {
      if (!grouped.has(row.id)) {
        grouped.set(row.id, {
          id: row.id,
          client_name: row.client_name,
          vendor_name: row.vendor_name,
          product_name: row.product_name,
          scheduled_at: row.scheduled_at,
          recorded_at: row.recorded_at,
          location: row.location,
          created_by_email: row.created_by_email,
          created_at: row.created_at,
          related_users: [],
          tags: [],
          follow_ups: [],
        })
      }
      if (row.related_mail) {
        grouped.get(row.id).related_users.push({
          mail: row.related_mail,
          icon: row.related_icon,
          icon_bg: row.related_icon_bg,
          username: row.related_username,
        })
      }
    }
    for (const row of tagRows) {
      if (grouped.has(row.submission_id)) {
        grouped.get(row.submission_id).tags.push(row.tag_name)
      }
    }
    for (const row of followRows) {
      if (grouped.has(row.submission_id)) {
        grouped.get(row.submission_id).follow_ups.push(row.content)
      }
    }
    sendJson(res, 200, { success: true, data: Array.from(grouped.values()) })
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { success: false, message: '無法讀取任務資料' })
  }
}

const handleGetUsers = async (req, res) => {
  const user = await getRequiredAuthUser(req, res)
  if (!user) return
  try {
    const connection = await getConnection()
    const [rows] = await connection.query(
      'SELECT mail, icon, icon_bg, username FROM users ORDER BY username ASC'
    )
    sendJson(res, 200, { success: true, data: rows })
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { success: false, message: '無法讀取使用者清單' })
  }
}

const handlePostMeetingRecords = async (req, res) => {
  const user = await getRequiredAuthUser(req, res)
  if (!user) return
  const body = await parseBody(req)
  if (!body) {
    sendJson(res, 400, { success: false, message: '需要提供會議記錄資料' })
    return
  }
  const { client, vendor, product, meeting_time: meetingTime, files } = body
  if (!isNonEmptyString(client) || !isNonEmptyString(vendor) || !isNonEmptyString(product)) {
    sendJson(res, 400, { success: false, message: '客戶、廠家、產品為必填' })
    return
  }
  if (!isNonEmptyString(meetingTime) || Number.isNaN(Date.parse(meetingTime))) {
    sendJson(res, 400, { success: false, message: '會議時間格式不正確' })
    return
  }
  if (!Array.isArray(files) || files.length === 0) {
    sendJson(res, 400, { success: false, message: '請上傳會議記錄檔案' })
    return
  }
  const normalizedMeetingTime = normalizeScheduledAt(meetingTime)
  let connection = null
  try {
    connection = await getConnection()
    await connection.beginTransaction()
    const [folderResult] = await connection.query(
      `INSERT INTO meeting_folders
        (client_name, vendor_name, product_name, meeting_time, created_by_email)
       VALUES (?, ?, ?, ?, ?)`,
      [client.trim(), vendor.trim(), product.trim(), normalizedMeetingTime, user.mail]
    )
    const folderId = folderResult.insertId
    await connection.query(
      'INSERT IGNORE INTO client_vendor_links (client_name, vendor_name) VALUES (?, ?)',
      [client.trim(), vendor.trim()]
    )
    await connection.query(
      'INSERT IGNORE INTO vendor_product_links (vendor_name, product_name) VALUES (?, ?)',
      [vendor.trim(), product.trim()]
    )
    await connection.query(
      'INSERT IGNORE INTO product_meeting_links (product_name, meeting_folder_id) VALUES (?, ?)',
      [product.trim(), folderId]
    )
    const records = files.map((file) => {
      const content = file?.contentBase64
        ? Buffer.from(String(file.contentBase64), 'base64')
        : null
      const isText =
        file?.type?.startsWith('text/') ||
        String(file?.name || '').toLowerCase().endsWith('.txt')
      const contentText = isText && content ? content.toString('utf8') : null
      return [
        folderId,
        file?.name || 'unknown',
        file?.path || null,
        file?.type || null,
        content,
        contentText,
      ]
    })
    await connection.query(
      'INSERT INTO meeting_records (folder_id, file_name, file_path, mime_type, file_content, content_text) VALUES ?',
      [records]
    )
    await connection.commit()
    sendJson(res, 201, { success: true, message: '會議記錄已上傳', data: { id: folderId } })
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback()
      } catch (rollbackError) {
        console.error(rollbackError)
      }
    }
    console.error(error)
    sendJson(res, 500, { success: false, message: '會議記錄上傳失敗' })
  }
}

const handleGetMeetingRecords = async (req, res) => {
  const user = await getRequiredAuthUser(req, res)
  if (!user) return
  try {
    const connection = await getConnection()
    const [clientVendors] = await connection.query(
      'SELECT client_name, vendor_name FROM client_vendor_links'
    )
    const [vendorProducts] = await connection.query(
      'SELECT vendor_name, product_name FROM vendor_product_links'
    )
    const [productMeetings] = await connection.query(
      'SELECT product_name, meeting_folder_id FROM product_meeting_links'
    )
    const [folders] = await connection.query(
      'SELECT id, meeting_time, created_by_email, created_at FROM meeting_folders'
    )
    const [records] = await connection.query(
      `SELECT id, folder_id, file_name, file_path, mime_type, content_text
       FROM meeting_records
       ORDER BY id ASC`
    )

    const foldersById = new Map()
    for (const folder of folders) {
      foldersById.set(folder.id, { ...folder, records: [] })
    }
    for (const record of records) {
      const folder = foldersById.get(record.folder_id)
      if (folder) {
        folder.records.push({
          id: record.id,
          file_name: record.file_name,
          file_path: record.file_path,
          mime_type: record.mime_type,
          content_text: record.content_text,
        })
      }
    }

    const productMeetingsMap = new Map()
    for (const link of productMeetings) {
      if (!productMeetingsMap.has(link.product_name)) {
        productMeetingsMap.set(link.product_name, [])
      }
      const folder = foldersById.get(link.meeting_folder_id)
      if (folder) {
        productMeetingsMap.get(link.product_name).push(folder)
      }
    }

    const vendorProductsMap = new Map()
    for (const link of vendorProducts) {
      if (!vendorProductsMap.has(link.vendor_name)) {
        vendorProductsMap.set(link.vendor_name, [])
      }
      vendorProductsMap.get(link.vendor_name).push(link.product_name)
    }

    const clientVendorsMap = new Map()
    for (const link of clientVendors) {
      if (!clientVendorsMap.has(link.client_name)) {
        clientVendorsMap.set(link.client_name, [])
      }
      clientVendorsMap.get(link.client_name).push(link.vendor_name)
    }

    const data = []
    for (const [clientName, vendors] of clientVendorsMap.entries()) {
      const vendorNodes = vendors.map((vendorName) => {
        const products = vendorProductsMap.get(vendorName) || []
        const productNodes = products.map((productName) => {
          const meetings = productMeetingsMap.get(productName) || []
          return {
            name: productName,
            meetings: meetings.map((meeting) => ({
              id: meeting.id,
              meeting_time: meeting.meeting_time,
              created_by_email: meeting.created_by_email,
              created_at: meeting.created_at,
              records: meeting.records,
            })),
          }
        })
        return { name: vendorName, products: productNodes }
      })
      data.push({ name: clientName, vendors: vendorNodes })
    }
    sendJson(res, 200, { success: true, data })
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { success: false, message: '無法讀取會議記錄' })
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
    related_user_mail: relatedUserMail,
    scheduled_at: scheduledAt,
    recorded_at: recordedAt,
    location,
    follow_up: followUp,
  } = body
  if (!isNonEmptyString(client) || !isNonEmptyString(vendor) || !isNonEmptyString(product)) {
    sendJson(res, 400, { success: false, message: '客戶、廠家、產品為必填' })
    return
  }
  const tags = Array.isArray(tag)
    ? tag.map((item) => String(item).trim()).filter(Boolean)
    : isNonEmptyString(tag)
      ? [tag.trim()]
      : []
  if (tags.length === 0) {
    sendJson(res, 400, { success: false, message: '任務標籤為必填' })
    return
  }
  const relatedUserMails = Array.isArray(relatedUserMail)
    ? relatedUserMail.map((mail) => String(mail).trim()).filter(Boolean)
    : []
  if (relatedUserMails.length === 0) {
    sendJson(res, 400, { success: false, message: '關聯用戶為必填' })
    return
  }
  if (
    client.length > 255 ||
    vendor.length > 255 ||
    product.length > 255 ||
    tags.some((tagName) => tagName.length > 255) ||
    (location && location.length > 255)
  ) {
    sendJson(res, 400, { success: false, message: '欄位長度超過限制' })
    return
  }
  const followUps = Array.isArray(followUp)
    ? followUp.map((item) => String(item).trim()).filter(Boolean)
    : isNonEmptyString(followUp)
      ? [followUp.trim()]
      : []
  if (followUps.some((item) => item.length > 2000)) {
    sendJson(res, 400, { success: false, message: '需跟進內容長度過長' })
    return
  }
  if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) {
    sendJson(res, 400, { success: false, message: '時間格式不正確' })
    return
  }
  if (recordedAt && Number.isNaN(Date.parse(recordedAt))) {
    sendJson(res, 400, { success: false, message: '記錄時間格式不正確' })
    return
  }
  const normalizedScheduledAt = scheduledAt ? normalizeScheduledAt(scheduledAt) : null
  const normalizedRecordedAt = recordedAt ? normalizeScheduledAt(recordedAt) : null
  try {
    const connection = await getConnection()
    const [users] = await connection.query('SELECT mail FROM users WHERE mail IN (?)', [
      relatedUserMails,
    ])
    if (users.length !== relatedUserMails.length) {
      sendJson(res, 400, { success: false, message: '關聯用戶不存在' })
      return
    }
    const [result] = await connection.query(
      `UPDATE task_submissions
       SET client_name = ?, vendor_name = ?, product_name = ?, tag_name = ?,
           scheduled_at = ?, location = ?, follow_up = ?, recorded_at = ?
       WHERE id = ?`,
      [
        client.trim(),
        vendor.trim(),
        product.trim(),
        tags[0],
        normalizedScheduledAt,
        location ? location.trim() : null,
        followUps[0] || null,
        normalizedRecordedAt,
        id,
      ]
    )
    if (result.affectedRows === 0) {
      sendJson(res, 404, { success: false, message: '找不到任務資料' })
      return
    }
    await connection.query('DELETE FROM task_submission_users WHERE submission_id = ?', [id])
    const relationValues = relatedUserMails.map((mail) => [id, mail])
    await connection.query(
      'INSERT INTO task_submission_users (submission_id, user_mail) VALUES ?',
      [relationValues]
    )
    await connection.query('DELETE FROM task_submission_tags WHERE submission_id = ?', [id])
    const tagValues = tags.map((tagName) => [id, tagName])
    await connection.query('INSERT INTO task_submission_tags (submission_id, tag_name) VALUES ?', [
      tagValues,
    ])
    await connection.query('DELETE FROM task_submission_followups WHERE submission_id = ?', [id])
    if (followUps.length > 0) {
      const followUpValues = followUps.map((item) => [id, item])
      await connection.query(
        'INSERT INTO task_submission_followups (submission_id, content) VALUES ?',
        [followUpValues]
      )
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
    await connection.beginTransaction()
    await connection.query('DELETE FROM task_submission_users WHERE submission_id = ?', [id])
    const [result] = await connection.query('DELETE FROM task_submissions WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      await connection.rollback()
      sendJson(res, 404, { success: false, message: '找不到任務資料' })
      return
    }
    await connection.commit()
    sendJson(res, 200, { success: true, message: '任務已刪除' })
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { success: false, message: '任務刪除失敗' })
  }
}

const handlePostDifyAutoFill = async (req, res) => {
  const body = await parseBody(req)
  const text = body?.text
  if (!isNonEmptyString(text)) {
    sendJson(res, 400, { success: false, message: '請提供檔案內容' })
    return
  }
  if (!DIFY_URL || !DIFY_API_KEY) {
    sendJson(res, 500, { success: false, message: 'Dify 設定不存在' })
    return
  }
  try {
    const response = await fetch(`${DIFY_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query: text,
        response_mode: 'blocking',
        conversation_id: '',
        user: 'innerai',
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      sendJson(res, 500, { success: false, message: data?.message || 'Dify 處理失敗' })
      return
    }
    sendJson(res, 200, { success: true, data })
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { success: false, message: 'Dify 連線失敗' })
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
    if (url.pathname === '/api/users' && req.method === 'GET') {
      await handleGetUsers(req, res)
      return
    }
    if (url.pathname === '/api/meeting-records' && req.method === 'POST') {
      await handlePostMeetingRecords(req, res)
      return
    }
    if (url.pathname === '/api/meeting-records' && req.method === 'GET') {
      await handleGetMeetingRecords(req, res)
      return
    }
    if (url.pathname === '/api/dify/auto-fill' && req.method === 'POST') {
      await handlePostDifyAutoFill(req, res)
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
