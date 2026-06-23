<template>
  <div v-if="totalPages > 1" class="pagination">
    <span :class="['pg', { disabled: modelValue <= 1 }]" @click="go(modelValue - 1)">«</span>
    <span
      v-for="p in pages"
      :key="p"
      :class="['pg', { current: p === modelValue, ellipsis: p === '…' }]"
      @click="typeof p === 'number' && go(p)"
    >{{ p }}</span>
    <span :class="['pg', { disabled: modelValue >= totalPages }]" @click="go(modelValue + 1)">»</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Number, required: true },
  totalPages: { type: Number, required: true },
})
const emit = defineEmits(['update:modelValue'])

function go(p) {
  if (p < 1 || p > props.totalPages || p === props.modelValue) return
  emit('update:modelValue', p)
}

const pages = computed(() => {
  const { modelValue: cur, totalPages: total } = props
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, 2, cur - 1, cur, cur + 1, total - 1, total].filter(p => p >= 1 && p <= total))
  const arr = [...set].sort((a, b) => a - b)
  const result = []
  for (let i = 0; i < arr.length; i++) {
    if (i > 0 && arr[i] - arr[i - 1] > 1) result.push('…')
    result.push(arr[i])
  }
  return result
})
</script>

<style scoped>
.pagination { display: flex; gap: 0.4rem; font-size: 0.82rem; margin-top: 1rem; flex-wrap: wrap; }
.pg { cursor: pointer; color: #888; padding: 0.1rem 0.3rem; }
.pg:hover:not(.disabled):not(.ellipsis):not(.current) { color: #333; }
.pg.current { color: #333; font-weight: bold; }
.pg.disabled { opacity: 0.3; cursor: default; }
.pg.ellipsis { cursor: default; }
</style>
