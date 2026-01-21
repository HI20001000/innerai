<script setup>
import { computed } from 'vue'

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  selectedLabel: {
    type: String,
    default: '已選',
  },
})

const emit = defineEmits(['select'])

const userName = computed(() => props.user?.username || 'user')
</script>

<template>
  <button type="button" class="option-item user-option" @click="emit('select')">
    <span class="user-avatar" :style="{ backgroundColor: user?.icon_bg || '#e2e8f0' }">
      {{ user?.icon || '🙂' }}
    </span>
    <span class="user-label">{{ userName }}</span>
    <span v-if="selected" class="user-selected">{{ selectedLabel }}</span>
  </button>
</template>
