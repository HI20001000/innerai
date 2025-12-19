<template>
  <el-row justify="center">
    <el-col :span="8">
      <h2>Register</h2>
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="Name" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="Email" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="Password" prop="password">
          <el-input v-model="form.password" type="password" />
        </el-form-item>
        <el-form-item label="Invite Token" prop="inviteToken">
          <el-input v-model="form.inviteToken" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="submit">Register</el-button>
          <el-button link @click="goLogin">Back to Login</el-button>
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

const form = reactive({ name: '', email: '', password: '', inviteToken: '' });
const loading = ref(false);
const formRef = ref<FormInstance>();
const rules: FormRules = {
  email: [{ required: true, message: 'Email required' }],
  password: [{ required: true, message: 'Password required' }],
  inviteToken: [{ required: true, message: 'Invite token required' }],
};

const submit = () => {
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    loading.value = true;
    try {
      await auth.register(form);
      ElMessage.success('Registered');
      router.push('/meetings');
    } catch (err: any) {
      ElMessage.error(err?.response?.data?.message || 'Register failed');
    } finally {
      loading.value = false;
    }
  });
};

const goLogin = () => router.push('/login');
</script>
