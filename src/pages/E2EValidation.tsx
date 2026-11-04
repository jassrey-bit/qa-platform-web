import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  addPlatform,
  cancelRun,
  createRun,
  getCatalog,
  getPlatforms,
  getRun,
  getSource,
  rerunRun,
  type Catalog,
  type CatalogFeature,
  type PlatformsInfo,
  type RunStatusResponse,
  type SourceInfo,
} from '../api/e2eValidation'
import { E2ERunView } from '../components/E2ERunView'
import { ToggleSwitch } from '../components/ToggleSwitch'
import { useJobPolling } from '../hooks/useJobPolling'

interface ModuleGroup {
  name: string
  features: CatalogFeature[]
}

function groupByModule(features: CatalogFeature[]): ModuleGroup[] {
  const groups = new Map<string, CatalogFeature[]>()
  for (const f of features) groups.set(f.module, [...(groups.get(f.module) ?? []), f])
  return Array.from(groups, ([name, feats]) => ({ name, features: feats }))
}

// Mismo criterio que el runner: acepta la URL completa y deja el subdominio.
function normalizePlatform(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .replace(/\.cloudgsf\.com$/, '')
}

const PLATFORM_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

function featureFileName(uri: string): string {
  return uri.split('/').pop()?.replace(/\.feature$/, '') ?? uri
}

