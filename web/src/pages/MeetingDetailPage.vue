<template>
  <div v-if="meeting">
    <el-card>
      <h2>{{ meeting.title }}</h2>
      <p><strong>Occurred:</strong> {{ formatDate(meeting.occurredAt) }}</p>
      <p><strong>Customer:</strong> {{ meeting.customer.name }} | <strong>Manufacturer:</strong>
        {{ meeting.manufacturer.name }} | <strong>Product:</strong> {{ meeting.product.name }}</p>
      <h4>Content</h4>
      <el-input v-model="meeting.content" type="textarea" :rows="8" readonly />
    </el-card>

    <el-card style="margin-top: 16px">
      <h3>AI Summary</h3>
      <p>{{ meeting.analysis?.summary || 'Pending AI analysis' }}</p>
    </el-card>

    <el-card style="margin-top: 16px">
      <h3>Follow Ups</h3>
      <el-table :data="meeting.followups" style="width: 100%">
        <el-table-column prop="title" label="Title" />
        <el-table-column prop="description" label="Description" />
        <el-table-column label="Status">
          <template #default="scope">
            <el-select v-model="scope.row.status" @change="(val) => onStatusChange(scope.row.id, val)">
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
              placeholder="Set"
              @change="(val) => onDueChange(scope.row.id, val as string)"
            />
          </template>
        </el-table-column>
        <el-table-column label="Priority">
          <template #default="scope">
            <el-select v-model="scope.row.priority" @change="(val) => onPriorityChange(scope.row.id, val)">
              <el-option label="Low" value="LOW" />
              <el-option label="Medium" value="MEDIUM" />
              <el-option label="High" value="HIGH" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="Assignee User ID">
          <template #default="scope">
            <el-input-number
              v-model="scope.row.assigneeUserId"
              :min="1"
              @change="(val) => onAssigneeChange(scope.row.id, val as number)
              "
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import dayjs from 'dayjs';
import { fetchMeeting, updateFollowup } from '../services/api';
import { ElMessage } from 'element-plus';

const route = useRoute();
const meeting = ref<any>(null);

const formatDate = (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm');

const load = async () => {
  const data = await fetchMeeting(Number(route.params.id));
  meeting.value = data;
};

const onStatusChange = async (id: number, status: string) => {
  try {
    await updateFollowup(id, { status });
    ElMessage.success('Updated');
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || 'Failed');
  }
};

const onDueChange = async (id: number, dueAt: string) => {
  if (!dueAt) return;
  try {
    await updateFollowup(id, { dueAt: dayjs(dueAt).toISOString() });
    ElMessage.success('Updated');
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || 'Failed');
  }
};

const onPriorityChange = async (id: number, priority: string) => {
  try {
    await updateFollowup(id, { priority });
    ElMessage.success('Updated');
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || 'Failed');
  }
};

const onAssigneeChange = async (id: number, assigneeUserId?: number) => {
  try {
    await updateFollowup(id, { assigneeUserId });
    ElMessage.success('Updated');
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || 'Failed');
  }
};

onMounted(load);
</script>
