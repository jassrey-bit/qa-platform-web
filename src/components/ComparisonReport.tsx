import type { ComparisonResult } from '../api/docValidation'
import { CopyButton } from './CopyButton'
import { DiffText } from './DiffText'
import { SeverityBadge } from './SeverityBadge'
import { VisualAnalysis } from './VisualAnalysis'
import { formatComparisonResult, formatDiscrepancy, formatVisualAnalysis } from '../lib/formatReport'
import { diffWords } from '../lib/textDiff'

export function ComparisonReport({ result }: { result: ComparisonResult }) {
  const { structural, semantic, visual, summary } = result
  const passed = summary.status === 'PASSED'

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

      <section className="rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-6">
        <h3 className="font-headline text-base text-on-surface">Estructura</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Puntaje: {structural.score.toFixed(1)} · Descubierto por: {structural.discovery_method}
        </p>
        {structural.missing_sections.length > 0 && (
          <p className="mt-1 text-sm text-on-surface-variant">
            Secciones faltantes: {structural.missing_sections.join(', ')}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-6">
        <h3 className="font-headline text-base text-on-surface">Discrepancias semánticas</h3>
        {semantic.discrepancies.length === 0 ? (
          <p className="mt-2 text-sm text-on-surface-variant">Sin discrepancias.</p>
        ) : (
          <ul className="mt-3 flex list-none flex-col gap-3 p-0">
            {semantic.discrepancies.map((d, i) => (
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
            <p className="mt-1 text-sm text-on-surface-variant">No disponible: {visual.error}</p>
          )}
        </section>
      )}
    </div>
  )
}
