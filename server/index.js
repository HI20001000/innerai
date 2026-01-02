import express from 'express'
import mysql from 'mysql2/promise'

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

const app = express()
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  next()
})
app.use(express.json())

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

app.get('/api/options/:type', async (req, res) => {
  const table = TABLES[req.params.type]
  if (!table) {
    res.status(400).json({ message: 'Unknown option type' })
    return
  }
  try {
    const connection = await getConnection()
    const [rows] = await connection.query(`SELECT name FROM \`${table}\` ORDER BY name ASC`)
    res.json(rows.map((row) => row.name))
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to load options' })
  }
})

app.post('/api/options/:type', async (req, res) => {
  const table = TABLES[req.params.type]
  if (!table) {
    res.status(400).json({ message: 'Unknown option type' })
    return
  }
  const { name } = req.body ?? {}
  if (!name || typeof name !== 'string') {
    res.status(400).json({ message: 'Name is required' })
    return
  }
  try {
    const connection = await getConnection()
    await connection.query(`INSERT INTO \`${table}\` (name) VALUES (?)`, [name.trim()])
    res.status(201).json({ name: name.trim() })
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ message: 'Name already exists' })
      return
    }
    console.error(error)
    res.status(500).json({ message: 'Failed to add option' })
  }
})

const start = async () => {
  await getConnection()
  const port = process.env.PORT || 3001
  app.listen(port, () => {
    console.log(`Server listening on ${port}`)
  })
}

start().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
