export function LoadingBar({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-6">
      <div className="flex items-center gap-2.5">
        <span className="material-symbols-outlined animate-spin text-[18px] text-primary">
          progress_activity
        </span>
        <span className="text-sm font-medium text-on-surface">{label}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
        <div className="h-full w-1/3 origin-left rounded-full bg-primary animate-indeterminate" />
      </div>
    </div>
  )
}
