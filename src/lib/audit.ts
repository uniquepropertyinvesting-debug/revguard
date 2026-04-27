import { authFetch } from '@/lib/auth'

export function logAudit(
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, unknown>
) {
  authFetch('/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, resourceType, resourceId, details }),
  }).catch(() => {})
}
