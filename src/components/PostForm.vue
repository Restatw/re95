<template>
  <div class="post-form">
    <details ref="detailsEl">
      <summary>{{ isNewThread ? t('post.newThread') : t('post.reply') }}</summary>
      <form @submit.prevent="submit">
        <div class="form-row">
          <label>{{ t('post.name') }}</label>
          <input v-model="name" type="text" placeholder="Anonymous" maxlength="50" />
        </div>

        <div v-if="isNewThread" class="form-row">
          <label>{{ t('post.title') }}</label>
          <input v-model="title" type="text" maxlength="100" />
        </div>

        <div class="form-row">
          <label>{{ t('post.content') }}</label>
          <textarea ref="textareaEl" v-model="content" rows="4" required maxlength="2000" />
        </div>

        <div class="form-row">
          <label>{{ t('post.image') }}</label>
          <input type="file" accept="image/*" @change="onFile" ref="fileInput" />
        </div>

        <div v-if="isNewThread" class="form-row">
          <label>{{ t('post.tags') }}</label>
          <input v-model="tagsInput" type="text" :placeholder="t('post.tagsHint')" maxlength="100" />
        </div>

        <div v-if="error" class="form-error">{{ error }}</div>

        <div class="form-actions">
          <button type="submit" :disabled="submitting">
            {{ submitting ? t('post.submitting') : t('post.submit') }}
          </button>
        </div>
      </form>
    </details>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIdentityStore } from '../stores/identityStore'
import { usePostsStore } from '../stores/postsStore'

const { t } = useI18n()

const props = defineProps({
  board:       { type: String, required: true },
  threadId:    { type: String, default: null },
  defaultOpen: { type: Boolean, default: false },
})
const emit = defineEmits(['posted'])

const isNewThread = computed(() => !props.threadId)

const name       = ref('')
const title      = ref('')
const content    = ref('')
const tagsInput  = ref('')
const file       = ref(null)
const submitting = ref(false)
const error          = ref('')
const detailsEl      = ref(null)
const textareaEl     = ref(null)
const fileInput      = ref(null)

const identityStore = useIdentityStore()
const postsStore    = usePostsStore()

onMounted(() => {
  identityStore.init()
  if (props.defaultOpen && detailsEl.value) detailsEl.value.open = true
})

function onFile(e) {
  file.value = e.target.files[0] ?? null
}

async function submit() {
  if (!content.value.trim()) return
  error.value = ''
  submitting.value = true
  try {
    const tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean)
    const post = await postsStore.submit({
      board:          props.board,
      threadId:       props.threadId,
      name:           name.value,
      title:          title.value,
      content:        content.value,
      tags,
      file:           file.value,
      attachIdentity: true,
    })
    name.value = ''
    title.value = ''
    content.value = ''
    tagsInput.value = ''
    file.value = null
    if (fileInput.value) fileInput.value.value = ''
    emit('posted', post)
  } catch (e) {
    console.error('[PostForm] submit error:', e)
    error.value = e?.message ?? String(e)
  } finally {
    submitting.value = false
  }
}

function insertQuote(shortId) {
  if (detailsEl.value) detailsEl.value.open = true
  content.value = `>>${shortId}\n` + content.value
  nextTick(() => textareaEl.value?.focus())
}

function open() {
  if (detailsEl.value) detailsEl.value.open = true
}

defineExpose({ insertQuote, open })
</script>

<style scoped>
.post-form { background: #d6daf0; border: 1px solid #b7bfd9; padding: 0.5rem 1rem; margin-bottom: 1rem; border-radius: 2px; }
summary { cursor: pointer; font-weight: bold; font-size: 0.9rem; }
form { margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
.form-row { display: flex; gap: 0.5rem; align-items: flex-start; }
.form-row label { width: 60px; font-size: 0.85rem; padding-top: 0.2rem; flex-shrink: 0; }
input[type="text"], textarea { flex: 1; border: 1px solid #aaa; padding: 0.3rem; font-size: 0.9rem; font-family: inherit; }
textarea { resize: vertical; }
.form-error { color: #c00; font-size: 0.85rem; background: #fee; border: 1px solid #fcc; padding: 0.3rem 0.5rem; border-radius: 2px; }
.form-actions { display: flex; justify-content: flex-end; }
button[type="submit"] { background: #8b98e8; color: white; border: none; padding: 0.4rem 1.2rem; cursor: pointer; font-size: 0.9rem; }
button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
