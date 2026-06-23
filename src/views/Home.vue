<template>
  <div class="page">
    <nav class="topbar" :class="{ searching }">
      <span class="topbar-title">re95</span>
      <input
        v-model="query"
        type="search"
        :placeholder="t('search.placeholder')"
        class="search-input"
        @input="page = 1"
        @focus="searching = true"
        @blur="onSearchBlur"
      />
      <span class="topbar-id">{{ identity?.displayId ?? '...' }}</span>
    </nav>

    <main class="board-list">
      <div class="view-toggle">
        <span :class="['vt-btn', { active: viewMode === 'modern' }]" @click="setView('modern')" title="Modern">⊞</span>
        <span :class="['vt-btn', { active: viewMode === 'classic' }]" @click="setView('classic')" title="Classic">≡</span>
      </div>
      <Pagination v-model="page" :totalPages="totalPages" top />

      <!-- modern grid -->
      <div v-if="viewMode === 'modern'" class="board-grid">
        <router-link
          v-for="board in pagedBoards"
          :key="board.id"
          :to="`/${board.id}/`"
          class="board-card"
        >
          <span class="board-emoji">{{ emoji(board) }}</span>
          <span class="board-name">{{ board.name }}</span>
          <span class="board-id">/{{ board.id }}/</span>
        </router-link>

        <div v-if="filteredBoards.length === 0" class="no-result">
          {{ t('board.noResult', { query }) }}
        </div>

        <div class="board-card board-new" @click="showCreate = true">
          <span class="board-emoji">+</span>
          <span class="board-name">{{ t('board.newBoard') }}</span>
        </div>
      </div>

      <!-- classic list -->
      <div v-else class="board-classic">
        <div v-if="filteredBoards.length === 0" class="no-result">
          {{ t('board.noResult', { query }) }}
        </div>
        <router-link
          v-for="board in filteredBoards"
          :key="board.id"
          :to="`/${board.id}/`"
          class="classic-item"
        >
          <span class="classic-emoji">{{ emoji(board) }}</span>
          <span class="classic-id">/{{ board.id }}/</span>
          <span class="classic-name">{{ board.name }}</span>
        </router-link>
        <span class="classic-new" @click="showCreate = true">+</span>
      </div>

      <Pagination v-model="page" :totalPages="totalPages" />
    </main>

    <!-- modal -->
    <Teleport to="body">
      <div v-if="showCreate" class="modal-backdrop" @click.self="closeModal">
        <div class="modal">
          <div class="modal-header">
            <span>{{ t('nav.new') }}</span>
            <span class="modal-close" @click="closeModal">✕</span>
          </div>
          <form @submit.prevent="createBoard" class="modal-form">
            <EmojiPicker v-model="newEmoji" />
            <input v-model="newId" type="text" :placeholder="t('board.idPlaceholder')" maxlength="20" required autofocus />
            <input v-model="newName" type="text" :placeholder="t('board.namePlaceholder')" maxlength="20" required />
            <div v-if="createError" class="modal-error">{{ createError }}</div>
            <div class="modal-actions">
              <span class="modal-cancel" @click="closeModal">{{ t('nav.cancel') }}</span>
              <button type="submit" :disabled="creating">
                {{ creating ? t('board.creating') : t('board.create') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useIdentityStore } from '../stores/identityStore'
import { useBoardsStore } from '../stores/boardsStore'
import Pagination from '../components/Pagination.vue'
import EmojiPicker from '../components/EmojiPicker.vue'

const { t } = useI18n()

const identityStore = useIdentityStore()
const { identity } = storeToRefs(identityStore)

const boardsStore = useBoardsStore()
const { boards } = storeToRefs(boardsStore)

const PAGE_SIZE = 40

const EMOJI = {
  b:'🎲', img:'🖼️', tech:'⚙️', prog:'💻', ani:'🎌', comic:'📚',
  moe:'💕', gam:'🎮', vn:'📖', mu:'🎵', tv:'🎬', sp:'⚽',
  news:'📰', pol:'🏛️', fin:'💰', crypto:'🪙', sci:'🔬', space:'🚀',
  his:'🏺', lang:'💬', edu:'🎓', law:'⚖️', art:'🎨', design:'✏️',
  photo:'📷', food:'🍜', fit:'💪', med:'🏥', travel:'✈️', pet:'🐾',
  car:'🚗', fashion:'👗', diy:'🔨', arch:'🏗️', env:'🌱', lit:'📝', cos:'🎭',
}

const emoji = board => board.emoji || EMOJI[board.id] || '📌'

const query      = ref('')
const page       = ref(1)
const searching  = ref(false)
const showCreate = ref(false)
const newId      = ref('')
const newName    = ref('')
const newEmoji   = ref('')
const creating   = ref(false)
const createError = ref('')
const viewMode   = ref(localStorage.getItem('re95-view') || 'modern')

function setView(mode) {
  viewMode.value = mode
  localStorage.setItem('re95-view', mode)
}

const filteredBoards = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return boards.value
  return boards.value.filter(b => b.id.includes(q) || b.name.includes(q))
})

