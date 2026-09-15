import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  createRun,
  getRun,
  listFixtures,
  rerunRun,
  type CustomCase,
  type FixtureCase,
  type RunMode,
} from '../api/apiValidation'
import { ApiTestReport } from '../components/ApiTestReport'
import { FileDropzone } from '../components/FileDropzone'
import { LoadingBar } from '../components/LoadingBar'
import { useJobPolling } from '../hooks/useJobPolling'

export function ApiValidation() {
  const [searchParams] = useSearchParams()

  const [mode, setMode] = useState<RunMode>('regression')
  const [fixtures, setFixtures] = useState<FixtureCase[]>([])
  const [fixturesError, setFixturesError] = useState<string | null>(null)
  const [fixtureFilter, setFixtureFilter] = useState('')
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([])

  const [includeCustomCase, setIncludeCustomCase] = useState(false)
  const [customCaseId, setCustomCaseId] = useState('')
  const [customPayloadFile, setCustomPayloadFile] = useState<File | null>(null)
  const [customPayloadText, setCustomPayloadText] = useState('')
  const [customExpectedText, setCustomExpectedText] = useState('')

  const [jobId, setJobId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [rerunning, setRerunning] = useState(false)

  useEffect(() => {
    listFixtures()
      .then(setFixtures)
      .catch((e) => setFixturesError(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => {
    const rerunJobId = searchParams.get('job')
    if (rerunJobId) setJobId(rerunJobId)
  }, [searchParams])

  const fetchStatus = useCallback((id: string) => getRun(id), [])
  const isPending = useCallback((r: Awaited<ReturnType<typeof getRun>>) => r.status === 'pending', [])
  const { data: job, polling, error: pollError } = useJobPolling(jobId, fetchStatus, isPending)

  const filteredFixtures = fixtureFilter.trim()
    ? fixtures.filter(
        (f) =>
          f.case_id.toLowerCase().includes(fixtureFilter.toLowerCase()) ||
          f.description.toLowerCase().includes(fixtureFilter.toLowerCase()),
      )
    : fixtures

  function toggleCase(caseId: string) {
    setSelectedCaseIds((prev) => (prev.includes(caseId) ? prev.filter((id) => id !== caseId) : [...prev, caseId]))
  }

  function selectAllFiltered() {
    setSelectedCaseIds((prev) => Array.from(new Set([...prev, ...filteredFixtures.map((f) => f.case_id)])))
  }

  function clearSelection() {
    setSelectedCaseIds([])
  }

  async function handleCustomFileChange(file: File | null) {
    setCustomPayloadFile(file)
    if (!file) return
    try {
      setCustomPayloadText(await file.text())
    } catch {
      setSubmitError('No se pudo leer el archivo seleccionado.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setJobId(null)

    let customCases: CustomCase[] | undefined

    if (includeCustomCase) {
      if (!customPayloadText.trim()) {
        setSubmitError('Agrega un payload personalizado en formato JSON o quita esa opción.')
        return
      }
      let payload: unknown
      try {
        payload = JSON.parse(customPayloadText)
      } catch {
        setSubmitError('El payload personalizado no es un JSON válido.')
        return
      }

      let expectedResponse: unknown
      if (mode === 'regression') {
        if (!customExpectedText.trim()) {
          setSubmitError('El modo regresión requiere una respuesta esperada para el caso personalizado.')
          return
        }
        try {
          expectedResponse = JSON.parse(customExpectedText)
        } catch {
          setSubmitError('La respuesta esperada no es un JSON válido.')
          return
        }
      }

      customCases = [
        { case_id: customCaseId.trim() || undefined, payload, expected_response: expectedResponse },
      ]
    }

    if (selectedCaseIds.length === 0 && !customCases) {
      setSubmitError('Selecciona al menos un fixture o agrega un payload personalizado.')
      return
    }

    try {
      const { job_id } = await createRun(mode, {
        caseIds: selectedCaseIds.length > 0 ? selectedCaseIds : undefined,
        customCases,
      })
      setJobId(job_id)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleRerun() {
    if (!jobId) return
    setRerunning(true)
    setSubmitError(null)
    try {
      const { job_id } = await rerunRun(jobId)
      setJobId(job_id)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    } finally {
      setRerunning(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-gutter-lg p-layout-margin">
      <div>
        <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Validación de API</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Ejecuta la regresión de amortización contra la API bajo prueba o compara PROD vs DEV en simultáneo,
          con validación de las 3 reglas financieras sobre cada respuesta.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-4 backdrop-blur-2xl"
      >
        <div className="flex flex-wrap items-center gap-2">
          {(['regression', 'comparison'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                mode === m
                  ? 'bg-primary text-on-primary shadow-lg shadow-primary/25'
                  : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {m === 'regression' ? 'Regresión (vs API bajo prueba)' : 'Comparación PROD vs DEV'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-medium text-on-surface">Casos de fixtures</label>
            <div className="flex items-center gap-2 text-xs">
              <button type="button" onClick={selectAllFiltered} className="text-primary hover:underline">
                Seleccionar {fixtureFilter ? 'filtrados' : 'todos'}
              </button>
              <span className="text-on-surface-variant">·</span>
              <button type="button" onClick={clearSelection} className="text-primary hover:underline">
                Limpiar
              </button>
            </div>
          </div>
          <input
            type="text"
            value={fixtureFilter}
            onChange={(e) => setFixtureFilter(e.target.value)}
            placeholder="Buscar por case_id o descripción…"
            className="rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60"
          />
          {fixturesError && <p className="text-xs text-error">{fixturesError}</p>}
          <div className="max-h-56 overflow-y-auto rounded-lg border border-outline-variant/20 bg-surface-container-low p-2">
            {filteredFixtures.map((f) => (
              <label
                key={f.case_id}
                className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-container-high"
              >
                <input
                  type="checkbox"
                  checked={selectedCaseIds.includes(f.case_id)}
                  onChange={() => toggleCase(f.case_id)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span>
                  <span className="font-mono text-xs text-on-surface-variant">{f.case_id}</span>{' '}
                  <span className="text-on-surface">{f.description}</span>
                </span>
              </label>
            ))}
            {filteredFixtures.length === 0 && (
              <p className="p-2 text-sm text-on-surface-variant">Sin resultados para el filtro actual.</p>
            )}
          </div>
          <p className="text-xs text-on-surface-variant">{selectedCaseIds.length} fixture(s) seleccionado(s)</p>
        </div>

        <div className="flex flex-col gap-2 border-t border-outline-variant/20 pt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-on-surface">
            <input
              type="checkbox"
              checked={includeCustomCase}
              onChange={(e) => setIncludeCustomCase(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Agregar un caso personalizado (payload propio)
          </label>

          {includeCustomCase && (
            <div className="flex flex-col gap-3 rounded-lg border border-outline-variant/20 bg-surface-container-low p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={customCaseId}
                  onChange={(e) => setCustomCaseId(e.target.value)}
                  placeholder="Identificador (opcional)"
                  className="min-w-[180px] flex-1 rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60"
                />
                <FileDropzone
                  compact
                  label="Cargar payload"
                  file={customPayloadFile}
                  onChange={handleCustomFileChange}
                  acceptedExtensions={['.json']}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-on-surface-variant">Payload (JSON)</label>
                <textarea
                  value={customPayloadText}
                  onChange={(e) => setCustomPayloadText(e.target.value)}
                  rows={5}
                  placeholder='[{"monto_solicitado": 100000, "tasa_interes": 30, ...}]'
                  className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 font-mono text-xs text-on-surface placeholder:text-on-surface-variant/60"
                />
              </div>

              {mode === 'regression' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-on-surface-variant">Respuesta esperada (JSON)</label>
                  <textarea
                    value={customExpectedText}
                    onChange={(e) => setCustomExpectedText(e.target.value)}
                    rows={5}
                    placeholder="Respuesta completa que la API debería devolver para este payload"
                    className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 font-mono text-xs text-on-surface placeholder:text-on-surface-variant/60"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={polling}
            className="rounded-xl bg-primary px-5 py-2.5 font-medium text-on-primary shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {polling ? 'Ejecutando…' : 'Ejecutar corrida'}
          </button>
        </div>
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

      {job?.status === 'pending' && <LoadingBar label="Ejecutando corrida…" />}
      {job?.status === 'error' && (
        <p className="rounded-xl border border-error/30 bg-error-container/20 p-4 text-on-error-container">
          Error: {job.error}
        </p>
      )}
      {job?.status === 'done' && <ApiTestReport job={job} onRerun={handleRerun} rerunning={rerunning} />}

      {!jobId && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container/30 p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant/50">api</span>
          <div>
            <h2 className="font-headline text-lg text-on-surface">Aún no hay una corrida</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-on-surface-variant">
              Elige un modo, selecciona fixtures o agrega un payload personalizado, y presiona "Ejecutar corrida"
              para ver el detalle de cada caso.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
