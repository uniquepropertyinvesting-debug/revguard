import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

// Derive a 32-byte key from the env secret using scrypt.
// Falls back to a deterministic dev key so the app starts without crashing,
// but logs a loud warning so it's impossible to miss in production.
function getEncryptionKey(): Buffer {
  const secret = process.env.REVGUARD_ENCRYPTION_KEY
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('REVGUARD_ENCRYPTION_KEY must be set in production')
    }
    // Dev fallback — NOT safe for real data
    console.warn('[RevGuard] WARNING: REVGUARD_ENCRYPTION_KEY not set. Using insecure dev key.')
    return scryptSync('dev-insecure-key-set-env-in-prod', 'revguard-salt', 32)
  }
  return scryptSync(secret, 'revguard-salt-v1', 32)
}

const ALGO = 'aes-256-gcm'
const PREFIX = 'enc:v1:'

/**
 * Encrypt a plaintext string. Returns a base64-encoded string with the IV and
 * auth tag prepended so it can be stored in a single DB column.
 * Format: enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_base64>
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('base64')}`
}

/**
 * Decrypt a value produced by encrypt(). If the value is not in the expected
 * format (e.g. already plaintext from a migration), it is returned as-is so
 * existing unencrypted rows keep working during a rollout.
 */
export function decrypt(stored: string): string {
  if (!stored || !stored.startsWith(PREFIX)) {
    // Not yet encrypted (legacy row or empty) — return as-is
    return stored
  }
  const rest = stored.slice(PREFIX.length)
  const parts = rest.split(':')
  if (parts.length !== 3) return stored // malformed — return raw

  const [ivHex, authTagHex, ciphertextB64] = parts
  const key = getEncryptionKey()
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ])
  return plaintext.toString('utf8')
}
