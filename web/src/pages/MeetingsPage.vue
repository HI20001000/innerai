<template>
  <div>
    <el-card>
      <el-form :inline="true" :model="filters">
        <el-form-item label="Customer">
          <el-select v-model="filters.customerId" clearable placeholder="All">
            <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Manufacturer">
          <el-select v-model="filters.manufacturerId" clearable placeholder="All" @change="loadProducts">
            <el-option v-for="m in manufacturers" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Product">
          <el-select v-model="filters.productId" clearable placeholder="All">
            <el-option v-for="p in products" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Search">
          <el-input v-model="filters.q" placeholder="Title or content" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadMeetings">Filter</el-button>
          <el-button @click="reset">Reset</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-table :data="meetings" style="width: 100%; margin-top: 16px" @row-click="goDetail">
      <el-table-column prop="title" label="Title" />
      <el-table-column prop="customer.name" label="Customer" />
      <el-table-column prop="manufacturer.name" label="Manufacturer" />
      <el-table-column prop="product.name" label="Product" />
      <el-table-column label="Occurred">
        <template #default="scope">{{ formatDate(scope.row.occurredAt) }}</template>
      </el-table-column>
      <el-table-column label="Summary">
        <template #default="scope">{{ scope.row.analysis?.summary || 'Pending' }}</template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { fetchCustomers, fetchManufacturers, fetchProducts, fetchMeetings } from '../services/api';
import { Customer, Manufacturer, Product } from '../types';
import dayjs from 'dayjs';

const meetings = ref<any[]>([]);
const customers = ref<Customer[]>([]);
const manufacturers = ref<Manufacturer[]>([]);
const products = ref<Product[]>([]);

const filters = reactive<{ customerId?: number; manufacturerId?: number; productId?: number; q?: string }>(
  {},
);

const router = useRouter();

const formatDate = (val: string) => dayjs(val).format('YYYY-MM-DD');

const loadProducts = async () => {
  products.value = await fetchProducts(filters.manufacturerId);
};

const loadFilters = async () => {
  customers.value = await fetchCustomers();
  manufacturers.value = await fetchManufacturers();
  await loadProducts();
};

const loadMeetings = async () => {
  const res = await fetchMeetings({ ...filters });
  meetings.value = res;
};

const reset = () => {
  Object.assign(filters, { customerId: undefined, manufacturerId: undefined, productId: undefined, q: '' });
  loadMeetings();
};

const goDetail = (row: any) => {
  router.push(`/meetings/${row.id}`);
};

onMounted(async () => {
  await loadFilters();
  await loadMeetings();
});
</script>
