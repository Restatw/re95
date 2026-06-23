import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../composables/useDB'
import { toHex, randomHex, sha256hex } from '../utils/hex'
import { useIdentityStore } from './identityStore'

// Track object URLs created this session to avoid leaks on re-load
const _urlCache = new Map()

async function resolveMedia(post) {
  if (!post.mediaCid) return null
  if (_urlCache.has(post.mediaCid)) return _urlCache.get(post.mediaCid)
  const media = await db.media.get(post.mediaCid)
  if (!media) return null
  const url = URL.createObjectURL(media.blob)
  _urlCache.set(post.mediaCid, url)
  return url
}

async function hydrate(post) {
  return { ...post, mediaUrl: await resolveMedia(post) }
}

export const usePostsStore = defineStore('posts', () => {
  const threads = ref([])
  const currentThread = ref([])

  async function loadBoard(board) {
    const ops = await db.posts
      .where({ board, threadId: 'root' })
      .reverse()
      .sortBy('createdAt')

    threads.value = await Promise.all(ops.map(async op => {
      const allReplies = await db.posts.where({ board, threadId: op.id }).sortBy('createdAt')
      const replyCount = allReplies.length
      const previewReplies = await Promise.all(allReplies.slice(-5).map(hydrate))
      return { ...(await hydrate(op)), replyCount, previewReplies }
    }))
  }

  async function loadThread(board, threadId) {
    const op = await db.posts.get(threadId)
    const replies = await db.posts.where({ board, threadId }).sortBy('createdAt')
    const all = op ? [op, ...replies] : []
    currentThread.value = await Promise.all(all.map(hydrate))
  }

  async function submit({ board, threadId, name, content, file, attachIdentity }) {
    const identityStore = useIdentityStore()
    const id = randomHex(16)

    let mediaCid = null
    if (file) {
      const buf = await file.arrayBuffer()
      mediaCid = crypto.subtle
        ? toHex(await crypto.subtle.digest('SHA-256', buf))
        : randomHex(16)
      if (!await db.media.get(mediaCid)) {
        await db.media.put({ cid: mediaCid, blob: file, mimeType: file.type })
      }
    }

    const post = {
      id,
      board,
      threadId: threadId ?? 'root',
      name: name.trim() || 'Anonymous',
      content: content.trim(),
      mediaCid,
      createdAt: Date.now(),
      displayId: attachIdentity ? identityStore.identity?.displayId : null,
      sig: null,
    }

    if (attachIdentity) {
      post.sig = await identityStore.sign({ id: post.id, content: post.content })
    }

    await db.posts.put(post)
    return post
  }

  return { threads, currentThread, loadBoard, loadThread, submit }
})
