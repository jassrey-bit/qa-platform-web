import { useState } from 'react'
import { ToggleSwitch } from '../components/ToggleSwitch'
import {
  getDocValidationSettings,
  saveDocValidationSettings,
  type DocValidationSettings,
} from '../lib/docValidationSettings'

export function Ajustes() {
  const [settings, setSettings] = useState<DocValidationSettings>(getDocValidationSettings)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    saveDocValidationSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleDiscard() {
    setSettings(getDocValidationSettings())
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
          Define los valores por defecto que se usarán al crear una nueva validación de documentos.
        </p>
      </div>

      <div className="flex flex-col gap-8 rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-8 backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-[24px]">rule_settings</span>
            </div>
            <div>
              <h2 className="font-headline text-lg text-on-surface">Validación de documentos</h2>
              <p className="text-sm text-on-surface-variant">
                Configura las reglas de análisis visual y omisión de variables.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-code text-xs text-primary">
            Activo
          </span>
        </div>

        <div className="h-px w-full bg-outline-variant/20" />

        <div className="flex items-start justify-between gap-gutter-xl rounded-2xl border border-transparent p-4 transition-all hover:border-outline-variant/10 hover:bg-surface-container-high/40">
          <div className="flex max-w-md flex-col gap-1">
            <label htmlFor="toggle-visual" className="cursor-pointer font-medium text-on-surface">
              Incluir análisis visual por defecto
            </label>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Compara automáticamente píxeles y diferencias de renderizado visual en cada ejecución.
            </p>
          </div>
          <div className="flex h-full items-center pt-1">
            <ToggleSwitch
              id="toggle-visual"
              checked={settings.enableVisualByDefault}
              onChange={(checked) => setSettings((s) => ({ ...s, enableVisualByDefault: checked }))}
            />
          </div>
        </div>

        <div className="flex items-start justify-between gap-gutter-xl rounded-2xl border border-transparent p-4 transition-all hover:border-outline-variant/10 hover:bg-surface-container-high/40">
          <div className="flex max-w-md flex-col gap-1">
            <label htmlFor="toggle-variables" className="cursor-pointer font-medium text-on-surface">
              Ocultar rellenos variables por defecto
            </label>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Omite marcas de tiempo y campos dinámicos para evitar falsos positivos en las comparaciones.
            </p>
          </div>
          <div className="flex h-full items-center pt-1">
            <ToggleSwitch
              id="toggle-variables"
              checked={settings.hideVariableFillsByDefault}
              onChange={(checked) => setSettings((s) => ({ ...s, hideVariableFillsByDefault: checked }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
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
            className="flex items-center gap-2 rounded-xl border border-primary-fixed/30 bg-primary px-6 py-2.5 font-medium text-on-primary shadow-lg shadow-primary/25 transition-all hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">
              {saved ? 'check' : 'save'}
            </span>
            {saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
