import type { ComparisonCaseResult, JobStatusResponse, RegressionCaseResult } from '../api/apiValidation'
import { formatApiReport } from '../lib/formatApiReport'
import { ApiDiffViewer } from './ApiDiffViewer'
import { CopyButton } from './CopyButton'
import { RunStatusBadge } from './RunStatusBadge'

type DoneJob = Extract<JobStatusResponse, { status: 'done' }>

function RegressionCaseCard({ result }: { result: RegressionCaseResult }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <RunStatusBadge passed={result.passed} />
          <span className="font-mono text-xs text-on-surface-variant">{result.case_id}</span>
        </div>
        <span className="text-xs text-on-surface-variant">
          HTTP {result.http_status} · {result.execution_time_ms.toFixed(0)} ms
        </span>
      </div>
      <p className="text-sm text-on-surface">{result.description}</p>
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
      {Object.keys(result.structural_diff).length > 0 && (
        <details className="rounded-lg border border-outline-variant/20 bg-surface-container p-3 text-xs">
          <summary className="cursor-pointer font-medium text-on-surface">Diferencias estructurales</summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-on-surface-variant">
            {JSON.stringify(result.structural_diff, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

function ComparisonCaseCard({ result }: { result: ComparisonCaseResult }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
      <div className="flex items-center gap-2">
        <RunStatusBadge passed={result.passed} />
        <span className="font-mono text-xs text-on-surface-variant">{result.case_id}</span>
      </div>
      <p className="text-sm text-on-surface">{result.description}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-outline-variant/20 bg-surface-container p-3 text-xs">
          <p className="font-medium text-on-surface">PROD</p>
          <p className="text-on-surface-variant">
            HTTP {result.prod.status_code} · {result.prod.response_time_ms} ms
          </p>
          {result.prod.financial_violations.map((v, i) => (
            <p key={i} className="mt-1 text-error">
              {v}
            </p>
          ))}
        </div>
        <div className="rounded-lg border border-outline-variant/20 bg-surface-container p-3 text-xs">
          <p className="font-medium text-on-surface">DEV</p>
          <p className="text-on-surface-variant">
            HTTP {result.dev.status_code} · {result.dev.response_time_ms} ms
          </p>
          {result.dev.financial_violations.map((v, i) => (
            <p key={i} className="mt-1 text-error">
              {v}
            </p>
          ))}
        </div>
      </div>
      <ApiDiffViewer differences={result.differences} />
    </div>
  )
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
        <div className="flex items-center gap-2">
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
        {job.mode === 'regression'
          ? job.result.map((c) => <RegressionCaseCard key={c.case_id} result={c} />)
          : job.result.map((c) => <ComparisonCaseCard key={c.case_id} result={c} />)}
      </div>
    </div>
  )
}
