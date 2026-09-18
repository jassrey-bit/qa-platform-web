import type { ComparisonDiff } from '../api/apiValidation'

const FIELD_LABELS: Record<string, string> = {
  pago_fijo: 'Pago fijo',
  pago_fijo_auxiliar: 'Pago fijo (auxiliar)',
  capital: 'Capital',
  iva_capital: 'IVA sobre capital',
  interes_ordinario: 'Interés ordinario',
  iva: 'IVA',
  tasa_iva: 'Tasa + IVA',
  interes_gracia: 'Interés de gracia',
  iva_gracia: 'IVA de gracia',
  capital_diferido: 'Capital diferido',
  saldo_insoluto: 'Saldo insoluto',
  dias_periodo: 'Días del periodo',
  fecha_inicio: 'Fecha de inicio',
  fecha_vencimiento: 'Fecha de vencimiento',
  num_amortizacion: 'Número de amortización',
  guid_simulacion: 'GUID de simulación',
  GUID_Simulacion: 'GUID de simulación',
  monto_financiado: 'Monto financiado',
  monto_dispuesto: 'Monto dispuesto',
  cat: 'CAT',
  status_code: 'Código de respuesta HTTP',
}

const TYPE_LABELS: Record<string, string> = {
  value_changed: 'Valor distinto',
  missing_in_prod: 'Falta en PROD',
  missing_in_dev: 'Falta en DEV',
  length_mismatch: 'Cantidad distinta',
  type_mismatch: 'Tipo de dato distinto',
}

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field
}

// La respuesta de la API incluye la misma tabla de amortización dos veces
// (anidada bajo amortizacion_conceptos y otra vez "aplanada" al nivel raíz),
// así que un mismo campo aparece bajo dos rutas distintas con el mismo dato.
const AMORT_NESTED_RE = /^root\[\d+\]\.amortizacion_conceptos\[\d+\]\.amortizaciones\[(?<idx>\d+)\]\.(?<field>.+)$/
const AMORT_FLAT_RE = /^root\[\d+\]\.amortizaciones\[(?<idx>\d+)\]\.(?<field>.+)$/
const ROOT_FIELD_RE = /^root\[\d+\]\.(?<field>.+)$/

export function humanizeDiffPath(path: string): string {
  const amort = AMORT_NESTED_RE.exec(path) ?? AMORT_FLAT_RE.exec(path)
  if (amort?.groups) {
    return `Amortización ${Number(amort.groups.idx) + 1} → ${fieldLabel(amort.groups.field)}`
  }

  const rootField = ROOT_FIELD_RE.exec(path)
  if (rootField?.groups) {
    return fieldLabel(rootField.groups.field)
  }

  return fieldLabel(path)
}

export function humanizeDiffType(type: string): string {
  return TYPE_LABELS[type] ?? type
}

/**
 * Colapsa diferencias que, ya traducidas a un campo legible, describen el
 * mismo cambio con los mismos valores PROD/DEV — evita mostrar cada
 * diferencia dos veces por la duplicación de amortizaciones en la respuesta.
 */
export function dedupeDifferences(differences: ComparisonDiff[]): ComparisonDiff[] {
  const seen = new Set<string>()
  const result: ComparisonDiff[] = []

  for (const d of differences) {
    const key = `${humanizeDiffPath(d.path)}|${JSON.stringify(d.prod_value)}|${JSON.stringify(d.dev_value)}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(d)
  }

  return result
}

// --- Diff estructural (DeepDiff, usado en modo regresión) ---
//
// DeepDiff usa notación de corchetes en vez de puntos, p.ej.
// root[0]['amortizacion_conceptos'][0]['amortizaciones'][0]['pago_fijo'].

const BRACKET_TOKEN_RE = /\[(?:'([^']*)'|"([^"]*)"|(\d+))\]/g

function tokenizeDeepDiffPath(path: string): (string | number)[] {
  const tokens: (string | number)[] = []
  let match: RegExpExecArray | null
  BRACKET_TOKEN_RE.lastIndex = 0
  while ((match = BRACKET_TOKEN_RE.exec(path))) {
    if (match[3] !== undefined) tokens.push(Number(match[3]))
    else tokens.push(match[1] ?? match[2] ?? '')
  }
  return tokens
}

export function humanizeDeepDiffPath(path: string): string {
  const tokens = tokenizeDeepDiffPath(path)
  if (tokens.length === 0) return path

  const amortIdx = tokens.lastIndexOf('amortizaciones')
  if (amortIdx !== -1 && typeof tokens[amortIdx + 1] === 'number') {
    const rowNum = (tokens[amortIdx + 1] as number) + 1
    const field = tokens[tokens.length - 1]
    if (typeof field === 'string') {
      return `Amortización ${rowNum} → ${fieldLabel(field)}`
    }
  }

  const last = tokens[tokens.length - 1]
  return typeof last === 'string' ? fieldLabel(last) : path
}

export interface StructuralDiffRow {
  label: string
  changeLabel: string
  before?: unknown
  after?: unknown
}

/**
 * Traduce el JSON crudo de DeepDiff (values_changed, type_changes,
 * dictionary_item_added/removed, iterable_item_added/removed) a filas
 * legibles, deduplicando cambios que aparecen dos veces por la tabla de
 * amortización duplicada en la respuesta.
 */
export function parseStructuralDiff(diff: Record<string, unknown> | null | undefined): StructuralDiffRow[] {
  if (!diff) return []
  const rows: StructuralDiffRow[] = []

  const valuesChanged = diff.values_changed as Record<string, { old_value: unknown; new_value: unknown }> | undefined
  for (const [path, v] of Object.entries(valuesChanged ?? {})) {
    rows.push({ label: humanizeDeepDiffPath(path), changeLabel: 'Valor distinto', before: v.old_value, after: v.new_value })
  }

  const typeChanges = diff.type_changes as Record<string, { old_value: unknown; new_value: unknown }> | undefined
  for (const [path, v] of Object.entries(typeChanges ?? {})) {
    rows.push({ label: humanizeDeepDiffPath(path), changeLabel: 'Tipo de dato distinto', before: v.old_value, after: v.new_value })
  }

  const iterableAdded = diff.iterable_item_added as Record<string, unknown> | undefined
  for (const [path, v] of Object.entries(iterableAdded ?? {})) {
    rows.push({ label: humanizeDeepDiffPath(path), changeLabel: 'Agregado', after: v })
  }

  const iterableRemoved = diff.iterable_item_removed as Record<string, unknown> | undefined
  for (const [path, v] of Object.entries(iterableRemoved ?? {})) {
    rows.push({ label: humanizeDeepDiffPath(path), changeLabel: 'Eliminado', before: v })
  }

  for (const path of (diff.dictionary_item_added as string[] | undefined) ?? []) {
    rows.push({ label: humanizeDeepDiffPath(path), changeLabel: 'Campo agregado' })
  }

  for (const path of (diff.dictionary_item_removed as string[] | undefined) ?? []) {
    rows.push({ label: humanizeDeepDiffPath(path), changeLabel: 'Campo eliminado' })
  }

  const seen = new Set<string>()
  const deduped: StructuralDiffRow[] = []
  for (const r of rows) {
    const key = `${r.label}|${r.changeLabel}|${JSON.stringify(r.before)}|${JSON.stringify(r.after)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(r)
  }
  return deduped
}
