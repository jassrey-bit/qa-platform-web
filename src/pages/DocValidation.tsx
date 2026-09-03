import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createComparison, getComparison } from '../api/docValidation'
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
    setJobId(null)
    try {
      const { job_id } = await createComparison(actual, expected, { enableVisual, hideVariableFills })
      setJobId(job_id)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-gutter-lg p-layout-margin">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface">
          Validación de documentos
        </h1>
        <p className="mt-1 text-on-surface-variant">
          Compara un documento generado contra su plantilla esperada (PDF y/o DOCX).
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-gutter-md rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-6 backdrop-blur-2xl"
      >
        <FileDropzone label="Documento esperado (plantilla)" file={expected} onChange={setExpected} />
        <FileDropzone label="Documento actual (generado)" file={actual} onChange={setActual} />
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={enableVisual}
              onChange={(e) => setEnableVisual(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Incluir análisis visual (requiere LibreOffice)
          </label>
          <p className="pl-6 text-xs text-on-surface-variant">
            Con esta opción, la comparación tarda más en procesarse.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-on-surface">
          <input
            type="checkbox"
            checked={hideVariableFills}
            onChange={(e) => setHideVariableFills(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Ocultar rellenos variables
        </label>
        <button
          type="submit"
          disabled={!actual || !expected || polling}
          className="self-start rounded-xl bg-primary px-5 py-2.5 font-medium text-on-primary shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
      {job?.status === 'done' && <ComparisonReport result={job.result} />}
    </div>
  )
}
