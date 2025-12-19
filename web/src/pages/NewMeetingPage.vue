<template>
  <el-card>
    <h2>New Meeting</h2>
    <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
      <el-form-item label="Title" prop="title">
        <el-input v-model="form.title" />
      </el-form-item>
      <el-form-item label="Occurred At" prop="occurredAt">
        <el-date-picker v-model="form.occurredAt" type="datetime" />
      </el-form-item>
      <el-form-item label="Customer" prop="customerId">
        <el-select v-model="form.customerId" placeholder="Select customer">
          <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="Manufacturer" prop="manufacturerId">
        <el-select v-model="form.manufacturerId" placeholder="Select manufacturer" @change="loadProducts">
          <el-option v-for="m in manufacturers" :key="m.id" :label="m.name" :value="m.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="Product" prop="productId">
        <el-select v-model="form.productId" placeholder="Select product">
          <el-option v-for="p in products" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="Content" prop="content">
        <el-input v-model="form.content" type="textarea" :rows="8" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="submit">Create</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script lang="ts" setup>
import { reactive, ref, onMounted } from 'vue';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';
import { Customer, Manufacturer, Product } from '../types';
import { fetchCustomers, fetchManufacturers, fetchProducts, createMeeting } from '../services/api';

const form = reactive({
  title: '',
  occurredAt: '',
  customerId: undefined as number | undefined,
  manufacturerId: undefined as number | undefined,
  productId: undefined as number | undefined,
  content: '',
});

const rules: FormRules = {
  title: [{ required: true, message: 'Title required' }],
  occurredAt: [{ required: true, message: 'Date required' }],
  customerId: [{ required: true, message: 'Customer required' }],
  manufacturerId: [{ required: true, message: 'Manufacturer required' }],
  productId: [{ required: true, message: 'Product required' }],
  content: [{ required: true, message: 'Content required' }],
};

const formRef = ref<FormInstance>();
const loading = ref(false);
const customers = ref<Customer[]>([]);
const manufacturers = ref<Manufacturer[]>([]);
const products = ref<Product[]>([]);
const router = useRouter();

const loadProducts = async () => {
  products.value = await fetchProducts(form.manufacturerId);
};

const loadData = async () => {
  customers.value = await fetchCustomers();
  manufacturers.value = await fetchManufacturers();
  await loadProducts();
};

const submit = () => {
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    loading.value = true;
    try {
      const payload = {
        ...form,
        occurredAt: dayjs(form.occurredAt).toISOString(),
      };
      const res = await createMeeting(payload);
      ElMessage.success('Meeting created');
      router.push(`/meetings/${res.meeting.id}`);
    } catch (err: any) {
      ElMessage.error(err?.response?.data?.message || 'Failed to create');
    } finally {
      loading.value = false;
    }
  });
};

onMounted(loadData);
</script>
