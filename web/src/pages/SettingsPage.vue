<template>
  <div class="grid">
    <el-card>
      <h3>Customers</h3>
      <el-form :inline="true" :model="customerForm">
        <el-form-item>
          <el-input v-model="customerForm.name" placeholder="New customer" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="addCustomer">Add</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="customers" style="width: 100%">
        <el-table-column prop="name" label="Name" />
        <el-table-column width="120">
          <template #default="scope">
            <el-button size="small" type="danger" @click="removeCustomer(scope.row.id)">Delete</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card>
      <h3>Manufacturers</h3>
      <el-form :inline="true" :model="manufacturerForm">
        <el-form-item>
          <el-input v-model="manufacturerForm.name" placeholder="New manufacturer" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="addManufacturer">Add</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="manufacturers" style="width: 100%">
        <el-table-column prop="name" label="Name" />
        <el-table-column width="120">
          <template #default="scope">
            <el-button size="small" type="danger" @click="removeManufacturer(scope.row.id)">Delete</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card>
      <h3>Products</h3>
      <el-form :inline="true" :model="productForm">
        <el-form-item>
          <el-input v-model="productForm.name" placeholder="New product" />
        </el-form-item>
        <el-form-item>
          <el-select v-model="productForm.manufacturerId" placeholder="Manufacturer">
            <el-option v-for="m in manufacturers" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="addProduct">Add</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="products" style="width: 100%">
        <el-table-column prop="name" label="Name" />
        <el-table-column prop="manufacturerId" label="Manufacturer">
          <template #default="scope">
            {{ manufacturerName(scope.row.manufacturerId) }}
          </template>
        </el-table-column>
        <el-table-column width="120">
          <template #default="scope">
            <el-button size="small" type="danger" @click="removeProduct(scope.row.id)">Delete</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, onMounted } from 'vue';
import {
  fetchCustomers,
  fetchManufacturers,
  fetchProducts,
  createCustomer,
  deleteCustomer,
  createManufacturer,
  deleteManufacturer,
  createProduct,
  deleteProduct,
} from '../services/api';
import { ElMessage } from 'element-plus';
import { Customer, Manufacturer, Product } from '../types';

const customers = ref<Customer[]>([]);
const manufacturers = ref<Manufacturer[]>([]);
const products = ref<Product[]>([]);

const customerForm = reactive({ name: '' });
const manufacturerForm = reactive({ name: '' });
const productForm = reactive<{ name: string; manufacturerId?: number }>({ name: '', manufacturerId: undefined });

const loadAll = async () => {
  customers.value = await fetchCustomers();
  manufacturers.value = await fetchManufacturers();
  products.value = await fetchProducts();
};

const addCustomer = async () => {
  if (!customerForm.name) return;
  await createCustomer({ name: customerForm.name });
  customerForm.name = '';
  ElMessage.success('Added');
  loadAll();
};

const removeCustomer = async (id: number) => {
  await deleteCustomer(id);
  ElMessage.success('Deleted');
  loadAll();
};

const addManufacturer = async () => {
  if (!manufacturerForm.name) return;
  await createManufacturer({ name: manufacturerForm.name });
  manufacturerForm.name = '';
  ElMessage.success('Added');
  loadAll();
};

const removeManufacturer = async (id: number) => {
  await deleteManufacturer(id);
  ElMessage.success('Deleted');
  loadAll();
};

const addProduct = async () => {
  if (!productForm.name || !productForm.manufacturerId) return;
  await createProduct({ ...productForm });
  productForm.name = '';
  productForm.manufacturerId = undefined;
  ElMessage.success('Added');
  loadAll();
};

const removeProduct = async (id: number) => {
  await deleteProduct(id);
  ElMessage.success('Deleted');
  loadAll();
};

const manufacturerName = (id: number) => manufacturers.value.find((m) => m.id === id)?.name || '';

onMounted(loadAll);
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}
</style>
