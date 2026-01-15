<script setup>
import { computed, ref } from 'vue'
import { formatDateTimeDisplay } from '../scripts/time.js'

const DEFAULT_CLIENT_COLOR = '#e2e8f0'
const GROUP_BADGE_COLOR = '#ef4444'
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000

const props = defineProps({
  viewMode: {
    type: String,
    default: 'user',
  },
  submissions: {
    type: Array,
    default: () => [],
  },
  users: {
    type: Array,
    default: () => [],
  },
  selectedUser: {
    type: Object,
    default: null,
  },
  selectedClient: {
    type: Object,
    default: null,
  },
})

const rangeType = ref('month')
const expandedTaskIds = ref(new Set())
const expandedGroupIds = ref(new Set())

const toTask = (submission) => {
  if (!submission?.end_at) return null
  const startAt = submission.start_at || submission.end_at
  const endAt = submission.end_at
  if (!startAt || !endAt) return null
  return {
    id: submission.id,
    clientName: submission.client_name,
    vendorName: submission.vendor_name,
    productName: submission.product_name,
    startAt,
    endAt,
    followUps: Array.isArray(submission.follow_ups) ? submission.follow_ups : [],
  }
}

const tasks = computed(() =>
  (props.submissions || [])
    .map((submission) => toTask(submission))
    .filter(Boolean)
)

const groupedTasks = computed(() => {
  if (props.viewMode !== 'user') {
    return []
  }
  const submissionById = new Map(
    (props.submissions || []).map((submission) => [submission.id, submission])
  )
  return (props.users || [])
    .map((user) => {
      const userTasks = tasks.value.filter((task) =>
        (props.submissions || []).some(
          (submission) =>
            submission.id === task.id &&
            (submission.related_users || []).some((related) => related.mail === user.mail)
        )
      )
      const clientNames = new Set()
      let followUpCount = 0
      userTasks.forEach((task) => {
        const submission = submissionById.get(task.id)
        if (submission?.client_name) {
          clientNames.add(submission.client_name)
        }
        followUpCount += Array.isArray(submission?.follow_ups) ? submission.follow_ups.length : 0
      })
      return {
        user,
        tasks: userTasks,
        clientCount: clientNames.size,
        followUpCount,
      }
    })
    .filter((group) => group.tasks.length > 0)
})

const rangeConfig = computed(() => {
  if (rangeType.value === 'day') {
    return { unit: 'day', count: 7, width: 110 }
  }
  if (rangeType.value === 'year') {
    return { unit: 'month', count: 3, width: 180 }
  }
  return { unit: 'month', count: 4, width: 150 }
})

const anchorDate = ref(new Date())

const timelineStart = computed(() => {
  const base = new Date(anchorDate.value)
  if (rangeType.value === 'day') {
    base.setHours(0, 0, 0, 0)
    return base
  }
  if (rangeType.value === 'year') {
    return new Date(base.getFullYear(), base.getMonth(), 1)
  }
  return new Date(base.getFullYear(), base.getMonth(), 1)
})

const timelineEnd = computed(() => {
  const start = timelineStart.value
  if (rangeType.value === 'day') {
    return new Date(start.getTime() + rangeConfig.value.count * MILLISECONDS_IN_DAY)
  }
  if (rangeType.value === 'year') {
    return new Date(start.getFullYear(), start.getMonth() + rangeConfig.value.count, 1)
  }
  return new Date(start.getFullYear(), start.getMonth() + rangeConfig.value.count, 1)
})

const axisTicks = computed(() => {
  const ticks = []
  const start = timelineStart.value
  if (rangeType.value === 'day') {
    for (let i = 0; i <= rangeConfig.value.count; i += 1) {
      const date = new Date(start.getTime() + i * MILLISECONDS_IN_DAY)
      ticks.push({
        key: date.toISOString(),
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        offset: i,
      })
    }
  } else if (rangeType.value === 'year') {
    for (let i = 0; i <= rangeConfig.value.count; i += 1) {
      const date = new Date(start.getFullYear(), start.getMonth() + i, 1)
      ticks.push({
        key: date.toISOString(),
        label: `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`,
        offset: i,
      })
    }
  } else {
    for (let i = 0; i <= rangeConfig.value.count; i += 1) {
      const date = new Date(start.getFullYear(), start.getMonth() + i, 1)
      ticks.push({
        key: date.toISOString(),
        label: `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`,
        offset: i,
      })
    }
  }
  return ticks
})

