import { useEffect, useRef, useState } from 'react'

interface PollingState<T> {
  data: T | null
  polling: boolean
  error: string | null
}

/**
 * Repite `fetchStatus(jobId)` cada `intervalMs` hasta que la respuesta deje de
 * estar en curso (según `isPending`). Pensado para reutilizarse con
 * cualquier módulo de la plataforma que exponga el patrón pending/done/error.
 */
export function useJobPolling<T>(
  jobId: string | null,
  fetchStatus: (jobId: string) => Promise<T>,
  isPending: (result: T) => boolean,
  intervalMs = 2000,
): PollingState<T> {
  const [data, setData] = useState<T | null>(null)
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchStatusRef = useRef(fetchStatus)
  fetchStatusRef.current = fetchStatus

  useEffect(() => {
    if (!jobId) {
      setData(null)
      setPolling(false)
      setError(null)
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    async function poll() {
      try {
        const result = await fetchStatusRef.current(jobId as string)
        if (cancelled) return
        setData(result)
        setError(null)
        if (isPending(result)) {
          setPolling(true)
          timer = setTimeout(poll, intervalMs)
        } else {
          setPolling(false)
        }
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setPolling(false)
      }
    }

    setPolling(true)
    poll()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [jobId, isPending, intervalMs])

  return { data, polling, error }
}
