import { useState } from 'react'
import type { DecimalViolationEntry } from '../api/apiValidation'
import { decimalsLabel, parseDecimalViolations, type DecimalViolationRow } from '../lib/apiDiffFormat'

const PREVIEW_COUNT = 3

function Occurrences({ row }: { row: DecimalViolationRow }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? row.occurrences : row.occurrences.slice(0, PREVIEW_COUNT)
  const hidden = row.occurrences.length - PREVIEW_COUNT

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((o, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-md border border-outline-variant/30 bg-surface-container px-2 py-0.5 text-xs"
        >
          <span className="text-on-surface-variant">{o.location}:</span>
          <span className="font-mono text-error">{o.value}</span>
        </span>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-primary hover:underline"
        >
          {expanded ? 'Ver menos' : `+${hidden} más`}
        </button>
      )}
    </div>
  )
}

export function DecimalViolationsViewer({
  violations,
  title = 'Decimales fuera de lo esperado',
}: {
  violations?: DecimalViolationEntry[]
  title?: string
}) {
  const { rows, legacy } = parseDecimalViolations(violations)
  if (rows.length === 0 && legacy.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-error">
        <span className="material-symbols-outlined text-[16px]">decimal_increase</span>
        {title}
      </p>
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-error/30">
          <table className="w-full text-left text-sm">
            <thead className="bg-error-container/20 text-xs uppercase text-on-surface-variant">
              <tr>
                <th className="px-3 py-2 font-medium">Campo</th>
                <th className="px-3 py-2 font-medium">Esperado</th>
                <th className="px-3 py-2 font-medium">Recibido</th>
                <th className="px-3 py-2 font-medium">Valores</th>
                <th className="px-3 py-2 font-medium">Ejemplos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-outline-variant/20 align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-xs font-medium text-on-surface">{r.label}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-success">
                    máx. {decimalsLabel(r.maxDecimals)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-error">
                    hasta {decimalsLabel(r.foundDecimals)}
                  </td>
                  <td className="px-3 py-2 text-xs text-on-surface-variant">{r.occurrences.length}</td>
                  <td className="min-w-[16rem] px-3 py-2">
                    <Occurrences row={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {legacy.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-error">
          {legacy.map((v, i) => (
            <li key={i} className="break-words">
              {v}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
