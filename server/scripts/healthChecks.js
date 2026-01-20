import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const extractDifyHostname = (difyUrl) => {
  if (!difyUrl) return ''
  const normalized = String(difyUrl).trim()
  const withoutProtocol = normalized.replace(/^https?:\/\//i, '')
  const hostSegment = withoutProtocol.split('/')[0] || ''
  return hostSegment.split(':')[0] || ''
}

const checkDifyHealth = async (difyUrl) => {
  const hostname = extractDifyHostname(difyUrl)
  if (!hostname) return false
  try {
    await execFileAsync('ping', ['-c', '1', '-W', '1', hostname], { timeout: 3000 })
    return true
  } catch (error) {
    console.warn('Dify health check failed.', error?.message ?? error)
    return false
  }
}

const createHealthCheckers = ({ getConnection, difyUrl }) => {
  const checkMysqlHealth = async () => {
    try {
      const connection = await getConnection()
      await connection.ping()
      return true
    } catch (error) {
      console.warn('MySQL health check failed.', error?.message ?? error)
      return false
    }
  }

  const checkDifyHealthBound = async () => checkDifyHealth(difyUrl)

  return { checkMysqlHealth, checkDifyHealth: checkDifyHealthBound }
}

export { createHealthCheckers, extractDifyHostname }
