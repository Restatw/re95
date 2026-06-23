<template>
  <div class="post" :class="{ 'is-op': isOP }">
    <div class="post-header">
      <span class="author">{{ post.name || 'Anonymous' }}</span>
      <span v-if="post.displayId" class="display-id">{{ post.displayId }}</span>
      <span class="post-time">{{ formattedTime }}</span>
      <span class="post-no">No.{{ shortId }}</span>
      <button class="reply-btn" @click="$emit('reply', shortId)">{{ $t('post.replyBtn') }}</button>
    </div>

    <div v-if="post.mediaUrl" class="post-media">
      <img :src="post.mediaUrl" @click="openMedia" />
    </div>

    <div class="post-content" v-html="parsedContent" />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  post: { type: Object, required: true },
})
defineEmits(['reply'])

const isOP = computed(() => props.post.threadId === 'root')
const shortId = computed(() => props.post.id.slice(0, 8))
const formattedTime = computed(() => {
  return new Date(props.post.createdAt).toLocaleString('zh-TW')
})

const parsedContent = computed(() => {
  return props.post.content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^(&gt;.+)$/gm, '<span class="greentext">$1</span>')
    .replace(/\n/g, '<br>')
})

function openMedia() {
  window.open(props.post.mediaUrl, '_blank')
}
</script>

<style scoped>
.post { background: #e8eaf6; border: 1px solid #c5cae9; padding: 0.35rem 0.5rem; margin-bottom: 0.35rem; border-radius: 2px; }
.is-op { background: transparent; border: none; padding-left: 0; padding-right: 0; }
.post-header { font-size: 0.8rem; margin-bottom: 0.4rem; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.author { font-weight: bold; color: #117743; }
.display-id { background: #ddd; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.75rem; font-family: monospace; }
.post-time { color: #555; }
.post-no { color: #888; font-size: 0.75rem; }
.reply-btn { background: none; border: none; color: #8b98e8; font-size: 0.75rem; cursor: pointer; padding: 0; text-decoration: underline; }
.reply-btn:hover { color: #5b68c8; }
.post-media img { max-width: 200px; max-height: 200px; cursor: pointer; display: block; margin-bottom: 0.5rem; object-fit: contain; }
.post-content { font-size: 0.9rem; line-height: 1.5; word-break: break-word; }
:deep(.greentext) { color: #789922; }
</style>
