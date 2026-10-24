import { useCallback, useEffect, useRef, useState } from 'react'

// A page owns each URL until replacement or unmount, including uploaded files.
export function useObjectUrl() {
  const [url, setUrl] = useState<string | null>(null)
  const current = useRef<string | null>(null)
  const active = useRef(true)

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      if (current.current) URL.revokeObjectURL(current.current)
      current.current = null
    }
  }, [])

  const replace = useCallback((file?: Blob) => {
    if (!active.current) return
    if (current.current) URL.revokeObjectURL(current.current)
    current.current = file ? URL.createObjectURL(file) : null
    setUrl(current.current)
  }, [])

  return [url, replace] as const
}
