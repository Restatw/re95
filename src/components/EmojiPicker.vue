<template>
  <div class="emoji-picker-wrap" ref="wrapEl">
    <button type="button" class="emoji-trigger" @click="open = !open">
      <span v-if="modelValue" class="emoji-value">{{ modelValue }}</span>
      <span v-else class="emoji-placeholder">
        <span class="emoji-placeholder-icon">🙂</span>
        <span class="emoji-placeholder-label">選擇圖示</span>
      </span>
    </button>

    <div v-if="open" class="emoji-dropdown">
      <div class="emoji-sections">
        <div v-for="section in SECTIONS" :key="section.label" class="emoji-section">
          <div class="section-label">{{ section.label }}</div>
          <div class="emoji-grid">
            <button
              v-for="e in section.emojis"
              :key="e"
              type="button"
              class="emoji-btn"
              :class="{ selected: modelValue === e }"
              @click="pick(e)"
            >{{ e }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({ modelValue: { type: String, default: '' } })
const emit  = defineEmits(['update:modelValue'])

const open   = ref(false)
const wrapEl = ref(null)

const SECTIONS = [
  {
    label: 'General',
    emojis: ['🎲','📌','🔥','⭐','💡','🗂️','📣','🆕'],
  },
  {
    label: 'Tech',
    emojis: ['💻','⚙️','🔬','🚀','🤖','📡','🔭','🛰️','🧬','⚡','🔐','🖥️'],
  },
  {
    label: 'Anime / Art',
    emojis: ['🎌','📚','💕','🎭','🎨','✏️','📷','🖼️','🎬','🎵','🎮','📖'],
  },
  {
    label: 'Society',
    emojis: ['📰','🏛️','⚖️','💰','🪙','🎓','🏥','🌍','🌱','🕊️','🗳️','🤝'],
  },
  {
    label: 'Lifestyle',
    emojis: ['🍜','✈️','🐾','🚗','👗','🔨','🏗️','💪','⚽','🎾','🏺','📝'],
  },
  {
    label: 'Symbols',
    emojis: ['🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔶','🔷','🔸'],
  },
]

function pick(e) {
  emit('update:modelValue', e)
  open.value = false
}

function onOutside(e) {
  if (wrapEl.value && !wrapEl.value.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('pointerdown', onOutside))
onUnmounted(() => document.removeEventListener('pointerdown', onOutside))
</script>

<style scoped>
.emoji-picker-wrap { position: relative; flex-shrink: 0; }

.emoji-trigger {
  width: 36px;
  border: none;
  border-bottom: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-size: 1.1rem;
  display: flex; align-items: center; justify-content: center;
  padding: 0.3rem 0.2rem;
  outline: none;
  transition: border-color 0.15s;
}
.emoji-trigger:hover,
.emoji-trigger:focus { border-bottom-color: #8b98e8; }
.emoji-value { font-size: 1.3rem; line-height: 1; }
.emoji-placeholder { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; }
.emoji-placeholder-icon  { font-size: 1.5rem; line-height: 1; opacity: 0.45; }
.emoji-placeholder-label { font-size: 0.7rem; color: #bbb; white-space: nowrap; }

.emoji-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 200;
  background: #fff;
  border: 1px solid #c5cae9;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(139,152,232,0.18);
  width: 260px;
  max-height: 300px;
  overflow-y: auto;
  padding: 0.5rem;
}

.emoji-section { margin-bottom: 0.5rem; }
.section-label { font-size: 0.68rem; color: #aaa; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
.emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }

.emoji-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1.15rem;
  padding: 0.2rem;
  border-radius: 4px;
  line-height: 1;
  transition: background 0.1s;
}
.emoji-btn:hover   { background: #eef2ff; }
.emoji-btn.selected { background: #d6daf0; }
</style>
