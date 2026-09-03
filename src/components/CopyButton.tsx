import { useState } from 'react'

type CopyState = 'idle' | 'loading' | 'copied' | 'error'

const ICONS: Record<CopyState, string> = {
  idle: 'content_copy',
  loading: 'progress_activity',
  copied: 'check',
  error: 'error',
}

const LABELS: Record<CopyState, string> = {
  idle: 'Copiar',
  loading: 'Copiando…',
  copied: 'Copiado',
  error: 'No se pudo copiar',
}

function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(textarea)
  return ok
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    if (!legacyCopy(text)) throw new Error('No se pudo copiar al portapapeles')
  }
}

export function CopyButton({
  getText,
  label,
  className = '',
  iconOnly = false,
}: {
  getText: () => string | Promise<string>
  label?: string
  className?: string
  iconOnly?: boolean
}) {
  const [state, setState] = useState<CopyState>('idle')

  async function handleCopy() {
    setState('loading')
    try {
      const text = await getText()
      await copyToClipboard(text)
      setState('copied')
    } catch {
      setState('error')
    } finally {
      setTimeout(() => setState('idle'), 1500)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={state === 'loading'}
      aria-label={iconOnly ? (label ?? 'Copiar') : undefined}
      className={className}
    >
      <span className={`material-symbols-outlined text-[16px] ${state === 'loading' ? 'animate-spin' : ''}`}>
        {ICONS[state]}
      </span>
      {!iconOnly && (state === 'idle' ? (label ?? LABELS.idle) : LABELS[state])}
    </button>
  )
}
