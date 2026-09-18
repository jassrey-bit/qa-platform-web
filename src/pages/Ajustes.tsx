import { useState } from 'react'
import { ToggleSwitch } from '../components/ToggleSwitch'
import type { RunMode } from '../api/apiValidation'
import {
  getApiValidationSettings,
  saveApiValidationSettings,
  TOLERANCE_FIELD_OPTIONS,
  type ApiValidationSettings,
} from '../lib/apiValidationSettings'
import {
  getDocValidationSettings,
  saveDocValidationSettings,
  type DocValidationSettings,
} from '../lib/docValidationSettings'

export function Ajustes() {
  const [settings, setSettings] = useState<DocValidationSettings>(getDocValidationSettings)
  const [apiSettings, setApiSettings] = useState<ApiValidationSettings>(getApiValidationSettings)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    saveDocValidationSettings(settings)
    saveApiValidationSettings(apiSettings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleDiscard() {
    setSettings(getDocValidationSettings())
    setApiSettings(getApiValidationSettings())
  }

  function toggleToleranceField(key: string) {
    setApiSettings((s) => ({
      ...s,
      toleranceFields: s.toleranceFields.includes(key)
        ? s.toleranceFields.filter((f) => f !== key)
        : [...s.toleranceFields, key],
    }))
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-gutter-xl p-layout-margin">
      <div>
        <span className="rounded bg-primary/10 px-2 py-0.5 font-code text-xs uppercase tracking-wider text-primary">
          Ajustes
        </span>
        <h1 className="mt-2 font-headline text-3xl font-bold tracking-tight text-on-surface">
          Ajustes de validación
        </h1>
        <p className="mt-1 max-w-2xl text-on-surface-variant">
          Define los valores por defecto que se usarán al crear una nueva validación de documentos o una nueva
          corrida de API.
        </p>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-4 backdrop-blur-2xl sm:gap-8 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-[24px]">rule_settings</span>
            </div>
            <div>
              <h2 className="font-headline text-lg text-on-surface">Validación de documentos</h2>
              <p className="text-sm text-on-surface-variant">
                Configura las reglas de análisis visual y omisión de variables.
              </p>
            </div>
          </div>
          <span className="self-start rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-code text-xs text-primary sm:self-auto">
            Activo
          </span>
        </div>

        <div className="h-px w-full bg-outline-variant/20" />

        <div className="flex flex-col gap-4 rounded-2xl border border-transparent p-4 transition-all hover:border-outline-variant/10 hover:bg-surface-container-high/40 sm:flex-row sm:items-start sm:justify-between sm:gap-gutter-xl">
          <div className="flex max-w-md flex-col gap-1">
            <label htmlFor="toggle-visual" className="cursor-pointer font-medium text-on-surface">
              Incluir análisis visual por defecto
            </label>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Compara automáticamente píxeles y diferencias de renderizado visual en cada ejecución.
            </p>
          </div>
          <div className="flex items-center sm:h-full sm:pt-1">
            <ToggleSwitch
              id="toggle-visual"
              checked={settings.enableVisualByDefault}
              onChange={(checked) => setSettings((s) => ({ ...s, enableVisualByDefault: checked }))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-transparent p-4 transition-all hover:border-outline-variant/10 hover:bg-surface-container-high/40 sm:flex-row sm:items-start sm:justify-between sm:gap-gutter-xl">
          <div className="flex max-w-md flex-col gap-1">
            <label htmlFor="toggle-variables" className="cursor-pointer font-medium text-on-surface">
              Ocultar rellenos variables por defecto
            </label>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Omite marcas de tiempo y campos dinámicos para evitar falsos positivos en las comparaciones.
            </p>
          </div>
          <div className="flex items-center sm:h-full sm:pt-1">
            <ToggleSwitch
              id="toggle-variables"
              checked={settings.hideVariableFillsByDefault}
              onChange={(checked) => setSettings((s) => ({ ...s, hideVariableFillsByDefault: checked }))}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-4 backdrop-blur-2xl sm:gap-8 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-[24px]">api</span>
            </div>
            <div>
              <h2 className="font-headline text-lg text-on-surface">Validación de API</h2>
              <p className="text-sm text-on-surface-variant">
                Configura el modo de corrida, el caso personalizado y la tolerancia numérica por defecto.
              </p>
            </div>
          </div>
          <span className="self-start rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-code text-xs text-primary sm:self-auto">
            Activo
          </span>
        </div>

        <div className="h-px w-full bg-outline-variant/20" />

        <div className="flex flex-col gap-4 rounded-2xl border border-transparent p-4 transition-all hover:border-outline-variant/10 hover:bg-surface-container-high/40 sm:flex-row sm:items-start sm:justify-between sm:gap-gutter-xl">
          <div className="flex max-w-md flex-col gap-1">
            <span className="font-medium text-on-surface">Modo de ejecución por defecto</span>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Modo preseleccionado al abrir la pantalla de Validación de API.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:h-full sm:pt-1">
            {(['regression', 'comparison'] as const).map((m: RunMode) => (
              <button
                key={m}
                type="button"
                onClick={() => setApiSettings((s) => ({ ...s, defaultMode: m }))}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  apiSettings.defaultMode === m
                    ? 'bg-primary text-on-primary shadow-lg shadow-primary/25'
                    : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {m === 'regression' ? 'Regresión' : 'Comparación'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-transparent p-4 transition-all hover:border-outline-variant/10 hover:bg-surface-container-high/40 sm:flex-row sm:items-start sm:justify-between sm:gap-gutter-xl">
          <div className="flex max-w-md flex-col gap-1">
            <label htmlFor="toggle-custom-case" className="cursor-pointer font-medium text-on-surface">
              Mostrar caso personalizado por defecto
            </label>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Expande el bloque de payload propio al abrir la pantalla, sin tener que activarlo cada vez.
            </p>
          </div>
          <div className="flex items-center sm:h-full sm:pt-1">
            <ToggleSwitch
              id="toggle-custom-case"
              checked={apiSettings.expandCustomCaseByDefault}
              onChange={(checked) => setApiSettings((s) => ({ ...s, expandCustomCaseByDefault: checked }))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-transparent p-4 transition-all hover:border-outline-variant/10 hover:bg-surface-container-high/40 sm:flex-row sm:items-start sm:justify-between sm:gap-gutter-xl">
          <div className="flex max-w-md flex-col gap-1">
            <label htmlFor="tolerance-decimals" className="cursor-pointer font-medium text-on-surface">
              Precisión decimal al comparar
            </label>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Cantidad de decimales que deben coincidir en los campos activados abajo para considerarlos
              iguales; el resto de los campos siempre se compara exacto. Entre más alto, más exigente: con 0
              solo se compara la parte entera; con 2, deben coincidir hasta el segundo decimal. Evita falsos
              positivos por redondeo sin dejar de detectar diferencias reales en los demás campos.
            </p>
          </div>
          <div className="flex items-center sm:h-full sm:pt-1">
            <input
              id="tolerance-decimals"
              type="number"
              min={0}
              max={10}
              value={apiSettings.toleranceDecimals}
              onChange={(e) =>
                setApiSettings((s) => ({ ...s, toleranceDecimals: Number(e.target.value) }))
              }
              className="w-20 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-sm text-on-surface"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-transparent p-4 transition-all hover:border-outline-variant/10 hover:bg-surface-container-high/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              <span className="font-medium text-on-surface">Campos con tolerancia decimal</span>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Activa los campos numéricos a los que se les aplicará la precisión de arriba. Los que dejes
                apagados siempre se comparan de forma exacta, sin importar el valor de "Precisión decimal".
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  setApiSettings((s) => ({
                    ...s,
                    toleranceFields: TOLERANCE_FIELD_OPTIONS.map((o) => o.key),
                  }))
                }
                className="text-primary hover:underline"
              >
                Activar todos
              </button>
              <span className="text-on-surface-variant">·</span>
              <button
                type="button"
                onClick={() => setApiSettings((s) => ({ ...s, toleranceFields: [] }))}
                className="text-primary hover:underline"
              >
                Desactivar todos
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {TOLERANCE_FIELD_OPTIONS.map((field) => {
              const active = apiSettings.toleranceFields.includes(field.key)
              return (
                <button
                  key={field.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleToleranceField(field.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? 'border border-primary/30 bg-primary/10 text-primary'
                      : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {field.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={handleDiscard}
          className="rounded-xl border border-transparent px-5 py-2.5 text-on-surface-variant transition-all hover:border-outline-variant/20 hover:bg-surface-container-high/60 hover:text-on-surface"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center justify-center gap-2 rounded-xl border border-primary-fixed/30 bg-primary px-6 py-2.5 font-medium text-on-primary shadow-lg shadow-primary/25 transition-all hover:opacity-90"
        >
          <span className="material-symbols-outlined text-[18px]">{saved ? 'check' : 'save'}</span>
          {saved ? '¡Guardado!' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
