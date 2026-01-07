<script setup>
const props = defineProps({
  height: {
    type: String,
    default: '70vh',
  },
})
</script>

<template>
  <div class="scroll-panel" :style="{ maxHeight: props.height }">
    <slot />
  </div>
</template>

<style scoped>
.scroll-panel {
  overflow-y: auto;
  padding-right: 0.4rem;
}

.scroll-panel::-webkit-scrollbar {
  width: 8px;
}

.scroll-panel::-webkit-scrollbar-track {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 999px;
}

.scroll-panel::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #111827, #334155);
  border-radius: 999px;
}

.scroll-panel::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #1f2937, #475569);
}

.scroll-panel {
  scrollbar-color: #1f2937 rgba(148, 163, 184, 0.2);
  scrollbar-width: thin;
}
</style>
