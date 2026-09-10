import { useState } from 'react'
import type { ComparisonPages, ComparisonResult, Severity } from '../api/docValidation'
import { CopyButton } from './CopyButton'
import { DiffText } from './DiffText'
import { PageCompareViewer } from './PageCompareViewer'
import { SeverityBadge } from './SeverityBadge'
import { VisualAnalysis } from './VisualAnalysis'
import { DISCOVERY_METHOD_LABELS, formatComparisonResult, formatDiscrepancy, formatVisualAnalysis } from '../lib/formatReport'
import { diffWords } from '../lib/textDiff'

interface ComparisonReportProps {
  result: ComparisonResult
  jobId: string
  pages: ComparisonPages
  expectedFilename: string
  actualFilename: string
  onRetryVisual?: () => void
  visualRetrying?: boolean
  visualRetryError?: string | null
}

type SeverityFilter = 'all' | Severity

export function ComparisonReport({
  result,
  jobId,
  pages,
  expectedFilename,
  actualFilename,
  onRetryVisual,
  visualRetrying,
  visualRetryError,
}: ComparisonReportProps) {
  const { structural, semantic, visual, summary } = result
  const passed = summary.status === 'PASSED'
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')

  const filters: { key: SeverityFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: summary.total_discrepancies },
    { key: 'CRITICO', label: 'Crítico', count: summary.critical },
    { key: 'AVISO', label: 'Aviso', count: summary.warning },
    { key: 'INFO', label: 'Info', count: summary.info },
  ]
  const filteredDiscrepancies =
    severityFilter === 'all' ? semantic.discrepancies : semantic.discrepancies.filter((d) => d.severity === severityFilter)

  return (
    <div className="flex flex-col gap-gutter-lg">
      <section
        className={`rounded-2xl border p-6 ${
          passed ? 'border-success/30 bg-success/10' : 'border-error/30 bg-error/10'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-headline text-lg text-on-surface">
              {passed ? 'Aprobado' : 'Con discrepancias'}
            </h2>
            <p className="text-on-surface-variant">
              {summary.total_discrepancies} discrepancia(s) — {summary.critical} crítica(s),{' '}
              {summary.warning} aviso(s), {summary.info} info
            </p>
          </div>
          <CopyButton
            getText={() => formatComparisonResult(result)}
            label="Copiar resultados"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest/60 px-3.5 py-2 text-sm font-medium text-on-surface transition-all hover:border-primary/50 hover:bg-primary hover:text-on-primary"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-gutter-lg lg:grid-cols-5 lg:items-start">
        <section className="min-w-0 rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-6 lg:sticky lg:top-20 lg:col-span-3 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <PageCompareViewer
            jobId={jobId}
            pages={pages}
            expectedFilename={expectedFilename}
            actualFilename={actualFilename}
            discrepancies={semantic.discrepancies}
          />
        </section>

        <div className="flex flex-col gap-gutter-lg lg:col-span-2">
          <section className="rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-headline text-base text-on-surface">Discrepancias semánticas</h3>
                <p className="text-xs text-on-surface-variant">
                  {summary.total_discrepancies} hallazgo(s) detectado(s)
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSeverityFilter(f.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                    severityFilter === f.key
                      ? 'border-on-surface bg-on-surface text-surface'
                      : 'border-outline-variant/30 text-on-surface-variant hover:border-primary/50 hover:text-primary'
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      structural.missing_sections.length > 0 ? 'text-tertiary' : 'text-success'
                    }`}
                  >
                    {structural.missing_sections.length > 0 ? 'warning' : 'check_circle'}
                  </span>
                  <span className="text-sm font-medium text-on-surface">Estructura del documento</span>
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Descubierto por: {DISCOVERY_METHOD_LABELS[structural.discovery_method]}
                </p>
                {structural.missing_sections.length > 0 && (
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Secciones faltantes: {structural.missing_sections.join(', ')}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full border border-outline-variant/30 bg-surface-container-lowest px-3 py-1 text-xs font-semibold text-on-surface">
                Puntaje: {structural.score.toFixed(1)}
              </span>
            </div>

            {filteredDiscrepancies.length === 0 ? (
              <p className="mt-4 text-sm text-on-surface-variant">Sin discrepancias para este filtro.</p>
            ) : (
              <ul className="mt-4 flex list-none flex-col gap-3 p-0">
                {filteredDiscrepancies.map((d, i) => (
                  <li key={i} className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                        <SeverityBadge severity={d.severity} />
                        <span>
                          {d.change_type} — página/párrafo {d.location}
                        </span>
                      </div>
                      <CopyButton
                        getText={() => formatDiscrepancy(d)}
                        iconOnly
                        label="Copiar esta discrepancia"
                        className="inline-flex items-center rounded p-1 text-on-surface-variant transition-all hover:bg-primary/10 hover:text-primary"
                      />
                    </div>
                    {d.severity_reasoning && (
                      <p className="mt-2 text-sm text-on-surface-variant">{d.severity_reasoning}</p>
                    )}
                    {(d.expected_text || d.actual_text) && (
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-error/20 bg-error/5 p-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-error">
                            Antes
                          </span>
                          <p className="mt-1 text-sm leading-relaxed text-on-surface">
                            <DiffText ops={diffWords(d.expected_text, d.actual_text)} side="before" />
                          </p>
                        </div>
                        <div className="rounded-lg border border-success/20 bg-success/5 p-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-success">
                            Después
                          </span>
                          <p className="mt-1 text-sm leading-relaxed text-on-surface">
                            <DiffText ops={diffWords(d.expected_text, d.actual_text)} side="after" />
                          </p>
                        </div>
                      </div>
                    )}
                    <ul className="mt-2 flex flex-col gap-1 pl-4 text-sm text-on-surface">
                      {d.internal_changes.map((c, j) => (
                        <li key={j}>{c.description}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {visual && (
            <section className="rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-headline text-base text-on-surface">Análisis visual</h3>
                <CopyButton
                  getText={() => formatVisualAnalysis(visual)}
                  iconOnly
                  label="Copiar análisis visual"
                  className="inline-flex items-center rounded p-1 text-on-surface-variant transition-all hover:bg-primary/10 hover:text-primary"
                />
              </div>
              {visual.available ? (
                <div className="mt-3">
                  <VisualAnalysis visual={visual} />
                </div>
              ) : (
                <div className="mt-1 flex flex-col gap-3">
                  <div>
                    <p className="text-sm text-on-surface">
                      El análisis visual no pudo completarse por una demora en el servicio de IA. Esto suele
                      ser temporal.
                    </p>
                    {visual.error && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-on-surface-variant">
                          Detalle técnico
                        </summary>
                        <p className="mt-1 text-xs text-on-surface-variant">{visual.error}</p>
                      </details>
                    )}
                  </div>
                  {onRetryVisual && (
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={onRetryVisual}
                        disabled={visualRetrying}
                        className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest/60 px-3.5 py-2 text-sm font-medium text-on-surface transition-all hover:border-primary/50 hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span
                          className={`material-symbols-outlined text-[18px] ${visualRetrying ? 'animate-spin' : ''}`}
                        >
                          refresh
                        </span>
                        {visualRetrying ? 'Reintentando…' : 'Reintentar'}
                      </button>
                      {visualRetryError && <p className="text-xs text-error">{visualRetryError}</p>}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
