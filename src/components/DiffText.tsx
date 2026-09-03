import type { DiffOp } from '../lib/textDiff'

export function DiffText({ ops, side }: { ops: DiffOp[]; side: 'before' | 'after' }) {
  const hidden = side === 'before' ? 'added' : 'removed'
  const highlighted = side === 'before' ? 'removed' : 'added'

  return (
    <>
      {ops
        .filter((op) => op.type !== hidden)
        .map((op, i) =>
          op.type === highlighted ? (
            <mark
              key={i}
              className={
                side === 'before'
                  ? 'rounded bg-error/20 text-error line-through decoration-2'
                  : 'rounded bg-success/20 text-success'
              }
            >
              {op.text}
            </mark>
          ) : (
            <span key={i}>{op.text}</span>
          ),
        )}
    </>
  )
}
