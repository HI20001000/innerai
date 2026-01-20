import { execFile } from 'node:child_process'

const extractDifyHostname = (difyUrl) => {
  if (!difyUrl) return ''
  const normalized = String(difyUrl).trim()
  const withoutProtocol = normalized.replace(/^https?:\/\//i, '')
  const hostSegment = withoutProtocol.split('/')[0] || ''
  return hostSegment.split(':')[0] || ''
}

const getPingArgs = (hostname) => {
  if (process.platform === 'win32') {
    return ['-n', '1', '-w', '1000', hostname]
  }
  return ['-c', '1', '-W', '1', hostname]
}

const checkDifyHealth = async (difyUrl) => {
  const hostname = extractDifyHostname(difyUrl)
  if (!hostname) return false
  try {
    await new Promise((resolve, reject) => {
      execFile('ping', getPingArgs(hostname), { timeout: 3000 }, (error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
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
