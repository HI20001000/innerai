import { h, shallowRef } from 'vue'
import LoginView from '../views/Login.vue'

const routeRecords = [{ path: '/', name: 'login', component: LoginView }]
const routes = new Map(routeRecords.map((route) => [route.path, route.component]))
const normalizePath = (path) => (path === '/login' ? '/' : path)

const currentPath = shallowRef(normalizePath(window.location.pathname || '/'))
const currentRoute = shallowRef({ path: currentPath.value })

const updatePath = (path) => {
  const nextPath = normalizePath(path)
  currentPath.value = nextPath
  currentRoute.value = { path: nextPath }
}

window.addEventListener('popstate', () => {
  updatePath(window.location.pathname || '/')
})

const RouterView = {
  name: 'RouterView',
  setup() {
    return () => {
      const component = routes.get(currentPath.value) || routes.get('/')
      return component ? h(component) : null
    }
  },
}

const router = {
  currentRoute,
  options: {
    history: {
      base: '/',
    },
    routes: routeRecords,
  },
  install(app) {
    app.component('RouterView', RouterView)
    app.config.globalProperties.$router = router
    app.config.globalProperties.$route = currentRoute
  },
  getRoutes() {
    return routeRecords
  },
  push(path) {
    const nextPath = normalizePath(path)
    if (nextPath === currentPath.value) return
    window.history.pushState({}, '', nextPath)
    updatePath(nextPath)
  },
}

export default router
