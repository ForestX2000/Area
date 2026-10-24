
import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CanvasEditor from '../components/editor/CanvasEditor'
import EditorToolbar from '../components/editor/EditorToolbar'
import type { DrawingObject, DrawingTool } from '../types/drawing'
import { getProjects, saveProjects } from '../utils/projectStorage'

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [objects, setObjects] = useState<DrawingObject[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<DrawingTool>('select')
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [zoom, setZoom] = useState(1)

  const GRID_SIZE = 50

  const project = projectId
    ? getProjects().find((p) => p.id === projectId)
    : undefined

  const selected = objects.find((o) => o.id === selectedId) ?? null

  const handleObjectsChange = useCallback(
    (next: DrawingObject[]) => {
      setObjects(next)
      if (projectId) {
        const projects = getProjects()
        const updated = projects.map((p) =>
          p.id === projectId ? { ...p, drawings: next } : p
        )
        try {
          saveProjects(updated)
        } catch {
          // silently ignore storage errors in MVP
        }
      }
    },
    [projectId]
  )

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id)
  }, [])

  const handleUpdateLabel = useCallback(
    (label: string) => {
      if (!selectedId) return
      setObjects((prev) =>
        prev.map((o) =>
          o.id === selectedId ? { ...o, label } : o
        )
      )
    },
    [selectedId]
  )

  const handleDelete = useCallback(() => {
    if (!selectedId) return
    setObjects((prev) => prev.filter((o) => o.id !== selectedId))
    setSelectedId(null)
    handleObjectsChange(objects.filter((o) => o.id !== selectedId))
  }, [selectedId, objects, handleObjectsChange])

  if (!projectId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">Редактор чертежей</h2>
          <p className="mt-2 text-slate-500">
            Выберите проект, чтобы открыть редактор планировки.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            ← Назад к проектам
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex flex-col md:flex-row h-screen overflow-hidden">
        {/*Toolbar — только слева*/}
        <aside className="hidden md:flex flex-col w-64">
          <EditorToolbar
            tool={tool}
            onToolChange={setTool}
            snapToGrid={snapToGrid}
            onSnapToggle={() => setSnapToGrid((prev) => !prev)}
            zoom={zoom}
            onZoomChange={setZoom}
          />
        </aside>

        {/*Canvas — центральная область*/}
        <div className="flex-1 min-w-0 relative">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
            <Link
              to={`/projects/${projectId}`}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition"
            >
              ← Назад к проекту
            </Link>
            <span className="w-px h-5 bg-slate-300" />
            <span className="text-sm font-medium text-slate-900">
              Редактор: {project?.name ?? 'Проект'}
            </span>
          </div>

          <CanvasEditor
            objects={objects}
            onObjectsChange={handleObjectsChange}
            selectedId={selectedId}
            onSelect={handleSelect}
            tool={tool}
            gridSize={GRID_SIZE}
            snapToGrid={snapToGrid}
            zoom={zoom}
            onZoomChange={setZoom}
          />
        </div>

        {/*Список элементов и свойства — справа*/}
        <aside className="w-80 border-l border-slate-200 bg-white flex flex-col">
          {/*Заголовок*/}
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Элементы</h3>
            <p className="text-xs text-slate-500">
              {objects.length} объектов
            </p>
          </div>

          {/*Свойства выделенного*/}
          {selected && (
            <div className="p-4 border-b border-slate-200">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Свойства
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    Название
                  </label>
                  <input
                    type="text"
                    value={selected.label ?? ''}
                    onChange={(e) => handleUpdateLabel(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 block mb-1">
                      Ширина
                    </label>
                    <input
                      type="number"
                      value={selected.width?.toFixed(0) ?? ''}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        if (v > 0) {
                          setObjects((prev) =>
                            prev.map((o) =>
                              o.id === selectedId
                                ? { ...o, width: v }
                                : o
                            )
                          )
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 block mb-1">
                      Высота
                    </label>
                    <input
                      type="number"
                      value={selected.height?.toFixed(0) ?? ''}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        if (v > 0) {
                          setObjects((prev) =>
                            prev.map((o) =>
                              o.id === selectedId
                                ? { ...o, height: v }
                                : o
                            )
                          )
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                >
                  Удалить элемент
                </button>
              </div>
            </div>
          )}

          {/*Список всех элементов*/}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {objects.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-8">
                Нет элементов
              </div>
            ) : (
              objects.map((obj) => {
                const isSelected = obj.id === selectedId
                const w = Math.abs(obj.points[1].x - obj.points[0].x)
                const h = Math.abs(obj.points[1].y - obj.points[0].y)
                const typeLabel =
                  obj.type === 'line' ? 'Линия' : 'Прямоугольник'

                return (
                  <div
                    key={obj.id}
                    onClick={() => setSelectedId(obj.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-transparent hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            obj.type === 'line'
                              ? 'bg-slate-500'
                              : 'bg-indigo-500'
                          }`}
                        />
                        <span className="truncate">
                          {obj.label ?? typeLabel}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {w.toFixed(0)} × {h.toFixed(0)} м
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setObjects((prev) =>
                          prev.filter((o) => o.id !== obj.id)
                        )
                        if (selectedId === obj.id) setSelectedId(null)
                        handleObjectsChange(
                          objects.filter((o) => o.id !== obj.id)
                        )
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      ✕
                    </button>
                  </div>
                )
              })
            )}
          </div>

          <div className="p-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleDelete}
              disabled={!selectedId}
              className={`w-full rounded-xl border px-3 py-2 text-sm font-medium transition ${
                !selectedId
                  ? 'border-slate-200 text-slate-400'
                  : 'border-red-200 text-red-600 hover:bg-red-50'
              }`}
            >
              Удалить выбранное
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