const totalPages = computed(() =>
  viewMode.value === 'modern'
    ? Math.max(1, Math.ceil(filteredBoards.value.length / PAGE_SIZE))
    : 1
)

const pagedBoards = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filteredBoards.value.slice(start, start + PAGE_SIZE)
})


function onSearchBlur() { setTimeout(() => { searching.value = false }, 150) }

function closeModal() {
  showCreate.value = false
  createError.value = ''
}

function onKey(e) { if (e.key === 'Escape') closeModal() }
onMounted(async () => {
  await identityStore.init()
  await boardsStore.load()
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))

async function createBoard() {
  if (creating.value) return
  createError.value = ''
  creating.value = true
  try {
    await boardsStore.create({ id: newId.value, name: newName.value, emoji: newEmoji.value })
    newId.value = ''
    newName.value = ''
    newEmoji.value = ''
    showCreate.value = false
  } catch (e) {
    createError.value = e.message
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.topbar-id { font-size: 0.78rem; color: #bbb; white-space: nowrap; letter-spacing: 0.03em; }

.view-toggle {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0 0.1rem;
}
.vt-btn {
  cursor: pointer;
  font-size: 1.05rem;
  color: #ccc;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  line-height: 1;
  border: 1px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.vt-btn:hover { color: #8b98e8; }
.vt-btn.active { color: #8b98e8; border-color: #d0d5f5; }

.board-list { padding: 0.25rem 0; }

/* ── modern grid ── */
.board-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.6rem;
  padding: 0.5rem 0;
}
.board-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.85rem 0.5rem 0.7rem;
  background: #fff;
  border: 1px solid #dde1f5;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
}
.board-card:hover {
  border-color: #8b98e8;
  box-shadow: 0 2px 8px rgba(139,152,232,0.18);
  transform: translateY(-2px);
}
.board-emoji { font-size: 1.6rem; line-height: 1; }
.board-name  { font-size: 0.82rem; color: #333; font-weight: 500; text-align: center; }
.board-id    { font-size: 0.72rem; color: #8b98e8; }
.board-new .board-emoji { font-size: 1.8rem; color: #8b98e8; font-weight: 300; }
.board-new .board-name  { color: #8b98e8; }
.board-new { border-style: dashed; cursor: pointer; }

/* ── classic list ── */
.board-classic { padding: 0.4rem 0; line-height: 2; }
.classic-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1rem 0.5rem 0.1rem 0.25rem;
  text-decoration: none;
  color: #555;
  border-radius: 4px;
  font-size: 0.84rem;
  transition: background 0.12s;
}
.classic-item:hover { background: #eef2ff; }
.classic-emoji { font-size: 0.95rem; line-height: 1; }
.classic-id   { color: #8b98e8; font-size: 0.8rem; }
.classic-name { color: #777; }
.classic-new {
  display: inline-flex;
  align-items: center;
  font-size: 1rem;
  color: #c5cae9;
  cursor: pointer;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  transition: background 0.12s, color 0.12s;
  vertical-align: middle;
}
.classic-new:hover { background: #eef2ff; color: #8b98e8; }

.no-result { color: #999; font-size: 0.9rem; padding: 2rem; text-align: center; grid-column: 1 / -1; }

/* ── modal ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  padding: 1rem;
}
.modal {
  background: #fff;
  border-radius: 10px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.9rem 1.1rem 0.6rem;
  font-size: 0.88rem;
  font-weight: bold;
  color: #444;
  border-bottom: 1px solid #eef2ff;
  border-radius: 10px 10px 0 0;
}
.modal-close { cursor: pointer; color: #bbb; font-size: 0.9rem; }
.modal-close:hover { color: #888; }
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.9rem 1.1rem 1.1rem;
}
.modal-form :deep(.emoji-picker-wrap) { width: 100%; }
.modal-form :deep(.emoji-trigger) {
  width: 100%;
  border-bottom: 1px solid #d8ddf5;
  padding: 0.5rem 0.2rem;
  font-size: 1.4rem;
}
.modal-form :deep(.emoji-trigger:hover),
.modal-form :deep(.emoji-trigger:focus) { border-bottom-color: #8b98e8; }
.modal-form :deep(.emoji-dropdown) { width: 100%; }
.modal-form input {
  border: none;
  border-bottom: 1px solid #d8ddf5;
  background: transparent;
  padding: 0.35rem 0.2rem;
  font-size: 0.88rem;
  font-family: inherit;
  outline: none;
  color: #333;
  width: 100%;
}
.modal-form input::placeholder { color: #bbb; }
.modal-form input:focus { border-bottom-color: #8b98e8; }
.modal-error { color: #c00; font-size: 0.78rem; }
.modal-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
  margin-top: 0.25rem;
}
.modal-cancel { font-size: 0.85rem; color: #aaa; cursor: pointer; }
.modal-cancel:hover { color: #888; }
.modal-actions button {
  background: #8b98e8;
  color: #fff;
  border: none;
  padding: 0.4rem 1.2rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  font-family: inherit;
}
.modal-actions button:hover { background: #6b78c8; }
.modal-actions button:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
