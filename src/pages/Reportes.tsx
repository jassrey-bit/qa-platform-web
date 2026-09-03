import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getComparison } from '../api/docValidation'
import { getExecutionFileUrl, listExecutions, rerunExecution } from '../api/reports'
import type { ExecutionRecord, ListExecutionsFilters } from '../api/reports'
import { CopyButton } from '../components/CopyButton'
import { formatComparisonResult } from '../lib/formatReport'

async function copyExecutionResult(jobId: string): Promise<string> {
  const response = await getComparison(jobId)
  if (response.status !== 'done') {
    throw new Error('El resultado de esta ejecución todavía no está disponible.')
  }
  return formatComparisonResult(response.result)
}

const MODULES = [
  { key: 'doc-validation', label: 'Validación de documentos', available: true },
  { key: 'api', label: 'Validación de API', available: false },
  { key: 'e2e', label: 'Automatización E2E', available: false },
]

function isSuccess(status: string) {
  return status.toUpperCase() === 'PASSED'
}

export function Reportes() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filename, setFilename] = useState('')
  const [page, setPage] = useState(1)

  const [items, setItems] = useState<ExecutionRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rerunningId, setRerunningId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const filters: ListExecutionsFilters = { page }
    if (status) filters.status = status as 'PASSED' | 'FAILED'
    if (dateFrom) filters.dateFrom = dateFrom
    if (dateTo) filters.dateTo = dateTo
    if (filename) filters.filename = filename

    const timer = setTimeout(() => {
      listExecutions(filters)
        .then((res) => {
          if (cancelled) return
          setItems(res.items)
          setTotal(res.total)
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
  }, [status, dateFrom, dateTo, filename, page])

  async function handleRerun(jobId: string) {
    setRerunningId(jobId)
    try {
      const { job_id } = await rerunExecution(jobId)
      navigate(`/doc-validation?job=${job_id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRerunningId(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-gutter-lg p-layout-margin">
      <div className="flex items-center gap-gutter-sm self-start rounded-2xl border border-outline-variant/30 bg-surface-container-low p-1.5">
        {MODULES.map((m) =>
          m.available ? (
            <button
              key={m.key}
              type="button"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-on-primary shadow-sm"
            >
              {m.label}
            </button>
          ) : (
            <button
              key={m.key}
              type="button"
              disabled
              className="flex cursor-not-allowed items-center gap-2 rounded-xl px-4 py-2 text-sm text-on-surface-variant"
            >
              {m.label}
              <span className="rounded-full border border-outline-variant/30 bg-surface-container-high px-2 py-0.5 text-xs">
                Próximamente
              </span>
            </button>
          ),
        )}
      </div>

      <div className="grid grid-cols-1 gap-gutter-md rounded-2xl border border-outline-variant/30 bg-surface-container/70 p-6 backdrop-blur-2xl md:grid-cols-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-on-surface-variant">
            Estado de ejecución
          </span>
          <select
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value)
            }}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 text-on-surface outline-none focus:border-primary"
          >
            <option value="">Todos los estados</option>
            <option value="PASSED">Éxito</option>
            <option value="FAILED">Fallido</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-on-surface-variant">Desde</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setPage(1)
              setDateFrom(e.target.value)
            }}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 text-on-surface outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-on-surface-variant">Hasta</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setPage(1)
              setDateTo(e.target.value)
            }}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 text-on-surface outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-on-surface-variant">
            Búsqueda de archivos
          </span>
          <div className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2.5 focus-within:border-primary">
            <span className="material-symbols-outlined text-[18px] text-primary">search</span>
            <input
              type="text"
              value={filename}
              onChange={(e) => {
                setPage(1)
                setFilename(e.target.value)
              }}
              placeholder="Nombre o extensión..."
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
                <th className="px-gutter-md py-4 font-semibold">Documentos usados</th>
                <th className="px-gutter-md py-4 font-semibold">Resultado</th>
                <th className="px-gutter-md py-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-on-surface">
              {loading && (
                <tr>
                  <td colSpan={4} className="px-gutter-md py-6 text-center text-on-surface-variant">
                    Cargando ejecuciones…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && !error && (
                <tr>
                  <td colSpan={4} className="px-gutter-md py-6 text-center text-on-surface-variant">
                    No hay ejecuciones para mostrar.
                  </td>
                </tr>
              )}
              {items.map((record) => (
                <tr key={record.job_id} className="transition-all hover:bg-surface-container-high/40">
                  <td className="whitespace-nowrap px-gutter-md py-4 font-code text-xs text-on-surface-variant">
                    {new Date(record.created_at).toLocaleString('es', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-gutter-md py-4">
                    <div className="flex flex-col gap-1.5">
                      <FileCell label="Esperado" filename={record.expected_filename} jobId={record.job_id} kind="expected" />
                      <FileCell label="Actual" filename={record.actual_filename} jobId={record.job_id} kind="actual" />
                    </div>
                  </td>
                  <td className="px-gutter-md py-4">
                    {isSuccess(record.status) ? (
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
                        getText={() => copyExecutionResult(record.job_id)}
                        iconOnly
                        label="Copiar resultados"
                        className="inline-flex items-center rounded-xl border border-outline-variant/30 bg-surface-container-high p-2 text-on-surface transition-all hover:border-primary/50 hover:bg-primary hover:text-on-primary"
                      />
                      <button
                        type="button"
                        disabled={rerunningId === record.job_id}
                        onClick={() => handleRerun(record.job_id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container-high px-3.5 py-2 text-sm font-medium text-on-surface transition-all hover:border-primary/50 hover:bg-primary hover:text-on-primary disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                        {rerunningId === record.job_id ? 'Ejecutando…' : 'Ejecutar de nuevo'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-outline-variant/30 bg-surface-container-low/80 p-4 text-sm text-on-surface-variant">
          <span className="font-code text-xs">Mostrando {items.length} de {total} ejecuciones</span>
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
              disabled={items.length === 0 || page * items.length >= total}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-outline-variant/30 bg-surface-container-high px-3.5 py-1.5 text-on-surface transition-all disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FileCell({
  label,
  filename,
  jobId,
  kind,
}: {
  label: string
  filename: string
  jobId: string
  kind: 'actual' | 'expected'
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-16 text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
        {label}:
      </span>
      <span className="rounded border border-outline-variant/20 bg-surface-container-low px-2 py-0.5 font-code text-xs text-on-surface">
        {filename}
      </span>
      <a
        href={getExecutionFileUrl(jobId, kind)}
        download
        className="inline-flex items-center rounded p-1 text-primary transition-all hover:bg-primary/20"
        aria-label={`Descargar ${filename}`}
      >
        <span className="material-symbols-outlined text-[16px]">download</span>
      </a>
    </div>
  )
}
