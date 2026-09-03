import type { Severity } from '../api/docValidation'

const LABELS: Record<Severity, string> = {
  CRITICO: 'Crítico',
  AVISO: 'Aviso',
  INFO: 'Info',
}

const STYLES: Record<Severity, string> = {
  CRITICO: 'bg-error/10 text-error border-error/30',
  AVISO: 'bg-tertiary/10 text-tertiary border-tertiary/30',
  INFO: 'bg-primary/10 text-primary border-primary/30',
}

export function SeverityBadge({ severity }: { severity: Severity | null }) {
  if (!severity) return null
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[severity]}`}
    >
      {LABELS[severity]}
    </span>
  )
}
