<template>
  <div class="page">
    <nav class="topbar">
      <span class="topbar-title">re95</span>
      <input v-model="query" type="search" :placeholder="t('search.placeholder')" class="search-input" @input="page = 1" />
      <span class="topbar-link" @click="showCreate = !showCreate">
        {{ showCreate ? t('nav.cancel') : t('nav.new') }}
      </span>
    </nav>

    <form v-if="showCreate" class="create-form" @submit.prevent="createBoard">
      <input v-model="newId"   type="text" :placeholder="t('board.idPlaceholder')"   maxlength="20" required autofocus />
      <input v-model="newName" type="text" :placeholder="t('board.namePlaceholder')" maxlength="20" required />
      <span class="create-submit" @click="createBoard">{{ creating ? t('board.creating') : t('board.create') }}</span>
      <span v-if="createError" class="create-error">{{ createError }}</span>
    </form>

    <main class="board-list">

      <ul>
        <li v-for="board in pagedBoards" :key="board.id">
          <router-link :to="`/${board.id}/`">
            <span class="board-id">/{{ board.id }}/</span>
            <span class="board-name">{{ board.name }}</span>
          </router-link>
        </li>
        <li v-if="filteredBoards.length === 0" class="no-result">
          {{ t('board.noResult', { query }) }}
        </li>
      </ul>

      <Pagination v-model="page" :totalPages="totalPages" />
    </main>

    <footer class="site-footer">
      <span>{{ t('board.footer', { id: identity?.displayId ?? '...' }) }}</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useIdentityStore } from '../stores/identityStore'
import { useBoardsStore } from '../stores/boardsStore'
import Pagination from '../components/Pagination.vue'

const { t } = useI18n()

const identityStore = useIdentityStore()
const { identity } = storeToRefs(identityStore)

const boardsStore = useBoardsStore()
const { boards } = storeToRefs(boardsStore)

const PAGE_SIZE = 8

const query       = ref('')
const page        = ref(1)
const showCreate  = ref(false)
const newId       = ref('')
const newName     = ref('')
const creating    = ref(false)
const createError = ref('')

const filteredBoards = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return boards.value
  return boards.value.filter(b => b.id.includes(q) || b.name.includes(q))
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredBoards.value.length / PAGE_SIZE)))

const pagedBoards = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filteredBoards.value.slice(start, start + PAGE_SIZE)
})

async function createBoard() {
  if (creating.value) return
  createError.value = ''
  creating.value = true
  try {
    await boardsStore.create({ id: newId.value, name: newName.value })
    newId.value = ''
    newName.value = ''
    showCreate.value = false
  } catch (e) {
    createError.value = e.message
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  await identityStore.init()
  await boardsStore.load()
})
</script>

<style scoped>
.create-form { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0.6rem 0; font-size: 0.85rem; }
.create-form input { border: 1px solid #b7bfd9; padding: 0.25rem 0.5rem; font-size: 0.85rem; font-family: inherit; border-radius: 2px; flex: 1; min-width: 130px; outline: none; }
.create-form input:focus { border-color: #8b98e8; }
.create-submit { color: #8b98e8; cursor: pointer; }
.create-submit:hover { text-decoration: underline; }
.create-error { color: #c00; }

.board-list { padding: 0.5rem 0; }
.board-list ul { list-style: none; padding: 0; }
.board-list li { padding: 0.4rem 0; border-bottom: 1px solid #d8ddf5; }
.board-list a { text-decoration: none; color: inherit; display: flex; gap: 1rem; }
.board-list a:hover { background: #e4e8f9; }
.board-id { font-weight: bold; color: #8b98e8; width: 60px; }
.no-result { color: #999; font-size: 0.9rem; padding: 0.4rem 0; }
.site-footer { margin-top: 2rem; font-size: 0.8rem; color: #888; text-align: center; }
</style>
