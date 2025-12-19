<template>
  <el-container style="min-height: 100vh">
    <el-header>
      <div class="nav">
        <div class="logo">AI Meeting Dashboard</div>
        <el-menu mode="horizontal" :default-active="active" @select="onSelect">
          <el-menu-item index="/meetings">Meetings</el-menu-item>
          <el-menu-item index="/meetings/new">New Meeting</el-menu-item>
          <el-menu-item index="/tasks">Follow-ups</el-menu-item>
          <el-menu-item index="/settings">Settings</el-menu-item>
        </el-menu>
        <div class="actions">
          <span v-if="auth.user" class="user">Hi, {{ auth.user.name || auth.user.email }}</span>
          <el-button v-if="auth.token" type="text" @click="logout">Logout</el-button>
          <el-button v-else type="primary" @click="() => router.push('/login')">Login</el-button>
        </div>
      </div>
    </el-header>
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const active = computed(() => route.path.startsWith('/meetings') ? '/meetings' : route.path);

const onSelect = (path: string) => {
  router.push(path);
};

const logout = () => {
  auth.logout();
  router.push('/login');
};
</script>

<style scoped>
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo {
  font-weight: 700;
  margin-right: 16px;
}
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.user {
  font-weight: 500;
}
</style>
