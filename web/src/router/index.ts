import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../pages/LoginPage.vue';
import RegisterPage from '../pages/RegisterPage.vue';
import MeetingsPage from '../pages/MeetingsPage.vue';
import NewMeetingPage from '../pages/NewMeetingPage.vue';
import MeetingDetailPage from '../pages/MeetingDetailPage.vue';
import TasksPage from '../pages/TasksPage.vue';
import SettingsPage from '../pages/SettingsPage.vue';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginPage },
    { path: '/register', component: RegisterPage },
    { path: '/', redirect: '/meetings' },
    { path: '/meetings', component: MeetingsPage, meta: { requiresAuth: true } },
    { path: '/meetings/new', component: NewMeetingPage, meta: { requiresAuth: true } },
    { path: '/meetings/:id', component: MeetingDetailPage, meta: { requiresAuth: true } },
    { path: '/tasks', component: TasksPage, meta: { requiresAuth: true } },
    { path: '/settings', component: SettingsPage, meta: { requiresAuth: true } },
  ],
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.token) {
    next('/login');
  } else if ((to.path === '/login' || to.path === '/register') && auth.token) {
    next('/meetings');
  } else {
    next();
  }
});

export default router;
