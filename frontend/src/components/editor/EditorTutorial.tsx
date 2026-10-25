import { useEffect, useRef, useState } from 'react'
import type { DrawingObject, DrawingTool } from '../../types/drawing'
import { markTutorialDone } from '../../utils/tutorial'

export interface TutorialContext {
  tool: DrawingTool
  objects: DrawingObject[]
  menuOpens: number
  undoCount: number
}

interface Progress {
  index: number
  ids: string[]
  roomId?: string
  roomPoints?: string
  menuOpens: number
  undoCount: number
}

interface Step {
  title: string
  text: string
  target?: string
  check?: (context: TutorialContext, progress: Progress, room?: DrawingObject) => boolean
}

const CANVAS = '[aria-label="Холст чертежа"]'
const isNew = (context: TutorialContext, progress: Progress, type: DrawingObject['type']) =>
  context.objects.some((object) => object.type === type && !progress.ids.includes(object.id))

const STEPS: Step[] = [
  { title: 'Добро пожаловать в редактор', text: 'За пару минут научимся рисовать помещения, двигать и поворачивать их, пользоваться меню и линейкой. Шаг засчитывается, когда ты сам выполнишь действие.' },
  { title: 'Выбери инструмент', text: 'Нажми «Прямоугольник» на панели инструментов слева.', target: '[data-tool="rectangle"]', check: (context) => context.tool === 'rectangle' },
  { title: 'Нарисуй комнату', text: 'Зажми левую кнопку мыши на холсте и протяни — получится прямоугольник.', target: CANVAS, check: (context, progress) => isNew(context, progress, 'rectangle') },
  { title: 'Перетащи комнату', text: 'Редактор сам вернулся к «Выделению». Возьми комнату мышью и перетащи в другое место.', target: CANVAS,
    check: (_, progress, room) => Boolean(room && JSON.stringify(room.points) !== progress.roomPoints) },
  { title: 'Подпиши помещение', text: 'Введи название в поле «Название» справа, например «Кухня». Если поля не видно — кликни по комнате.', target: '#object-label',
    check: (_, __, room) => Boolean(room?.label?.trim()) },
  { title: 'Поверни комнату', text: 'Потяни круглый маркер над рамкой выделения. С зажатым Shift угол меняется шагами по 15°.', target: '[data-rotation-handle]',
    check: (_, __, room) => Boolean(room?.rotation) },
  { title: 'Открой меню действий', text: 'Кликни правой кнопкой мыши по комнате: там копирование, порядок слоёв, поворот и маршрут.', target: CANVAS,
    check: (context, progress) => context.menuOpens > progress.menuOpens },
  { title: 'Измерь линейкой', text: 'Выбери «Линейка» рядом с «Выделением» и протяни линию вдоль стены.', target: '[data-tool="dimension"]',
    check: (context, progress) => isNew(context, progress, 'dimension') },
  { title: 'Отмени действие', text: 'Нажми Ctrl + Z или кнопку «Отменить» — последняя линейка исчезнет. Ctrl + Y вернёт её.', target: '[data-tutorial="undo"]',
    check: (context, progress) => context.undoCount > progress.undoCount },
  { title: 'Обучение пройдено!', text: 'Теперь ты знаешь основы. Ещё в редакторе есть лестницы между этажами, метки и построение маршрута. Повторить обучение можно кнопкой «? Обучение».' },
]

function snapshot(context: TutorialContext, index: number, previous?: Progress): Progress {
  const room = previous?.roomId ? undefined : context.objects.find((object) => object.type === 'rectangle' && previous && !previous.ids.includes(object.id))
  const roomId = previous?.roomId ?? room?.id
  const current = context.objects.find((object) => object.id === roomId)
  return { index, ids: context.objects.map((object) => object.id), roomId, roomPoints: current ? JSON.stringify(current.points) : undefined,
    menuOpens: context.menuOpens, undoCount: context.undoCount }
}

