import { useEffect, useState } from 'react'
import { addPlatform, getPlatforms, removePlatform, type PlatformItem } from '../api/e2eValidation'

/**
 * Lista de plataformas E2E: las por defecto (del servidor, con candado) y las
 * que agrega el equipo. A diferencia del resto de Ajustes, se guarda al
 * momento en el runner y la ven todos, no solo este navegador.
 */
export function E2EPlatformsManager() {
  const [items, setItems] = useState<PlatformItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  useEffect(() => {
    getPlatforms()
      .then((data) => setItems(data.items))
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)))
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setAddError('Escribe el subdominio de la plataforma.')
      return
    }
    setAdding(true)
    setAddError(null)
    try {
      const item = await addPlatform(name)
      setItems((prev) => [...(prev ?? []), item])
      setName('')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(platform: string) {
    setConfirmRemove(null)
    setRemoving(platform)
    try {
      await removePlatform(platform)
      setItems((prev) => (prev ?? []).filter((p) => p.name !== platform))
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err))
    } finally {
      setRemoving(null)
    }
  }

  if (loadError) {
    return (
      <p className="text-sm text-error">
        {loadError}. Verifica que el servicio e2e-runner esté encendido.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {items === null && <span className="text-sm text-on-surface-variant">Cargando plataformas…</span>}
        {items?.map((p) =>
          p.source === 'default' ? (
            <span
              key={p.name}
              className="flex items-center gap-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 text-sm text-on-surface"
              title="Plataforma por defecto: se administra en el servidor (E2E_PLATFORMS)"
            >
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">lock</span>
              {p.name}
            </span>
          ) : (
            <span
              key={p.name}
              className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 py-1.5 pl-3 pr-1.5 text-sm text-primary"
              title={p.added_at ? `Agregada el ${new Date(p.added_at).toLocaleString()}` : undefined}
            >
              <span className="material-symbols-outlined text-[16px]">group</span>
              {p.name}
              {confirmRemove === p.name ? (
                <span className="ml-1 flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => handleRemove(p.name)}
                    className="rounded-md bg-error px-2 py-0.5 font-medium text-on-error hover:opacity-90"
                  >
                    Quitar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(null)}
                    className="rounded-md px-2 py-0.5 text-on-surface-variant hover:bg-surface-container-high"
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmRemove(p.name)}
                  disabled={removing === p.name}
                  aria-label={`Quitar ${p.name}`}
                  className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-primary/15 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </span>
          ),
        )}
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap items-start gap-2">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1 sm:max-w-md">
          <label htmlFor="e2e-new-platform" className="sr-only">
            Subdominio de la nueva plataforma
          </label>
          <div className="flex items-center rounded-lg border border-outline-variant/40 bg-surface-container-low pr-3 focus-within:border-primary">
            <input
              id="e2e-new-platform"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setAddError(null)
              }}
              placeholder="beta-accede"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 font-code text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
            />
            <span className="font-code text-xs text-on-surface-variant">.cloudgsf.com</span>
          </div>
          {addError && <p className="text-xs text-error">{addError}</p>}
        </div>
        <button
          type="submit"
          disabled={adding}
          className="flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[18px] ${adding ? 'animate-spin' : ''}`}>
            {adding ? 'progress_activity' : 'add'}
          </span>
          {adding ? 'Verificando…' : 'Agregar'}
        </button>
      </form>
    </div>
  )
}
