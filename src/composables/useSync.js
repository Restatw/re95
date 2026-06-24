import { reactive, toRefs } from 'vue'
import { db } from './useDB'

const RELAY = import.meta.env.VITE_RELAY_URL ?? '/api'

// ── Singleton WS state ────────────────────────────────────────────────────────

const state = reactive({
  online:      false,
  syncing:     false,
  error:       null,
  lastPost:    null,   // most recent post written (from WS push or delta pull)
  lastDelete:  null,   // most recent delete { id, board } pushed from relay
  mediaSynced: 0,      // increments each time back-fill uploads ≥1 blob
})

let _ws             = null
let _reconnectTimer = null
let _mediaSyncTimer = null
const _boards       = new Set()

function _wsUrl() {
  if (RELAY.startsWith('/')) {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${location.host}/ws`
  }
  return RELAY
    .replace(/^http(s?):\/\//, (_, s) => `ws${s}://`)
    .replace(/\/api$/, '/ws')
}

function _send(msg) {
  if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify(msg))
}

function _normalise(p) {
  return {
    id:        p.id,
    board:     p.board,
    threadId:  p.thread_id  ?? p.threadId  ?? 'root',
    name:      p.name       ?? 'Anonymous',
    title:     p.title      ?? null,
    content:   p.content,
    tags:      p.tags       ?? null,
    mediaCid:  p.media_cid  ?? p.mediaCid  ?? null,
    createdAt: p.created_at ?? p.createdAt ?? Date.now(),
    displayId: p.display_id ?? p.displayId ?? null,
    sig:       p.sig        ?? null,
    pubkey:    p.pubkey     ?? null,
  }
}

// Upload all local blobs the relay doesn't have yet.
// Runs once per WS connect (2-second delay to let subscriptions settle).
async function _syncLocalMedia() {
  let records
  try { records = await db.media.toArray() } catch { return }
  if (!records.length) return

  let uploaded = 0
  for (const { cid, blob, mimeType } of records) {
    try {
      const head = await fetch(`${RELAY}/media/${cid}`, { method: 'HEAD' })
      if (head.ok) continue                          // relay already has it
      const fd = new FormData()
      fd.append('file', new File([blob], cid, { type: mimeType }))
      const up = await fetch(`${RELAY}/media`, { method: 'POST', body: fd })
      if (up.ok) uploaded++
    } catch {
      // relay unreachable; will retry on next connect
    }
  }

  if (uploaded > 0) state.mediaSynced++   // triggers view reload in watchers
}

function _openWs() {
  if (_ws && _ws.readyState <= WebSocket.OPEN) return

  _ws = new WebSocket(_wsUrl())

  _ws.onopen = () => {
    state.online = true
    state.error  = null
    clearTimeout(_reconnectTimer)
    for (const b of _boards) _send({ type: 'subscribe', board: b })
    clearTimeout(_mediaSyncTimer)
    _mediaSyncTimer = setTimeout(_syncLocalMedia, 2000)
  }

  _ws.onmessage = async ({ data }) => {
    let msg
    try { msg = JSON.parse(data) } catch { return }
    if (msg.type === 'post') {
      const post = _normalise(msg.payload)
      await db.posts.put(post)
      state.lastPost = post
    } else if (msg.type === 'delete') {
      await db.posts.delete(msg.payload.id)
      state.lastDelete = msg.payload
    }
  }

  _ws.onclose = () => {
    state.online = false
    _reconnectTimer = setTimeout(_openWs, 4000)
  }

  _ws.onerror = () => {
    state.error = 'websocket error'
    _ws?.close()
  }
}

// ── Standalone relay helpers ──────────────────────────────────────────────────

// mediaSynced version is baked into the relay URL so that after a back-fill
// upload, Vue sees a changed src and forces the browser to re-fetch the image.
export const RELAY_MEDIA_URL = (cid) =>
  `${RELAY}/media/${cid}${state.mediaSynced ? `?v=${state.mediaSynced}` : ''}`

export function getMediaSynced() { return state.mediaSynced }

export async function relayPush(post, cfToken) {
  const res = await fetch(`${RELAY}/posts`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(cfToken ? { ...post, cfToken } : post),
  })
  if (!res.ok && res.status !== 409) {
    throw new Error(`relay POST /posts → ${res.status}`)
  }
}

export async function relayUploadMedia(file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${RELAY}/media`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`relay POST /media → ${res.status}`)
  return res.json()
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useSync() {
  function subscribe(board) {
    if (!_boards.has(board)) {
      _boards.add(board)
      _send({ type: 'subscribe', board })
    }
    _openWs()
  }

  async function pull(board) {
    state.syncing = true
    state.error   = null
    try {
      const localCount = await db.posts.where({ board }).count()
      const since = localCount > 0
        ? parseInt(localStorage.getItem(`sync:${board}`) ?? '0', 10)
        : 0
      const res   = await fetch(`${RELAY}/sync?since=${since}&board=${encodeURIComponent(board)}`)
      if (!res.ok) throw new Error(`relay GET /sync → ${res.status}`)

      const raw = await res.json()
      if (!raw.length) return 0

      await db.posts.bulkPut(raw.map(_normalise))

      const maxTs = Math.max(...raw.map(p => p.created_at ?? 0))
      if (maxTs > since) localStorage.setItem(`sync:${board}`, String(maxTs))

      state.lastPost = _normalise(raw[raw.length - 1])
      return raw.length
    } catch (e) {
      state.error = e.message
      return 0
    } finally {
      state.syncing = false
    }
  }

  return { ...toRefs(state), subscribe, pull }
}
