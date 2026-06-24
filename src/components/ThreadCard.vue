<template>
  <div class="thread-card">
    <Post :post="thread" :reply-href="threadUrl" @reply="goToThread" @deleted="$emit('posted')" @retried="$emit('posted')" />

    <div v-if="thread.replyCount > 5" class="omitted">
      {{ $t('post.omitted', thread.replyCount - 5) }}
    </div>

    <Post
      v-for="reply in thread.previewReplies"
      :key="reply.id"
      :post="reply"
      :reply-href="threadUrl"
      class="preview-reply"
      @reply="goToThread"
      @deleted="$emit('posted')"
      @retried="$emit('posted')"
    />

    <div v-if="thread.replyCount > 5" class="reply-info">
      <router-link :to="`/${board}/thread/${thread.id}`">
        {{ $t('post.viewAll', thread.replyCount) }}
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Post from './Post.vue'

const props = defineProps({
  thread: { type: Object, required: true },
  board:  { type: String, required: true },
})

const router = useRouter()
const threadUrl = computed(() => `/${props.board}/thread/${props.thread.id}`)

function goToThread() {
  router.push(threadUrl.value)
}
</script>

<style scoped>
.thread-card { margin-bottom: 0.75rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; }
.omitted { font-size: 0.8rem; color: #888; padding: 0.25rem 0.5rem; font-style: italic; }
.reply-info { font-size: 0.8rem; margin-top: 0.4rem; }
.reply-info a { color: #8b98e8; text-decoration: none; }
</style>
