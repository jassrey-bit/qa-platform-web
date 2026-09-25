import { useEffect, useState, type ReactNode } from 'react'
import { ToggleSwitch } from '../components/ToggleSwitch'
import type { RunMode } from '../api/apiValidation'
import {
  getApiValidationSettings,
  saveApiValidationSettings,
  MAX_TOLERANCE_DECIMALS,
  TOLERANCE_FIELD_OPTIONS,
  type ApiValidationSettings,
} from '../lib/apiValidationSettings'
import {
  getDocValidationSettings,
  saveDocValidationSettings,
  type DocValidationSettings,
} from '../lib/docValidationSettings'

const RUN_MODES: { value: RunMode; label: string; icon: string }[] = [
  { value: 'regression', label: 'Regresión', icon: 'history' },
  { value: 'comparison', label: 'Comparación', icon: 'compare_arrows' },
]

const DECIMAL_OPTIONS = Array.from({ length: MAX_TOLERANCE_DECIMALS + 1 }, (_, i) => i)

// Compara ajustes ignorando el orden en que se activaron los campos.
function sameSettings(a: object, b: object) {
  const normalize = (o: object) =>
    JSON.stringify(o, (_, v) => (Array.isArray(v) ? [...v].sort() : v))
  return normalize(a) === normalize(b)
}

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container/60 backdrop-blur-2xl">
      <header className="flex items-center gap-4 border-b border-outline-variant/20 px-4 py-4 sm:px-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
        <div>
          <h2 className="font-headline text-lg text-on-surface">{title}</h2>
          <p className="text-sm text-on-surface-variant">{description}</p>
        </div>
      </header>
      <div className="divide-y divide-outline-variant/15">{children}</div>
    </section>
  )
}

