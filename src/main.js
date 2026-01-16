import './assets/main.css'

import { createApp } from 'vue'
import { apiBaseUrl } from './scripts/apiBaseUrl.js'
import App from './App.vue'
import router from './router'


const readAuthStorage = () => {
  const raw = window.localStorage.getItem('innerai_auth')
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    if (!data?.token || !data?.expiresAt) return null
    return data
  } catch {
    return null
  }
}

const clearAuthStorage = () => {
  window.localStorage.removeItem('innerai_auth')
  window.localStorage.removeItem('innerai_user')
}

const verifyAuth = async () => {
  const auth = readAuthStorage()
  if (!auth) return false
  if (Date.now() >= Date.parse(auth.expiresAt)) {
    clearAuthStorage()
    return false
  }
  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    const data = await response.json()
    if (!response.ok) {
      clearAuthStorage()
      return false
    }
    if (data?.user) {
      window.localStorage.setItem('innerai_user', JSON.stringify(data.user))
    }
    if (data?.expiresAt) {
      window.localStorage.setItem(
        'innerai_auth',
        JSON.stringify({ token: auth.token, expiresAt: data.expiresAt })
      )
    }
    return true
  } catch {
    clearAuthStorage()
    return false
  }
}

const ensureRouteAccess = (authed) => {
  const currentPath = window.location.pathname
  const normalized = currentPath === '/login' ? '/' : currentPath
  if (!authed && normalized !== '/') {
    router.push('/')
  }
  if (authed && normalized === '/') {
    router.push('/home')
  }
}

const bootstrap = async () => {
  const app = createApp(App).use(router)
  const authed = await verifyAuth()
  ensureRouteAccess(authed)
  app.mount('#app')
}

bootstrap()
