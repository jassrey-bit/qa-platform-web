import type { RunMode } from '../api/apiValidation'

const STORAGE_KEY = 'qa-platform-api-validation-settings'

// Campos numéricos candidatos a los que se les puede aplicar tolerancia
// decimal (p. ej. por redondeo de punto flotante). Se activan/desactivan
// desde Ajustes, en vez de estar fijos en el backend.
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

export interface ApiValidationSettings {
  defaultMode: RunMode
  expandCustomCaseByDefault: boolean
  toleranceDecimals: number
  toleranceFields: string[]
}

const DEFAULTS: ApiValidationSettings = {
  defaultMode: 'regression',
  expandCustomCaseByDefault: false,
  toleranceDecimals: 2,
  toleranceFields: ['cat'],
}

export function getApiValidationSettings(): ApiValidationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const settings: ApiValidationSettings = { ...DEFAULTS, ...JSON.parse(raw) }
    settings.toleranceDecimals = Math.min(
      MAX_TOLERANCE_DECIMALS,
      Math.max(0, Math.round(Number(settings.toleranceDecimals) || 0)),
    )
    return settings
  } catch {
    return DEFAULTS
  }
}

export function saveApiValidationSettings(settings: ApiValidationSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
