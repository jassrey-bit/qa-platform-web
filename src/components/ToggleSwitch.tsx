export function ToggleSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  id: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative flex h-7 w-14 items-center rounded-full border p-1 transition-all duration-300 ease-out ${
        checked
          ? 'border-primary-fixed/30 bg-primary shadow-[0_0_15px_rgba(77,142,255,0.35)]'
          : 'border-outline-variant/30 bg-surface-container-highest'
      }`}
    >
      <div
        className={`h-5 w-5 rounded-full shadow-lg transition-transform duration-300 ease-out ${
          checked ? 'translate-x-7 bg-on-primary' : 'translate-x-0 bg-outline'
        }`}
      />
    </button>
  )
}
