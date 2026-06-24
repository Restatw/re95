import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../composables/useDB'
import { sha256hex, randomHex } from '../utils/hex'
import { useIdentityStore } from './identityStore'
import { relayPush, relayUploadMedia, RELAY_MEDIA_URL } from '../composables/useSync'

const RELAY = import.meta.env.VITE_RELAY_URL ?? '/api'

// Cache only blob: URLs (expensive to create). Relay URLs are cheap strings —
// they are NOT cached so that the version suffix from RELAY_MEDIA_URL() stays
// current after a back-fill upload (state.mediaSynced bump).
const _blobUrlCache = new Map()

async function resolveMedia(post) {
  if (!post.mediaCid) return null
  if (_blobUrlCache.has(post.mediaCid)) return _blobUrlCache.get(post.mediaCid)

  const media = await db.media.get(post.mediaCid)
  if (media) {
    const url = URL.createObjectURL(media.blob)
    _blobUrlCache.set(post.mediaCid, url)
    return url
  }

  // No local blob — return relay URL with current version suffix.
  // Not cached: version changes after back-fill, letting Vue update <img src>.
  return RELAY_MEDIA_URL(post.mediaCid)
}

async function hydrate(post) {
  return { ...post, mediaUrl: await resolveMedia(post) }
}

export const usePostsStore = defineStore('posts', () => {
  const threads       = ref([])
  const currentThread = ref([])

  async function loadBoard(board) {
    const ops = await db.posts
      .where({ board, threadId: 'root' })
      .reverse()
      .sortBy('createdAt')

    threads.value = await Promise.all(ops.map(async op => {
      const allReplies    = await db.posts.where({ board, threadId: op.id }).sortBy('createdAt')
      const replyCount    = allReplies.length
      const previewReplies = await Promise.all(allReplies.slice(-5).map(hydrate))
      return { ...(await hydrate(op)), replyCount, previewReplies }
    }))
  }

  async function loadThread(board, threadId) {
    const op      = await db.posts.get(threadId)
    const replies = await db.posts.where({ board, threadId }).sortBy('createdAt')
    const all     = op ? [op, ...replies] : []
    currentThread.value = await Promise.all(all.map(hydrate))
  }

  async function submit({ board, threadId, name, title, content, tags, file, attachIdentity, cfToken }) {
    const identityStore = useIdentityStore()
    const id = randomHex(16)

    let mediaCid = null
    if (file) {
      const buf = await file.arrayBuffer()
      mediaCid = await sha256hex(buf)
      if (!await db.media.get(mediaCid)) {
        await db.media.put({ cid: mediaCid, blob: file, mimeType: file.type })
      }
    }

    const post = {
      id,
      board,
      threadId:  threadId ?? 'root',
      name:      name.trim() || 'Anonymous',
      title:     title?.trim() || null,
      content:   content.trim(),
      tags:      tags?.length ? tags : null,
      mediaCid,
      createdAt: Date.now(),
      displayId: attachIdentity ? identityStore.identity?.displayId : null,
      pubkey:    attachIdentity ? identityStore.identity?.pubkey    : null,
      sig:       null,
    }

    if (attachIdentity) {
      post.sig = await identityStore.sign({ id: post.id, content: post.content })
    }

    await db.posts.put(post)

    // Fire-and-forget relay push — failure doesn't block the local write
    ;(async () => {
      try {
        let relayCid = post.mediaCid
        if (file) {
          const result = await relayUploadMedia(file)
          relayCid = result.cid
          // When crypto.subtle is unavailable (HTTP non-localhost), the local CID
          // is a random hex while the relay computes the real SHA-256. Fix the mismatch
          // so cross-device clients can find the media by the authoritative CID.
          if (relayCid !== post.mediaCid) {
            await db.posts.where('id').equals(post.id).modify({ mediaCid: relayCid })
            const oldMedia = await db.media.get(post.mediaCid)
            if (oldMedia) {
              await db.media.put({ ...oldMedia, cid: relayCid })
              await db.media.delete(post.mediaCid)
            }
          }
        }
        await relayPush({ ...post, mediaCid: relayCid }, cfToken)
      } catch (e) {
        console.warn('[sync] relay push failed:', e.message)
      }
    })()

    return post
  }

  async function deletePost(postId) {
    const identityStore = useIdentityStore()
    await db.posts.delete(postId)

    // Sign and call relay
    const sig = await identityStore.sign({ action: 'delete', id: postId })
    if (sig) {
      fetch(`${RELAY}/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sig }),
      }).catch(() => {})
    }
  }

  return { threads, currentThread, loadBoard, loadThread, submit, deletePost }
})
