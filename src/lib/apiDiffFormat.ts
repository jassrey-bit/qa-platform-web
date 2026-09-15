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
