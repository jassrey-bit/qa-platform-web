export const BASE_URL = import.meta.env.VITE_API_VALIDATION_API_URL ?? 'http://127.0.0.1:8002'

export type RunMode = 'regression' | 'comparison'

export interface FixtureCase {
  case_id: string
  description: string
}

export interface CustomCase {
  case_id?: string
  description?: string
  payload: unknown
  expected_response?: unknown
}

export interface RegressionCaseResult {
  case_id: string
  description: string
  passed: boolean
  http_status: number
  execution_time_ms: number
  structural_diff: Record<string, unknown>
  financial_violations: string[]
  actual_response: unknown
  expected_response: unknown
}

export interface ComparisonDiff {
  path: string
  type: string
  prod_value: unknown
  dev_value: unknown
}

export interface ComparisonSide {
  status_code: number
  response_time_ms: number
  data: unknown
  financial_violations: string[]
}

export interface ComparisonCaseResult {
  case_id: string
  description: string
  passed: boolean
  prod: ComparisonSide
  dev: ComparisonSide
  differences: ComparisonDiff[]
}

export interface RunSummary {
  total: number
  passed: number
  failed: number
}

export type JobStatusResponse =
  | { job_id: string; status: 'pending' }
  | { job_id: string; status: 'error'; error: string }
  | { job_id: string; status: 'done'; mode: 'regression'; summary: RunSummary; result: RegressionCaseResult[] }
  | { job_id: string; status: 'done'; mode: 'comparison'; summary: RunSummary; result: ComparisonCaseResult[] }

export interface RunListItem {
  job_id: string
  mode: RunMode
  created_at: string
  status: string
  summary: RunSummary
}

export interface RunListFilters {
  mode?: RunMode
  status?: string
  dateFrom?: string
  dateTo?: string
  caseId?: string
  page?: number
}

export interface CreateRunOptions {
  caseIds?: string[]
  customCases?: CustomCase[]
}

export async function listFixtures(): Promise<FixtureCase[]> {
  const response = await fetch(`${BASE_URL}/fixtures`)
  if (!response.ok) {
    throw new Error(`No se pudo obtener la lista de fixtures (HTTP ${response.status})`)
  }
  return response.json()
}

async function extractErrorDetail(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body?.detail === 'string') return body.detail
  } catch {
    // ignore, se usa el mensaje genérico
  }
  return fallback
}

export async function createRun(
  mode: RunMode,
  options: CreateRunOptions = {},
): Promise<{ job_id: string; status: 'pending' }> {
  const response = await fetch(`${BASE_URL}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode,
      case_ids: options.caseIds ?? null,
      custom_cases: options.customCases ?? null,
    }),
  })
  if (!response.ok) {
    throw new Error(await extractErrorDetail(response, `No se pudo crear la corrida (HTTP ${response.status})`))
  }
  return response.json()
}

export async function getRun(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`${BASE_URL}/runs/${jobId}`)
  if (!response.ok) {
    throw new Error(`No se pudo consultar el job (HTTP ${response.status})`)
  }
  return response.json()
}

export async function listRuns(filters: RunListFilters = {}): Promise<{
  items: RunListItem[]
  total: number
  page: number
  page_size: number
}> {
  const params = new URLSearchParams()
  if (filters.mode) params.set('mode', filters.mode)
  if (filters.status) params.set('status', filters.status)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  if (filters.caseId) params.set('case_id', filters.caseId)
  if (filters.page) params.set('page', String(filters.page))

  const response = await fetch(`${BASE_URL}/runs?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`No se pudo obtener el historial (HTTP ${response.status})`)
  }
  return response.json()
}

export async function rerunRun(jobId: string): Promise<{ job_id: string; status: 'pending' }> {
  const response = await fetch(`${BASE_URL}/runs/${jobId}/rerun`, { method: 'POST' })
  if (!response.ok) {
    throw new Error(`No se pudo reintentar la corrida (HTTP ${response.status})`)
  }
  return response.json()
}
