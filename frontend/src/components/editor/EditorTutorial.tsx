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
  { title: 'Обучение редактору', text: 'Рисование, перемещение, поворот и измерение объектов. Следующий шаг открывается после выполнения действия.' },
  { title: 'Выбор инструмента', text: 'Выберите «Прямоугольник» на панели слева.', target: '[data-tool="rectangle"]', check: (context) => context.tool === 'rectangle' },
  { title: 'Создание комнаты', text: 'Зажмите левую кнопку мыши и протяните по диагонали холста.', target: CANVAS, check: (context, progress) => isNew(context, progress, 'rectangle') },
  { title: 'Перемещение комнаты', text: 'Перетащите комнату в другое место.', target: CANVAS,
    check: (_, progress, room) => Boolean(room && JSON.stringify(room.points) !== progress.roomPoints) },
  { title: 'Название помещения', text: 'Выберите комнату и заполните поле «Название» в свойствах справа.', target: '#object-label',
    check: (_, __, room) => Boolean(room?.label?.trim()) },
  { title: 'Поворот комнаты', text: 'Перетащите круглый маркер над рамкой выделения. Удерживайте Shift для поворота с шагом 15°.', target: '[data-rotation-handle]',
    check: (_, __, room) => Boolean(room?.rotation) },
  { title: 'Меню действий', text: 'Нажмите правую кнопку мыши на комнате, чтобы открыть меню действий.', target: CANVAS,
    check: (context, progress) => context.menuOpens > progress.menuOpens },
  { title: 'Измерение', text: 'Выберите «Линейка» и протяните линию вдоль стены.', target: '[data-tool="dimension"]',
    check: (context, progress) => isNew(context, progress, 'dimension') },
  { title: 'Отмена действия', text: 'Нажмите Ctrl + Z или «Отменить», чтобы удалить последний замер. Ctrl + Y повторяет действие.', target: '[data-tutorial="undo"]',
    check: (context, progress) => context.undoCount > progress.undoCount },
  { title: 'Обучение завершено', text: 'Для повторного прохождения нажмите «Обучение».' },
]

const MOBILE_STEPS: Step[] = STEPS.map((step, index) => ({ ...step, ...({
  0: { text: 'Рисование и редактирование плана. Подсказки можно свернуть.' },
  1: { text: 'Откройте «Инструменты» → «Прямоугольник».', target: '[aria-label="Открыть инструменты"]' },
  2: { text: 'Протяните пальцем по диагонали холста. Для перемещения и масштаба используйте два пальца.' },
  3: { text: 'Коснитесь комнаты и перетащите её пальцем.' },
  4: { text: 'Откройте «Свойства», введите название и закройте панель.', target: '[aria-label="Открыть свойства"]' },
  5: { text: 'Закройте свойства и перетащите круглый маркер над комнатой для поворота.' },
  6: { text: 'Удерживайте комнату, чтобы открыть меню действий.', target: CANVAS },
  7: { text: 'Выберите «Линейка» в инструментах и протяните пальцем вдоль стены.', target: '[aria-label="Открыть инструменты"]' },
  8: { text: 'Нажмите стрелку отмены слева над холстом, чтобы удалить последний замер.', target: '[aria-label="Отменить действие"]' },
  9: { text: 'Повторное прохождение: «Инструменты» → «Обучение».' },
} as Record<number, Partial<Step>>)[index] }))

function snapshot(context: TutorialContext, index: number, previous?: Progress): Progress {
  const room = previous?.roomId ? undefined : context.objects.find((object) => object.type === 'rectangle' && previous && !previous.ids.includes(object.id))
  const roomId = previous?.roomId ?? room?.id
  const current = context.objects.find((object) => object.id === roomId)
  return { index, ids: context.objects.map((object) => object.id), roomId, roomPoints: current ? JSON.stringify(current.points) : undefined,
    menuOpens: context.menuOpens, undoCount: context.undoCount }
}

