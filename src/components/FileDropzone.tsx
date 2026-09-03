import { useId, useRef, useState } from 'react'

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx']

function hasAcceptedExtension(file: File): boolean {
  const name = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileDropzone({
  label,
  file,
  onChange,
}: {
  label: string
  file: File | null
  onChange: (file: File | null) => void
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function acceptFile(candidate: File) {
    if (!hasAcceptedExtension(candidate)) {
      setError('Solo se aceptan archivos PDF o DOCX.')
      return
    }
    setError(null)
    onChange(candidate)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) acceptFile(dropped)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) acceptFile(selected)
  }

  function handleRemove(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setError(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-2 text-sm text-on-surface">
      <label htmlFor={inputId}>{label}</label>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all ${
          dragActive
            ? 'border-primary bg-primary/5'
            : error
              ? 'border-error/50 bg-error/5'
              : 'border-outline-variant/40 bg-surface-container-low hover:border-primary/50'
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,.docx"
          onChange={handleInputChange}
          className="hidden"
        />
        {file ? (
          <div className="flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-[20px] text-primary">description</span>
            <span className="max-w-[220px] truncate font-medium">{file.name}</span>
            <span className="text-xs text-on-surface-variant">{formatFileSize(file.size)}</span>
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Quitar archivo"
              className="ml-1 inline-flex items-center rounded p-0.5 text-on-surface-variant hover:bg-error/10 hover:text-error"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ) : (
          <>
            <span className="material-symbols-outlined text-[24px] text-on-surface-variant">
              upload_file
            </span>
            <span className="text-on-surface-variant">
              Arrastra un archivo aquí o <span className="text-primary">selecciónalo</span>
            </span>
            <span className="text-xs text-on-surface-variant/70">PDF o DOCX</span>
          </>
        )}
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}
