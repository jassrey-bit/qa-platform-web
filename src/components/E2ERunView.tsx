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
  PASSED: { icon: 'verified', className: 'text-success', label: 'Pasó' },
  FAILED: { icon: 'cancel', className: 'text-error', label: 'Falló' },
  RUNNING: { icon: 'progress_activity', className: 'animate-spin text-primary', label: 'Ejecutando' },
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

function StepIcon({ status }: { status: StepStatus }) {
  const meta = STEP_ICON[status] ?? STEP_ICON.UNKNOWN
  return (
    <span className={`material-symbols-outlined shrink-0 text-[18px] ${meta.className}`} title={meta.label}>
      {meta.icon}
    </span>
  )
}

// Los hooks (Before/After) solo se muestran si fallaron: son ruido cuando pasan.
function visibleSteps(steps: RunStep[]): RunStep[] {
  return steps.filter((s) => !s.hook || s.status === 'FAILED')
}

function StepList({ steps, jobId, platform }: { steps: RunStep[]; jobId: string; platform: string }) {
  return (
    <ol className="flex flex-col">
      {visibleSteps(steps).map((step) => (
        <li key={step.id} className="flex flex-col gap-1.5">
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
            <div className="ml-8 flex flex-col gap-2">
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-error/30 bg-error-container/20 p-3 font-code text-xs text-on-error-container">
                {step.error.trim()}
              </pre>
              {step.screenshot && (
                <a
                  href={getFailureScreenshotUrl(jobId, platform, step.screenshot)}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-fit overflow-hidden rounded-lg border border-outline-variant/30"
                  title="Abrir captura en tamaño completo"
                >
                  <img
                    src={getFailureScreenshotUrl(jobId, platform, step.screenshot)}
                    alt={`Captura del paso fallido: ${step.text}`}
                    className="max-h-64 w-auto"
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

function LivePanel({ job, platform }: { job: RunStatusResponse; platform: PlatformProgress }) {
  const [expanded, setExpanded] = useState(false)
  const current = platform.scenarios.find((s) => s.id === platform.current_scenario_id) ?? null
  const position = current ? platform.scenarios.findIndex((s) => s.id === current.id) + 1 : 0
  const scenarioSteps = current ? visibleSteps(current.steps) : []
  const done = scenarioSteps.filter((s) => s.status !== 'PENDING_RUN' && s.status !== 'RUNNING').length
  const showShot = job.params.live_screenshots && platform.live

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-surface-container-low p-4">
      {current ? (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                En vivo · escenario {position} de {platform.total}
              </p>
              <h3 className="font-headline text-base text-on-surface">{current.name}</h3>
              <p className="font-code text-xs text-on-surface-variant">
                {current.uri}
                {current.line ? `:${current.line}` : ''}
              </p>
            </div>
            <span className="font-code text-xs text-on-surface-variant">
              paso {Math.min(done + 1, scenarioSteps.length)} de {scenarioSteps.length}
            </span>
          </div>
          <div className={`grid gap-4 ${showShot ? 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]' : ''}`}>
            <StepList steps={current.steps} jobId={job.job_id} platform={platform.name} />
            {showShot && platform.live && (
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="overflow-hidden rounded-lg border border-outline-variant/30 bg-surface"
                  title={expanded ? 'Reducir captura' : 'Ampliar captura'}
                >
                  <img
                    src={getLiveScreenshotUrl(job.job_id, platform.name, platform.live.at)}
                    alt="Última captura de la ejecución"
                    className="w-full"
                  />
                </button>
                <p className="text-xs text-on-surface-variant">
                  Última captura, tras «{platform.live.step}» · {new Date(platform.live.at).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
          {expanded && platform.live && (
            <img
              src={getLiveScreenshotUrl(job.job_id, platform.name, platform.live.at)}
              alt="Última captura de la ejecución, ampliada"
              className="w-full rounded-lg border border-outline-variant/30"
            />
          )}
        </>
      ) : (
        <div className="flex items-center gap-2.5 text-sm text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-[18px] text-primary">progress_activity</span>
          {job.phase ??
            (platform.state === 'queued'
              ? 'En espera de que termine la plataforma anterior…'
              : 'Preparando Cucumber y el navegador…')}
        </div>
      )}
    </div>
  )
}

function ScenarioRow({ scenario, jobId, platform }: { scenario: RunScenario; jobId: string; platform: string }) {
  // Hasta que el usuario lo abra o cierre, un escenario fallido se muestra
  // abierto (también si falla mientras ya estaba en pantalla).
  const [toggled, setToggled] = useState<boolean | null>(null)
  const open = toggled ?? scenario.status === 'FAILED'
  const setOpen = (fn: (v: boolean) => boolean) => setToggled(fn(open))
  return (
    <li className="border-t border-outline-variant/20 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-container-high"
        aria-expanded={open}
      >
        <StepIcon status={scenario.finished || scenario.status === 'CANCELLED' ? scenario.status : 'RUNNING'} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-on-surface">{scenario.name}</span>
          <span className="block truncate font-code text-xs text-on-surface-variant">
            {scenario.feature} · {scenario.uri}
            {scenario.line ? `:${scenario.line}` : ''}
          </span>
        </span>
        {scenario.duration_ms > 0 && (
          <span className="shrink-0 font-code text-xs text-on-surface-variant">{formatDuration(scenario.duration_ms)}</span>
        )}
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <StepList steps={scenario.steps} jobId={jobId} platform={platform} />
        </div>
      )}
    </li>
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
    <section className="flex flex-col gap-4 rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-4 backdrop-blur-2xl">
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
              className="flex items-center gap-1 font-code text-xs text-on-surface-variant"
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
            <div className="flex items-center gap-2 text-sm">
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

          {(platform.state === 'running' || platform.state === 'queued') && running && (
            <LivePanel job={job} platform={platform} />
          )}

          {platform.error && (
            <div className="flex flex-col gap-1.5 rounded-xl border border-error/30 bg-error-container/20 p-3">
              <p className="text-sm font-medium text-on-error-container">La plataforma no pudo ejecutarse</p>
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap font-code text-xs text-on-error-container">
                {platform.error}
              </pre>
            </div>
          )}

          {platform.scenarios.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-on-surface">Escenarios</p>
              <ul className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-low">
                {platform.scenarios.map((sc) => (
                  <ScenarioRow key={sc.id} scenario={sc} jobId={job.job_id} platform={platform.name} />
                ))}
              </ul>
            </div>
          )}

          {/* key: al cambiar de plataforma la consola arranca desde cero. */}
          <ConsolePanel key={platform.name} jobId={job.job_id} platform={platform.name} live={running} />
        </div>
      )}
    </section>
  )
}
