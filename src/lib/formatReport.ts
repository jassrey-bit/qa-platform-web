import type { ComparisonResult, SemanticDiscrepancy, Severity, VisualVerdict } from '../api/docValidation'

const SEVERITY_LABELS: Record<Severity, string> = {
  CRITICO: 'Crítico',
  AVISO: 'Aviso',
  INFO: 'Info',
}

export function formatDiscrepancy(d: SemanticDiscrepancy): string {
  const lines: string[] = []
  const severity = d.severity ? SEVERITY_LABELS[d.severity] : 'Sin severidad'
  lines.push(`[${severity}] ${d.change_type} — página/párrafo ${d.location}`)

  if (d.severity_reasoning) lines.push(d.severity_reasoning)

  if (d.expected_text || d.actual_text) {
    lines.push(`Antes: ${d.expected_text}`)
    lines.push(`Después: ${d.actual_text}`)
  }

  for (const c of d.internal_changes) {
    lines.push(`- ${c.description}`)
  }

  return lines.join('\n')
}

export function formatVisualAnalysis(visual: VisualVerdict): string {
  return visual.available
    ? ['Análisis visual', `Estado: ${visual.status}`, visual.findings].filter(Boolean).join('\n\n')
    : `Análisis visual\nNo disponible: ${visual.error}`
}

export function formatComparisonResult(result: ComparisonResult): string {
  const { structural, semantic, visual, summary } = result
  const sections: string[] = []

  sections.push(
    [
      `Resultado: ${summary.status === 'PASSED' ? 'Aprobado' : 'Con discrepancias'}`,
      `${summary.total_discrepancies} discrepancia(s) — ${summary.critical} crítica(s), ${summary.warning} aviso(s), ${summary.info} info`,
    ].join('\n'),
  )

  sections.push(
    [
      'Estructura',
      `Puntaje: ${structural.score.toFixed(1)} · Descubierto por: ${structural.discovery_method}`,
      structural.missing_sections.length > 0
        ? `Secciones faltantes: ${structural.missing_sections.join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n'),
  )

  sections.push(
    [
      'Discrepancias semánticas',
      semantic.discrepancies.length === 0
        ? 'Sin discrepancias.'
        : semantic.discrepancies.map((d, i) => `${i + 1}. ${formatDiscrepancy(d)}`).join('\n\n'),
    ].join('\n'),
  )

  if (visual) {
    sections.push(formatVisualAnalysis(visual))
  }

  return sections.join('\n\n---\n\n')
}
