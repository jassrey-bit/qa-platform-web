import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
// eslint-disable-next-line import/no-unresolved
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { DiffOp } from './textDiff'
import type { SemanticDiscrepancy } from '../api/docValidation'
import { diffWords } from './textDiff'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

export interface HighlightRect {
  left: number
  top: number
  width: number
  height: number
}

export interface Highlight {
  pageIndex: number // 0-based
  rects: HighlightRect[]
  pageWidth: number
  pageHeight: number
  color: 'red' | 'green'
  key: string
}

interface PageTextIndex {
  joined: string
  offsets: [number, number][]
  items: Array<{ str: string; transform: number[]; width: number; height: number }>
  viewportWidth: number
  viewportHeight: number
}

export interface LoadedDoc {
  doc: PDFDocumentProxy
  pages: PageTextIndex[]
}

function normalize(s: string): string {
  return s
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

async function buildPageTextIndex(page: PDFPageProxy): Promise<PageTextIndex> {
  const content = await page.getTextContent()
  const items = content.items as Array<{ str: string; transform: number[]; width: number; height: number }>
  const viewport = page.getViewport({ scale: 1 })

  let joined = ''
  const offsets: [number, number][] = []
  for (const it of items) {
    const start = joined.length
    const norm = normalize(it.str ?? '')
    // Solo agrega el separador cuando el item aporta texto real: pdf.js a
    // veces emite items de puro espacio en blanco entre celdas/palabras, y
    // si cada uno sumara su propio ' ' de más, el texto unido quedaría con
    // espacios dobles donde el backend (que ya normaliza a un solo espacio)
    // usa uno solo — rompiendo la búsqueda exacta de substring.
    if (norm) joined += norm + ' '
    offsets.push([start, joined.length])
  }

  return { joined, offsets, items, viewportWidth: viewport.width, viewportHeight: viewport.height }
}

export async function loadDocWithPages(url: string): Promise<LoadedDoc> {
  const doc = await pdfjsLib.getDocument(url).promise
  const pages: PageTextIndex[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    pages.push(await buildPageTextIndex(page))
  }
  return { doc, pages }
}

function findFragmentRects(index: PageTextIndex, fragment: string): HighlightRect[] {
  const needle = normalize(fragment)
  if (!needle) return []
  const idx = index.joined.indexOf(needle)
  if (idx === -1) return []
  const endIdx = idx + needle.length

  const rects: HighlightRect[] = []
  for (let i = 0; i < index.offsets.length; i++) {
    const [s, e] = index.offsets[i]
    if (e <= idx || s >= endIdx) continue
    const item = index.items[i]
    const x = item.transform[4]
    const y = item.transform[5]
    const width = item.width
    const height = item.height || Math.hypot(item.transform[2], item.transform[3]) || 10
    rects.push(_toViewportRect(index, x, y, width, height))
  }
  return rects
}

// El PageTextIndex no guarda el objeto `PageViewport` completo (no es serializable
// de forma barata), así que el volteo Y (origen PDF abajo-izquierda -> viewport
// arriba-izquierda) se replica aquí a mano en vez de usar
// `viewport.convertToViewportRectangle`.
function _toViewportRect(index: PageTextIndex, x: number, y: number, width: number, height: number): HighlightRect {
  const top = index.viewportHeight - (y + height)
  return { left: x, top, width, height }
}

/**
 * Agrupa tokens consecutivos del mismo tipo ('removed' o 'added') del diff
 * de palabras en frases — así una frase completa que cambió se busca como
 * un solo fragmento en vez de palabra por palabra (evita falsos positivos
 * con palabras sueltas muy comunes).
 */
const MAX_FRAGMENT_WORDS = 6

export function groupDiffFragments(ops: DiffOp[], type: 'removed' | 'added'): string[] {
  const groups: string[][] = []
  let current: string[] = []
  for (const op of ops) {
    if (op.type === type) {
      current.push(op.text)
    } else if (current.length) {
      groups.push(current)
      current = []
    }
  }
  if (current.length) groups.push(current)

  // Cada grupo consecutivo se trocea en ventanas de ~MAX_FRAGMENT_WORDS
  // palabras: una frase corta es mucho más fácil de ubicar de forma exacta
  // en el texto que extrae pdf.js que un bloque entero (p.ej. una tabla
  // completa), donde basta una diferencia mínima de espaciado en un solo
  // punto del bloque para que la búsqueda de substring falle por completo.
  const fragments: string[] = []
  for (const tokens of groups) {
    let windowStart = 0
    let wordCount = 0
    for (let i = 0; i < tokens.length; i++) {
      if (/\S/.test(tokens[i])) wordCount++
      if (wordCount >= MAX_FRAGMENT_WORDS || i === tokens.length - 1) {
        const chunk = tokens.slice(windowStart, i + 1).join('').trim()
        if (chunk) fragments.push(chunk)
        windowStart = i + 1
        wordCount = 0
      }
    }
  }

  return fragments.filter((f) => f.replace(/[^\p{L}\p{N}]/gu, '').length >= 2)
}

function findFragmentAcrossPages(
  pages: PageTextIndex[],
  fragment: string,
): { pageIndex: number; rects: HighlightRect[] } | null {
  for (let i = 0; i < pages.length; i++) {
    const rects = findFragmentRects(pages[i], fragment)
    if (rects.length > 0) return { pageIndex: i, rects }
  }
  return null
}

export function computeHighlights(
  discrepancies: SemanticDiscrepancy[],
  pages: PageTextIndex[],
  side: 'expected' | 'actual',
  color: 'red' | 'green',
): Highlight[] {
  const highlights: Highlight[] = []
  discrepancies.forEach((d, di) => {
    const ops = diffWords(d.expected_text, d.actual_text)
    const fragments = groupDiffFragments(ops, side === 'expected' ? 'removed' : 'added')
    fragments.forEach((fragment, fi) => {
      const found = findFragmentAcrossPages(pages, fragment)
      if (!found) return
      const page = pages[found.pageIndex]
      highlights.push({
        pageIndex: found.pageIndex,
        rects: found.rects,
        pageWidth: page.viewportWidth,
        pageHeight: page.viewportHeight,
        color,
        key: `${di}-${fi}`,
      })
    })
  })
  return highlights
}
