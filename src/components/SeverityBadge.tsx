import type { Severity } from '../api/docValidation'

const LABELS: Record<Severity, string> = {
  CRITICO: 'Crítico',
  AVISO: 'Aviso',
  INFO: 'Info',
}

export function SeverityBadge({ severity }: { severity: Severity | null }) {
  if (!severity) return null
  return <span className={`badge badge-${severity.toLowerCase()}`}>{LABELS[severity]}</span>
}
