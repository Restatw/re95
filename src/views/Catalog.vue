<template>
  <div class="page">
    <nav class="topbar" :class="{ searching }">
      <span class="breadcrumb">
        <router-link to="/">re95</router-link>
        <span> / <router-link :to="`/${board}/`">{{ board }}</router-link></span>
        <span> / {{ t('board.catalog') }}</span>
      </span>
      <input
        v-model="query"
        type="search"
        :placeholder="t('search.placeholder')"
        class="search-input"
        @focus="searching = true"
        @blur="onSearchBlur"
      />
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

    <div v-if="filtered.length === 0" class="empty">
      {{ threads.length === 0 ? t('board.noThreads') : t('thread.noResult', { query }) }}
    </div>

    <div class="catalog-grid">
      <router-link
        v-for="thread in filtered"
        :key="thread.id"
        :to="`/${board}/thread/${thread.id}`"
        class="cat-card"
      >
        <div class="cat-thumb">
          <img v-if="thread.mediaUrl" :src="thread.mediaUrl" :alt="thread.title || ''" />
          <div v-else class="cat-thumb-placeholder">
            <span>{{ thread.title?.[0] || thread.name?.[0] || '?' }}</span>
          </div>
        </div>
        <div class="cat-info">
          <div v-if="thread.title" class="cat-title">{{ thread.title }}</div>
          <div class="cat-snippet">{{ thread.content }}</div>
          <div class="cat-meta">
            <span class="cat-replies">{{ t('post.omitted', thread.replyCount, { count: thread.replyCount }) }}</span>
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { usePostsStore } from '../stores/postsStore'
import PostForm from '../components/PostForm.vue'

const { t } = useI18n()
const route = useRoute()
const board = route.params.board
const postsStore = usePostsStore()
const { threads } = storeToRefs(postsStore)

const query       = ref('')
const searching   = ref(false)
const showNewPost = ref(false)
const newPostFormRef = ref(null)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return threads.value
  return threads.value.filter(t =>
    t.title?.toLowerCase().includes(q) ||
    t.content?.toLowerCase().includes(q) ||
    t.name?.toLowerCase().includes(q)
  )
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
  await postsStore.loadBoard(board)
}

onMounted(() => postsStore.loadBoard(board))
</script>

<style scoped>
.breadcrumb { white-space: nowrap; }

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.cat-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #dde1f5;
  border-radius: 8px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
}
.cat-card:hover {
  border-color: #8b98e8;
  box-shadow: 0 2px 8px rgba(139,152,232,0.15);
  transform: translateY(-2px);
}

.cat-thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: #eef2ff;
  flex-shrink: 0;
}
.cat-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cat-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #b7bfd9;
  font-weight: bold;
  user-select: none;
}

.cat-info {
  padding: 0.5rem 0.55rem 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-height: 0;
}
.cat-title {
  font-size: 0.78rem;
  font-weight: bold;
  color: #c00;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
.cat-snippet {
  font-size: 0.74rem;
  color: #555;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.cat-meta {
  margin-top: 0.2rem;
  font-size: 0.7rem;
  color: #aaa;
}
</style>
