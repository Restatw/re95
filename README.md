# re95

Anonymous imageboard PWA — live at [re95.org](https://re95.org)

## Overview

re95 is a lightweight, privacy-focused imageboard built as a Progressive Web App. Offline-first: posts and media are written to IndexedDB locally, then synced to a relay server in the background via WebSocket. Works without a network connection; syncs automatically when back online.

## Features

- Anonymous posting with optional pseudonymous identity (ECDSA P-256 keypair, stored locally)
- Image attachments persisted in IndexedDB and synced to relay (content-addressed by SHA-256 CID)
- Multiple boards, thread + reply structure, catalog view
- Board creation by users
- Real-time cross-device sync via WebSocket relay
- Cloudflare Turnstile bot protection on post submit
- PWA installable, works offline
- i18n support (English + Traditional Chinese)

## Stack

- **Vue 3** (Composition API, `<script setup>`)
- **Pinia** — state management
- **Dexie v4** — IndexedDB wrapper
- **vue-i18n v9** — internationalization
- **Vue Router v4**
- **Vite** + **vite-plugin-pwa**

## Development

```bash
npm install
npm run dev      # dev server on 0.0.0.0:5173
npm run build    # production build → dist/
npm run preview  # preview production build
```

The dev server proxies `/api` and `/ws` to `http://localhost:3001` (re95-relay). Start the relay separately before testing sync features.

## Environment Variables

```
VITE_RELAY_URL=/api              # relay base URL; relative = same origin
VITE_TURNSTILE_SITE_KEY=        # Cloudflare Turnstile site key; leave empty to disable
```

## Deployment

```bash
npm run build
sudo cp -r dist/. /var/www/re95.org/
```

Served via nginx with Cloudflare proxy (HTTPS only). nginx proxies `/api/` and `/ws` to the relay on `127.0.0.1:3001`.

## Architecture

```
User action → PostForm.vue (Turnstile verification)
  → useIdentity (optional ECDSA sign)
  → db.posts.put() via Dexie (IndexedDB)        ← always succeeds
  → relayPush() via useSync.js (fire-and-forget) ← best-effort
```

On WebSocket connect, `useSync.js` also delta-pulls missed posts and back-fills any local media blobs not yet on the relay.

## Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ | Single-device prototype, IndexedDB storage, ECDSA identity |
| 2 | ✅ | WebSocket relay sync — `useSync.js`, delta pull, live push |
| 3 | ✅ | Media CID addressing — blob persistence + relay back-fill |
| 4 | ✅ | Cloudflare Turnstile bot protection |
| 5 | ✅ | Production deploy on re95.org (systemd + nginx) |
| 6 | 🔲 | Relay-to-relay sync |
| 7 | 🔲 | Optional daemon install, libp2p + Tor P2P |
