const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000

const pad = (value) => String(value).padStart(2, '0')

const toTaipeiDate = (date) => new Date(date.getTime() + TAIPEI_OFFSET_MS)

const hasExplicitTimeZone = (value) => /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)

const normalizeDateTimeString = (value) =>
  value.replace('T', ' ').replace('Z', '').split('.')[0]

export const formatDateTimeDisplay = (value) => {
  if (!value) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const normalized = normalizeDateTimeString(trimmed)
    if (hasExplicitTimeZone(trimmed)) {
      const parsed = new Date(trimmed)
      if (!Number.isNaN(parsed.getTime())) {
        return toTaipeiDate(parsed).toISOString().replace('T', ' ').slice(0, 19)
      }
    }
    return normalized.slice(0, 19)
  }
  return toTaipeiDate(new Date(value)).toISOString().replace('T', ' ').slice(0, 19)
}

export const formatDateTimeInput = (value) => {
  if (!value) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (hasExplicitTimeZone(trimmed)) {
      const parsed = new Date(trimmed)
      if (!Number.isNaN(parsed.getTime())) {
        return toTaipeiDate(parsed).toISOString().slice(0, 16)
      }
    }
    const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T')
    return normalizeDateTimeString(normalized).slice(0, 16)
  }
  return toTaipeiDate(new Date(value)).toISOString().slice(0, 16)
}

export const getTaipeiNowInput = () => {
  const now = new Date()
  return toTaipeiDate(now).toISOString().slice(0, 16)
}

export const formatTaipeiDateTime = (date) => {
  const taipei = toTaipeiDate(date)
  return `${taipei.getUTCFullYear()}-${pad(taipei.getUTCMonth() + 1)}-${pad(
    taipei.getUTCDate()
  )} ${pad(taipei.getUTCHours())}:${pad(taipei.getUTCMinutes())}:${pad(
    taipei.getUTCSeconds()
  )}`
}

export const toDateKey = (value) => {
  if (!value) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (hasExplicitTimeZone(trimmed)) {
      const parsed = new Date(trimmed)
      if (Number.isNaN(parsed.getTime())) return null
      return toTaipeiDate(parsed).toISOString().slice(0, 10)
    }
    const normalized = normalizeDateTimeString(trimmed.replace('T', ' '))
    return normalized.split(' ')[0]
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return toTaipeiDate(parsed).toISOString().slice(0, 10)
}

export const getTaipeiTodayKey = () => toDateKey(new Date())
