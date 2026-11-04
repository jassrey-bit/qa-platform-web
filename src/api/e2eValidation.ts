export const BASE_URL = import.meta.env.VITE_E2E_API_URL ?? 'http://127.0.0.1:8004'

export type StepStatus =
  | 'PENDING_RUN'
  | 'RUNNING'
  | 'PASSED'
  | 'FAILED'
  | 'SKIPPED'
  | 'UNDEFINED'
  | 'AMBIGUOUS'
  | 'PENDING'
  | 'CANCELLED'
  | 'UNKNOWN'

export type PlatformState = 'queued' | 'running' | 'done' | 'cancelled' | 'error'

export interface CatalogScenario {
  id: string // "uri:linea", lo que se manda en `scenarios` al crear la corrida
  name: string
  line: number
  tags: string[]
  steps: number
  undefined_steps: number
}

export interface CatalogFeature {
  uri: string
  name: string
  module: string
  scenarios: CatalogScenario[]
}

export interface Catalog {
  version: string
  features: CatalogFeature[]
  tags: { name: string; count: number }[]
  invalid_features: string[]
  generated_at: string
  // Modo repositorio: de qué rama y commit salió el catálogo (null en modo local).
  branch: string | null
  commit: string | null
}

export interface SourceBranch {
  name: string
  commit: string
  committed_at: string
  subject: string
}

export interface SourceInfo {
  // repo: el runner baja la rama elegida del repositorio; local: usa la carpeta de BaseProject.
  mode: 'repo' | 'local'
  repo: string | null
  default_branch: string | null
  branches: SourceBranch[]
}

export interface PlatformItem {
  name: string
  // default: definida en el servidor (E2E_PLATFORMS); team: agregada desde la web.
  source: 'default' | 'team'
  added_at: string | null
}

export interface PlatformsInfo {
  platforms: string[]
  items: PlatformItem[]
  versions: string[]
  default_version: string
}

export interface RunStep {
  id: string
  keyword: string
  text: string
  status: StepStatus
  duration_ms: number
  hook: boolean
  error?: string
  screenshot?: string
}

export interface RunScenario {
  id: string
  feature: string
  uri: string
  line: number | null
  name: string
  tags: string[]
  status: StepStatus
  finished: boolean
  duration_ms: number
  steps: RunStep[]
}

export interface PlatformProgress {
  name: string
  state: PlatformState
  error: string | null
  started_at: string | null
  finished_at: string | null
  live: { step: string; at: string } | null
  total: number
  finished: number
  passed: number
  failed: number
  current_scenario_id: string | null
  scenarios: RunScenario[]
}

export interface RunSummary {
  total: number
  finished: number
  passed: number
  failed: number
}

export interface RunParams {
  version: string
  platforms: string[]
  scenarios: string[]
  tags: string | null
  parallel: boolean
  live_screenshots: boolean
  branch?: string | null
  commit?: string | null
}

export interface RunStatusResponse {
  job_id: string
  status: 'pending' | 'done' | 'cancelled' | 'error'
  error: string | null
  // Qué se está preparando antes de lanzar las pruebas (bajar la rama, instalar dependencias).
  phase: string | null
  created_at: string
  finished_at: string | null
  params: RunParams
  summary: RunSummary
  platforms: PlatformProgress[]
}

async function ensureOk(response: Response, action: string): Promise<Response> {
  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail = typeof body?.detail === 'string' ? body.detail : ''
    } catch {
      // sin cuerpo JSON
    }
    // Los 422 traen un mensaje pensado para el usuario (validaciones); se muestra tal cual.
    if (response.status === 422 && detail) throw new Error(detail)
    throw new Error(`${action} (HTTP ${response.status})${detail ? `: ${detail}` : ''}`)
  }
  return response
}

export async function getPlatforms(): Promise<PlatformsInfo> {
  const response = await fetch(`${BASE_URL}/platforms`)
  await ensureOk(response, 'No se pudieron cargar las plataformas')
  return response.json()
}

// El runner verifica el formato y que la plataforma responda antes de guardarla.
export async function addPlatform(name: string): Promise<PlatformItem> {
  const response = await fetch(`${BASE_URL}/platforms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  await ensureOk(response, 'No se pudo agregar la plataforma')
  return response.json()
}

export async function removePlatform(name: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/platforms/${encodeURIComponent(name)}`, { method: 'DELETE' })
  await ensureOk(response, 'No se pudo quitar la plataforma')
}

export async function getSource(): Promise<SourceInfo> {
  const response = await fetch(`${BASE_URL}/source`)
  await ensureOk(response, 'No se pudo consultar el repositorio de pruebas')
  return response.json()
}

export async function getCatalog(version: string, branch?: string | null): Promise<Catalog> {
  const query = new URLSearchParams({ version })
  if (branch) query.set('branch', branch)
  const response = await fetch(`${BASE_URL}/catalog?${query}`)
  await ensureOk(response, 'No se pudo cargar el catálogo de pruebas')
  return response.json()
}

export async function createRun(params: RunParams): Promise<{ job_id: string; status: 'pending' }> {
  const response = await fetch(`${BASE_URL}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  await ensureOk(response, 'No se pudo iniciar la corrida')
  return response.json()
}

export async function getRun(jobId: string): Promise<RunStatusResponse> {
  const response = await fetch(`${BASE_URL}/runs/${jobId}`)
  await ensureOk(response, 'No se pudo consultar la corrida')
  return response.json()
}

export async function cancelRun(jobId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/runs/${jobId}/cancel`, { method: 'POST' })
  await ensureOk(response, 'No se pudo cancelar la corrida')
}

export async function rerunRun(jobId: string): Promise<{ job_id: string; status: 'pending' }> {
  const response = await fetch(`${BASE_URL}/runs/${jobId}/rerun`, { method: 'POST' })
  await ensureOk(response, 'No se pudo re-ejecutar la corrida')
  return response.json()
}

export async function getRunLogs(jobId: string, platform: string, offset: number): Promise<{ text: string; offset: number }> {
  const response = await fetch(`${BASE_URL}/runs/${jobId}/logs/${encodeURIComponent(platform)}?offset=${offset}`)
  await ensureOk(response, 'No se pudo leer la consola')
  return response.json()
}

export function getLiveScreenshotUrl(jobId: string, platform: string, version: string): string {
  return `${BASE_URL}/runs/${jobId}/live/${encodeURIComponent(platform)}?t=${encodeURIComponent(version)}`
}

export function getFailureScreenshotUrl(jobId: string, platform: string, name: string): string {
  return `${BASE_URL}/runs/${jobId}/screenshots/${encodeURIComponent(platform)}/${name}`
}
