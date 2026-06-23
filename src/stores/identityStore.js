import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../composables/useDB'
import { toHex, fromHex, randomHex } from '../utils/hex'

export const useIdentityStore = defineStore('identity', () => {
  const identity = ref(null)

  async function init() {
    if (identity.value) return
    let stored = await db.identity.get('self')
    if (!stored) stored = await _generate()
    identity.value = stored
  }

  async function _generate() {
    if (!crypto.subtle) {
      const record = { id: 'self', displayId: randomHex(4), pubkey: null, privkey: null, createdAt: Date.now() }
      await db.identity.put(record)
      return record
    }
    const keypair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
    )
    const pubkeyRaw = await crypto.subtle.exportKey('raw', keypair.publicKey)
    const privkeyRaw = await crypto.subtle.exportKey('pkcs8', keypair.privateKey)
    const hashBuf = await crypto.subtle.digest('SHA-256', pubkeyRaw)
    const displayId = toHex(hashBuf).slice(0, 8)
    const record = {
      id: 'self',
      displayId,
      pubkey: toHex(pubkeyRaw),
      privkey: toHex(privkeyRaw),
      createdAt: Date.now(),
    }
    await db.identity.put(record)
    return record
  }

  async function sign(data) {
    if (!identity.value?.privkey || !crypto.subtle) return null
    const key = await crypto.subtle.importKey(
      'pkcs8',
      fromHex(identity.value.privkey),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    )
    const encoded = new TextEncoder().encode(JSON.stringify(data))
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoded)
    return toHex(sig)
  }

  return { identity, init, sign }
})
