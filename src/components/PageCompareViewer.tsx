import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComparisonPages, SemanticDiscrepancy } from '../api/docValidation'
import { getComparisonPageUrl, getComparisonRenderPdfUrl } from '../api/docValidation'
import type { Highlight, LoadedDoc } from '../lib/pdfHighlight'
import { computeHighlights, loadDocWithPages } from '../lib/pdfHighlight'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface PageCompareViewerProps {
  jobId: string
  expectedFilename: string
  actualFilename: string
  pages: ComparisonPages
  discrepancies: SemanticDiscrepancy[]
}

const ZOOM_MIN = 50
const ZOOM_MAX = 200
const ZOOM_STEP = 10

function PanelLabel({
  label,
  isFocused,
  onToggleFocus,
}: {
  label: string
  isFocused: boolean
  onToggleFocus: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{label}</span>
      <button
        type="button"
        onClick={onToggleFocus}
        aria-label={isFocused ? 'Mostrar ambos documentos' : 'Expandir este documento'}
        title={isFocused ? 'Mostrar ambos documentos' : 'Expandir este documento'}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-on-surface-variant transition-all hover:bg-primary/10 hover:text-primary"
      >
        <span className="material-symbols-outlined text-[16px]">
          {isFocused ? 'close_fullscreen' : 'open_in_full'}
        </span>
      </button>
    </div>
  )
}

function StaticPagePanel({
  label,
  src,
  hasPage,
  zoom,
  scrollRef,
  onScroll,
  isFocused,
  onToggleFocus,
}: {
  label: string
  src: string
  hasPage: boolean
  zoom: number
  scrollRef: React.RefObject<HTMLDivElement | null>
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void
  isFocused: boolean
  onToggleFocus: () => void
}) {
  const [failed, setFailed] = useState(false)

  return (
    <div className="min-w-0 flex flex-col gap-2">
      <PanelLabel label={label} isFocused={isFocused} onToggleFocus={onToggleFocus} />
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex min-h-[200px] items-center justify-center overflow-auto rounded-lg border border-outline-variant/20 bg-surface-container-lowest/60 p-2"
      >
        {hasPage && !failed ? (
          <img
            src={src}
            alt={label}
            style={{ width: `${zoom}%` }}
            className="shrink-0 rounded shadow-sm"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="p-6 text-sm text-on-surface-variant">
            {failed ? 'No se pudo cargar la página.' : 'Este documento no tiene esta página.'}
          </span>
        )}
      </div>
    </div>
  )
}

function PdfPagePanel({
  label,
  doc,
  pageNum,
  hasPage,
  highlights,
  zoom,
  scrollRef,
  onScroll,
  isFocused,
  onToggleFocus,
}: {
  label: string
  doc: PDFDocumentProxy | null
  pageNum: number
  hasPage: boolean
  highlights: Highlight[]
  zoom: number
  scrollRef: React.RefObject<HTMLDivElement | null>
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void
  isFocused: boolean
  onToggleFocus: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    if (!doc || !hasPage) return
    let cancelled = false
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | undefined

    async function render() {
      const page = await doc!.getPage(pageNum)
      if (cancelled) return
      const viewport = page.getViewport({ scale: 2 })
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      setSize({ width: viewport.width, height: viewport.height })
      renderTask = page.render({ canvasContext: ctx, viewport })
      await renderTask.promise
    }
    render().catch(() => {})

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [doc, pageNum, hasPage])

  return (
    <div className="min-w-0 flex flex-col gap-2">
      <PanelLabel label={label} isFocused={isFocused} onToggleFocus={onToggleFocus} />
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex min-h-[200px] items-center justify-center overflow-auto rounded-lg border border-outline-variant/20 bg-surface-container-lowest/60 p-2"
      >
        {hasPage ? (
          <div className="relative shrink-0" style={{ width: `${zoom}%` }}>
            <canvas ref={canvasRef} className="block w-full h-auto rounded shadow-sm" />
            {size &&
              highlights.map((h) =>
                h.rects.map((r, ri) => (
                  <div
                    key={`${h.key}-${ri}`}
                    className={
                      h.color === 'red'
                        ? 'pointer-events-none absolute rounded-sm bg-error/30 ring-1 ring-error/70'
                        : 'pointer-events-none absolute rounded-sm bg-success/30 ring-1 ring-success/70'
                    }
                    style={{
                      left: `${(r.left / h.pageWidth) * 100}%`,
                      top: `${(r.top / h.pageHeight) * 100}%`,
                      width: `${(r.width / h.pageWidth) * 100}%`,
                      height: `${(r.height / h.pageHeight) * 100}%`,
                    }}
                  />
                )),
              )}
          </div>
        ) : (
          <span className="p-6 text-sm text-on-surface-variant">Este documento no tiene esta página.</span>
        )}
      </div>
    </div>
  )
}

