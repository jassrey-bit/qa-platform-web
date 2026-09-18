import { parseStructuralDiff } from '../lib/apiDiffFormat'

function formatValue(v: unknown): string {
  if (v === undefined) return '—'
  if (v === null) return 'null'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function StructuralDiffViewer({ diff }: { diff: Record<string, unknown> }) {
  const rows = parseStructuralDiff(diff)

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-container-low text-xs uppercase text-on-surface-variant">
          <tr>
            <th className="px-3 py-2 font-medium">Campo</th>
            <th className="px-3 py-2 font-medium">Cambio</th>
            <th className="px-3 py-2 font-medium">Esperado</th>
            <th className="px-3 py-2 font-medium">Obtenido</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-outline-variant/20">
              <td className="px-3 py-2 text-xs text-on-surface">{r.label}</td>
              <td className="px-3 py-2 text-xs text-on-surface-variant">{r.changeLabel}</td>
              <td className="px-3 py-2 font-mono text-xs text-error">{formatValue(r.before)}</td>
              <td className="px-3 py-2 font-mono text-xs text-success">{formatValue(r.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
