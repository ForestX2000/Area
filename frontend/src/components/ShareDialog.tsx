import { useEffect, useRef, useState } from 'react'
import type { Project } from '../types/project'
import { publishShare, ShareError, shareUrl } from '../utils/share'

export default function ShareDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; url: string } | { kind: 'error'; message: string }>({ kind: 'idle' })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])

  async function create() {
    setState({ kind: 'loading' })
    setCopied(false)
    try {
      setState({ kind: 'ready', url: shareUrl(await publishShare(project)) })
    } catch (error) {
      setState({ kind: 'error', message: error instanceof ShareError ? error.message : 'Не удалось создать ссылку.' })
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // Без доступа к буферу обмена — выделяем ссылку, чтобы скопировать вручную.
      inputRef.current?.select()
    }
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="share-title" onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === dialogRef.current) onClose() }}
      className="m-auto w-[min(480px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-body shadow-2xl backdrop:bg-black/40">
      <div className="grid gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand">Поделиться</p>
            <h2 id="share-title" className="mt-1 text-lg font-bold text-ink">{project.name}</h2>
          </div>
          <button type="button" aria-label="Закрыть" onClick={onClose} className="rounded-md px-2 text-xl leading-none text-muted hover:text-brand">×</button>
        </div>
        <p className="text-sm leading-6 text-muted">
          По ссылке проект откроется без входа и регистрации, только для просмотра: план, чертежи всех этажей, точки и панорамы 360°.
          Ссылка постоянная: она всегда открывает актуальную версию карты.
        </p>

        {state.kind === 'ready' ? (
          <div className="grid gap-2">
            <label className="grid gap-1 text-xs text-muted">Ссылка для просмотра
              <div className="flex gap-2">
                <input ref={inputRef} readOnly value={state.url} aria-label="Ссылка для просмотра" onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm text-body" />
                <button type="button" onClick={() => copy(state.url)} className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
                  {copied ? 'Скопировано' : 'Скопировать'}
                </button>
              </div>
            </label>
            <a href={state.url} target="_blank" rel="noreferrer" className="text-sm text-brand hover:underline">Открыть в новой вкладке</a>
          </div>
        ) : (
          <button type="button" onClick={create} disabled={state.kind === 'loading'}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
            {state.kind === 'loading' ? 'Загружаем проект…' : project.shareId ? 'Обновить и показать ссылку' : 'Создать ссылку'}
          </button>
        )}
        {state.kind === 'error' && <p role="alert" className="rounded-lg bg-brand-soft p-3 text-sm text-brand-strong">{state.message}</p>}
      </div>
    </dialog>
  )
}
