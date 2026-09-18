import type { ComparisonCaseResult, JobStatusResponse, RegressionCaseResult } from '../api/apiValidation'
import { dedupeDifferences, humanizeDiffPath, parseStructuralDiff } from './apiDiffFormat'

type DoneJob = Extract<JobStatusResponse, { status: 'done' }>

function formatRegressionCase(c: RegressionCaseResult, i: number): string {
  const lines = [`${i + 1}. [${c.passed ? 'PASS' : 'FAIL'}] ${c.case_id} — ${c.description}`]
  lines.push(`HTTP ${c.http_status} · ${c.execution_time_ms.toFixed(0)} ms`)
  if (c.financial_violations.length > 0) {
    lines.push('Reglas financieras violadas:')
    c.financial_violations.forEach((v) => lines.push(`  - ${v}`))
  }
  const structuralRows = parseStructuralDiff(c.structural_diff)
  if (structuralRows.length > 0) {
    lines.push('Diferencias estructurales:')
    structuralRows.forEach((r) =>
      lines.push(`  - ${r.label} (${r.changeLabel}): esperado=${JSON.stringify(r.before)} | obtenido=${JSON.stringify(r.after)}`),
    )
  }
  return lines.join('\n')
}

function formatComparisonCase(c: ComparisonCaseResult, i: number): string {
  const lines = [`${i + 1}. [${c.passed ? 'PASS' : 'FAIL'}] ${c.case_id} — ${c.description}`]
  lines.push(
    `PROD: HTTP ${c.prod.status_code} (${c.prod.response_time_ms} ms) · DEV: HTTP ${c.dev.status_code} (${c.dev.response_time_ms} ms)`,
  )
  if (c.prod.financial_violations.length > 0) {
    lines.push(`Reglas financieras (PROD): ${c.prod.financial_violations.join('; ')}`)
  }
  if (c.dev.financial_violations.length > 0) {
    lines.push(`Reglas financieras (DEV): ${c.dev.financial_violations.join('; ')}`)
  }
  const differences = dedupeDifferences(c.differences)
  if (differences.length > 0) {
    lines.push('Diferencias PROD vs DEV:')
    differences.forEach((d) =>
      lines.push(`  - ${humanizeDiffPath(d.path)}: PROD=${JSON.stringify(d.prod_value)} | DEV=${JSON.stringify(d.dev_value)}`),
    )
  }
  return lines.join('\n')
}

export function formatApiReport(job: DoneJob): string {
  const header = [
    `Resultado: ${job.summary.failed === 0 ? 'Aprobado' : 'Con fallos'}`,
    `${job.summary.total} caso(s) — ${job.summary.passed} aprobado(s), ${job.summary.failed} con fallos`,
    `Modo: ${job.mode === 'regression' ? 'Regresión' : 'Comparación'}`,
  ].join('\n')

  const body =
    job.mode === 'regression'
      ? job.result.map((c, i) => formatRegressionCase(c, i)).join('\n\n')
      : job.result.map((c, i) => formatComparisonCase(c, i)).join('\n\n')

  return [header, body].join('\n\n---\n\n')
}
