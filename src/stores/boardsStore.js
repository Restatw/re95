import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../composables/useDB'

const RELAY = import.meta.env.VITE_RELAY_URL ?? '/api'

const DEFAULT_BOARDS = [
  { id: 'b',       name: '隨機',     createdAt: 0 },
  { id: 'img',     name: '圖片',     createdAt: 1 },
  { id: 'tech',    name: '技術',     createdAt: 2 },
  { id: 'prog',    name: '程式',     createdAt: 3 },
  { id: 'ani',     name: '動漫',     createdAt: 4 },
  { id: 'comic',   name: '漫畫',     createdAt: 5 },
  { id: 'moe',     name: '萌',       createdAt: 6 },
  { id: 'gam',     name: '遊戲',     createdAt: 7 },
  { id: 'vn',      name: '視覺小說', createdAt: 8 },
  { id: 'mu',      name: '音樂',     createdAt: 9 },
  { id: 'tv',      name: '影視',     createdAt: 10 },
  { id: 'sp',      name: '運動',     createdAt: 11 },
  { id: 'news',    name: '新聞',     createdAt: 12 },
  { id: 'pol',     name: '政治',     createdAt: 13 },
  { id: 'fin',     name: '財經',     createdAt: 14 },
  { id: 'crypto',  name: '加密貨幣', createdAt: 15 },
  { id: 'sci',     name: '科學',     createdAt: 16 },
  { id: 'space',   name: '太空',     createdAt: 17 },
  { id: 'his',     name: '歷史',     createdAt: 18 },
  { id: 'lang',    name: '語言',     createdAt: 19 },
  { id: 'edu',     name: '教育',     createdAt: 20 },
  { id: 'law',     name: '法律',     createdAt: 21 },
  { id: 'art',     name: '藝術',     createdAt: 22 },
  { id: 'design',  name: '設計',     createdAt: 23 },
  { id: 'photo',   name: '攝影',     createdAt: 24 },
  { id: 'food',    name: '美食',     createdAt: 25 },
  { id: 'fit',     name: '健身',     createdAt: 26 },
  { id: 'med',     name: '醫療',     createdAt: 27 },
  { id: 'travel',  name: '旅遊',     createdAt: 28 },
  { id: 'pet',     name: '寵物',     createdAt: 29 },
  { id: 'car',     name: '汽車',     createdAt: 30 },
  { id: 'fashion', name: '時尚',     createdAt: 31 },
  { id: 'diy',     name: '手作',     createdAt: 32 },
  { id: 'arch',    name: '建築',     createdAt: 33 },
  { id: 'env',     name: '環保',     createdAt: 34 },
  { id: 'lit',     name: '文學',     createdAt: 35 },
  { id: 'cos',     name: 'Cosplay',  createdAt: 36 },
]

export const useBoardsStore = defineStore('boards', () => {
  const boards = ref([])

  async function load() {
    const existing = new Set((await db.boards.toArray()).map(b => b.id))
    const missing = DEFAULT_BOARDS.filter(b => !existing.has(b.id))
    if (missing.length) await db.boards.bulkPut(missing)

    // Pull custom boards from relay and merge into local DB
    try {
      const res = await fetch(`${RELAY}/boards`)
      if (res.ok) {
        const remote = await res.json()
        const localIds = new Set((await db.boards.toArray()).map(b => b.id))
        const newBoards = remote
          .filter(b => !localIds.has(b.id))
          .map(b => ({ id: b.id, name: b.name, emoji: b.emoji ?? null, createdAt: b.created_at ?? Date.now() }))
        if (newBoards.length) await db.boards.bulkPut(newBoards)
      }
    } catch {}

    boards.value = await db.boards.orderBy('createdAt').toArray()
  }

  async function create({ id, name, emoji }) {
    const slug = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (!slug) throw new Error('版面 ID 只能包含英文小寫、數字、-、_')
    if (!name.trim()) throw new Error('版面名稱不可為空')
    if (await db.boards.get(slug)) throw new Error(`/${slug}/ 已存在`)
    const board = { id: slug, name: name.trim(), emoji: emoji?.trim() || null, createdAt: Date.now() }
    await db.boards.put(board)
    boards.value = await db.boards.orderBy('createdAt').toArray()

    // Sync to relay (fire-and-forget)
    fetch(`${RELAY}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(board),
    }).catch(() => {})
  }

  return { boards, load, create }
})
