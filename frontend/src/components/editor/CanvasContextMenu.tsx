import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

export type MenuItem = { label: string; shortcut?: string; onSelect: () => void; disabled?: boolean; danger?: boolean } | 'separator'

export default function CanvasContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    const menu = ref.current
    if (!menu) return
    const { width, height } = menu.getBoundingClientRect()
    setPosition({ left: Math.max(8, Math.min(x, window.innerWidth - width - 8)), top: Math.max(8, Math.min(y, window.innerHeight - height - 8)) })
    menu.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus()
  }, [x, y])

  useEffect(() => {
    // Без подложки: правый клик по другой фигуре должен дойти до холста.
    const close = (event: Event) => { if (!ref.current?.contains(event.target as Node)) onClose() }
    const closeNow = () => onClose()
    document.addEventListener('pointerdown', close, true)
    window.addEventListener('resize', closeNow)
    window.addEventListener('blur', closeNow)
    return () => {
      document.removeEventListener('pointerdown', close, true)
      window.removeEventListener('resize', closeNow)
      window.removeEventListener('blur', closeNow)
    }
  }, [onClose])

  function handleKeyDown(event: KeyboardEvent) {
    const buttons = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])]
    const index = buttons.indexOf(document.activeElement as HTMLElement)
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() }
    else if (event.key === 'ArrowDown') { event.preventDefault(); buttons[(index + 1) % buttons.length]?.focus() }
    else if (event.key === 'ArrowUp') { event.preventDefault(); buttons[(index - 1 + buttons.length) % buttons.length]?.focus() }
    else if (event.key === 'Tab') { event.preventDefault(); onClose() }
  }

  return <div ref={ref} role="menu" aria-label="Действия на холсте" onKeyDown={handleKeyDown} onContextMenu={(event) => event.preventDefault()}
    style={position} className="fixed z-50 min-w-56 rounded-xl border border-line bg-surface p-1 text-sm text-body shadow-xl">
    {items.map((item, index) => item === 'separator'
      ? <div key={index} role="separator" className="my-1 border-t border-line" />
      : <button key={index} type="button" role="menuitem" disabled={item.disabled}
        onClick={() => { onClose(); item.onSelect() }}
        className={`flex w-full items-center justify-between gap-6 rounded-lg px-3 py-1.5 text-left outline-none enabled:hover:bg-surface-muted enabled:focus:bg-surface-muted disabled:opacity-40 ${item.danger ? 'text-brand-hover' : ''}`}>
        <span>{item.label}</span>{item.shortcut && <span className="text-xs text-muted">{item.shortcut}</span>}
      </button>)}
  </div>
}
