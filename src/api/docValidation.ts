const BASE_URL = import.meta.env.VITE_DOC_VALIDATION_API_URL ?? 'http://127.0.0.1:8000'

export type ChangeKind = 'real' | 'variable_fill' | 'monto_fill'
export type ChangeType = 'modified' | 'missing' | 'added'
export type DiscoveryMethod = 'toc' | 'heuristic' | 'ai' | 'none'
export type Severity = 'CRITICO' | 'AVISO' | 'INFO'

export interface InternalChange {
  kind: ChangeKind
  description: string
}

export interface StructuralResult {
  expected_sections: string[]
  found_sections: string[]
  missing_sections: string[]
  score: number
  discovery_method: DiscoveryMethod
}

export interface SemanticDiscrepancy {
  location: number | string
  change_type: ChangeType
  expected_text: string
  actual_text: string
  internal_changes: InternalChange[]
  severity: Severity | null
  severity_reasoning: string | null
}

export interface SemanticResult {
  matches: boolean
  details: string
  discrepancies: SemanticDiscrepancy[]
}

export interface VisualVerdict {
  available: boolean
  status: string | null
  findings: string | null
  error: string | null
}

export interface ComparisonSummary {
  status: string
  total_discrepancies: number
  critical: number
  warning: number
  info: number
  generated_at: string
}

export interface ComparisonResult {
  actual_path: string
  expected_path: string
  structural: StructuralResult
  semantic: SemanticResult
  visual: VisualVerdict | null
  summary: ComparisonSummary
}

export type JobStatusResponse =
  | { job_id: string; status: 'pending' }
  | { job_id: string; status: 'error'; error: string }
  | { job_id: string; status: 'done'; result: ComparisonResult }

export interface CreateComparisonOptions {
  enableVisual?: boolean
  hideVariableFills?: boolean
}

export async function createComparison(
  actual: File,
  expected: File,
  options: CreateComparisonOptions = {},
): Promise<{ job_id: string; status: 'pending' }> {
  const formData = new FormData()
  formData.append('actual', actual)
  formData.append('expected', expected)
  formData.append('enable_visual', String(options.enableVisual ?? false))
  formData.append('hide_variable_fills', String(options.hideVariableFills ?? false))

  const response = await fetch(`${BASE_URL}/comparisons`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    throw new Error(`No se pudo crear la comparación (HTTP ${response.status})`)
  }
  return response.json()
}

export async function getComparison(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`${BASE_URL}/comparisons/${jobId}`)
  if (!response.ok) {
    throw new Error(`No se pudo consultar el job (HTTP ${response.status})`)
  }
  return response.json()
}
