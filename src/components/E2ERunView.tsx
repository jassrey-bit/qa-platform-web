import { useEffect, useRef, useState } from 'react'
import {
  getFailureScreenshotUrl,
  getLiveScreenshotUrl,
  getRunLogs,
  type PlatformProgress,
  type RunScenario,
  type RunStatusResponse,
  type RunStep,
  type StepStatus,
} from '../api/e2eValidation'

const STEP_ICON: Record<StepStatus, { icon: string; className: string; label: string }> = {
  PASSED: { icon: 'done_outline', className: 'text-success', label: 'Pasó' },
  FAILED: { icon: 'error', className: 'text-error', label: 'Falló' },
  RUNNING: { icon: 'sync', className: 'animate-spin text-primary', label: 'Ejecutando' },
  PENDING_RUN: { icon: 'radio_button_unchecked', className: 'text-on-surface-variant/50', label: 'Pendiente' },
  SKIPPED: { icon: 'block', className: 'text-on-surface-variant/60', label: 'Omitido' },
  UNDEFINED: { icon: 'help', className: 'text-tertiary', label: 'Sin definir' },
  AMBIGUOUS: { icon: 'help', className: 'text-tertiary', label: 'Ambiguo' },
  PENDING: { icon: 'pending', className: 'text-tertiary', label: 'Pendiente' },
  CANCELLED: { icon: 'do_not_disturb_on', className: 'text-on-surface-variant', label: 'Cancelado' },
  UNKNOWN: { icon: 'help', className: 'text-on-surface-variant', label: 'Desconocido' },
}

const RUN_STATUS = {
  pending: { label: 'En curso', className: 'border-primary/30 bg-primary/10 text-primary' },
  done: { label: 'Terminada', className: 'border-success/30 bg-success/10 text-success' },
  cancelled: { label: 'Cancelada', className: 'border-outline-variant/40 bg-surface-container-high text-on-surface-variant' },
  error: { label: 'Error', className: 'border-error/30 bg-error/10 text-error' },
} as const

const PLATFORM_STATE: Record<PlatformProgress['state'], string> = {
  queued: 'En espera',
  running: 'Ejecutando',
  done: 'Terminada',
  cancelled: 'Cancelada',
  error: 'Error',
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

function useElapsed(from: string, to: string | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (to) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [to])
  return (to ? new Date(to).getTime() : now) - new Date(from).getTime()
}

function StepIcon({ status, icon }: { status: StepStatus; icon?: string }) {
  const meta = STEP_ICON[status] ?? STEP_ICON.UNKNOWN
  return (
    <span className={`material-symbols-outlined shrink-0 text-[18px] ${meta.className}`} title={meta.label}>
      {icon ?? meta.icon}
    </span>
  )
}

// Los hooks (Before/After) solo se muestran si fallaron: son ruido cuando pasan.
function visibleSteps(steps: RunStep[]): RunStep[] {
  return steps.filter((s) => !s.hook || s.status === 'FAILED')
}

