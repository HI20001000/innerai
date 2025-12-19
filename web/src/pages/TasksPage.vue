<template>
  <el-card>
    <h2>Follow-up Dashboard</h2>
    <el-form :inline="true" :model="filters">
      <el-form-item label="Status">
        <el-select v-model="filters.status" clearable placeholder="All">
          <el-option label="TODO" value="TODO" />
          <el-option label="In Progress" value="IN_PROGRESS" />
          <el-option label="Done" value="DONE" />
        </el-select>
      </el-form-item>
      <el-form-item label="Meeting ID">
        <el-input-number v-model="filters.meetingId" />
      </el-form-item>
      <el-form-item label="Assignee User ID">
        <el-input-number v-model="filters.assigneeUserId" />
      </el-form-item>
      <el-form-item label="Due Before">
        <el-date-picker v-model="filters.dueBefore" type="date" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="load">Filter</el-button>
        <el-button @click="reset">Reset</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="items" style="width: 100%; margin-top: 16px">
      <el-table-column prop="title" label="Title" />
      <el-table-column prop="meetingId" label="Meeting" />
      <el-table-column label="Status">
        <template #default="scope">
          <el-select v-model="scope.row.status" @change="(val) => update(scope.row.id, { status: val })">
            <el-option label="TODO" value="TODO" />
            <el-option label="In Progress" value="IN_PROGRESS" />
            <el-option label="Done" value="DONE" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="Due">
        <template #default="scope">
          <el-date-picker
            v-model="scope.row.dueAt"
            type="date"
            @change="(val) => update(scope.row.id, { dueAt: val ? dayjs(val as string).toISOString() : null })"
          />
        </template>
      </el-table-column>
      <el-table-column label="Priority">
        <template #default="scope">
          <el-select v-model="scope.row.priority" @change="(val) => update(scope.row.id, { priority: val })">
            <el-option label="Low" value="LOW" />
            <el-option label="Medium" value="MEDIUM" />
            <el-option label="High" value="HIGH" />
          </el-select>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script lang="ts" setup>
import { reactive, ref, onMounted } from 'vue';
import { fetchFollowups, updateFollowup } from '../services/api';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';

const filters = reactive<{ status?: string; meetingId?: number | null; assigneeUserId?: number | null; dueBefore?: string | null }>({});
const items = ref<any[]>([]);

const load = async () => {
  const params: any = { ...filters };
  if (filters.dueBefore) params.dueBefore = dayjs(filters.dueBefore as string).toISOString();
  items.value = await fetchFollowups(params);
};

const reset = () => {
  filters.status = undefined;
  filters.meetingId = undefined;
  filters.assigneeUserId = undefined;
  filters.dueBefore = null;
  load();
};

const update = async (id: number, payload: any) => {
  try {
    await updateFollowup(id, payload);
    ElMessage.success('Updated');
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || 'Failed');
  }
};

onMounted(load);
</script>