// Fila de tres columnas: nombre del ajuste | descripción | control.
// En pantallas angostas las columnas se apilan.
function SettingRow({
  icon,
  label,
  htmlFor,
  hint,
  description,
  children,
  wideControl = false,
}: {
  icon: string
  label: string
  htmlFor?: string
  hint?: ReactNode
  description?: ReactNode
  children: ReactNode
  wideControl?: boolean
}) {
  const Label = htmlFor ? 'label' : 'span'
  return (
    <div
      className={`grid gap-3 px-4 py-5 transition-colors hover:bg-surface-container-high/30 sm:px-6 lg:gap-x-8 ${
        wideControl
          ? 'lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]'
          : 'lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_auto] lg:items-center'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined mt-0.5 text-[20px] text-primary/80">{icon}</span>
        <div className="flex flex-col gap-1">
          <Label htmlFor={htmlFor} className={`font-medium text-on-surface ${htmlFor ? 'cursor-pointer' : ''}`}>
            {label}
          </Label>
          {hint}
        </div>
      </div>
      {wideControl ? (
        <div className="flex flex-col gap-3 pl-8 lg:pl-0">
          {description && <p className="text-sm leading-relaxed text-on-surface-variant">{description}</p>}
          {children}
        </div>
      ) : (
        <>
          <p className="max-w-2xl pl-8 text-sm leading-relaxed text-on-surface-variant lg:pl-0">{description}</p>
          <div className="flex items-center pl-8 lg:justify-end lg:pl-0">{children}</div>
        </>
      )}
    </div>
  )
}

export function Ajustes() {
  const [savedDoc, setSavedDoc] = useState<DocValidationSettings>(getDocValidationSettings)
  const [savedApi, setSavedApi] = useState<ApiValidationSettings>(getApiValidationSettings)
  const [settings, setSettings] = useState<DocValidationSettings>(savedDoc)
  const [apiSettings, setApiSettings] = useState<ApiValidationSettings>(savedApi)
  const [saved, setSaved] = useState(false)

  const dirty = !sameSettings(settings, savedDoc) || !sameSettings(apiSettings, savedApi)
  const noToleranceFields = apiSettings.toleranceFields.length === 0

  // Avisa al cerrar o recargar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function handleSave() {
    saveDocValidationSettings(settings)
    saveApiValidationSettings(apiSettings)
    setSavedDoc(settings)
    setSavedApi(apiSettings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleDiscard() {
    setSettings(savedDoc)
    setApiSettings(savedApi)
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
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-gutter-xl p-layout-margin">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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

        <div className="flex w-full shrink-0 flex-wrap items-center gap-3 sm:w-auto">
          {dirty && (
            <span className="flex w-full items-center gap-1.5 text-xs text-on-surface-variant sm:w-auto">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Cambios sin guardar
            </span>
          )}
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!dirty}
            className="flex-1 rounded-xl border border-outline-variant/30 px-4 py-2 text-sm sm:flex-none text-on-surface-variant transition-all hover:bg-surface-container-high/60 hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty && !saved}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary-fixed/30 bg-primary px-5 sm:flex-none py-2 text-sm font-medium text-on-primary shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            <span className="material-symbols-outlined text-[18px]">{saved ? 'check' : 'save'}</span>
            {saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <SettingsSection
        icon="document_scanner"
        title="Validación de documentos"
        description="Configura las reglas de análisis visual y omisión de variables."
      >
        <SettingRow
          icon="image_search"
          label="Incluir análisis visual por defecto"
          htmlFor="toggle-visual"
          description="Compara automáticamente píxeles y diferencias de renderizado visual en cada ejecución."
        >
          <ToggleSwitch
            id="toggle-visual"
            checked={settings.enableVisualByDefault}
            onChange={(checked) => setSettings((s) => ({ ...s, enableVisualByDefault: checked }))}
          />
        </SettingRow>

        <SettingRow
          icon="visibility_off"
          label="Ocultar rellenos variables por defecto"
          htmlFor="toggle-variables"
          description="Omite marcas de tiempo y campos dinámicos para evitar falsos positivos en las comparaciones."
        >
          <ToggleSwitch
            id="toggle-variables"
            checked={settings.hideVariableFillsByDefault}
            onChange={(checked) => setSettings((s) => ({ ...s, hideVariableFillsByDefault: checked }))}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        icon="api"
        title="Validación de API"
        description="Configura el modo de corrida, el caso personalizado y la tolerancia numérica por defecto."
      >
        <SettingRow
          icon="alt_route"
          label="Modo de ejecución por defecto"
          description="Modo preseleccionado al abrir la pantalla de Validación de API."
        >
          <div
            role="radiogroup"
            aria-label="Modo de ejecución por defecto"
            className="flex rounded-xl border border-outline-variant/30 bg-surface-container-low p-1"
          >
            {RUN_MODES.map((m) => {
              const active = apiSettings.defaultMode === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setApiSettings((s) => ({ ...s, defaultMode: m.value }))}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? 'bg-primary text-on-primary shadow-md shadow-primary/25'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{m.icon}</span>
                  {m.label}
                </button>
              )
            })}
          </div>
        </SettingRow>

        <SettingRow
          icon="data_object"
          label="Mostrar caso personalizado por defecto"
          htmlFor="toggle-custom-case"
          description="Expande el bloque de payload propio al abrir la pantalla, sin tener que activarlo cada vez."
        >
          <ToggleSwitch
            id="toggle-custom-case"
            checked={apiSettings.expandCustomCaseByDefault}
            onChange={(checked) => setApiSettings((s) => ({ ...s, expandCustomCaseByDefault: checked }))}
          />
        </SettingRow>

        <SettingRow
          icon="decimal_increase"
          label="Precisión decimal al comparar"
          hint={<span className="text-xs text-on-surface-variant">Aplica solo a los campos activados abajo.</span>}
          description={
            noToleranceFields ? (
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">info</span>
                No hay campos activados: todos se comparan de forma exacta.
              </span>
            ) : (
              'Decimales que deben coincidir para considerar iguales los valores. Con 0 solo se compara la parte entera; con 2, hasta el segundo decimal.'
            )
          }
        >
          <div
            role="radiogroup"
            aria-label="Precisión decimal"
            aria-disabled={noToleranceFields}
            title={noToleranceFields ? 'Activa al menos un campo con tolerancia para elegir la precisión' : undefined}
            className={`flex gap-1.5 transition-opacity ${noToleranceFields ? 'opacity-40' : ''}`}
          >
            {DECIMAL_OPTIONS.map((n) => {
              const active = apiSettings.toleranceDecimals === n
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={noToleranceFields}
                  onClick={() => setApiSettings((s) => ({ ...s, toleranceDecimals: n }))}
                  className={`h-9 w-9 rounded-lg font-code text-sm transition-all disabled:cursor-not-allowed ${
                    active
                      ? 'bg-primary text-on-primary shadow-md shadow-primary/25 disabled:shadow-none'
                      : 'border border-outline-variant/40 text-on-surface-variant enabled:hover:bg-surface-container-high'
                  }`}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </SettingRow>

        <SettingRow
          icon="checklist"
          label="Campos con tolerancia decimal"
          wideControl
          hint={
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  setApiSettings((s) => ({ ...s, toleranceFields: TOLERANCE_FIELD_OPTIONS.map((o) => o.key) }))
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
          }
          description={`Activa los campos numéricos a los que se aplica la precisión de arriba (${apiSettings.toleranceFields.length} de ${TOLERANCE_FIELD_OPTIONS.length}). Los apagados siempre se comparan de forma exacta.`}
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {TOLERANCE_FIELD_OPTIONS.map((field) => {
              const active = apiSettings.toleranceFields.includes(field.key)
              return (
                <button
                  key={field.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleToleranceField(field.key)}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                    active
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">
                      {active ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    {field.label}
                  </span>
                  <span className="font-code text-[11px] opacity-80">
                    {active ? `${apiSettings.toleranceDecimals} dec.` : 'exacto'}
                  </span>
                </button>
              )
            })}
          </div>
        </SettingRow>
      </SettingsSection>
    </div>
  )
}
