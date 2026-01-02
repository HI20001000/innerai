import { h, shallowRef } from 'vue'
import LoginView from '../views/Login.vue'
import HomeView from '../views/Home.vue'
import TaskCreateView from '../views/TaskCreate.vue'

const routeRecords = [
  { path: '/', name: 'login', component: LoginView },
  { path: '/home', name: 'home', component: HomeView },
  { path: '/tasks/new', name: 'task-create', component: TaskCreateView },
]
const routes = new Map(routeRecords.map((route) => [route.path, route.component]))
const normalizePath = (path) => (path === '/login' ? '/' : path)

const currentPath = shallowRef(normalizePath(window.location.pathname || '/'))
const resolveRoute = (path) => {
  const record = routeRecords.find((route) => route.path === path)
  return {
    path,
    matched: record ? [record] : [],
  }
}

const currentRoute = shallowRef(resolveRoute(currentPath.value))

const updatePath = (path) => {
  const nextPath = normalizePath(path)
  currentPath.value = nextPath
  currentRoute.value = resolveRoute(nextPath)
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
      location: currentPath,
      state: {},
    },
    routes: routeRecords,
  },
  install(app) {
    app.component('RouterView', RouterView)
    app.config.globalProperties.$router = router
    app.config.globalProperties.$route = currentRoute
  },
  getRoutes() {
    return routeRecords.map((route) => ({ ...route }))
  },
  push(path) {
    const nextPath = normalizePath(path)
    if (nextPath === currentPath.value) return
    window.history.pushState({}, '', nextPath)
    updatePath(nextPath)
  },
}

export default router
