import type { ComparisonDiff } from '../api/apiValidation'
import { dedupeDifferences, humanizeDiffPath, humanizeDiffType } from '../lib/apiDiffFormat'

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function ApiDiffViewer({ differences }: { differences: ComparisonDiff[] }) {
  const deduped = dedupeDifferences(differences)

  if (deduped.length === 0) {
    return <p className="text-sm text-on-surface-variant">Sin diferencias entre PROD y DEV.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-container-low text-xs uppercase text-on-surface-variant">
          <tr>
            <th className="px-3 py-2 font-medium">Campo</th>
            <th className="px-3 py-2 font-medium">Tipo</th>
            <th className="px-3 py-2 font-medium">PROD</th>
            <th className="px-3 py-2 font-medium">DEV</th>
          </tr>
        </thead>
        <tbody>
          {deduped.map((d, i) => (
            <tr key={i} className="border-t border-outline-variant/20">
              <td className="px-3 py-2 text-xs text-on-surface">{humanizeDiffPath(d.path)}</td>
              <td className="px-3 py-2 text-xs text-on-surface-variant">{humanizeDiffType(d.type)}</td>
              <td className="px-3 py-2 font-mono text-xs text-error">{formatValue(d.prod_value)}</td>
              <td className="px-3 py-2 font-mono text-xs text-success">{formatValue(d.dev_value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