const getBarColor = (user) => user?.icon_bg || DEFAULT_CLIENT_COLOR

const ganttRows = computed(() => {
  const rows = []
  if (props.viewMode === 'user') {
    groupedTasks.value.forEach(({ user, tasks: userTasks, clientCount, followUpCount }) => {
      const groupId = `group-user-${user?.mail || 'unknown'}`
      const sortedTasks = userTasks
        .map((task) => ({
          ...task,
          startAtDate: new Date(task.startAt),
          endAtDate: new Date(task.endAt),
        }))
        .filter((task) => {
          const hasStart = !Number.isNaN(task.startAtDate.getTime())
          const hasEnd = !Number.isNaN(task.endAtDate.getTime())
          return hasStart && hasEnd
        })
        .sort((a, b) => a.startAtDate.getTime() - b.startAtDate.getTime())
      rows.push({
        id: groupId,
        type: 'group',
        label: user?.username || user?.mail || '用戶',
        icon: user?.icon || '🙂',
        groupId,
        color: getBarColor(user),
        taskSpans: sortedTasks.map((task) => ({
          startAt: task.startAt,
          endAt: task.endAt,
          color: getBarColor(user),
        })),
        tasks: userTasks,
        meta: `客戶 ${clientCount}｜跟進 ${followUpCount}`,
      })
      if (expandedGroupIds.value.has(groupId)) {
        userTasks.forEach((task) => {
          rows.push({
            id: `task-${task.id}`,
            taskId: task.id,
            type: 'task',
            label: `${task.clientName}_${task.vendorName}_${task.productName}`,
            startAt: task.startAt,
            endAt: task.endAt,
            color: getBarColor(user),
          })
          if (expandedTaskIds.value.has(task.id)) {
            task.followUps.forEach((followUp) => {
              rows.push({
                id: `followup-${task.id}-${followUp.id || followUp.content}`,
                type: 'followup',
                label: followUp.content || '跟進任務',
                endAt: task.endAt,
                color: getBarColor(user),
              })
            })
          }
        })
      }
    })
  } else if (props.viewMode === 'client') {
    const clientGroupId = `group-client-${props.selectedClient?.name || 'unknown'}`
    const relatedMails = new Set()
    let unassignedFollowUps = 0
    tasks.value.forEach((task) => {
      const submission = (props.submissions || []).find((item) => item.id === task.id)
      if (submission?.related_users) {
        submission.related_users.forEach((related) => related?.mail && relatedMails.add(related.mail))
      }
      const followUps = Array.isArray(submission?.follow_ups) ? submission.follow_ups : []
      followUps.forEach((followUp) => {
        const assignees = Array.isArray(followUp?.assignees) ? followUp.assignees : []
        if (assignees.length === 0) {
          unassignedFollowUps += 1
        }
      })
    })
    rows.push({
      id: clientGroupId,
      type: 'group',
      label: props.selectedClient?.name || '客戶',
      icon: '🏷️',
      groupId: clientGroupId,
      color: DEFAULT_CLIENT_COLOR,
      taskSpans: tasks.value.map((task) => ({
        startAt: task.startAt,
        endAt: task.endAt,
        color: DEFAULT_CLIENT_COLOR,
      })),
      meta: `同事 ${relatedMails.size}｜未指派 ${unassignedFollowUps}`,
    })
    if (expandedGroupIds.value.has(clientGroupId)) {
      tasks.value.forEach((task) => {
        rows.push({
          id: `task-${task.id}`,
          taskId: task.id,
          type: 'task',
          label: `${task.clientName}_${task.vendorName}_${task.productName}`,
          startAt: task.startAt,
          endAt: task.endAt,
          color: DEFAULT_CLIENT_COLOR,
        })
        if (expandedTaskIds.value.has(task.id)) {
          task.followUps.forEach((followUp) => {
            rows.push({
              id: `followup-${task.id}-${followUp.id || followUp.content}`,
              type: 'followup',
              label: followUp.content || '跟進任務',
              endAt: task.endAt,
              color: DEFAULT_CLIENT_COLOR,
            })
          })
        }
      })
    }
  }

  return rows
})

