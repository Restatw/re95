# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server on 0.0.0.0:5173 (accessible on all interfaces)
npm run build    # production build → dist/
npm run preview  # preview production build
```

No test runner is configured yet.

## Project Overview

**re95** is an anonymous imageboard PWA (similar to 4chan/Komica), running at `re95.org`. Offline-first: all data is written to IndexedDB via Dexie first; the relay (`re95-relay`) is synced in the background.

The long-term architecture plans a P2P network layer where Daemon nodes communicate via libp2p + Tor, and PWA clients sync from those public relay nodes via WebSocket.

## Completed Phases

| Phase | Status | Notes |
|---|---|---|
| 1 — Local-only PWA | ✅ | IndexedDB via Dexie, ECDSA identity, offline-capable |
| 2 — Relay sync | ✅ | `useSync.js`: WebSocket push + delta pull (`GET /api/sync`) |
| 3 — Media CID | ✅ | SHA-256 CID, blob persisted in IndexedDB, back-filled to relay on connect |
| 4 — Bot protection | ✅ | Cloudflare Turnstile on post submit (`VITE_TURNSTILE_SITE_KEY`) |
| 5 — Production deploy | ✅ | Built to `/var/www/re95.org`, nginx proxies `/api/` + `/ws` to relay |

## Planned Next Phases

- **Phase 6**: Relay-to-relay sync (pull from peer relays on connect)
- **Phase 7**: Optional Daemon install for true P2P via libp2p + Tor

## Architecture

### Data Flow

```
User action → PostForm.vue (Turnstile verification)
  → useIdentity (optional ECDSA sign)
  → db.posts.put() via Dexie (IndexedDB)       ← always succeeds
  → relayPush() via useSync.js (fire-and-forget) ← best-effort
```

On WebSocket connect, `useSync.js` also:
- Subscribes to board channels for live push
- Back-fills any local blobs not yet on the relay (`HEAD /api/media/:cid` → `POST /api/media`)
- Delta-pulls posts created since last sync (`GET /api/sync?since=<ms>&board=<id>`)

### IndexedDB Schema (`src/composables/useDB.js`)

Three tables in the `re95` Dexie database:
- `identity` — single record keyed `'self'`, holds the user's ECDSA P-256 keypair (hex-encoded) and 8-char `displayId`
- `posts` — indexed on `board`, `threadId`, `createdAt`. OP posts have `threadId: 'root'`; replies store the parent post's `id` as `threadId`
- `media` — CID-keyed blobs; persisted across sessions; back-filled to relay on WS connect

### Identity System (`src/composables/useIdentity.js`)

Module-level singleton `identity` ref shared across all callers. On first use, `init()` generates an ECDSA P-256 keypair via WebCrypto, stores it in IndexedDB, and derives an 8-hex-char `displayId` from SHA-256 of the public key. Signing is optional per-post.

### Media / CID

- CID = SHA-256 hex of raw file bytes (computed via `src/utils/hex.js`)
- On HTTP non-localhost (no `crypto.subtle`): falls back to `randomHex(32)`; relay returns the authoritative SHA-256 CID after upload and the local record is reconciled
- Relay URLs use a `?v=<mediaSynced>` version suffix to bust Vue's img cache after back-fill

### Post Data Model

```js
{
  id:        string    // 16-char random hex, client-generated
  board:     string    // board slug e.g. 'b'
  threadId:  string    // 'root' for OP, parent post id for replies
  name:      string    // defaults to 'Anonymous'
  title:     string|null
  content:   string    // max 2000 chars
  tags:      string[]|null
  mediaCid:  string|null   // SHA-256 hex (CID)
  createdAt: number        // Unix ms
  displayId: string|null   // 8-char hex from pubkey hash
  sig:       string|null   // ECDSA P-256 signature hex
  pubkey:    string|null   // uncompressed P-256 pubkey hex
}
```

### Routing (`src/router/index.js`)

```
/                        → Home.vue    (board list + management)
/:board/                 → Board.vue   (thread list, paginated)
/:board/catalog          → Catalog.vue (grid view)
/:board/thread/:id       → Thread.vue  (single thread + replies)
```

## Environment Variables

```
VITE_RELAY_URL=/api                     # relay base URL (relative = same origin)
VITE_TURNSTILE_SITE_KEY=               # Cloudflare Turnstile site key; leave empty to disable
```

## Production Deploy

```bash
npm run build
sudo cp -r dist/* /var/www/re95.org/
```
