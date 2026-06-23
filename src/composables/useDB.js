import Dexie from 'dexie'

export const db = new Dexie('re95')

db.version(1).stores({
  identity: 'id',
  posts:    'id, board, threadId, createdAt',
  media:    'cid',
})

db.version(2).stores({
  identity: 'id',
  posts:    'id, board, threadId, createdAt',
  media:    'cid',
  boards:   'id, createdAt',
})
