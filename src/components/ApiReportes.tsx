import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { downloadRunReport, getRun, listRuns, rerunRun } from '../api/apiValidation'
import type { MatchedCase, RunListFilters, RunListItem, RunMode } from '../api/apiValidation'
import { formatApiReport } from '../lib/formatApiReport'
import { CopyButton } from './CopyButton'
import { RunStatusBadge } from './RunStatusBadge'

const MODE_LABELS: Record<RunMode, string> = {
  regression: 'Regresión',
  comparison: 'PROD vs DEV',
}

const INPUT_CLASS =
  'rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 text-on-surface outline-none focus:border-primary'

const ACTION_CLASS =
  'inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container-high px-3.5 py-2 text-sm font-medium text-on-surface transition-all hover:border-primary/50 hover:bg-primary hover:text-on-primary disabled:opacity-50'

async function copyRunResult(jobId: string): Promise<string> {
  const response = await getRun(jobId)
  if (response.status !== 'done') {
    throw new Error('El resultado de esta corrida todavía no está disponible.')
  }
  return formatApiReport(response)
}

/** Historial de corridas del backend de Validación de API (`GET /runs`), con la misma tabla que el de documentos. */
export function ApiReportes() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [caseId, setCaseId] = useState('')
  const [page, setPage] = useState(1)

  const [items, setItems] = useState<RunListItem[]>([])
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rerunningId, setRerunningId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // La columna sale de la respuesta y no del input, para que no aparezca
  // vacía mientras corre el debounce de la búsqueda.
  const showMatches = items.some((run) => run.matched_cases)
  const columnCount = showMatches ? 6 : 5

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const filters: RunListFilters = { page }
    if (mode) filters.mode = mode as RunMode
    if (status) filters.status = status
    if (dateFrom) filters.dateFrom = dateFrom
    if (dateTo) filters.dateTo = dateTo
    if (caseId) filters.caseId = caseId

    const timer = setTimeout(() => {
      listRuns(filters)
        .then((res) => {
          if (cancelled) return
          setItems(res.items)
          setTotal(res.total)
          setPageSize(res.page_size)
        })
        .catch((e) => {
          if (cancelled) return
          setError(e instanceof Error ? e.message : String(e))
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [mode, status, dateFrom, dateTo, caseId, page])

  async function handleRerun(jobId: string) {
    setRerunningId(jobId)
    try {
      const { job_id } = await rerunRun(jobId)
      navigate(`/api-validation?job=${job_id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRerunningId(null)
    }
  }

  async function handleDownload(jobId: string) {
    setDownloadingId(jobId)
    setError(null)
    try {
      await downloadRunReport(jobId)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDownloadingId(null)
    }
  }

  function updateFilter(setter: (value: string) => void) {
    return (e: { target: { value: string } }) => {
      setPage(1)
      setter(e.target.value)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-gutter-md rounded-2xl border border-outline-variant/30 bg-surface-container/70 p-4 backdrop-blur-2xl sm:grid-cols-2 sm:p-6 lg:grid-cols-5">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-on-surface-variant">Modo</span>
          <select value={mode} onChange={updateFilter(setMode)} className={INPUT_CLASS}>
            <option value="">Todos los modos</option>
            <option value="regression">{MODE_LABELS.regression}</option>
            <option value="comparison">{MODE_LABELS.comparison}</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-on-surface-variant">Estado de ejecución</span>
          <select value={status} onChange={updateFilter(setStatus)} className={INPUT_CLASS}>
            <option value="">Todos los estados</option>
            <option value="PASSED">Éxito</option>
            <option value="FAILED">Fallido</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-on-surface-variant">Desde</span>
          <input type="date" value={dateFrom} onChange={updateFilter(setDateFrom)} className={INPUT_CLASS} />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-on-surface-variant">Hasta</span>
          <input type="date" value={dateTo} onChange={updateFilter(setDateTo)} className={INPUT_CLASS} />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-on-surface-variant">Búsqueda de casos</span>
          <div className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 focus-within:border-primary">
            <span className="material-symbols-outlined text-[18px] text-primary">search</span>
            <input
              type="text"
              value={caseId}
              onChange={updateFilter(setCaseId)}
              placeholder="ID o descripción (ej. 068, quincenal)"
              className="w-full bg-transparent text-on-surface outline-none placeholder:text-on-surface-variant/50"
            />
          </div>
        </label>
      </div>

      {error && (
        <p className="rounded-xl border border-error/30 bg-error-container/20 p-4 text-on-error-container">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container/70 backdrop-blur-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container-high/60 text-xs uppercase tracking-wider text-on-surface-variant">
                <th className="px-gutter-md py-4 font-semibold">Fecha y hora</th>
                <th className="px-gutter-md py-4 font-semibold">Modo</th>
                <th className="px-gutter-md py-4 font-semibold">Casos</th>
                {showMatches && <th className="px-gutter-md py-4 font-semibold">Caso(s) buscado(s)</th>}
                <th className="px-gutter-md py-4 font-semibold">Resultado</th>
                <th className="px-gutter-md py-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-on-surface">
              {loading && (
                <tr>
                  <td colSpan={columnCount} className="px-gutter-md py-6 text-center text-on-surface-variant">
                    Cargando corridas…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && !error && (
                <tr>
                  <td colSpan={columnCount} className="px-gutter-md py-6 text-center text-on-surface-variant">
                    No hay corridas para mostrar.
                  </td>
                </tr>
              )}
              {items.map((run) => (
                <tr key={run.job_id} className="transition-all hover:bg-surface-container-high/40">
                  <td className="whitespace-nowrap px-gutter-md py-4 font-code text-xs text-on-surface-variant">
                    {new Date(run.created_at).toLocaleString('es', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="whitespace-nowrap px-gutter-md py-4">
                    <span className="rounded border border-outline-variant/20 bg-surface-container-low px-2 py-0.5 font-code text-xs text-on-surface">
                      {MODE_LABELS[run.mode] ?? run.mode}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-gutter-md py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{run.summary.total} caso(s)</span>
                      <span className="text-xs text-on-surface-variant">
                        <span className="text-success">{run.summary.passed} ok</span>
                        {' · '}
                        <span className={run.summary.failed > 0 ? 'text-error' : ''}>
                          {run.summary.failed} con fallos
                        </span>
                      </span>
                    </div>
                  </td>
                  {showMatches && (
                    <td className="px-gutter-md py-4">
                      <MatchedCasesCell cases={run.matched_cases ?? []} />
                    </td>
                  )}
                  <td className="px-gutter-md py-4">
                    {run.status.toUpperCase() === 'PASSED' ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
                        <span className="h-2 w-2 rounded-full bg-success" />
                        Éxito
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full border border-error/30 bg-error/10 px-3 py-1 text-xs font-medium text-error">
                        <span className="h-2 w-2 rounded-full bg-error" />
                        Fallido
                      </span>
                    )}
                  </td>
                  <td className="px-gutter-md py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <CopyButton
                        getText={() => copyRunResult(run.job_id)}
                        iconOnly
                        label="Copiar resultados"
                        className="inline-flex items-center rounded-xl border border-outline-variant/30 bg-surface-container-high p-2 text-on-surface transition-all hover:border-primary/50 hover:bg-primary hover:text-on-primary"
                      />
                      <button
                        type="button"
                        disabled={downloadingId === run.job_id}
                        onClick={() => handleDownload(run.job_id)}
                        aria-label="Descargar reporte PDF"
                        className={ACTION_CLASS}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {downloadingId === run.job_id ? 'progress_activity' : 'download'}
                        </span>
                        {downloadingId === run.job_id ? 'Generando…' : 'PDF'}
                      </button>
                      <button
                        type="button"
                        disabled={rerunningId === run.job_id}
                        onClick={() => handleRerun(run.job_id)}
                        className={ACTION_CLASS}
                      >
                        <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                        {rerunningId === run.job_id ? 'Ejecutando…' : 'Ejecutar de nuevo'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/30 bg-surface-container-low/80 p-4 text-sm text-on-surface-variant">
          <span className="font-code text-xs">Mostrando {items.length} de {total} corridas</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border border-outline-variant/30 bg-surface-container-high px-3.5 py-1.5 text-on-surface transition-all disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-2 font-medium text-on-surface">{page}</span>
            <button
              type="button"
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-outline-variant/30 bg-surface-container-high px-3.5 py-1.5 text-on-surface transition-all disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function caseTimes(c: MatchedCase): string {
  if (c.response_time_ms !== undefined) return `${c.response_time_ms} ms`
  return `PROD ${c.prod_time_ms} ms · DEV ${c.dev_time_ms} ms`
}

function MatchedCaseLine({ matched }: { matched: MatchedCase }) {
  return (
    <div className="flex min-w-56 flex-col gap-1" title={matched.description}>
      <div className="flex items-center gap-2">
        <RunStatusBadge passed={matched.passed} />
        <span className="whitespace-nowrap font-code text-xs text-on-surface">{matched.case_id}</span>
      </div>
      <span className="text-xs text-on-surface-variant">
        <span className="whitespace-nowrap font-code text-[11px]">{caseTimes(matched)}</span>
        {matched.issues.length > 0 && <span className="text-error"> · {matched.issues.join(' · ')}</span>}
      </span>
    </div>
  )
}

/** Estado de cada caso que coincide con la búsqueda en esta corrida. */
function MatchedCasesCell({ cases }: { cases: MatchedCase[] }) {
  const [expanded, setExpanded] = useState(false)

  if (cases.length === 1) return <MatchedCaseLine matched={cases[0]} />

  const passed = cases.filter((c) => c.passed).length
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-on-surface">{cases.length} coinciden</span>
        <span className="text-on-surface-variant">
          <span className="text-success">{passed} ok</span>
          {' · '}
          <span className={cases.length - passed > 0 ? 'text-error' : ''}>{cases.length - passed} con fallos</span>
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-0.5 rounded px-1 text-primary transition-all hover:bg-primary/20"
        >
          {expanded ? 'Ocultar' : 'Ver detalle'}
          <span className="material-symbols-outlined text-[16px]">{expanded ? 'expand_less' : 'expand_more'}</span>
        </button>
      </div>
      {expanded && (
        <div className="flex max-h-64 flex-col gap-2.5 overflow-y-auto pr-1">
          {cases.map((c, i) => (
            <MatchedCaseLine key={`${c.case_id}-${i}`} matched={c} />
          ))}
        </div>
      )}
    </div>
  )
}
