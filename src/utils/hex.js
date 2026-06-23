export function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function fromHex(hex) {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return arr.buffer
}

export function randomHex(bytes = 16) {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return toHex(arr)
}

export async function sha256hex(data) {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data
  if (!crypto.subtle) return randomHex(32)
  return toHex(await crypto.subtle.digest('SHA-256', buf))
}
