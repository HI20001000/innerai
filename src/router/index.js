import { h, shallowRef } from 'vue'
import LoginView from '../views/Login.vue'

const routes = new Map([['/', LoginView]])
const currentPath = shallowRef(window.location.pathname || '/')

const normalizePath = (path) => (path === '/login' ? '/' : path)

const updatePath = (path) => {
  currentPath.value = normalizePath(path)
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
  install(app) {
    app.component('RouterView', RouterView)
    app.config.globalProperties.$router = router
  },
  push(path) {
    const nextPath = normalizePath(path)
    if (nextPath === currentPath.value) return
    window.history.pushState({}, '', nextPath)
    updatePath(nextPath)
  },
}

export default router
