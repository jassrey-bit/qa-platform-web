import type { RunMode } from '../api/apiValidation'

const STORAGE_KEY = 'qa-platform-api-validation-settings'

// Campos numéricos a los que se les puede fijar un número de decimales
// esperado desde Ajustes, en vez de estar fijos en el backend.
export const TOLERANCE_FIELD_OPTIONS: { key: string; label: string }[] = [
  { key: 'cat', label: 'CAT' },
  { key: 'pago_fijo', label: 'Pago fijo' },
  { key: 'pago_fijo_auxiliar', label: 'Pago fijo (auxiliar)' },
  { key: 'capital', label: 'Capital' },
  { key: 'iva_capital', label: 'IVA sobre capital' },
  { key: 'interes_ordinario', label: 'Interés ordinario' },
  { key: 'iva', label: 'IVA' },
  { key: 'tasa_iva', label: 'Tasa + IVA' },
  { key: 'interes_gracia', label: 'Interés de gracia' },
  { key: 'iva_gracia', label: 'IVA de gracia' },
  { key: 'capital_diferido', label: 'Capital diferido' },
  { key: 'saldo_insoluto', label: 'Saldo insoluto' },
  { key: 'monto_financiado', label: 'Monto financiado' },
  { key: 'monto_dispuesto', label: 'Monto dispuesto' },
]

// Más de 4 decimales no aporta en montos y tasas; valores guardados
// antes con un máximo mayor se ajustan a este límite al leerlos.
export const MAX_TOLERANCE_DECIMALS = 4

// Decimales esperados por campo ({ cat: 2 }). Para cada campo con regla, la
// API no debe traer más de N decimales y la comparación contra el esperado
// se hace solo hasta esos N decimales. Los campos sin regla se comparan
// exacto y no se valida su formato.
export type DecimalRules = Record<string, number>

export interface ApiValidationSettings {
  defaultMode: RunMode
  expandCustomCaseByDefault: boolean
  decimalRules: DecimalRules
}

const DEFAULTS: ApiValidationSettings = {
  defaultMode: 'regression',
  expandCustomCaseByDefault: false,
  decimalRules: { cat: 2 },
}

function clampDecimals(value: unknown): number {
  return Math.min(MAX_TOLERANCE_DECIMALS, Math.max(0, Math.round(Number(value) || 0)))
}

// Antes había un solo número de decimales para todos los campos activados
// (toleranceDecimals + toleranceFields); se convierte a una regla por campo.
function migrateLegacy(raw: Record<string, unknown>): DecimalRules | undefined {
  if (!Array.isArray(raw.toleranceFields)) return undefined
  const decimals = clampDecimals(raw.toleranceDecimals ?? 2)
  return Object.fromEntries((raw.toleranceFields as string[]).map((key) => [key, decimals]))
}

export function decimalRulesLabel(rules: DecimalRules): string {
  const entries = Object.entries(rules)
  if (entries.length === 0) return 'ningún campo'
  return entries
    .map(([key, n]) => `${TOLERANCE_FIELD_OPTIONS.find((o) => o.key === key)?.label ?? key} (${n} dec.)`)
    .join(', ')
}

export function getApiValidationSettings(): ApiValidationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    const rules: DecimalRules = parsed.decimalRules ?? migrateLegacy(parsed) ?? DEFAULTS.decimalRules
    return {
      defaultMode: parsed.defaultMode ?? DEFAULTS.defaultMode,
      expandCustomCaseByDefault: parsed.expandCustomCaseByDefault ?? DEFAULTS.expandCustomCaseByDefault,
      decimalRules: Object.fromEntries(Object.entries(rules).map(([key, n]) => [key, clampDecimals(n)])),
    }
  } catch {
    return DEFAULTS
  }
}

export function saveApiValidationSettings(settings: ApiValidationSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
