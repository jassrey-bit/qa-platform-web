import type { ComparisonDiff } from '../api/apiValidation'
import { dedupeDifferences, humanizeDiffPath, humanizeDiffType } from '../lib/apiDiffFormat'
import { CopyButton } from './CopyButton'

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

  // Separado por tabuladores para que se pegue como tabla en Excel o en un ticket.
  function diffsAsText(): string {
    const header = ['Campo', 'Tipo', 'PROD', 'DEV'].join('\t')
    const rows = deduped.map((d) =>
      [humanizeDiffPath(d.path), humanizeDiffType(d.type), formatValue(d.prod_value), formatValue(d.dev_value)].join(
        '\t',
      ),
    )
    return [header, ...rows].join('\n')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-on-surface-variant">
          Diferencias estructuradas · {deduped.length} campo(s)
        </p>
        <CopyButton
          getText={diffsAsText}
          label="Copiar diferencias"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary transition-colors hover:bg-surface-container-high"
        />
      </div>
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
    </div>
  )
}
