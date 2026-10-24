import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { ConfirmationContext } from '../contexts/useConfirmation'
import type { ConfirmationOptions } from '../contexts/useConfirmation'

export default function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmationOptions | null>(null)
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const deleteRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const messageId = useId()
  const location = useLocation()

  const finish = useCallback((confirmed: boolean) => {
    const resolve = resolveRef.current
    resolveRef.current = null
    setRequest(null)
    resolve?.(confirmed)
  }, [])

  const confirm = useCallback((options: ConfirmationOptions) => {
    if (resolveRef.current) return Promise.resolve(false)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setRequest(options)
    })
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (request) {
      if (!dialog.open) dialog.showModal()
      cancelRef.current?.focus()
    } else if (dialog.open) dialog.close()
  }, [request])

  useEffect(() => () => finish(false), [location.key, finish])

  return <ConfirmationContext.Provider value={confirm}>
    {children}
    {createPortal(<dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={messageId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-white p-0 text-body shadow-2xl backdrop:bg-ink/45"
      onCancel={(event) => { event.preventDefault(); finish(false) }}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Tab') {
          event.preventDefault()
          const next = document.activeElement === cancelRef.current ? deleteRef.current : cancelRef.current
          next?.focus()
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) finish(false)
      }}>
      <div className="p-6">
        <h2 id={titleId} className="text-xl font-bold text-ink">{request?.title}</h2>
        <p id={messageId} className="mt-3 break-words text-sm leading-6 text-muted">{request?.message}</p>
      </div>
      <div className="flex flex-wrap justify-end gap-3 border-t border-line bg-surface-muted px-6 py-4">
        <button ref={cancelRef} type="button" onClick={() => finish(false)}
          className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-surface-subtle">Отмена</button>
        <button ref={deleteRef} type="button" onClick={() => finish(true)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Удалить</button>
      </div>
    </dialog>, document.body)}
  </ConfirmationContext.Provider>
}