function ZoomControl({ zoom, onChange }: { zoom: number; onChange: (z: number) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-outline-variant/30 px-1 py-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(zoom - ZOOM_STEP, ZOOM_MIN))}
        disabled={zoom <= ZOOM_MIN}
        aria-label="Alejar"
        className="inline-flex h-6 w-6 items-center justify-center rounded text-on-surface-variant transition-all hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-[16px]">remove</span>
      </button>
      <span className="w-10 text-center text-xs text-on-surface-variant">{zoom}%</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(zoom + ZOOM_STEP, ZOOM_MAX))}
        disabled={zoom >= ZOOM_MAX}
        aria-label="Acercar"
        className="inline-flex h-6 w-6 items-center justify-center rounded text-on-surface-variant transition-all hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-[16px]">add</span>
      </button>
    </div>
  )
}

export function PageCompareViewer({
  jobId,
  expectedFilename,
  actualFilename,
  pages,
  discrepancies,
}: PageCompareViewerProps) {
  const maxPage = Math.max(pages.actual_count, pages.expected_count)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [loaded, setLoaded] = useState<{ expected: LoadedDoc; actual: LoadedDoc } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Al expandir un documento (útil con zoom alto, donde el panel a mitad de
  // ancho no alcanza para ver una línea completa sin scroll horizontal), el
  // otro se oculta temporalmente para que el expandido use todo el ancho.
  const [focusedSide, setFocusedSide] = useState<'expected' | 'actual' | null>(null)

  // Sincroniza el scroll (horizontal y vertical) entre los dos paneles, para
  // que al hacer zoom o desplazarse se pueda seguir comparando lado a lado
  // en vez de que cada documento se desplace por su cuenta.
  const expectedScrollRef = useRef<HTMLDivElement>(null)
  const actualScrollRef = useRef<HTMLDivElement>(null)
  const syncingScroll = useRef(false)

  function onExpectedScroll(e: React.UIEvent<HTMLDivElement>) {
    if (syncingScroll.current) return
    const target = actualScrollRef.current
    if (!target) return
    syncingScroll.current = true
    target.scrollLeft = e.currentTarget.scrollLeft
    target.scrollTop = e.currentTarget.scrollTop
    syncingScroll.current = false
  }
  function onActualScroll(e: React.UIEvent<HTMLDivElement>) {
    if (syncingScroll.current) return
    const target = expectedScrollRef.current
    if (!target) return
    syncingScroll.current = true
    target.scrollLeft = e.currentTarget.scrollLeft
    target.scrollTop = e.currentTarget.scrollTop
    syncingScroll.current = false
  }

  useEffect(() => {
    if (maxPage === 0) return
    let cancelled = false
    setLoaded(null)
    setLoadError(null)
    Promise.all([
      loadDocWithPages(getComparisonRenderPdfUrl(jobId, 'expected')),
      loadDocWithPages(getComparisonRenderPdfUrl(jobId, 'actual')),
    ])
      .then(([expected, actual]) => {
        if (!cancelled) setLoaded({ expected, actual })
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [jobId, maxPage])

  const expectedHighlights = useMemo(
    () => (loaded ? computeHighlights(discrepancies, loaded.expected.pages, 'expected', 'red') : []),
    [loaded, discrepancies],
  )
  const actualHighlights = useMemo(
    () => (loaded ? computeHighlights(discrepancies, loaded.actual.pages, 'actual', 'green') : []),
    [loaded, discrepancies],
  )

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-headline text-base text-on-surface">Visor de documentos</h3>
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-error" /> Plantilla (Esperado)
          </span>
          <span>vs</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success" /> Generado (Actual)
          </span>
        </div>
      </div>
      {maxPage > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="rounded-lg border border-outline-variant/30 px-3 py-1.5 text-sm font-medium text-on-surface transition-all hover:border-primary/50 hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-sm text-on-surface-variant">
              Página {Math.min(Math.max(page, 1), maxPage)} de {maxPage}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, maxPage))}
              disabled={page >= maxPage}
              className="rounded-lg border border-outline-variant/30 px-3 py-1.5 text-sm font-medium text-on-surface transition-all hover:border-primary/50 hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
          <ZoomControl zoom={zoom} onChange={setZoom} />
        </div>
      )}
    </div>
  )

  if (maxPage === 0) {
    return (
      <div className="flex flex-col gap-3">
        {header}
        <p className="text-sm text-on-surface-variant">No disponible{pages.error ? `: ${pages.error}` : '.'}</p>
      </div>
    )
  }

  const clampedPage = Math.min(Math.max(page, 1), maxPage)

  // Si la vista interactiva (pdf.js) falla en cargar, se degrada a las
  // imágenes estáticas que el backend ya genera — sin resaltado, pero
  // siempre disponible.
  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        {header}
        <p className="text-xs text-on-surface-variant">
          Vista interactiva no disponible ({loadError}). Mostrando imágenes estáticas.
        </p>
        <div className={`grid grid-cols-1 gap-3 ${focusedSide ? '' : 'sm:grid-cols-2'}`}>
          {focusedSide !== 'actual' && (
            <StaticPagePanel
              label={expectedFilename}
              src={getComparisonPageUrl(jobId, 'expected', clampedPage)}
              hasPage={clampedPage <= pages.expected_count}
              zoom={zoom}
              scrollRef={expectedScrollRef}
              onScroll={onExpectedScroll}
              isFocused={focusedSide === 'expected'}
              onToggleFocus={() => setFocusedSide((s) => (s === 'expected' ? null : 'expected'))}
            />
          )}
          {focusedSide !== 'expected' && (
            <StaticPagePanel
              label={actualFilename}
              src={getComparisonPageUrl(jobId, 'actual', clampedPage)}
              hasPage={clampedPage <= pages.actual_count}
              zoom={zoom}
              scrollRef={actualScrollRef}
              onScroll={onActualScroll}
              isFocused={focusedSide === 'actual'}
              onToggleFocus={() => setFocusedSide((s) => (s === 'actual' ? null : 'actual'))}
            />
          )}
        </div>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div className="flex flex-col gap-3">
        {header}
        <p className="text-sm text-on-surface-variant">Cargando documentos…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {header}
      <div className={`grid grid-cols-1 gap-3 ${focusedSide ? '' : 'sm:grid-cols-2'}`}>
        {focusedSide !== 'actual' && (
          <PdfPagePanel
            label={expectedFilename}
            doc={loaded.expected.doc}
            pageNum={clampedPage}
            hasPage={clampedPage <= pages.expected_count}
            highlights={expectedHighlights.filter((h) => h.pageIndex === clampedPage - 1)}
            zoom={zoom}
            scrollRef={expectedScrollRef}
            onScroll={onExpectedScroll}
            isFocused={focusedSide === 'expected'}
            onToggleFocus={() => setFocusedSide((s) => (s === 'expected' ? null : 'expected'))}
          />
        )}
        {focusedSide !== 'expected' && (
          <PdfPagePanel
            label={actualFilename}
            doc={loaded.actual.doc}
            pageNum={clampedPage}
            hasPage={clampedPage <= pages.actual_count}
            highlights={actualHighlights.filter((h) => h.pageIndex === clampedPage - 1)}
            zoom={zoom}
            scrollRef={actualScrollRef}
            onScroll={onActualScroll}
            isFocused={focusedSide === 'actual'}
            onToggleFocus={() => setFocusedSide((s) => (s === 'actual' ? null : 'actual'))}
          />
        )}
      </div>
    </div>
  )
}
