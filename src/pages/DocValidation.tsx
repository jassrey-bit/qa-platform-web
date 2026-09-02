import { useCallback, useState } from 'react'
import { createComparison, getComparison } from '../api/docValidation'
import { ComparisonReport } from '../components/ComparisonReport'
import { useJobPolling } from '../hooks/useJobPolling'

export function DocValidation() {
  const [actual, setActual] = useState<File | null>(null)
  const [expected, setExpected] = useState<File | null>(null)
  const [enableVisual, setEnableVisual] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const fetchStatus = useCallback((id: string) => getComparison(id), [])
  const isPending = useCallback((r: Awaited<ReturnType<typeof getComparison>>) => r.status === 'pending', [])
  const { data: job, polling, error: pollError } = useJobPolling(jobId, fetchStatus, isPending)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!actual || !expected) return
    setSubmitError(null)
    setJobId(null)
    try {
      const { job_id } = await createComparison(actual, expected, { enableVisual })
      setJobId(job_id)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="page">
      <h1>Validación de documentos</h1>
      <p>Compara un documento generado contra su plantilla esperada (PDF y/o DOCX).</p>

      <form onSubmit={handleSubmit} className="upload-form">
        <label>
          Documento esperado (plantilla)
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => setExpected(e.target.files?.[0] ?? null)}
            required
          />
        </label>
        <label>
          Documento actual (generado)
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => setActual(e.target.files?.[0] ?? null)}
            required
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={enableVisual}
            onChange={(e) => setEnableVisual(e.target.checked)}
          />
          Incluir análisis visual (requiere LibreOffice)
        </label>
        <button type="submit" disabled={!actual || !expected || polling}>
          {polling ? 'Comparando…' : 'Comparar'}
        </button>
      </form>

      {submitError && <p className="error">{submitError}</p>}
      {pollError && <p className="error">{pollError}</p>}

      {job?.status === 'pending' && <p className="status">Procesando comparación…</p>}
      {job?.status === 'error' && <p className="error">Error: {job.error}</p>}
      {job?.status === 'done' && <ComparisonReport result={job.result} />}
    </div>
  )
}
