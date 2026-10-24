
import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CanvasEditor from '../components/editor/CanvasEditor'
import EditorToolbar from '../components/editor/EditorToolbar'
import PropertiesPanel from '../components/editor/PropertiesPanel'
import type { DrawingObject, DrawingTool } from '../types/drawing'
import { getProjects, saveProjects } from '../utils/projectStorage'

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [objects, setObjects] = useState<DrawingObject[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<DrawingTool>('select')
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [zoom, setZoom] = useState(1)

  const GRID_SIZE = 50 // фиксированный размер ячейки сетки

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

  const handleUpdate = useCallback(
    (updates: Partial<DrawingObject>) => {
      if (!selectedId) return
      setObjects((prev) =>
        prev.map((o) =>
          o.id === selectedId ? { ...o, ...updates } : o
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
        {/*Toolbar — только слева, кнопки на канвасе убраны*/}
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

        {/*Canvas — только область рисования*/}
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

        {/*Properties*/}
        <aside className="w-80 border-l border-slate-200">
          <PropertiesPanel
            selected={selected}
            onUpdate={(updates) => {
              handleUpdate(updates)
              handleObjectsChange(objects)
            }}
            onDelete={handleDelete}
          />
        </aside>
      </div>
    </div>
  )
}
