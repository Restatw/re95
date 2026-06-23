import { reactive, toRefs } from 'vue'
import { db } from './useDB'

const RELAY = import.meta.env.VITE_RELAY_URL ?? '/api'

// ── Singleton WS state ────────────────────────────────────────────────────────

const state = reactive({
  online:    false,
  syncing:   false,
  error:     null,
  lastPost:  null,   // most recent post written (from WS push or delta pull)
})

let _ws             = null
let _reconnectTimer = null
let _mediaSyncTimer = null
const _boards       = new Set()   // boards we're subscribed to this session

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

// Relay snake_case → Dexie camelCase
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
// Called once per relay connection (throttled to once per session).
async function _syncLocalMedia() {
  let records
  try { records = await db.media.toArray() } catch { return }
  if (!records.length) return

  for (const { cid, blob, mimeType } of records) {
    try {
      const head = await fetch(`${RELAY}/media/${cid}`, { method: 'HEAD' })
      if (head.ok) continue            // relay already has it
      const fd = new FormData()
      fd.append('file', new File([blob], cid, { type: mimeType }))
      await fetch(`${RELAY}/media`, { method: 'POST', body: fd })
    } catch {
      // relay may be temporarily unreachable; skip silently
    }
  }
}

function _openWs() {
  if (_ws && _ws.readyState <= WebSocket.OPEN) return

  _ws = new WebSocket(_wsUrl())

  _ws.onopen = () => {
    state.online = true
    state.error  = null
    clearTimeout(_reconnectTimer)
    for (const b of _boards) _send({ type: 'subscribe', board: b })
    // Back-fill any local blobs the relay missed (fire-and-forget)
    clearTimeout(_mediaSyncTimer)
    _mediaSyncTimer = setTimeout(_syncLocalMedia, 2000)
  }

  _ws.onmessage = async ({ data }) => {
    let msg
    try { msg = JSON.parse(data) } catch { return }
    if (msg.type !== 'post') return

    const post = _normalise(msg.payload)
    await db.posts.put(post)
    state.lastPost = post
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

// ── Standalone relay helpers (importable without the composable) ───────────────

export const RELAY_MEDIA_URL = (cid) => `${RELAY}/media/${cid}`

export async function relayPush(post) {
  const res = await fetch(`${RELAY}/posts`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(post),
  })
  if (!res.ok && res.status !== 409) {   // 409 = already exists, ignore
    throw new Error(`relay POST /posts → ${res.status}`)
  }
}

export async function relayUploadMedia(file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${RELAY}/media`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`relay POST /media → ${res.status}`)
  return res.json()  // { cid, mimeType, size }
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
      const since = parseInt(localStorage.getItem(`sync:${board}`) ?? '0', 10)
      const url   = `${RELAY}/sync?since=${since}&board=${encodeURIComponent(board)}`
      const res   = await fetch(url)
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
