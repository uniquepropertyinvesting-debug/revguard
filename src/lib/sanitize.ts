const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, char => ENTITY_MAP[char] || char)
}

export function safeBoldHtml(str: string): string {
  const escaped = escapeHtml(str)
  return escaped.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
}

export function sanitizeInput(str: string, maxLength = 1000): string {
  return str.trim().slice(0, maxLength)
}

export function sanitizeEmail(str: string): string {
  return str.trim().toLowerCase().slice(0, 254)
}

export function sanitizeUrl(str: string): string | null {
  const trimmed = str.trim()
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString()
  } catch {
    return null
  }
}
