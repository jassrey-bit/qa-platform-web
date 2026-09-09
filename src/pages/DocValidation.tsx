import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createComparison, getComparison, retryVisualAnalysis, type VisualVerdict } from '../api/docValidation'
import { ComparisonReport } from '../components/ComparisonReport'
import { FileDropzone } from '../components/FileDropzone'
import { LoadingBar } from '../components/LoadingBar'
import { useJobPolling } from '../hooks/useJobPolling'
import { getDocValidationSettings } from '../lib/docValidationSettings'

export function DocValidation() {
  const [searchParams] = useSearchParams()
  const defaults = getDocValidationSettings()

  const [actual, setActual] = useState<File | null>(null)
  const [expected, setExpected] = useState<File | null>(null)
  const [enableVisual, setEnableVisual] = useState(defaults.enableVisualByDefault)
  const [hideVariableFills, setHideVariableFills] = useState(defaults.hideVariableFillsByDefault)
  const [jobId, setJobId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [visualOverride, setVisualOverride] = useState<VisualVerdict | null>(null)
  const [visualRetrying, setVisualRetrying] = useState(false)
  const [visualRetryError, setVisualRetryError] = useState<string | null>(null)

  useEffect(() => {
    const rerunJobId = searchParams.get('job')
    if (rerunJobId) setJobId(rerunJobId)
  }, [searchParams])

  const fetchStatus = useCallback((id: string) => getComparison(id), [])
  const isPending = useCallback((r: Awaited<ReturnType<typeof getComparison>>) => r.status === 'pending', [])
  const { data: job, polling, error: pollError } = useJobPolling(jobId, fetchStatus, isPending)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!actual || !expected) return
    setSubmitError(null)
    setVisualOverride(null)
    setVisualRetryError(null)
    setJobId(null)
    try {
      const { job_id } = await createComparison(actual, expected, { enableVisual, hideVariableFills })
      setJobId(job_id)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleRetryVisual() {
    if (!jobId) return
    setVisualRetrying(true)
    setVisualRetryError(null)
    try {
      const updated = await retryVisualAnalysis(jobId)
      if (updated.status === 'done') setVisualOverride(updated.result.visual)
    } catch (e) {
      setVisualRetryError(e instanceof Error ? e.message : String(e))
    } finally {
      setVisualRetrying(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-gutter-lg p-layout-margin">
      <div>
        <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
          Validación de documentos
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Sube la plantilla esperada y el documento generado: las diferencias quedan resaltadas en rojo y
          verde directamente sobre cada página, junto con el detalle de cada discrepancia.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-4 backdrop-blur-2xl"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <FileDropzone compact label="Plantilla" file={expected} onChange={setExpected} />
            <FileDropzone compact label="Actual" file={actual} onChange={setActual} />
          </div>

          <div className="hidden h-8 w-px bg-outline-variant/30 sm:block" />

          <div className="flex flex-wrap items-center gap-4">
            <label
              className="flex items-center gap-2 text-sm text-on-surface"
              title="Requiere LibreOffice. Con esta opción, la comparación tarda más en procesarse."
            >
              <input
                type="checkbox"
                checked={enableVisual}
                onChange={(e) => setEnableVisual(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Análisis visual
            </label>
            <label className="flex items-center gap-2 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={hideVariableFills}
                onChange={(e) => setHideVariableFills(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Ocultar rellenos variables
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={!actual || !expected || polling}
          className="rounded-xl bg-primary px-5 py-2.5 font-medium text-on-primary shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {polling ? 'Comparando…' : 'Comparar'}
        </button>
      </form>

      {submitError && (
        <p className="rounded-xl border border-error/30 bg-error-container/20 p-4 text-on-error-container">
          {submitError}
        </p>
      )}
      {pollError && (
        <p className="rounded-xl border border-error/30 bg-error-container/20 p-4 text-on-error-container">
          {pollError}
        </p>
      )}

      {job?.status === 'pending' && <LoadingBar label="Procesando comparación…" />}
      {job?.status === 'error' && (
        <p className="rounded-xl border border-error/30 bg-error-container/20 p-4 text-on-error-container">
          Error: {job.error}
        </p>
      )}

      {job?.status === 'done' && (
        <ComparisonReport
          result={visualOverride ? { ...job.result, visual: visualOverride } : job.result}
          jobId={job.job_id}
          pages={job.pages}
          expectedFilename={expected?.name ?? job.result.expected_path.split(/[\\/]/).pop() ?? 'Esperado'}
          actualFilename={actual?.name ?? job.result.actual_path.split(/[\\/]/).pop() ?? 'Actual'}
          onRetryVisual={handleRetryVisual}
          visualRetrying={visualRetrying}
          visualRetryError={visualRetryError}
        />
      )}

      {!jobId && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container/30 p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant/50">difference</span>
          <div>
            <h2 className="font-headline text-lg text-on-surface">Aún no hay una comparación</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-on-surface-variant">
              Selecciona la plantilla y el documento generado arriba, luego presiona "Comparar" para ver el
              visor de documentos lado a lado y el detalle de discrepancias.
            </p>
          </div>
          <div className="mt-2 grid w-full grid-cols-1 gap-3 opacity-40 lg:grid-cols-5">
            <div className="h-48 rounded-xl bg-surface-container-low lg:col-span-3" />
            <div className="flex flex-col gap-3 lg:col-span-2">
              <div className="h-20 rounded-xl bg-surface-container-low" />
              <div className="h-24 rounded-xl bg-surface-container-low" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
