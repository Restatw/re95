<template>
  <div class="post" :class="{ 'is-op': isOP, 'is-unsynced': post.synced === false }" :id="`p-${shortId}`">
    <div class="post-header">
      <span v-if="post.title" class="post-title">{{ post.title }}</span>
      <span class="author">{{ post.name || 'Anonymous' }}</span>
      <span v-if="post.displayId" class="display-id">{{ post.displayId }}</span>
      <span class="post-time">{{ formattedTime }}</span>
      <span class="post-no">No.{{ shortId }}</span>
      <a v-if="replyHref" :href="replyHref" class="reply-btn" @click.prevent="$emit('reply', shortId)">{{ $t('post.replyBtn') }}</a>
      <button v-else class="reply-btn" @click="$emit('reply', shortId)">{{ $t('post.replyBtn') }}</button>
      <button v-if="canDelete" class="del-btn" @click="handleDelete">×</button>
    </div>

    <div v-if="post.mediaUrl" class="post-media">
      <video
        v-if="isVideo"
        :src="post.mediaUrl"
        controls
        loop
        muted
        playsinline
        @click="lightbox = true"
      />
      <img v-else :src="post.mediaUrl" @click="lightbox = true" />
    </div>

    <Teleport to="body">
      <div v-if="lightbox" class="lightbox" @click="lightbox = false">
        <video v-if="isVideo" :src="post.mediaUrl" controls loop autoplay playsinline @click.stop />
        <img v-else :src="post.mediaUrl" @click.stop />
      </div>
    </Teleport>

    <div class="post-content" :class="{ 'no-content': !post.content?.trim() }" v-html="parsedContent" @click.capture="handleContentClick" />

    <div v-if="post.tags?.length" class="post-tags">
      <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
    </div>

    <div v-if="post.synced === false" class="sync-banner">
      <span class="sync-warn">⚠ 未同步至伺服器</span>
      <button class="sync-btn" :disabled="retrying" @click="handleRetry">{{ retrying ? '重試中…' : '重試' }}</button>
      <button class="sync-btn del" @click="handleDelete">刪除</button>
    </div>

    <div v-if="backLinks.length" class="back-links">
      Replies({{ backLinks.length }}):
      <a
        v-for="id in backLinks"
        :key="id"
        :href="`#p-${id}`"
        class="back-ref"
        @click.prevent="scrollToPost(id)"
      >>{{ id }}</a>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useIdentityStore } from '../stores/identityStore'
import { usePostsStore } from '../stores/postsStore'

const props = defineProps({
  post:      { type: Object, required: true },
  backLinks: { type: Array, default: () => [] },
  replyHref: { type: String, default: null },
})
const emit = defineEmits(['reply', 'deleted', 'retried'])

const lightbox = ref(false)
const retrying = ref(false)
const identityStore = useIdentityStore()
const postsStore    = usePostsStore()

const canDelete = computed(() =>
  props.post.displayId &&
  identityStore.identity?.displayId === props.post.displayId
)

async function handleRetry() {
  retrying.value = true
  const ok = await postsStore.retryPost(props.post.id)
  retrying.value = false
  if (ok) emit('retried')
}

async function handleDelete() {
  if (props.post.synced !== false) {
    if (!confirm(`刪除 No.${shortId.value}？`)) return
  }
  await postsStore.deletePost(props.post.id)
  emit('deleted', props.post.id)
}

function onKey(e) { if (e.key === 'Escape') lightbox.value = false }
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