function StepList({ steps, jobId, platform }: { steps: RunStep[]; jobId: string; platform: string }) {
  return (
    <ol className="flex min-w-0 flex-col">
      {visibleSteps(steps).map((step) => (
        <li key={step.id} className="flex min-w-0 flex-col gap-1.5">
          <div
            className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm ${
              step.status === 'RUNNING' ? 'bg-primary/10 text-primary' : ''
            }`}
          >
            <StepIcon status={step.status} />
            <span className="w-12 shrink-0 font-code text-xs leading-5 text-on-surface-variant">{step.keyword}</span>
            <span
              className={`min-w-0 flex-1 break-words ${
                step.status === 'PENDING_RUN' || step.status === 'SKIPPED' ? 'text-on-surface-variant/70' : 'text-on-surface'
              } ${step.status === 'RUNNING' ? 'font-medium text-primary' : ''}`}
            >
              {step.text}
            </span>
            {step.duration_ms > 0 && (
              <span className="shrink-0 font-code text-xs leading-5 text-on-surface-variant">
                {(step.duration_ms / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          {step.error && (
            <div className="flex min-w-0 flex-col gap-2 sm:ml-8">
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-error/30 bg-error-container/20 p-3 font-code text-xs text-on-error-container">
                {step.error.trim()}
              </pre>
              {step.screenshot && (
                <a
                  href={getFailureScreenshotUrl(jobId, platform, step.screenshot)}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-lg border border-outline-variant/30 sm:w-fit"
                  title="Abrir captura en tamaño completo"
                >
                  <img
                    src={getFailureScreenshotUrl(jobId, platform, step.screenshot)}
                    alt={`Captura del paso fallido: ${step.text}`}
                    className="w-full sm:max-h-64 sm:w-auto"
                  />
                </a>
              )}
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

function scenarioIcon(scenario: RunScenario, currentId: string | null): StepStatus {
  if (scenario.finished || scenario.status === 'CANCELLED') return scenario.status
  return scenario.id === currentId ? 'RUNNING' : 'PENDING_RUN'
}

function fileLabel(scenario: RunScenario): string {
  const file = scenario.uri.split('/').pop() ?? scenario.uri
  return scenario.line ? `${file}:${scenario.line}` : file
}

function ScenarioDetail({
  job,
  platform,
  scenario,
  isLive,
  onFollowLive,
}: {
  job: RunStatusResponse
  platform: PlatformProgress
  scenario: RunScenario
  isLive: boolean
  onFollowLive: (() => void) | null
}) {
  const position = platform.scenarios.findIndex((s) => s.id === scenario.id) + 1
  const steps = visibleSteps(scenario.steps)
  const done = steps.filter((s) => s.status !== 'PENDING_RUN' && s.status !== 'RUNNING').length
  const showShot = isLive && job.params.live_screenshots && platform.live
  const statusMeta = STEP_ICON[scenarioIcon(scenario, platform.current_scenario_id)] ?? STEP_ICON.UNKNOWN

  return (
    <div
      className={`flex min-w-0 flex-col gap-3 rounded-xl border bg-surface-container-low p-3 sm:p-4 ${
        isLive ? 'border-primary/30' : 'border-outline-variant/20'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              isLive ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            {isLive ? 'En vivo · ' : ''}Escenario {position} de {platform.total}
            {isLive ? '' : ` · ${statusMeta.label}`}
          </p>
          <h3 className="break-words font-headline text-base text-on-surface">{scenario.name}</h3>
          <p className="break-all font-code text-xs text-on-surface-variant">
            {scenario.uri}
            {scenario.line ? `:${scenario.line}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isLive && steps.length > 0 && (
            <span className="font-code text-xs text-on-surface-variant">
              paso {Math.min(done + 1, steps.length)} de {steps.length}
            </span>
          )}
          {!isLive && scenario.duration_ms > 0 && (
            <span className="font-code text-xs text-on-surface-variant">{formatDuration(scenario.duration_ms)}</span>
          )}
          {onFollowLive && (
            <button
              type="button"
              onClick={onFollowLive}
              className="flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Seguir en vivo
            </button>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-[minmax(0,1fr)] gap-4 ${showShot ? 'xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]' : ''}`}>
        <StepList steps={scenario.steps} jobId={job.job_id} platform={platform.name} />
        {showShot && platform.live && (
          // En pantallas angostas va antes de los pasos: una lista larga la dejaría fuera de vista.
          <div className="order-first flex min-w-0 flex-col gap-1.5 xl:order-none">
            <a
              href={getLiveScreenshotUrl(job.job_id, platform.name, platform.live.at)}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-lg border border-outline-variant/30 bg-surface"
              title="Abrir captura en tamaño completo"
            >
              <img
                src={getLiveScreenshotUrl(job.job_id, platform.name, platform.live.at)}
                alt="Última captura de la ejecución"
                className="w-full"
              />
            </a>
            <p className="break-words text-xs text-on-surface-variant">
              Última captura, tras «{platform.live.step}» · {new Date(platform.live.at).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Lista de escenarios a la izquierda y pasos de uno solo a la derecha. El
 * detalle sigue al escenario en curso hasta que el usuario elige otro. En
 * pantallas angostas la lista se pliega tras una barra sobre el detalle, para
 * que una corrida larga no deje lo que está pasando al fondo de la página.
 */
function ScenarioExplorer({ job, platform, running }: { job: RunStatusResponse; platform: PlatformProgress; running: boolean }) {
  const [pinnedId, setPinnedId] = useState<string | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  const selectedRowRef = useRef<HTMLLIElement>(null)

  const { scenarios } = platform
  const live = running && platform.state === 'running'
  const currentId = live ? platform.current_scenario_id : null
  const followedId = live
    ? (currentId ?? scenarios.find((s) => !s.finished)?.id)
    : (scenarios.find((s) => s.status !== 'PASSED')?.id ?? scenarios[0]?.id)
  const shownId = pinnedId ?? followedId
  const shown = scenarios.find((s) => s.id === shownId) ?? scenarios[0]

  // Solo mueve el scroll de la lista, nunca el de la página.
  useEffect(() => {
    const list = listRef.current
    const row = selectedRowRef.current
    if (!list || !row) return
    const top = row.offsetTop
    const bottom = top + row.offsetHeight
    if (top < list.scrollTop) list.scrollTop = top
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight
  }, [shown?.id, listOpen])

  function select(id: string) {
    // Elegir el que está corriendo equivale a volver a seguir en vivo.
    setPinnedId(id === currentId ? null : id)
    setListOpen(false)
  }

  if (!shown) return null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-3 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="hidden text-sm font-medium text-on-surface lg:block">Escenarios</p>
        {scenarios.length > 1 && (
          <button
            type="button"
            onClick={() => setListOpen((v) => !v)}
            aria-expanded={listOpen}
            className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-left text-sm text-on-surface lg:hidden"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">list</span>
            <span className="font-medium">Escenarios</span>
            <span className="font-code text-xs text-on-surface-variant">
              {platform.finished}/{platform.total}
            </span>
            {platform.failed > 0 && <span className="text-xs font-medium text-error">{platform.failed} con fallo</span>}
            <span className="material-symbols-outlined ml-auto text-[18px] text-on-surface-variant">
              {listOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        )}
        <ul
          ref={listRef}
          className={`relative max-h-80 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-low lg:block lg:max-h-[70vh] ${
            listOpen ? 'block' : 'hidden'
          }`}
        >
          {scenarios.map((sc) => {
            const selected = sc.id === shown.id
            return (
              <li
                key={sc.id}
                ref={selected ? selectedRowRef : undefined}
                className="border-t border-outline-variant/20 first:border-t-0"
              >
                <button
                  type="button"
                  onClick={() => select(sc.id)}
                  aria-current={selected ? 'true' : undefined}
                  title={`${sc.feature} · ${sc.uri}${sc.line ? `:${sc.line}` : ''}`}
                  className={`flex min-h-11 w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left ${
                    selected ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-surface-container-high'
                  }`}
                >
                  <StepIcon
                    status={scenarioIcon(sc, currentId)}
                    icon={scenarioIcon(sc, currentId) === 'PASSED' ? 'check_circle' : undefined}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-on-surface">{sc.name}</span>
                    <span className="block truncate font-code text-xs text-on-surface-variant">{fileLabel(sc)}</span>
                  </span>
                  {sc.duration_ms > 0 && (
                    <span className="shrink-0 font-code text-xs text-on-surface-variant">{formatDuration(sc.duration_ms)}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="min-w-0 lg:pt-[1.625rem]">
        <ScenarioDetail
          job={job}
          platform={platform}
          scenario={shown}
          isLive={shown.id === currentId}
          onFollowLive={live && pinnedId !== null ? () => setPinnedId(null) : null}
        />
      </div>
    </div>
  )
}

function PreparingPanel({ job, platform }: { job: RunStatusResponse; platform: PlatformProgress }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-surface-container-low p-4 text-sm text-on-surface-variant">
      <span className="material-symbols-outlined animate-spin text-[18px] text-primary">progress_activity</span>
      {job.phase ??
        (platform.state === 'queued'
          ? 'En espera de que termine la plataforma anterior…'
          : 'Preparando Cucumber y el navegador…')}
    </div>
  )
}

function ConsolePanel({ jobId, platform, live }: { jobId: string; platform: string; live: boolean }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const offsetRef = useRef(0)
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    async function pull() {
      try {
        const res = await getRunLogs(jobId, platform, offsetRef.current)
        if (cancelled) return
        offsetRef.current = res.offset
        if (res.text) setText((t) => (t + res.text).slice(-200_000))
        setError(null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
      if (!cancelled && live) timer = setTimeout(pull, 2000)
    }
    pull()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, jobId, platform, live])

  useEffect(() => {
    if (preRef.current) preRef.current.scrollTop = preRef.current.scrollHeight
  }, [text])

  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-on-surface-variant hover:text-on-surface"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-[18px]">terminal</span>
        Consola de Cucumber
        <span className="material-symbols-outlined ml-auto text-[18px]">{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          {error && <p className="mb-2 text-xs text-error">{error}</p>}
          <pre
            ref={preRef}
            className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-surface p-3 font-code text-xs text-on-surface"
          >
            {text || 'Sin salida todavía.'}
          </pre>
        </div>
      )}
    </div>
  )
}

export function E2ERunView({
  job,
  onCancel,
  cancelling,
  onRerun,
  rerunning,
}: {
  job: RunStatusResponse
  onCancel: () => void
  cancelling: boolean
  onRerun: () => void
  rerunning: boolean
}) {
  const [selected, setSelected] = useState(job.platforms[0]?.name ?? '')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const elapsed = useElapsed(job.created_at, job.finished_at)
  const running = job.status === 'pending'
  const platform = job.platforms.find((p) => p.name === selected) ?? job.platforms[0]
  const status = RUN_STATUS[job.status]
  const { summary } = job
  const percent = summary.total > 0 ? Math.round((summary.finished / summary.total) * 100) : 0

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-3 backdrop-blur-2xl sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.className}`}>
            {running && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}
            {status.label}
          </span>
          <span className="text-sm text-on-surface-variant">
            {job.params.version.toUpperCase()} · {job.params.platforms.length} plataforma(s) ·{' '}
            {job.params.parallel ? 'en paralelo' : 'una tras otra'}
          </span>
          {job.params.branch && (
            <span
              className="flex min-w-0 items-center gap-1 break-all font-code text-xs text-on-surface-variant"
              title={job.params.commit ?? undefined}
            >
              <span className="material-symbols-outlined text-[16px]">account_tree</span>
              {job.params.branch}
              {job.params.commit && <span className="opacity-70">@{job.params.commit.slice(0, 7)}</span>}
            </span>
          )}
          <span className="flex items-center gap-1 font-code text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            {formatDuration(elapsed)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {running && !confirmCancel && (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              disabled={cancelling}
              className="flex items-center gap-1.5 rounded-lg border border-error/40 px-3 py-1.5 text-sm text-error hover:bg-error/10 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">stop_circle</span>
              {cancelling ? 'Cancelando…' : 'Cancelar corrida'}
            </button>
          )}
          {running && confirmCancel && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-on-surface-variant">¿Detener todas las plataformas?</span>
              <button
                type="button"
                onClick={() => {
                  setConfirmCancel(false)
                  onCancel()
                }}
                className="rounded-lg bg-error px-3 py-1.5 font-medium text-on-error hover:opacity-90"
              >
                Sí, cancelar
              </button>
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="rounded-lg border border-outline-variant/40 px-3 py-1.5 text-on-surface-variant hover:bg-surface-container-high"
              >
                Seguir
              </button>
            </div>
          )}
          {!running && (
            <button
              type="button"
              onClick={onRerun}
              disabled={rerunning}
              className="flex items-center gap-1.5 rounded-lg border border-outline-variant/40 px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container-high disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">replay</span>
              {rerunning ? 'Iniciando…' : 'Re-ejecutar'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Escenarios', value: summary.total, className: 'text-on-surface' },
          { label: 'Terminados', value: `${summary.finished} (${percent}%)`, className: 'text-on-surface' },
          { label: 'Pasaron', value: summary.passed, className: 'text-success' },
          { label: 'Fallaron', value: summary.failed, className: summary.failed > 0 ? 'text-error' : 'text-on-surface' },
        ].map((m) => (
          <div key={m.label} className="rounded-xl bg-surface-container-low p-3">
            <p className="text-xs text-on-surface-variant">{m.label}</p>
            <p className={`font-headline text-xl font-semibold tabular-nums ${m.className}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {job.error && (
        <p className="whitespace-pre-line rounded-xl border border-error/30 bg-error-container/20 p-3 text-sm text-on-error-container">
          {job.error}
        </p>
      )}

      {job.platforms.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist">
          {job.platforms.map((p) => (
            <button
              key={p.name}
              type="button"
              role="tab"
              aria-selected={p.name === platform?.name}
              onClick={() => setSelected(p.name)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all ${
                p.name === platform?.name
                  ? 'bg-primary text-on-primary shadow-lg shadow-primary/25'
                  : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {p.state === 'running' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
              {p.name}
              <span className="font-code text-xs opacity-80">
                {p.finished}/{p.total}
                {p.failed > 0 ? ` · ${p.failed}✕` : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      {platform && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span>
                <span className="font-medium text-on-surface">{platform.name}</span> · {PLATFORM_STATE[platform.state]}
              </span>
              <span className="font-code">
                {platform.finished}/{platform.total} escenarios
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                className={`h-full rounded-full transition-all ${platform.failed > 0 ? 'bg-error' : 'bg-primary'}`}
                style={{ width: `${platform.total > 0 ? (platform.finished / platform.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {platform.scenarios.length === 0 && (platform.state === 'running' || platform.state === 'queued') && running && (
            <PreparingPanel job={job} platform={platform} />
          )}

          {platform.error && (
            <div className="flex flex-col gap-1.5 rounded-xl border border-error/30 bg-error-container/20 p-3">
              <p className="text-sm font-medium text-on-error-container">La plataforma no pudo ejecutarse</p>
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap font-code text-xs text-on-error-container">
                {platform.error}
              </pre>
            </div>
          )}

          {/* key: cada plataforma recuerda por separado qué escenario se eligió. */}
          <ScenarioExplorer key={`scenarios-${platform.name}`} job={job} platform={platform} running={running} />

          {/* key: al cambiar de plataforma la consola arranca desde cero. */}
          <ConsolePanel key={platform.name} jobId={job.job_id} platform={platform.name} live={running} />
        </div>
      )}
    </section>
  )
}
