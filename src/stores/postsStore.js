import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../composables/useDB'
import { sha256hex, randomHex } from '../utils/hex'
import { useIdentityStore } from './identityStore'
import { relayPush, relayUploadMedia, RELAY_MEDIA_URL } from '../composables/useSync'

const RELAY = import.meta.env.VITE_RELAY_URL ?? '/api'

const _blobUrlCache = new Map()

// iOS Safari cannot store Blob/File in IndexedDB — we store ArrayBuffer instead.
// Old records may still have a `blob` field; handle both formats.
function _mediaToBlob(media) {
  if (media.buf) return new Blob([media.buf], { type: media.mimeType })
  return media.blob
}

async function resolveMedia(post) {
  if (!post.mediaCid) return null
  if (_blobUrlCache.has(post.mediaCid)) return _blobUrlCache.get(post.mediaCid)

  const media = await db.media.get(post.mediaCid)
  if (media) {
    const url = URL.createObjectURL(_mediaToBlob(media))
    _blobUrlCache.set(post.mediaCid, url)
    return url
  }

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
      const allReplies     = await db.posts.where({ board, threadId: op.id }).sortBy('createdAt')
      const replyCount     = allReplies.length
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
        await db.media.put({ cid: mediaCid, buf, mimeType: file.type })
      }
    }

    const post = {
      id,
      board,
      threadId:  threadId ?? 'root',
      name:      name.trim() || 'Anonymous',
      title:     title?.trim() || null,
      content:   content?.trim() ?? '',
      tags:      tags?.length ? tags : null,
      mediaCid,
      createdAt: Date.now(),
      displayId: attachIdentity ? identityStore.identity?.displayId : null,
      pubkey:    attachIdentity ? identityStore.identity?.pubkey    : null,
      sig:       null,
      synced:    false,
    }

    if (attachIdentity) {
      post.sig = await identityStore.sign({ id: post.id, content: post.content })
    }

    await db.posts.put(post)

    ;(async () => {
      try {
        let relayCid = post.mediaCid
        if (file) {
          const result = await relayUploadMedia(file)
          relayCid = result.cid
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
        await db.posts.where('id').equals(post.id).modify({ synced: true })
      } catch (e) {
        console.warn('[sync] relay push failed:', e.message)
      }
    })()

    return post
  }

  async function retryPost(postId) {
    const post = await db.posts.get(postId)
    if (!post) return false
    try {
      let relayCid = post.mediaCid
      if (post.mediaCid) {
        const media = await db.media.get(post.mediaCid)
        if (media) {
          const file = new File([_mediaToBlob(media)], post.mediaCid, { type: media.mimeType })
          const result = await relayUploadMedia(file)
          relayCid = result.cid
          if (relayCid !== post.mediaCid) {
            await db.posts.where('id').equals(postId).modify({ mediaCid: relayCid })
          }
        }
      }
      await relayPush({ ...post, mediaCid: relayCid })
      await db.posts.where('id').equals(postId).modify({ synced: true })
      return true
    } catch {
      return false
    }
  }

  async function deletePost(postId) {
    const identityStore = useIdentityStore()
    const post = await db.posts.get(postId)
    await db.posts.delete(postId)

    if (post?.synced === false) return  // not on relay, skip remote delete

    const sig = await identityStore.sign({ action: 'delete', id: postId })
    if (sig) {
      fetch(`${RELAY}/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sig }),
      }).catch(() => {})
    }
  }

  return { threads, currentThread, loadBoard, loadThread, submit, retryPost, deletePost }
})
