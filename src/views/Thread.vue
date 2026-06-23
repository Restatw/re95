<template>
  <div class="page">
    <nav class="topbar">
      <router-link to="/">re95</router-link>
      <span> / </span>
      <router-link :to="`/${board}/`">{{ board }}</router-link>
      <span> / {{ t('thread.breadcrumb', { id: shortId }) }}</span>
    </nav>

    <PostForm ref="postFormRef" :board="board" :threadId="threadId" @posted="load" />

    <div class="posts">
      <Post
        v-for="post in currentThread"
        :key="post.id"
        :post="post"
        :back-links="backLinksMap[post.id.slice(0, 8)] ?? []"
        @reply="handleReply"
      />
      <p v-if="currentThread.length === 0" class="empty">{{ t('thread.notFound') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { usePostsStore } from '../stores/postsStore'
import { useSync } from '../composables/useSync'
import Post from '../components/Post.vue'
import PostForm from '../components/PostForm.vue'

const { t } = useI18n()

const route = useRoute()
const board = route.params.board
const threadId = route.params.id
const shortId = threadId.slice(0, 8)

const postsStore = usePostsStore()
const { currentThread } = storeToRefs(postsStore)
const postFormRef = ref(null)
const { lastPost, subscribe, pull } = useSync()

const backLinksMap = computed(() => {
  const map = {}
  for (const post of currentThread.value) {
    for (const [, id] of post.content.matchAll(/>>([0-9a-f]{8})/g)) {
      ;(map[id] ??= []).push(post.id.slice(0, 8))
    }
  }
  return map
})

function handleReply(quotedShortId) {
  postFormRef.value?.insertQuote(quotedShortId)
}

async function load() {
  await postsStore.loadThread(board, threadId)
}

// Reload thread when a reply or a new OP matching this thread arrives via WS
watch(lastPost, post => {
  if (post?.threadId === threadId || post?.id === threadId) load()
})

onMounted(async () => {
  await load()
  subscribe(board)
  const n = await pull(board)
  if (n) load()
  postFormRef.value?.open()
})
</script>

<style scoped>
.posts { margin-top: 0.4rem; }
</style>
