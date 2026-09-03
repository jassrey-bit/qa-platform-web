import { BASE_URL } from './docValidation'

export interface ExecutionRecord {
  job_id: string
  created_at: string
  expected_filename: string
  actual_filename: string
  status: string
}

export interface ListExecutionsFilters {
  status?: 'PASSED' | 'FAILED'
  dateFrom?: string
  dateTo?: string
  filename?: string
  page?: number
}

export interface ListExecutionsResponse {
  items: ExecutionRecord[]
  total: number
  page: number
  page_size: number
}

/**
 * Requiere que el backend de validación de documentos exponga `GET /comparisons`
 * con soporte de listado + filtros y persistencia de archivos originales.
 * Ese endpoint aún no existe (solo hay crear/consultar un job puntual).
 */
export async function listExecutions(
  filters: ListExecutionsFilters = {},
): Promise<ListExecutionsResponse> {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  if (filters.filename) params.set('filename', filters.filename)
  if (filters.page) params.set('page', String(filters.page))

  const response = await fetch(`${BASE_URL}/comparisons?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`No se pudo obtener el listado de ejecuciones (HTTP ${response.status})`)
  }
  return response.json()
}

export function getExecutionFileUrl(jobId: string, kind: 'actual' | 'expected'): string {
  return `${BASE_URL}/comparisons/${jobId}/files/${kind}`
}

export async function rerunExecution(jobId: string): Promise<{ job_id: string; status: 'pending' }> {
  const response = await fetch(`${BASE_URL}/comparisons/${jobId}/rerun`, { method: 'POST' })
  if (!response.ok) {
    throw new Error(`No se pudo volver a ejecutar el caso (HTTP ${response.status})`)
  }
  return response.json()
}