const getPositionStyle = (startAt, endAt) => {
  const start = new Date(startAt)
  const end = new Date(endAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { display: 'none' }
  }
  const total = timelineEnd.value.getTime() - timelineStart.value.getTime()
  if (total <= 0) return { display: 'none' }
  const left = ((start.getTime() - timelineStart.value.getTime()) / total) * timelineWidth.value
  const width = ((end.getTime() - start.getTime()) / total) * timelineWidth.value
  if (width <= 0) return { display: 'none' }
  return {
    left: `${Math.max(left, 0)}px`,
    width: `${Math.min(width, timelineWidth.value - left)}px`,
  }
}

const getMarkerStyle = (dateValue) => {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return { display: 'none' }
  }
  const total = timelineEnd.value.getTime() - timelineStart.value.getTime()
  if (total <= 0) return { display: 'none' }
  const left = ((date.getTime() - timelineStart.value.getTime()) / total) * timelineWidth.value
  return {
    left: `${Math.min(Math.max(left, 0), timelineWidth.value)}px`,
  }
}

const toggleTask = (taskId) => {
  const next = new Set(expandedTaskIds.value)
  if (next.has(taskId)) {
    next.delete(taskId)
  } else {
    next.add(taskId)
  }
  expandedTaskIds.value = next
}

const isTaskExpanded = (taskId) => expandedTaskIds.value.has(taskId)

const toggleGroup = (groupId) => {
  const next = new Set(expandedGroupIds.value)
  if (next.has(groupId)) {
    next.delete(groupId)
  } else {
    next.add(groupId)
  }
  expandedGroupIds.value = next
}

const isGroupExpanded = (groupId) => expandedGroupIds.value.has(groupId)

const setRangeType = (value) => {
  rangeType.value = value
}

const shiftRange = (direction) => {
  if (rangeType.value === 'day') {
    anchorDate.value = new Date(
      anchorDate.value.getTime() + direction * MILLISECONDS_IN_DAY
    )
  } else if (rangeType.value === 'year') {
    anchorDate.value = new Date(
      anchorDate.value.getFullYear(),
      anchorDate.value.getMonth() + direction,
      anchorDate.value.getDate()
    )
  } else {
    anchorDate.value = new Date(
      anchorDate.value.getFullYear(),
      anchorDate.value.getMonth() + direction,
      anchorDate.value.getDate()
    )
  }
}

const timelineWidth = computed(() => rangeConfig.value.count * rangeConfig.value.width)

const wheelAccumulator = ref(0)
const handleWheel = (event) => {
  wheelAccumulator.value += event.deltaY
  if (Math.abs(wheelAccumulator.value) < 120) {
    return
  }
  const direction = wheelAccumulator.value > 0 ? 1 : -1
  wheelAccumulator.value = 0
  shiftRange(direction)
}
</script>

