<template>
  <el-row justify="center">
    <el-col :span="8">
      <h2>Login</h2>
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="Email" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="Password" prop="password">
          <el-input v-model="form.password" type="password" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="submit">Login</el-button>
          <el-button link @click="goRegister">Register</el-button>
        </el-form-item>
      </el-form>
    </el-col>
  </el-row>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { ElMessage, FormInstance, FormRules } from 'element-plus';

const auth = useAuthStore();
const router = useRouter();

const form = reactive({ email: '', password: '' });
const loading = ref(false);
const formRef = ref<FormInstance>();
const rules: FormRules = {
  email: [{ required: true, message: 'Email required' }],
  password: [{ required: true, message: 'Password required' }],
};

const submit = () => {
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    loading.value = true;
    try {
      await auth.login(form.email, form.password);
      ElMessage.success('Logged in');
      router.push('/meetings');
    } catch (err: any) {
      ElMessage.error(err?.response?.data?.message || 'Login failed');
    } finally {
      loading.value = false;
    }
  });
};

const goRegister = () => router.push('/register');
</script>
