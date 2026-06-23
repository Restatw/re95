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

**re95** is an anonymous imageboard PWA (similar to 4chan/Komica), running at `re95.org`. The current implementation is a pure frontend with local-only storage — no backend server exists yet. All data lives in the browser's IndexedDB via Dexie.

The long-term architecture plans a P2P network layer where Daemon nodes communicate via libp2p + Tor, and PWA clients sync from those public relay nodes via WebSocket. The current codebase is Phase 1 (single-node prototype).

## Architecture

### Data Flow

```
User action → PostForm.vue
  → useIdentity (optional ECDSA sign)
  → db.posts.put() via Dexie (IndexedDB)
  → emits 'posted' → parent view reloads from DB
```

### IndexedDB Schema (`src/composables/useDB.js`)

Three tables in the `re95` Dexie database:
- `identity` — single record keyed `'self'`, holds the user's ECDSA P-256 keypair (hex-encoded) and 8-char `displayId`
- `posts` — indexed on `board`, `threadId`, `createdAt`. OP posts have `threadId: 'root'`; replies store the parent post's `id` as `threadId`
- `media` — placeholder table for future CID-addressed media, not yet used

### Identity System (`src/composables/useIdentity.js`)

Module-level singleton `identity` ref shared across all callers. On first use, `init()` generates an ECDSA P-256 keypair via WebCrypto, stores it in IndexedDB, and derives an 8-hex-char `displayId` from SHA-256 of the public key. Signing is optional per-post — users choose whether to attach `displayId` + signature, enabling pseudonymous identity consistency without revealing who they are.

### Post Data Model

```js
{
  id:        // SHA-256 hex of timestamp+random (serves as post ID)
  board:     // e.g. 'b', 'tech'
  threadId:  // 'root' for OP, or parent post's id for replies
  name:      // display name, defaults to 'Anonymous'
  content:   // raw text, max 2000 chars
  mediaUrl:  // object URL (local only, not persisted across sessions)
  createdAt: // Unix ms timestamp
  displayId: // optional 8-char hex from pubkey hash
  sig:       // optional ECDSA signature hex
}
```

### Routing (`src/router/index.js`)

```
/                        → Home.vue    (board list)
/:board/                 → Board.vue   (thread list for a board)
/:board/thread/:id       → Thread.vue  (single thread + replies)
```

### Planned Next Phases

- **Phase 2**: WebSocket sync to public relay nodes; `useSync.js` composable to be added
- **Phase 3**: Media chunking / IPFS-like CID addressing (the `media` table is reserved for this)
- **Phase 4**: Optional Daemon install for true P2P via libp2p + Tor

## Known Limitations (Phase 1)

- `mediaUrl` is a `URL.createObjectURL()` blob URL — it dies when the tab closes. Images are not persisted in IndexedDB yet.
- No network sync; all posts are local to the device.
- `replyCount` on thread cards is always 0 (not yet computed from DB).
- `HelloWorld.vue` in `src/components/` is unused scaffolding and can be deleted.
