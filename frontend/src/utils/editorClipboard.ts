import type { DrawingObject } from '../types/drawing'

// Буфер общий для всех этажей и вкладок: редактор пересоздаётся при смене этажа.
const KEY = 'space-map-editor-clipboard'

export interface EditorClipboard {
  /** `${projectId}:${floorId}` — откуда скопированы объекты. */
  source: string
  items: DrawingObject[]
}

export function readClipboard(): EditorClipboard {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (value && typeof value.source === 'string' && Array.isArray(value.items)) return value
  } catch {
    // Повреждённый буфер просто считается пустым.
  }
  return { source: '', items: [] }
}

export function writeClipboard(clipboard: EditorClipboard) {
  try { localStorage.setItem(KEY, JSON.stringify(clipboard)) } catch { /* буфер останется в памяти вкладки */ }
}