export default function EditorTutorial({ context, onClose }: { context: TutorialContext; onClose: () => void }) {
  const [progress, setProgress] = useState<Progress>(() => snapshot(context, 0))
  const step = STEPS[progress.index]
  const room = context.objects.find((object) => object.id === progress.roomId)
  if (step.check?.(context, progress, room)) setProgress(snapshot(context, progress.index + 1, progress))
  const [rect, setRect] = useState<DOMRect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardSize, setCardSize] = useState({ width: 320, height: 180 })

  useEffect(() => {
    let frame = 0
    const measure = () => {
      const element = step.target ? document.querySelector(step.target) : null
      const next = element?.getBoundingClientRect() ?? null
      setRect((current) => current && next && ['x', 'y', 'width', 'height'].every((key) => current[key as 'x'] === next[key as 'x']) ? current : next)
      frame = requestAnimationFrame(measure)
    }
    frame = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(frame)
  }, [step.target])

  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const observer = new ResizeObserver(() => {
      const { width, height } = card.getBoundingClientRect()
      setCardSize((current) => current.width === width && current.height === height ? current : { width, height })
    })
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  function finish() {
    markTutorialDone()
    onClose()
  }

  const gap = 16
  let left = (window.innerWidth - cardSize.width) / 2, top = window.innerHeight - cardSize.height - 24
  if (rect) {
    // Холст большой — карточку ставим в его угол, чтобы не закрывать место для рисования.
    const large = rect.width > window.innerWidth * 0.35
    if (large) { left = rect.right - cardSize.width - gap; top = rect.top + gap }
    else if (rect.right + gap + cardSize.width < window.innerWidth) { left = rect.right + gap; top = rect.top + rect.height / 2 - cardSize.height / 2 }
    else if (rect.left - gap - cardSize.width > 0) { left = rect.left - gap - cardSize.width; top = rect.top + rect.height / 2 - cardSize.height / 2 }
    else { left = rect.left; top = rect.bottom + gap }
  }
  left = Math.max(8, Math.min(left, window.innerWidth - cardSize.width - 8))
  top = Math.max(8, Math.min(top, window.innerHeight - cardSize.height - 8))
  const last = progress.index === STEPS.length - 1
  const actionSteps = STEPS.length - 2

  return <>
    {rect && <div aria-hidden="true" data-tutorial-highlight className="pointer-events-none fixed z-40 rounded-xl border-2 border-brand shadow-[0_0_0_4px_rgba(221,37,56,0.18)] animate-pulse"
      style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }} />}
    <div ref={cardRef} role="dialog" aria-modal="false" aria-labelledby="tutorial-title" data-tutorial-step={progress.index}
      style={{ left, top }} className="fixed z-50 w-80 max-w-[calc(100vw-16px)] rounded-2xl border border-line bg-surface p-4 text-body shadow-2xl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          {progress.index === 0 ? 'Обучение' : last ? 'Готово' : `Шаг ${progress.index} из ${actionSteps}`}
        </p>
        <button type="button" aria-label="Закрыть обучение" onClick={finish} className="rounded-md px-1.5 text-lg leading-none text-muted hover:text-brand">×</button>
      </div>
      {!last && progress.index > 0 && <div className="mb-3 h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(progress.index - 1) / actionSteps * 100}%` }} />
      </div>}
      <h2 id="tutorial-title" className="font-semibold text-ink">{step.title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{step.text}</p>
      <div className="mt-4 flex items-center justify-end gap-2">
        {progress.index === 0 ? <>
          <button type="button" onClick={finish} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-muted">Не сейчас</button>
          <button type="button" onClick={() => setProgress(snapshot(context, 1))} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Начать</button>
        </> : last
          ? <button type="button" onClick={finish} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Завершить</button>
          : <button type="button" onClick={() => setProgress(snapshot(context, progress.index + 1, progress))} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Далее</button>}
      </div>
    </div>
  </>
}