export function E2EValidation() {
  const [searchParams] = useSearchParams()

  const [info, setInfo] = useState<PlatformsInfo | null>(null)
  const [source, setSource] = useState<SourceInfo | null>(null)
  const [branch, setBranch] = useState('')
  const [refreshingBranches, setRefreshingBranches] = useState(false)
  const [version, setVersion] = useState('')
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(false)
  // Error del catálogo de la rama/versión elegida (por ejemplo, una rama que no se puede preparar).
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [platforms, setPlatforms] = useState<string[]>([])
  // Plataformas escritas a mano solo para esta sesión (no se guardan en el runner).
  const [extraPlatforms, setExtraPlatforms] = useState<string[]>([])
  const [showOther, setShowOther] = useState(false)
  const [otherName, setOtherName] = useState('')
  const [saveForTeam, setSaveForTeam] = useState(false)
  const [otherError, setOtherError] = useState<string | null>(null)
  const [addingOther, setAddingOther] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [parallel, setParallel] = useState(true)
  const [liveScreenshots, setLiveScreenshots] = useState(true)

  const [jobId, setJobId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [rerunning, setRerunning] = useState(false)

  useEffect(() => {
    Promise.all([getPlatforms(), getSource()])
      .then(([data, src]) => {
        setInfo(data)
        setSource(src)
        setBranch(src.default_branch ?? '')
        setCatalogLoading(true)
        setVersion(data.default_version)
        setPlatforms(data.platforms.slice(0, 1))
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)))
  }, [])

  const repoMode = source?.mode === 'repo'
  const branchInfo = source?.branches.find((b) => b.name === branch)

  function selectBranch(b: string) {
    if (b === branch) return
    setBranch(b)
    setCatalog(null)
    setCatalogError(null)
    setCatalogLoading(true)
    setSelected([])
    setActiveTag(null)
  }

  async function refreshBranches() {
    setRefreshingBranches(true)
    try {
      const src = await getSource()
      setSource(src)
      if (!src.branches.some((b) => b.name === branch)) selectBranch(src.default_branch ?? '')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    } finally {
      setRefreshingBranches(false)
    }
  }

  function selectVersion(v: string) {
    if (v === version) return
    setVersion(v)
    setCatalog(null)
    setCatalogError(null)
    setCatalogLoading(true)
    setSelected([])
    setActiveTag(null)
  }

  useEffect(() => {
    if (!version || !source || (source.mode === 'repo' && !branch)) return
    // Al cambiar rápido de rama/versión, se ignora la respuesta que llegue tarde.
    let stale = false
    getCatalog(version, source.mode === 'repo' ? branch : null)
      .then((c) => {
        if (!stale) setCatalog(c)
      })
      .catch((e) => {
        if (!stale) setCatalogError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!stale) setCatalogLoading(false)
      })
    return () => {
      stale = true
    }
  }, [version, branch, source])

  useEffect(() => {
    const job = searchParams.get('job')
    if (job) setJobId(job)
  }, [searchParams])

  const fetchStatus = useCallback((id: string) => getRun(id), [])
  const isPending = useCallback((r: RunStatusResponse) => r.status === 'pending', [])
  const { data: job, polling, error: pollError } = useJobPolling(jobId, fetchStatus, isPending)
  const running = job?.status === 'pending' || (jobId !== null && !job && polling)

  // Filtro por texto (escenario, feature o archivo) y por tag.
  const filteredFeatures = useMemo(() => {
    if (!catalog) return []
    const q = filter.trim().toLowerCase()
    return catalog.features
      .map((f) => ({
        ...f,
        scenarios: f.scenarios.filter(
          (s) =>
            (!activeTag || s.tags.includes(activeTag)) &&
            (!q || `${s.name} ${f.name} ${f.uri}`.toLowerCase().includes(q)),
        ),
      }))
      .filter((f) => f.scenarios.length > 0)
  }, [catalog, filter, activeTag])

  const visibleIds = filteredFeatures.flatMap((f) => f.scenarios.map((s) => s.id))

  function toggle(ids: string[]) {
    setSelected((prev) =>
      ids.every((id) => prev.includes(id)) ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids])),
    )
  }

  function togglePlatform(name: string) {
    setPlatforms((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]))
  }

  function removeExtraPlatform(name: string) {
    setExtraPlatforms((prev) => prev.filter((p) => p !== name))
    setPlatforms((prev) => prev.filter((p) => p !== name))
  }

  async function handleAddOther() {
    const name = normalizePlatform(otherName)
    if (!PLATFORM_RE.test(name)) {
      setOtherError('Usa solo el subdominio: letras minúsculas, números y guiones (ej. beta-accede).')
      return
    }
    if (info?.platforms.includes(name) || extraPlatforms.includes(name)) {
      setPlatforms((prev) => (prev.includes(name) ? prev : [...prev, name]))
      setOtherError(null)
      setOtherName('')
      setShowOther(false)
      return
    }
    setOtherError(null)
    if (saveForTeam) {
      // El runner verifica que responda antes de guardarla para todo el equipo.
      setAddingOther(true)
      try {
        const item = await addPlatform(name)
        setInfo((prev) =>
          prev ? { ...prev, platforms: [...prev.platforms, item.name], items: [...prev.items, item] } : prev,
        )
      } catch (err) {
        setOtherError(err instanceof Error ? err.message : String(err))
        return
      } finally {
        setAddingOther(false)
      }
    } else {
      // Solo para esta sesión: el runner la verifica al iniciar la corrida.
      setExtraPlatforms((prev) => [...prev, name])
    }
    setPlatforms((prev) => [...prev, name])
    setOtherName('')
    setShowOther(false)
  }

  const teamPlatforms = new Set(info?.items.filter((p) => p.source === 'team').map((p) => p.name) ?? [])
  const platformOptions = [...(info?.platforms ?? []), ...extraPlatforms]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (platforms.length === 0) {
      setSubmitError('Elige al menos una plataforma.')
      return
    }
    if (selected.length === 0) {
      setSubmitError('Selecciona al menos un escenario.')
      return
    }
    setJobId(null)
    try {
      const { job_id } = await createRun({
        version,
        platforms,
        scenarios: selected,
        tags: null,
        parallel,
        live_screenshots: liveScreenshots,
        branch: repoMode ? branch : null,
      })
      setJobId(job_id)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleCancel() {
    if (!jobId) return
    setCancelling(true)
    try {
      await cancelRun(jobId)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    } finally {
      setCancelling(false)
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

  const executions = selected.length * platforms.length

  return (
    <div className="flex w-full flex-col gap-gutter-lg p-layout-margin">
      <div>
        <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Automatización E2E</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Ejecuta los escenarios de Cucumber de BaseProject contra una o varias plataformas y sigue en vivo el paso
          que se está ejecutando.
        </p>
      </div>

      {loadError && (
        <p className="rounded-xl border border-error/30 bg-error-container/20 p-4 text-on-error-container">
          {loadError}. Verifica que el servicio e2e-runner esté encendido.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-4 backdrop-blur-2xl"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="flex flex-col gap-4">
            {repoMode && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="e2e-branch" className="text-sm font-medium text-on-surface">
                    Rama de BaseProject
                  </label>
                  <button
                    type="button"
                    onClick={refreshBranches}
                    disabled={refreshingBranches}
                    title="Volver a consultar las ramas del repositorio"
                    className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${refreshingBranches ? 'animate-spin' : ''}`}>
                      refresh
                    </span>
                    Actualizar
                  </button>
                </div>
                <select
                  id="e2e-branch"
                  value={branch}
                  onChange={(e) => selectBranch(e.target.value)}
                  className="rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 font-code text-sm text-on-surface"
                >
                  {source.branches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                      {b.name === source.default_branch ? ' (predeterminada)' : ''}
                    </option>
                  ))}
                </select>
                {branchInfo && (
                  <p className="text-xs text-on-surface-variant" title={branchInfo.commit}>
                    <span className="font-code">{branchInfo.commit.slice(0, 7)}</span> · {branchInfo.subject} ·{' '}
                    {new Date(branchInfo.committed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface">Versión de la suite</label>
              <div className="flex flex-wrap gap-2">
                {(info?.versions ?? []).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => selectVersion(v)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      version === v
                        ? 'bg-primary text-on-primary shadow-lg shadow-primary/25'
                        : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface">Plataformas</label>
              <div className="flex flex-wrap gap-2">
                {platformOptions.map((p) => {
                  const extra = extraPlatforms.includes(p)
                  return (
                    <span key={p} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => togglePlatform(p)}
                        aria-pressed={platforms.includes(p)}
                        title={
                          extra
                            ? 'Solo para esta sesión (no está guardada)'
                            : teamPlatforms.has(p)
                              ? 'Agregada por el equipo'
                              : 'Plataforma por defecto'
                        }
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all ${
                          extra ? 'border-dashed' : ''
                        } ${
                          platforms.includes(p)
                            ? 'border border-primary/40 bg-primary/10 text-primary'
                            : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high'
                        } ${extra ? 'rounded-r-none border-r-0' : ''}`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {platforms.includes(p) ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        {p}
                        {teamPlatforms.has(p) && <span className="material-symbols-outlined text-[14px] opacity-70">group</span>}
                      </button>
                      {extra && (
                        <button
                          type="button"
                          onClick={() => removeExtraPlatform(p)}
                          aria-label={`Quitar ${p} de esta sesión`}
                          className={`flex items-center self-stretch rounded-r-lg border border-dashed px-1.5 ${
                            platforms.includes(p)
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : 'border-outline-variant/40 text-on-surface-variant'
                          } hover:bg-surface-container-high`}
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </span>
                  )
                })}
                {!showOther && (
                  <button
                    type="button"
                    onClick={() => setShowOther(true)}
                    className="flex items-center gap-1 rounded-lg border border-dashed border-outline-variant/50 px-3 py-1.5 text-sm text-on-surface-variant hover:border-primary/50 hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Otra plataforma
                  </button>
                )}
              </div>
              {showOther && (
                <div className="flex flex-col gap-2 rounded-lg border border-outline-variant/20 bg-surface-container-low p-3">
                  <div className="flex items-center rounded-lg border border-outline-variant/40 bg-surface pr-3 focus-within:border-primary">
                    <label htmlFor="e2e-other-platform" className="sr-only">
                      Subdominio de la plataforma
                    </label>
                    <input
                      id="e2e-other-platform"
                      type="text"
                      autoFocus
                      autoComplete="off"
                      value={otherName}
                      onChange={(e) => {
                        setOtherName(e.target.value)
                        setOtherError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddOther()
                        }
                        if (e.key === 'Escape') setShowOther(false)
                      }}
                      placeholder="beta-accede"
                      className="min-w-0 flex-1 bg-transparent px-3 py-2 font-code text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
                    />
                    <span className="font-code text-xs text-on-surface-variant">.cloudgsf.com</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <input
                      type="checkbox"
                      checked={saveForTeam}
                      onChange={(e) => setSaveForTeam(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    Guardar para el equipo (queda en la lista de todos)
                  </label>
                  {otherError && <p className="text-xs text-error">{otherError}</p>}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOther(false)
                        setOtherError(null)
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm text-on-surface-variant hover:bg-surface-container-high"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddOther}
                      disabled={addingOther}
                      className="flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                    >
                      {addingOther && (
                        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      )}
                      {addingOther ? 'Verificando…' : 'Agregar'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-outline-variant/20 pt-4">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="e2e-parallel" className="text-sm text-on-surface">
                  Plataformas en paralelo
                  <span className="block text-xs text-on-surface-variant">Si se apaga, corren una tras otra.</span>
                </label>
                <ToggleSwitch id="e2e-parallel" checked={parallel} onChange={setParallel} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="e2e-live" className="text-sm text-on-surface">
                  Captura en vivo
                  <span className="block text-xs text-on-surface-variant">
                    Una imagen de la pantalla tras cada paso.
                  </span>
                </label>
                <ToggleSwitch id="e2e-live" checked={liveScreenshots} onChange={setLiveScreenshots} />
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium text-on-surface">Escenarios</label>
              <div className="flex items-center gap-2 text-xs">
                <button type="button" onClick={() => toggle(visibleIds)} className="text-primary hover:underline">
                  {visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id))
                    ? 'Quitar visibles'
                    : 'Seleccionar visibles'}
                </button>
                <span className="text-on-surface-variant">·</span>
                <button type="button" onClick={() => setSelected([])} className="text-primary hover:underline">
                  Limpiar
                </button>
              </div>
            </div>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar por escenario, feature o archivo…"
              className="rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60"
            />
            {catalog && catalog.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {catalog.tags.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setActiveTag(activeTag === t.name ? null : t.name)}
                    className={`rounded-full px-2.5 py-0.5 font-code text-xs transition-all ${
                      activeTag === t.name
                        ? 'bg-primary text-on-primary'
                        : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {t.name} <span className="opacity-70">{t.count}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="max-h-96 overflow-y-auto rounded-lg border border-outline-variant/20 bg-surface-container-low px-2 pb-2">
              {catalogLoading && (
                <p className="flex items-center gap-2 p-3 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin text-[18px] text-primary">progress_activity</span>
                  {repoMode
                    ? `Preparando la rama ${branch}… La primera vez que cambian las dependencias puede tardar un par de minutos.`
                    : 'Leyendo features de BaseProject…'}
                </p>
              )}
              {groupByModule(filteredFeatures).map((group) => {
                const ids = group.features.flatMap((f) => f.scenarios.map((s) => s.id))
                const count = ids.filter((id) => selected.includes(id)).length
                return (
                  <div key={group.name}>
                    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-surface-container-low px-2 pb-1 pt-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        {group.name}
                        <span className="ml-2 font-normal normal-case tracking-normal">
                          {count}/{ids.length}
                        </span>
                      </span>
                      <button type="button" onClick={() => toggle(ids)} className="text-xs text-primary hover:underline">
                        {count === ids.length ? 'Quitar módulo' : 'Seleccionar módulo'}
                      </button>
                    </div>
                    {group.features.map((f) => {
                      const fids = f.scenarios.map((s) => s.id)
                      const allIn = fids.every((id) => selected.includes(id))
                      return (
                        <div key={f.uri} className="mb-1">
                          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-surface-container-high">
                            <input
                              type="checkbox"
                              checked={allIn}
                              onChange={() => toggle(fids)}
                              className="h-4 w-4 accent-primary"
                            />
                            <span className="font-medium text-on-surface">{featureFileName(f.uri)}</span>
                            <span className="truncate text-xs text-on-surface-variant">{f.name}</span>
                          </label>
                          {f.scenarios.map((s) => (
                            <label
                              key={s.id}
                              className="ml-6 flex cursor-pointer items-start gap-2 rounded-md px-2 py-1 text-sm hover:bg-surface-container-high"
                            >
                              <input
                                type="checkbox"
                                checked={selected.includes(s.id)}
                                onChange={() => toggle([s.id])}
                                className="mt-0.5 h-4 w-4 accent-primary"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="text-on-surface">{s.name}</span>
                                <span className="ml-2 font-code text-xs text-on-surface-variant">
                                  {s.steps} pasos
                                </span>
                                {s.undefined_steps > 0 && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-tertiary">
                                    <span className="material-symbols-outlined text-[14px]">warning</span>
                                    {s.undefined_steps} paso(s) sin definir
                                  </span>
                                )}
                                {s.tags.length > 0 && (
                                  <span className="block font-code text-[11px] text-on-surface-variant/80">
                                    {s.tags.join(' ')}
                                  </span>
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              {catalogError && (
                <p className="whitespace-pre-line p-3 text-sm text-error">
                  {repoMode ? `No se pudo preparar la rama ${branch}: ` : ''}
                  {catalogError}
                </p>
              )}
              {catalog && filteredFeatures.length === 0 && (
                <p className="p-3 text-sm text-on-surface-variant">Sin escenarios para el filtro actual.</p>
              )}
            </div>
            {catalog && catalog.invalid_features.length > 0 && (
              <p className="text-xs text-tertiary">
                Se omitieron por errores de sintaxis: {catalog.invalid_features.join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/20 pt-4">
          <p className="text-sm text-on-surface-variant">
            {selected.length} escenario(s) × {platforms.length} plataforma(s) = {executions} ejecución(es)
          </p>
          <button
            type="submit"
            disabled={running || catalogLoading}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-medium text-on-primary shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">play_arrow</span>
            {running ? 'Ejecutando…' : 'Ejecutar corrida'}
          </button>
        </div>
      </form>

      {submitError && (
        <p className="rounded-xl border border-error/30 bg-error-container/20 p-4 text-on-error-container">{submitError}</p>
      )}
      {pollError && (
        <p className="rounded-xl border border-error/30 bg-error-container/20 p-4 text-on-error-container">{pollError}</p>
      )}

      {job && (
        <E2ERunView
          key={job.job_id}
          job={job}
          onCancel={handleCancel}
          cancelling={cancelling}
          onRerun={handleRerun}
          rerunning={rerunning}
        />
      )}

      {!jobId && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container/30 p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant/50">robot_2</span>
          <div>
            <h2 className="font-headline text-lg text-on-surface">Aún no hay una corrida</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-on-surface-variant">
              Elige {repoMode ? 'la rama, ' : ''}la versión, las plataformas y los escenarios, y presiona "Ejecutar corrida" para seguir cada paso
              en vivo.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
