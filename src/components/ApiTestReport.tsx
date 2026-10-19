import { useState } from 'react'
import type {
  ComparisonCaseResult,
  ComparisonSide,
  JobStatusResponse,
  RegressionCaseResult,
} from '../api/apiValidation'
import { formatApiReport } from '../lib/formatApiReport'
import { ApiDiffViewer } from './ApiDiffViewer'
import { CopyButton } from './CopyButton'
import { DecimalViolationsViewer } from './DecimalViolationsViewer'
import { RunStatusBadge } from './RunStatusBadge'
import { StructuralDiffViewer } from './StructuralDiffViewer'

type DoneJob = Extract<JobStatusResponse, { status: 'done' }>

function CaseHeader({
  passed,
  caseId,
  meta,
  hasDetail,
  open,
  onToggle,
}: {
  passed: boolean
  caseId: string
  meta: string
  hasDetail: boolean
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <RunStatusBadge passed={passed} />
        <span className="font-mono text-xs text-on-surface-variant">{caseId}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-on-surface-variant">{meta}</span>
        {hasDetail && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="flex items-center gap-1 rounded-lg border border-outline-variant/40 px-2.5 py-1 text-xs text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-[16px]">{open ? 'expand_less' : 'expand_more'}</span>
            {open ? 'Ocultar detalle' : 'Ver detalle'}
          </button>
        )}
      </div>
    </div>
  )
}

function RegressionCaseCard({ result }: { result: RegressionCaseResult }) {
  const hasStructuralDiff = Object.keys(result.structural_diff).length > 0
  const hasDetail =
    result.financial_violations.length > 0 || (result.decimal_violations?.length ?? 0) > 0 || hasStructuralDiff
  const [open, setOpen] = useState(!result.passed)

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
      <CaseHeader
        passed={result.passed}
        caseId={result.case_id}
        meta={`HTTP ${result.http_status} · ${result.execution_time_ms.toFixed(0)} ms`}
        hasDetail={hasDetail}
        open={open}
        onToggle={() => setOpen((o) => !o)}
      />
      <p className="text-sm text-on-surface">{result.description}</p>
      {hasDetail && open && (
        <>
          {result.financial_violations.length > 0 && (
            <div className="rounded-lg border border-error/30 bg-error-container/20 p-3 text-sm text-on-error-container">
              <p className="font-medium">Reglas financieras violadas</p>
              <ul className="mt-1 list-disc pl-5">
                {result.financial_violations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
          )}
          <DecimalViolationsViewer violations={result.decimal_violations} />
          {hasStructuralDiff && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-on-surface-variant">Diferencias estructurales</p>
              <StructuralDiffViewer diff={result.structural_diff} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ComparisonSideBox({ label, side }: { label: string; side: ComparisonSide }) {
  // Con un HTTP de error no hay respuesta sobre la cual evaluar las reglas.
  const rulesPassed = side.financial_violations.length === 0 && side.status_code >= 200 && side.status_code < 300

  return (
    <div className="rounded-lg border border-outline-variant/20 bg-surface-container p-3 text-xs">
      <p className="font-medium text-on-surface">{label}</p>
      <p className="text-on-surface-variant">
        HTTP {side.status_code} · {side.response_time_ms} ms
      </p>
      {side.financial_violations.map((v, i) => (
        <p key={i} className="mt-1 text-error">
          {v}
        </p>
      ))}
      {rulesPassed && (
        <p className="mt-1 flex items-center gap-1.5 text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Las 3 reglas financieras pasaron
        </p>
      )}
    </div>
  )
}

function ComparisonCaseCard({ result }: { result: ComparisonCaseResult }) {
  const [open, setOpen] = useState(!result.passed)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
      <CaseHeader
        passed={result.passed}
        caseId={result.case_id}
        meta={`PROD ${result.prod.response_time_ms} ms · DEV ${result.dev.response_time_ms} ms`}
        hasDetail
        open={open}
        onToggle={() => setOpen((o) => !o)}
      />
      <p className="text-sm text-on-surface">{result.description}</p>
      {open && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ComparisonSideBox label="PROD" side={result.prod} />
            <ComparisonSideBox label="DEV" side={result.dev} />
          </div>
          <DecimalViolationsViewer
            violations={result.prod.decimal_violations}
            title="Decimales fuera de lo esperado (PROD)"
          />
          <DecimalViolationsViewer violations={result.dev.decimal_violations} title="Decimales fuera de lo esperado (DEV)" />
          <ApiDiffViewer differences={result.differences} />
        </>
      )}
    </div>
  )
}

type ResultFilter = 'all' | 'failed' | 'passed'

const FILTER_LABELS: Record<ResultFilter, string> = {
  all: 'Todos',
  failed: 'Con fallos',
  passed: 'Aprobados',
}

function matchesFilter(passed: boolean, filter: ResultFilter): boolean {
  return filter === 'all' || (filter === 'passed') === passed
}

// Los fallos primero; sort es estable, así que dentro de cada grupo se respeta el orden de la corrida.
function failedFirst<T extends { passed: boolean }>(cases: T[], filter: ResultFilter): T[] {
  return cases.filter((c) => matchesFilter(c.passed, filter)).sort((a, b) => Number(a.passed) - Number(b.passed))
}

export function ApiTestReport({
  job,
  onRerun,
  rerunning = false,
}: {
  job: DoneJob
  onRerun?: () => void
  rerunning?: boolean
}) {
  const { summary } = job
  const passed = summary.failed === 0
  const [filter, setFilter] = useState<ResultFilter>(passed ? 'all' : 'failed')
  const counts: Record<ResultFilter, number> = { all: summary.total, failed: summary.failed, passed: summary.passed }

  const cards =
    job.mode === 'regression'
      ? failedFirst(job.result, filter).map((c) => <RegressionCaseCard key={c.case_id} result={c} />)
      : failedFirst(job.result, filter).map((c) => <ComparisonCaseCard key={c.case_id} result={c} />)

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-6 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${
              passed ? 'border-success/30 bg-success/10 text-success' : 'border-error/30 bg-error/10 text-error'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${passed ? 'bg-success' : 'bg-error'}`} />
            {passed ? 'Aprobado' : 'Con fallos'}
          </span>
          <span className="text-sm text-on-surface-variant">
            {summary.total} caso(s) · {summary.passed} aprobado(s) · {summary.failed} con fallos
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-outline-variant/40 p-0.5">
            {(['all', 'failed', 'passed'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  filter === f
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {FILTER_LABELS[f]} <span className="text-xs opacity-70">{counts[f]}</span>
              </button>
            ))}
          </div>
          {onRerun && (
            <button
              type="button"
              onClick={onRerun}
              disabled={rerunning}
              className="flex items-center gap-1.5 rounded-lg border border-outline-variant/40 px-3 py-1.5 text-sm text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[16px] ${rerunning ? 'animate-spin' : ''}`}>
                {rerunning ? 'progress_activity' : 'replay'}
              </span>
              Ejecutar de nuevo
            </button>
          )}
          <CopyButton
            getText={() => formatApiReport(job)}
            label="Copiar resultado"
            className="flex items-center gap-1.5 rounded-lg border border-outline-variant/40 px-3 py-1.5 text-sm text-on-surface transition-colors hover:bg-surface-container-high"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {cards.length === 0 ? (
          <p className="rounded-xl border border-dashed border-outline-variant/30 p-6 text-center text-sm text-on-surface-variant">
            No hay casos {filter === 'passed' ? 'aprobados' : 'con fallos'} en esta corrida.
          </p>
        ) : (
          cards
        )}
      </div>
    </div>
  )
}