export default function EditorTutorial({ context, onClose }: { context: TutorialContext; onClose: () => void }) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 1023px)').matches)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)')
    const update = () => setMobile(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  const [progress, setProgress] = useState<Progress>(() => snapshot(context, 0))
  const [collapsed, setCollapsed] = useState(() => window.innerHeight <= 480)
  const step = (mobile ? MOBILE_STEPS : STEPS)[progress.index]
  const room = context.objects.find((object) => object.id === progress.roomId)
  if (step.check?.(context, progress, room)) setProgress(snapshot(context, progress.index + 1, progress))
  const [rect, setRect] = useState<DOMRect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardSize, setCardSize] = useState({ width: 320, height: 180 })

  useEffect(() => {
    let frame = 0
    const measure = () => {
      const element = step.target ? document.querySelector(step.target) : null
      const next = element?.getClientRects().length ? element.getBoundingClientRect() : null
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
  let left = (window.innerWidth - cardSize.width) / 2, top = mobile ? (window.innerHeight - cardSize.height) / 2 : window.innerHeight - cardSize.height - 24
  if (rect && !mobile) {
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
  const mobileHint = mobile && progress.index > 0 && !last

  return <>
    {rect && <div aria-hidden="true" data-tutorial-highlight className="pointer-events-none fixed z-40 rounded-xl border-2 border-brand shadow-[0_0_0_4px_rgba(221,37,56,0.18)] animate-pulse"
      style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }} />}
    <div ref={cardRef} role="dialog" aria-modal="false" aria-labelledby="tutorial-title" data-tutorial-step={progress.index}
      style={mobileHint ? undefined : { left, top }} className={mobileHint
        ? 'mx-2 my-1 shrink-0 rounded-xl border border-line bg-surface px-3 text-xs text-body'
        : `fixed z-50 max-w-[calc(100vw-16px)] rounded-2xl border border-line bg-surface text-body shadow-2xl ${mobile ? 'w-72 max-h-[calc(100dvh-24px)] overflow-y-auto p-3 text-xs' : 'w-80 p-4'}`}>
      {mobileHint ? <>
        <div className="flex min-h-11 items-center gap-2">
          <span className="shrink-0 text-[10px] font-semibold text-brand">{progress.index}/{actionSteps}</span>
          <h2 id="tutorial-title" className="min-w-0 flex-1 text-xs font-semibold text-ink">{step.title}</h2>
          <button type="button" aria-label={collapsed ? 'Развернуть подсказку' : 'Свернуть подсказку'} aria-expanded={!collapsed} aria-controls="tutorial-hint-content"
            onClick={() => setCollapsed((value) => !value)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-muted">
            <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-4 w-4 ${collapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <button type="button" aria-label="Закрыть обучение" onClick={finish} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-muted">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M6 18 18 6" /></svg>
          </button>
        </div>
        {!collapsed && <div id="tutorial-hint-content" className="pb-2">
          <p className="text-xs leading-4 text-muted">{step.text}</p>
          <div className="mt-1 flex justify-end">
            <button type="button" onClick={() => setProgress(snapshot(context, progress.index + 1, progress))} className="min-h-8 rounded-lg px-2 text-xs text-muted hover:bg-surface-muted">Пропустить шаг</button>
          </div>
        </div>}
      </> : <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          {progress.index === 0 ? 'Обучение' : last ? 'Готово' : `Шаг ${progress.index} из ${actionSteps}`}
        </p>
        <button type="button" aria-label="Закрыть обучение" onClick={finish} className={`${mobile ? 'h-11 w-11' : 'px-1.5'} rounded-md text-lg leading-none text-muted hover:text-brand`}>×</button>
      </div>
      {!last && progress.index > 0 && <div className="mb-3 h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(progress.index - 1) / actionSteps * 100}%` }} />
      </div>}
      <h2 id="tutorial-title" className={`${mobile ? 'text-sm' : ''} font-semibold text-ink`}>{step.title}</h2>
      <p className={`mt-1 text-muted ${mobile ? 'text-xs leading-5' : 'text-sm leading-6'}`}>{step.text}</p>
      <div className={`${mobile ? 'mt-2' : 'mt-4'} flex items-center justify-end gap-2`}>
        {progress.index === 0 ? <>
          <button type="button" onClick={finish} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-muted">Не сейчас</button>
          <button type="button" onClick={() => setProgress(snapshot(context, 1))} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Начать</button>
        </> : last
          ? <button type="button" onClick={finish} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Завершить</button>
          : <button type="button" onClick={() => setProgress(snapshot(context, progress.index + 1, progress))} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Далее</button>}
      </div>
      </>}
    </div>
  </>
}
