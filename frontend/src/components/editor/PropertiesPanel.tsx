
import { useState } from 'react'
import type { DrawingObject } from '../../types/drawing'

interface PropertiesPanelProps {
  selected: DrawingObject | null
  onUpdate: (updates: Partial<DrawingObject>) => void
  onDelete: () => void
}

export default function PropertiesPanel({
  selected,
  onUpdate,
  onDelete,
}: PropertiesPanelProps) {
  const [label, setLabel] = useState(selected?.label ?? '')
  const [strokeWidth, setStrokeWidth] = useState(
    selected?.strokeWidth ?? 2
  )

  if (!selected) {
    return (
      <div className="p-4 bg-white border-l border-slate-200 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            ⌘
          </div>
          <p className="text-sm text-slate-500 text-center">
            Выберите объект на чертеже, чтобы задать размеры и свойства.
          </p>
        </div>
      </div>
    )
  }

  const width = selected.width ?? Math.abs(selected.points[1].x - selected.points[0].x)
  const height = selected.height ?? Math.abs(selected.points[1].y - selected.points[0].y)

  return (
    <div className="p-4 bg-white border-l border-slate-200 shadow-sm flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Объект: {selected.type === 'line' ? 'Линия' : 'Прямоугольник'}
        </h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>ID:</span>
          <span className="font-mono text-slate-400">{selected.id}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700">Название</label>
          <input
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value)
              onUpdate({ label: e.target.value })
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700">Ширина</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={width.toString()}
              onChange={(e) => onUpdate({ width: Number(e.target.value) || 0 })}
              className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
            />
            <span className="text-xs text-slate-500">м</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700">Высота</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={height.toString()}
              onChange={(e) => onUpdate({ height: Number(e.target.value) || 0 })}
              className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
            />
            <span className="text-xs text-slate-500">м</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700">Толщина линии</label>
          <input
            type="range"
            min="1"
            max="6"
            step="1"
            value={strokeWidth}
            onChange={(e) => {
              setStrokeWidth(Number(e.target.value))
              onUpdate({ strokeWidth: Number(e.target.value) })
            }}
            className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <div className="mt-auto">
        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
        >
          Удалить объект
        </button>
      </div>
    </div>
  )
}
