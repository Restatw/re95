# re95

Anonymous imageboard PWA — live at [re95.org](https://re95.org)

## Overview

re95 is a lightweight, privacy-focused imageboard built as a Progressive Web App. Phase 1 runs entirely in the browser with no backend — all posts and media are stored locally in IndexedDB via Dexie. Future phases will add P2P relay sync via WebSocket and libp2p + Tor.

## Features

- Anonymous posting with optional pseudonymous identity (ECDSA P-256 keypair, stored locally)
- Image attachments persisted in IndexedDB (blob storage with content-hash CID)
- Multiple boards, thread + reply structure
- Board creation by users
- PWA installable, works offline
- i18n support (English default, Traditional Chinese included)

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

## Deployment

```bash
npm run build
sudo cp -r dist/. /var/www/re95.org/
```

Served via nginx with Cloudflare proxy (HTTPS only).

## Architecture

```
User action → PostForm.vue
  → useIdentity (optional ECDSA sign)
  → db.posts.put() via Dexie (IndexedDB)
  → emits 'posted' → parent view reloads from DB
```

### Planned phases

| Phase | Description |
|-------|-------------|
| 1 ✓  | Single-device prototype, IndexedDB storage |
| 2    | WebSocket sync to public relay nodes |
| 3    | Media chunking / IPFS-like CID addressing |
| 4    | Optional daemon install, libp2p + Tor P2P |
