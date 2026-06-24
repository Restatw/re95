<template>
  <div class="post" :class="{ 'is-op': isOP }" :id="`p-${shortId}`">
    <div class="post-header">
      <span v-if="post.title" class="post-title">{{ post.title }}</span>
      <span class="author">{{ post.name || 'Anonymous' }}</span>
      <span v-if="post.displayId" class="display-id">{{ post.displayId }}</span>
      <span class="post-time">{{ formattedTime }}</span>
      <span class="post-no">No.{{ shortId }}</span>
      <a v-if="replyHref" :href="replyHref" class="reply-btn" @click.prevent="$emit('reply', shortId)">{{ $t('post.replyBtn') }}</a>
      <button v-else class="reply-btn" @click="$emit('reply', shortId)">{{ $t('post.replyBtn') }}</button>
    </div>

    <div v-if="post.mediaUrl" class="post-media">
      <img :src="post.mediaUrl" @click="lightbox = true" />
    </div>

    <Teleport to="body">
      <div v-if="lightbox" class="lightbox" @click="lightbox = false">
        <img :src="post.mediaUrl" @click.stop />
      </div>
    </Teleport>

    <div class="post-content" :class="{ 'no-content': !post.content?.trim() }" v-html="parsedContent" @click.capture="handleContentClick" />

    <div v-if="post.tags?.length" class="post-tags">
      <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
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

const props = defineProps({
  post:      { type: Object, required: true },
  backLinks: { type: Array, default: () => [] },
  replyHref: { type: String, default: null },
})
defineEmits(['reply'])

const lightbox = ref(false)

function onKey(e) { if (e.key === 'Escape') lightbox.value = false }
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

const isOP      = computed(() => props.post.threadId === 'root')
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
.post-media img { max-width: 200px; max-height: 200px; cursor: zoom-in; display: block; margin-bottom: 0.5rem; object-fit: contain; }
.lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 9999; cursor: zoom-out; }
.lightbox img { max-width: 92vw; max-height: 92vh; object-fit: contain; cursor: default; border-radius: 2px; }
.post-content { font-size: 0.9rem; line-height: 1.5; word-break: break-word; }
:deep(.greentext) { color: #789922; }
:deep(.quote-link) { color: #8b98e8; cursor: pointer; text-decoration: none; }
:deep(.quote-link:hover) { text-decoration: underline; }
:deep(.url-link) { color: #4a6fa5; word-break: break-all; }
:deep(.url-link:hover) { text-decoration: underline; }
:deep(.no-content-text) { color: #aaa; font-style: italic; }
.post-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.4rem; }
.tag { font-size: 0.72rem; background: #d6daf0; color: #5b68c8; padding: 0.1rem 0.45rem; border-radius: 999px; }
.back-links { font-size: 0.75rem; color: #888; margin-top: 0.35rem; display: flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }
.back-ref { color: #8b98e8; cursor: pointer; }
.back-ref:hover { text-decoration: underline; }
</style>
