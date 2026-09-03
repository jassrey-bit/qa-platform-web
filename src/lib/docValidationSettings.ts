const STORAGE_KEY = 'qa-platform-doc-validation-settings'

export interface DocValidationSettings {
  enableVisualByDefault: boolean
  hideVariableFillsByDefault: boolean
}

const DEFAULTS: DocValidationSettings = {
  enableVisualByDefault: false,
  hideVariableFillsByDefault: false,
}

export function getDocValidationSettings(): DocValidationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

export function saveDocValidationSettings(settings: DocValidationSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
