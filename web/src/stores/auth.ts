import { defineStore } from 'pinia';
import api from '../services/http';

interface UserInfo {
  id: number;
  email: string;
  name?: string | null;
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({ token: null, user: null }),
  actions: {
    initialize() {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      this.token = token;
      this.user = user ? JSON.parse(user) : null;
    },
    async login(email: string, password: string) {
      const res = await api.post('/api/auth/login', { email, password });
      this.token = res.data.token;
      this.user = res.data.user;
      localStorage.setItem('token', this.token || '');
      localStorage.setItem('user', JSON.stringify(this.user));
    },
    async register(payload: { email: string; password: string; name?: string; inviteToken: string }) {
      const res = await api.post('/api/auth/register', payload);
      this.token = res.data.token;
      this.user = res.data.user;
      localStorage.setItem('token', this.token || '');
      localStorage.setItem('user', JSON.stringify(this.user));
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    async fetchMe() {
      if (!this.token) return;
      const res = await api.get('/api/auth/me');
      this.user = res.data.user;
      localStorage.setItem('user', JSON.stringify(this.user));
    },
  },
});
