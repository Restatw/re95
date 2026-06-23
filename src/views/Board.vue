<template>
  <div class="page">
    <nav class="topbar" :class="{ searching }">
      <span class="breadcrumb">
        <router-link to="/">re95</router-link>
        <span> / {{ board }}</span>
      </span>
      <input
        v-model="query"
        type="search"
        :placeholder="t('search.placeholder')"
        class="search-input"
        @input="page = 1"
        @focus="searching = true"
        @blur="onSearchBlur"
      />
      <router-link :to="`/${board}/catalog`" class="topbar-link">{{ t('board.catalog') }}</router-link>
      <span class="topbar-link" @click="toggleNewPost">
        {{ showNewPost ? t('nav.cancel') : t('nav.new') }}
      </span>
    </nav>

    <PostForm
      v-if="showNewPost"
      ref="newPostFormRef"
      :board="board"
      @posted="onPosted"
    />

    <Pagination v-model="page" :totalPages="totalPages" top :always="threads.length > 0" />

    <div class="thread-list">
      <ThreadCard
        v-for="thread in pagedThreads"
        :key="thread.id"
        :thread="thread"
        :board="board"
        @posted="load"
      />
      <p v-if="filteredThreads.length === 0 && threads.length > 0" class="empty">
        {{ t('thread.noResult', { query }) }}
      </p>
      <p v-if="threads.length === 0" class="empty">{{ t('board.noThreads') }}</p>
    </div>

    <Pagination v-model="page" :totalPages="totalPages" :always="threads.length > 0" />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { usePostsStore } from '../stores/postsStore'
import PostForm from '../components/PostForm.vue'
import ThreadCard from '../components/ThreadCard.vue'
import Pagination from '../components/Pagination.vue'

const { t } = useI18n()

const route = useRoute()
const board = route.params.board
const postsStore = usePostsStore()
const { threads } = storeToRefs(postsStore)

const PAGE_SIZE = 10

const query          = ref('')
const page           = ref(1)
const searching      = ref(false)
const showNewPost    = ref(false)
const newPostFormRef = ref(null)

const filteredThreads = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return threads.value
  return threads.value.filter(t =>
    t.content?.toLowerCase().includes(q) ||
    t.name?.toLowerCase().includes(q)
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredThreads.value.length / PAGE_SIZE)))

const pagedThreads = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filteredThreads.value.slice(start, start + PAGE_SIZE)
})

function onSearchBlur() { setTimeout(() => { searching.value = false }, 150) }

async function toggleNewPost() {
  showNewPost.value = !showNewPost.value
  if (showNewPost.value) {
    await nextTick()
    newPostFormRef.value?.open()
  }
}

async function onPosted() {
  showNewPost.value = false
  page.value = 1
  await load()
}

async function load() {
  await postsStore.loadBoard(board)
}

onMounted(load)
</script>

<style scoped>
.breadcrumb { white-space: nowrap; }
.thread-list { margin-top: 0.5rem; }
</style>
