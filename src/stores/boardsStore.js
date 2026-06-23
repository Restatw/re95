import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../composables/useDB'

const DEFAULT_BOARDS = [
  { id: 'b',      name: '隨機',   createdAt: 0 },
  { id: 'img',    name: '圖片',   createdAt: 1 },
  { id: 'tech',   name: '技術',   createdAt: 2 },
  { id: 'ani',    name: '動漫',   createdAt: 3 },
  { id: 'gam',    name: '遊戲',   createdAt: 4 },
  { id: 'mu',     name: '音樂',   createdAt: 5 },
  { id: 'tv',     name: '影視',   createdAt: 6 },
  { id: 'sp',     name: '運動',   createdAt: 7 },
  { id: 'news',   name: '新聞',   createdAt: 8 },
  { id: 'pol',    name: '政治',   createdAt: 9 },
  { id: 'sci',    name: '科學',   createdAt: 10 },
  { id: 'his',    name: '歷史',   createdAt: 11 },
  { id: 'art',    name: '藝術',   createdAt: 12 },
  { id: 'food',   name: '美食',   createdAt: 13 },
  { id: 'fit',    name: '健身',   createdAt: 14 },
  { id: 'travel', name: '旅遊',   createdAt: 15 },
  { id: 'lit',    name: '文學',   createdAt: 16 },
]

export const useBoardsStore = defineStore('boards', () => {
  const boards = ref([])

  async function load() {
    const existing = new Set((await db.boards.toArray()).map(b => b.id))
    const missing = DEFAULT_BOARDS.filter(b => !existing.has(b.id))
    if (missing.length) await db.boards.bulkPut(missing)
    boards.value = await db.boards.orderBy('createdAt').toArray()
  }

  async function create({ id, name }) {
    const slug = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (!slug) throw new Error('版面 ID 只能包含英文小寫、數字、-、_')
    if (!name.trim()) throw new Error('版面名稱不可為空')
    if (await db.boards.get(slug)) throw new Error(`/${slug}/ 已存在`)
    await db.boards.put({ id: slug, name: name.trim(), createdAt: Date.now() })
    boards.value = await db.boards.orderBy('createdAt').toArray()
  }

  return { boards, load, create }
})