const isOP      = computed(() => props.post.threadId === 'root')
const isVideo   = computed(() => /^video\//i.test(props.post.mediaMime ?? '') || /\.(webm|mp4)$/i.test(props.post.mediaUrl ?? ''))
const shortId   = computed(() => props.post.id.slice(0, 8))
const formattedTime = computed(() => new Date(props.post.createdAt).toLocaleString('zh-TW'))

const parsedContent = computed(() => {
  if (!props.post.content?.trim()) return '<span class="no-content-text">No content</span>'
  return props.post.content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&gt;&gt;([0-9a-f]{8})/g, '<a class="quote-link" href="#p-$1" data-id="$1">&gt;&gt;$1</a>')
    .replace(/^(&gt;(?!&gt;).+)$/gm, '<span class="greentext">$1</span>')
    .replace(/(https?:\/\/[^\s<"]+)/g, '<a class="url-link" href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, '<br>')
})

function scrollToPost(id) {
  document.getElementById(`p-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function handleContentClick(e) {
  const link = e.target.closest('.quote-link')
  if (!link || e.button !== 0 || e.ctrlKey || e.metaKey) return
  e.preventDefault()
  scrollToPost(link.dataset.id)
}

</script>

<style scoped>
.post { background: #e8eaf6; border: 1px solid #c5cae9; padding: 0.35rem 0.5rem; margin-bottom: 0.35rem; border-radius: 2px; }
.is-op { background: transparent; border: none; padding-left: 0; padding-right: 0; }
.post-header { font-size: 0.8rem; margin-bottom: 0.4rem; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.post-title { font-weight: bold; color: #c00; }
.author { font-weight: bold; color: #117743; }
.display-id { background: #ddd; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.75rem; font-family: monospace; }
.post-time { color: #555; }
.post-no { color: #888; font-size: 0.75rem; }
.reply-btn { background: none; border: none; color: #8b98e8; font-size: 0.75rem; cursor: pointer; padding: 0; text-decoration: underline; }
.reply-btn:hover { color: #5b68c8; }
.del-btn { background: none; border: none; color: #c00; font-size: 0.85rem; cursor: pointer; padding: 0 0.1rem; line-height: 1; opacity: 0.6; }
.del-btn:hover { opacity: 1; }
.post-media img, .post-media video { max-width: 200px; max-height: 200px; cursor: zoom-in; display: block; margin-bottom: 0.5rem; object-fit: contain; }
.lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 9999; cursor: zoom-out; }
.lightbox img { max-width: 92vw; max-height: 92vh; object-fit: contain; cursor: default; border-radius: 2px; }
.lightbox video { max-width: 92vw; max-height: 92vh; cursor: default; border-radius: 2px; }
.post-content { font-size: 0.9rem; line-height: 1.5; word-break: break-word; }
:deep(.greentext) { color: #789922; }
:deep(.quote-link) { color: #8b98e8; cursor: pointer; text-decoration: none; }
:deep(.quote-link:hover) { text-decoration: underline; }
:deep(.url-link) { color: #4a6fa5; word-break: break-all; }
:deep(.url-link:hover) { text-decoration: underline; }
:deep(.no-content-text) { color: #aaa; font-style: italic; }

.is-unsynced { border-style: dashed; border-color: #e8a87c; }
.is-unsynced .post-header,
.is-unsynced .post-media,
.is-unsynced .post-content,
.is-unsynced .post-tags { opacity: 0.5; }

.sync-banner { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.4rem; font-size: 0.78rem; flex-wrap: wrap; }
.sync-warn { color: #c67c2a; }
.sync-btn { border: 1px solid #c67c2a; background: none; color: #c67c2a; font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 3px; cursor: pointer; }
.sync-btn:hover:not(:disabled) { background: #c67c2a; color: #fff; }
.sync-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sync-btn.del { border-color: #c00; color: #c00; }
.sync-btn.del:hover { background: #c00; color: #fff; }
.post-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.4rem; }
.tag { font-size: 0.72rem; background: #d6daf0; color: #5b68c8; padding: 0.1rem 0.45rem; border-radius: 999px; }
.back-links { font-size: 0.75rem; color: #888; margin-top: 0.35rem; display: flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }
.back-ref { color: #8b98e8; cursor: pointer; }
.back-ref:hover { text-decoration: underline; }
</style>