<template>
  <div class="gantt-panel">
    <header class="gantt-header">
      <div>
        <h3 class="gantt-title">甘特圖視圖</h3>
        <p class="gantt-subtitle">
          {{ formatDateTimeDisplay(timelineStart) }} - {{ formatDateTimeDisplay(timelineEnd) }}
        </p>
      </div>
      <div class="gantt-controls">
        <div class="gantt-range-toggle">
          <button
            type="button"
            :class="['gantt-range-button', { active: rangeType === 'day' }]"
            @click="setRangeType('day')"
          >
            日
          </button>
          <button
            type="button"
            :class="['gantt-range-button', { active: rangeType === 'month' }]"
            @click="setRangeType('month')"
          >
            月
          </button>
          <button
            type="button"
            :class="['gantt-range-button', { active: rangeType === 'year' }]"
            @click="setRangeType('year')"
          >
            年
          </button>
        </div>
        <div class="gantt-shift">
          <button type="button" class="ghost-button" @click="shiftRange(-1)">←</button>
          <button type="button" class="ghost-button" @click="shiftRange(1)">→</button>
        </div>
      </div>
    </header>

    <div class="gantt-body">
      <div class="gantt-sidebar">
        <div
          v-for="row in ganttRows"
          :key="row.id"
          :class="['gantt-label', `gantt-label-${row.type}`]"
        >
          <button
            v-if="row.type === 'group'"
            type="button"
            class="gantt-group"
            @click="toggleGroup(row.groupId || row.id)"
          >
            <div class="gantt-group-badge" :style="{ backgroundColor: row.color }">
              {{ row.icon }}
            </div>
            <div class="gantt-group-text">
              <span class="gantt-group-name">{{ row.label }}</span>
              <span v-if="row.meta" class="gantt-group-meta">{{ row.meta }}</span>
            </div>
            <span class="gantt-task-toggle">
              {{ isGroupExpanded(row.groupId || row.id) ? '▾' : '▸' }}
            </span>
          </button>
          <button
            v-else-if="row.type === 'task'"
            type="button"
            class="gantt-task-button"
            @click="toggleTask(row.taskId)"
          >
            <span class="gantt-task-text">{{ row.label }}</span>
            <span class="gantt-task-toggle">{{ isTaskExpanded(row.taskId) ? '▾' : '▸' }}</span>
          </button>
          <span v-else class="gantt-followup-text">{{ row.label }}</span>
        </div>
      </div>
      <div class="gantt-timeline" @wheel="handleWheel">
        <div class="gantt-axis" :style="{ width: `${timelineWidth}px` }">
          <span
            v-for="tick in axisTicks"
            :key="tick.key"
            class="gantt-tick"
            :style="{ left: `${tick.offset * rangeConfig.width}px` }"
          >
            {{ tick.label }}
          </span>
        </div>
        <div class="gantt-rows" :style="{ width: `${timelineWidth}px` }">
          <div v-for="row in ganttRows" :key="row.id" class="gantt-row">
            <template v-if="row.type === 'group'">
              <div
                v-for="(span, index) in row.taskSpans || []"
                :key="`${row.id}-span-${index}`"
                class="gantt-bar"
                :style="{
                  backgroundColor: span.color,
                  ...getPositionStyle(span.startAt, span.endAt),
                }"
              ></div>
            </template>
            <div
              v-else-if="row.type === 'task'"
              class="gantt-bar"
              :style="{
                backgroundColor: row.color,
                ...getPositionStyle(row.startAt, row.endAt),
              }"
            ></div>
            <div
              v-else-if="row.type === 'followup'"
              class="gantt-marker"
              :style="{
                backgroundColor: row.color,
                ...getMarkerStyle(row.endAt),
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.gantt-header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.gantt-title {
  margin: 0;
  font-size: 1.1rem;
}

.gantt-subtitle {
  margin: 0.3rem 0 0;
  color: #64748b;
  font-size: 0.85rem;
}

.gantt-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.gantt-range-toggle {
  display: inline-flex;
  background: #f1f5f9;
  padding: 0.25rem;
  border-radius: 999px;
  gap: 0.25rem;
}

.gantt-range-button {
  border: none;
  background: transparent;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
  color: #475569;
  cursor: pointer;
}

.gantt-range-button.active {
  background: #111827;
  color: #fff;
}

.gantt-shift {
  display: inline-flex;
  gap: 0.5rem;
}

.gantt-body {
  display: grid;
  grid-template-columns: 320px 1fr;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
}

.gantt-sidebar {
  background: #f8fafc;
  padding: 1rem;
  display: grid;
  gap: 0.6rem;
}

.gantt-label {
  font-size: 0.85rem;
  color: #1f2937;
}

.gantt-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.gantt-group-badge {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1rem;
}

.gantt-group-name {
  font-size: 0.95rem;
}

.gantt-group-text {
  display: grid;
  gap: 0.15rem;
}

.gantt-group-meta {
  font-size: 0.75rem;
  color: #64748b;
}

.gantt-task-button {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #1f2937;
  cursor: pointer;
  text-align: left;
}

.gantt-task-text {
  padding-left: 0.25rem;
}

.gantt-task-toggle {
  font-size: 0.8rem;
  color: #94a3b8;
}

.gantt-followup-text {
  padding-left: 1.5rem;
  color: #64748b;
  font-size: 0.8rem;
}

.gantt-timeline {
  position: relative;
  overflow-x: auto;
  padding: 1rem 1.5rem;
}

.gantt-axis {
  position: relative;
  height: 24px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 0.75rem;
}

.gantt-tick {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: #94a3b8;
}

.gantt-rows {
  display: grid;
  gap: 0.6rem;
}

.gantt-row {
  position: relative;
  height: 28px;
  border-radius: 999px;
  background: #f8fafc;
}

.gantt-bar {
  position: absolute;
  top: 6px;
  height: 16px;
  border-radius: 999px;
}

.gantt-marker {
  position: absolute;
  top: 10px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

@media (max-width: 960px) {
  .gantt-body {
    grid-template-columns: 1fr;
  }

  .gantt-sidebar {
    border-bottom: 1px solid #e2e8f0;
  }
}
</style>
