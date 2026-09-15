export function RunStatusBadge({ passed }: { passed: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        passed ? 'border-success/30 bg-success/10 text-success' : 'border-error/30 bg-error/10 text-error'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${passed ? 'bg-success' : 'bg-error'}`} />
      {passed ? 'PASS' : 'FAIL'}
    </span>
  )
}
