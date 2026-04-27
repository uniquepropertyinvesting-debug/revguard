import { logAudit } from '@/lib/audit'

function escapeField(value: unknown): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export function exportCsv(filename: string, headers: string[], rows: Record<string, unknown>[]) {
  logAudit('export_csv', 'report', filename, { rowCount: rows.length, columns: headers })
  const csvLines = [
    headers.map(escapeField).join(','),
    ...rows.map(row => headers.map(h => escapeField(row[h])).join(',')),
  ]
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
