import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useMemo } from 'react'
import type { VisualVerdict } from '../api/docValidation'

const STATUS_LINE = /^\[STATUS:\s*([^\]]+)\]\s*/i

function splitStatus(findings: string): { status: string | null; body: string } {
  const match = findings.match(STATUS_LINE)
  if (!match) return { status: null, body: findings }
  return { status: match[1].trim(), body: findings.slice(match[0].length) }
}

export function VisualAnalysis({ visual }: { visual: VisualVerdict }) {
  const { status, body } = useMemo(() => splitStatus(visual.findings ?? ''), [visual.findings])
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(body, { async: false })), [body])
  const passed = status?.toUpperCase() === 'PASSED'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-on-surface-variant">Estado del análisis visual:</span>
        {status ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
              passed
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-error/30 bg-error/10 text-error'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${passed ? 'bg-success' : 'bg-error'}`} />
            {status}
          </span>
        ) : (
          <span className="text-sm text-on-surface-variant">{visual.status}</span>
        )}
      </div>

      <div
        className="markdown-content rounded-xl border border-outline-variant/20 bg-surface-container-low p-5 text-sm text-on-surface"
        // eslint-disable-next-line react/no-danger -- sanitized with DOMPurify above
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
