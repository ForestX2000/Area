import { expect, test, type CDPSession, type Page } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

const canvas = (page: Page) => page.getByRole('application', { name: 'Холст чертежа' })
const shapes = (page: Page) => canvas(page).locator('[data-object-id]')

async function stored(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('space-map-projects')!)[0].drawings ?? [])
}

async function view(page: Page) {
  return canvas(page).locator('[data-canvas-content]').evaluate((node) => {
    const { a, e, f } = (node as SVGGraphicsElement).transform.baseVal.consolidate()!.matrix
    return { zoom: a, x: e, y: f }
  })
}

async function touch(session: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', points: { x: number; y: number; id?: number }[]) {
  await session.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((point) => ({ radiusX: 5, radiusY: 5, force: 1, ...point })) })
}

async function drawRectangle(page: Page, session: CDPSession) {
  await page.getByRole('button', { name: 'Открыть инструменты', exact: true }).tap()
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).tap()
  await expect(page.getByRole('complementary', { name: 'Панель инструментов', exact: true })).toBeHidden()
  const box = (await canvas(page).boundingBox())!
  await touch(session, 'touchStart', [{ x: box.x + 75, y: box.y + 100, id: 1 }])
  await touch(session, 'touchMove', [{ x: box.x + 250, y: box.y + 225, id: 1 }])
  await touch(session, 'touchEnd', [])
  await expect(shapes(page)).toHaveCount(1)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'test', name: 'Тест', email: 'test@example.com', role: 'admin' }))
    if (!localStorage.getItem('space-map-projects')) localStorage.setItem('space-map-projects', JSON.stringify([
      { id: 'mobile', name: 'Мобильный проект с длинным названием', description: '', createdAt: '2026-10-25' },
    ]))
  })
  await page.goto('/projects/mobile/editor')
  await expect(canvas(page)).toBeVisible()
})

test('touch drawing, properties, duplication and undo remain accessible without page scrolling', async ({ page, context }) => {
  const session = await context.newCDPSession(page)
  await drawRectangle(page, session)
  await page.getByRole('button', { name: 'Открыть свойства', exact: true }).tap()
  await page.getByLabel('Название', { exact: true }).fill('Комната')
  await page.getByLabel('Ширина', { exact: true }).fill('4')
  await page.screenshot({ path: 'test-results/mobile-properties.png' })
  await page.getByRole('button', { name: 'Закрыть свойства', exact: true }).tap()
  expect((await stored(page))[0].label).toBe('Комната')
  await expect(shapes(page).locator('rect')).toHaveAttribute('width', '200')
  await page.getByRole('button', { name: 'Открыть действия', exact: true }).tap()
  await page.getByRole('button', { name: 'Дублировать', exact: true }).tap()
  await expect(shapes(page)).toHaveCount(2)
  await page.getByRole('button', { name: 'Отменить действие', exact: true }).tap()
  await expect(shapes(page)).toHaveCount(1)
  await page.screenshot({ path: 'test-results/mobile-drawing.png' })
  await page.reload()
  await expect(shapes(page)).toHaveCount(1)
  expect((await stored(page))[0].label).toBe('Комната')
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY, overflow: document.documentElement.scrollWidth > innerWidth }))).toEqual({ x: 0, y: 0, overflow: false })
})

test('two real touch contacts pan and pinch around their midpoint without editing the drawing', async ({ page, context }) => {
  const session = await context.newCDPSession(page)
  await drawRectangle(page, session)
  const before = await stored(page)
  const box = (await canvas(page).boundingBox())!
  const a = { x: box.x + 100, y: box.y + 300, id: 1 }
  const b = { x: box.x + 250, y: box.y + 300, id: 2 }
  await touch(session, 'touchStart', [a])
  await touch(session, 'touchStart', [a, b])
  await touch(session, 'touchMove', [{ ...a, x: a.x - 25, y: a.y + 30 }, { ...b, x: b.x + 50, y: b.y + 30 }])
  await expect.poll(async () => (await view(page)).zoom).toBeCloseTo(1.5)
  const transform = await view(page)
  // Original midpoint (175, 300) moves to (187.5, 330).
  expect(transform.x).toBeCloseTo(-75)
  expect(transform.y).toBeCloseTo(-120)
  await touch(session, 'touchEnd', [])
  expect(await stored(page)).toEqual(before)
  await page.getByRole('button', { name: 'Отменить действие', exact: true }).tap()
  await expect(shapes(page)).toHaveCount(0)
})

test('a second finger cancels the draft and lifting one finger cannot commit it', async ({ page, context }) => {
  const session = await context.newCDPSession(page)
  await page.getByRole('button', { name: 'Открыть инструменты', exact: true }).tap()
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).tap()
  const box = (await canvas(page).boundingBox())!
  const a = { x: box.x + 75, y: box.y + 120, id: 1 }
  const b = { x: box.x + 250, y: box.y + 250, id: 2 }
  await touch(session, 'touchStart', [a])
  await touch(session, 'touchMove', [{ ...a, x: a.x + 30, y: a.y + 30 }])
  await expect(canvas(page).locator('[data-preview]')).toHaveCount(1)
  await touch(session, 'touchStart', [{ ...a, x: a.x + 30, y: a.y + 30 }, b])
  await expect(canvas(page).locator('[data-preview]')).toHaveCount(0)
  await touch(session, 'touchEnd', [b])
  await touch(session, 'touchMove', [{ ...b, x: b.x + 20 }])
  await touch(session, 'touchEnd', [])
  await expect(shapes(page)).toHaveCount(0)
  expect(await stored(page)).toEqual([])
})

test('pan tool moves the canvas with one finger and touch cancellation discards edits', async ({ page, context }) => {
  const session = await context.newCDPSession(page)
  await drawRectangle(page, session)
  const before = await stored(page)
  await page.getByRole('button', { name: 'Перемещение холста', exact: true }).tap()
  await expect(page.getByRole('button', { name: 'Перемещение холста', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const box = (await canvas(page).boundingBox())!
  const a = { x: box.x + 140, y: box.y + 170, id: 1 }
  await touch(session, 'touchStart', [a])
  await touch(session, 'touchMove', [{ ...a, x: a.x + 40, y: a.y + 50 }])
  await touch(session, 'touchEnd', [])
  expect(await view(page)).toEqual({ zoom: 1, x: 40, y: 50 })
  expect(await stored(page)).toEqual(before)
  await page.getByRole('button', { name: 'Выделение на холсте', exact: true }).tap()
  await touch(session, 'touchStart', [{ ...a, x: a.x + 40, y: a.y + 50 }])
  await touch(session, 'touchMove', [{ ...a, x: a.x + 90, y: a.y + 100 }])
  await touch(session, 'touchCancel', [])
  expect(await stored(page)).toEqual(before)
})

test('touch resize and vertex handles work beyond the visible dot and support undo', async ({ page, context }) => {
  const session = await context.newCDPSession(page)
  await drawRectangle(page, session)
  const box = (await canvas(page).boundingBox())!
  const handle = (await canvas(page).locator('[data-resize-handle="2"]').boundingBox())!
  const start = { x: handle.x + handle.width / 2 + 12, y: handle.y + handle.height / 2, id: 1 }
  await touch(session, 'touchStart', [start])
  await touch(session, 'touchMove', [{ ...start, x: box.x + 300, y: box.y + 275 }])
  await touch(session, 'touchEnd', [])
  await expect(shapes(page).locator('rect')).toHaveAttribute('width', '225')
  await expect(shapes(page).locator('rect')).toHaveAttribute('height', '175')
  await page.getByRole('button', { name: 'Отменить действие', exact: true }).tap()
  await expect(shapes(page).locator('rect')).toHaveAttribute('width', '175')
  // Undo clears selection; select the room again with a tap.
  await page.touchscreen.tap(box.x + 150, box.y + 160)
  await page.getByRole('button', { name: 'Открыть свойства', exact: true }).tap()
  await page.getByRole('button', { name: 'Редактировать вершины', exact: true }).tap()
  await expect(page.getByRole('complementary', { name: 'Свойства и объекты', exact: true })).toBeHidden()
  const vertex = (await canvas(page).locator('[data-vertex-handle="0"]').boundingBox())!
  const vertexStart = { x: vertex.x + vertex.width / 2 - 12, y: vertex.y + vertex.height / 2, id: 1 }
  await touch(session, 'touchStart', [vertexStart])
  await touch(session, 'touchMove', [{ ...vertexStart, x: box.x + 50, y: box.y + 75 }])
  await touch(session, 'touchEnd', [])
  expect((await stored(page))[0].points[0]).toEqual({ x: 50, y: 75 })
})

test('holding an object opens its actions without moving it or adding history', async ({ page, context }) => {
  const session = await context.newCDPSession(page)
  await drawRectangle(page, session)
  const before = await stored(page)
  const box = (await canvas(page).boundingBox())!
  const point = { x: box.x + 150, y: box.y + 160, id: 1 }
  await touch(session, 'touchStart', [point])
  const menu = page.getByRole('menu', { name: 'Действия на холсте' })
  await expect(menu).toBeVisible()
  expect(await stored(page)).toEqual(before)
  await touch(session, 'touchEnd', [])
  await expect(menu).toBeVisible()
  await menu.getByRole('menuitem', { name: 'Дублировать', exact: true }).tap()
  await expect(shapes(page)).toHaveCount(2)
  await page.getByRole('button', { name: 'Отменить действие', exact: true }).tap()
  await expect(shapes(page)).toHaveCount(1)
  await page.getByRole('button', { name: 'Отменить действие', exact: true }).tap()
  await expect(shapes(page)).toHaveCount(0)
})

test('a quick tap, movement, second finger and touch cancellation prevent the hold menu', async ({ page, context }) => {
  const session = await context.newCDPSession(page)
  await drawRectangle(page, session)
  const box = (await canvas(page).boundingBox())!
  const point = { x: box.x + 150, y: box.y + 160, id: 1 }
  const menu = page.getByRole('menu', { name: 'Действия на холсте' })
  for (const action of ['tap', 'move', 'pinch', 'cancel']) {
    await touch(session, 'touchStart', [point])
    if (action === 'tap') await touch(session, 'touchEnd', [])
    if (action === 'move') await touch(session, 'touchMove', [{ ...point, x: point.x + 12 }])
    if (action === 'pinch') await touch(session, 'touchStart', [point, { ...point, x: point.x + 100, id: 2 }])
    if (action === 'cancel') await touch(session, 'touchCancel', [])
    // Wait beyond the hold threshold with the gesture in its cancelled state.
    await page.waitForTimeout(650)
    await expect(menu).toBeHidden()
    if (action === 'move' || action === 'pinch') await touch(session, 'touchEnd', [])
  }
  expect(await stored(page)).toHaveLength(1)
})

test('holding a selected group preserves it and holding another object selects only that object', async ({ page, context }) => {
  await page.evaluate(() => {
    const projects = JSON.parse(localStorage.getItem('space-map-projects')!)
    projects[0].drawings = [
      { id: 'a', type: 'rectangle', points: [{ x: 50, y: 100 }, { x: 175, y: 200 }] },
      { id: 'b', type: 'rectangle', points: [{ x: 225, y: 100 }, { x: 350, y: 200 }] },
      { id: 'ruler', type: 'dimension', points: [{ x: 50, y: 300 }, { x: 250, y: 300 }] },
    ]
    projects[0].floors[0].drawings = projects[0].drawings
    localStorage.setItem('space-map-projects', JSON.stringify(projects))
  })
  await page.reload()
  await page.getByRole('button', { name: 'Открыть действия', exact: true }).tap()
  await page.getByRole('button', { name: 'Выделить всё', exact: true }).tap()
  const session = await context.newCDPSession(page)
  const box = (await canvas(page).boundingBox())!
  await touch(session, 'touchStart', [{ x: box.x + 100, y: box.y + 150, id: 1 }])
  const menu = page.getByRole('menu', { name: 'Действия на холсте' })
  await expect(menu.getByRole('menuitem', { name: 'Удалить (3)', exact: true })).toBeVisible()
  await touch(session, 'touchEnd', [])
  await page.getByRole('button', { name: 'Выделение на холсте', exact: true }).tap()
  // A touch contextmenu event must not trigger the mouse shortcut that removes a ruler.
  const rulerPoint = { x: box.x + 150, y: box.y + 300, id: 1 }
  await touch(session, 'touchStart', [rulerPoint])
  await canvas(page).dispatchEvent('contextmenu', { clientX: rulerPoint.x, clientY: rulerPoint.y, pointerType: 'touch' })
  await expect(menu.getByRole('menuitem', { name: 'Удалить', exact: true })).toBeVisible()
  await touch(session, 'touchEnd', [])
  expect(await stored(page)).toHaveLength(3)
  await menu.getByRole('menuitem', { name: 'Удалить', exact: true }).tap()
  await expect(shapes(page)).toHaveCount(2)
  expect((await stored(page)).some((object: { id: string }) => object.id === 'ruler')).toBe(false)
})

test('the hold menu fits a small phone and its last action can be reached by scrolling', async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  const session = await context.newCDPSession(page)
  await drawRectangle(page, session)
  const box = (await canvas(page).boundingBox())!
  await touch(session, 'touchStart', [{ x: box.x + 240, y: box.y + 190, id: 1 }])
  const menu = page.getByRole('menu', { name: 'Действия на холсте' })
  await expect(menu).toBeVisible()
  await touch(session, 'touchEnd', [])
  const menuBox = (await menu.boundingBox())!
  expect(menuBox.x).toBeGreaterThanOrEqual(8)
  expect(menuBox.y).toBeGreaterThanOrEqual(8)
  expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(312)
  expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(560)
  await page.screenshot({ path: 'test-results/mobile-hold-menu.png' })
  await menu.getByRole('menuitem', { name: 'Удалить', exact: true }).tap()
  await expect(shapes(page)).toHaveCount(0)
})

test('polygon can be completed and cancelled with touch buttons', async ({ page }) => {
  await page.getByRole('button', { name: 'Открыть инструменты', exact: true }).tap()
  await page.getByRole('button', { name: 'Многоугольник', exact: true }).tap()
  const box = (await canvas(page).boundingBox())!
  for (const point of [{ x: 75, y: 100 }, { x: 250, y: 100 }, { x: 175, y: 225 }]) {
    await page.touchscreen.tap(box.x + point.x, box.y + point.y)
  }
  await page.getByRole('button', { name: 'Завершить фигуру', exact: true }).tap()
  await expect(shapes(page)).toHaveCount(1)
  await expect(shapes(page)).toHaveAttribute('data-object-type', 'polygon')
  await page.getByRole('button', { name: 'Открыть инструменты', exact: true }).tap()
  await page.getByRole('button', { name: 'Многоугольник', exact: true }).tap()
  await page.touchscreen.tap(box.x + 50, box.y + 300)
  await page.getByRole('button', { name: 'Отменить фигуру', exact: true }).tap()
  await expect(canvas(page).locator('[data-polygon-point]')).toHaveCount(0)
  await expect(shapes(page)).toHaveCount(1)
})

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 768, height: 1024 }]) {
  test(`editor and floor picker fit ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const box = (await canvas(page).boundingBox())!
    expect(box.width).toBeGreaterThan(300)
    expect(box.height).toBeGreaterThan(140)
    const footer = (await page.getByRole('navigation', { name: 'Управление чертежом' }).boundingBox())!
    expect(footer.y + footer.height).toBeLessThanOrEqual(viewport.height + 1)
    await page.getByRole('button', { name: /^Этаж:/ }).tap()
    const picker = (await page.getByRole('dialog', { name: 'Этажи', exact: true }).boundingBox())!
    expect(picker.x).toBeGreaterThanOrEqual(0)
    expect(picker.x + picker.width).toBeLessThanOrEqual(viewport.width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/mobile-editor-${viewport.width}.png` })
  })
}

test('main pages fit a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  for (const route of ['/', '/projects/mobile', '/projects/mobile/map', '/stats', '/profile', '/workspace']) {
    await page.goto(route)
    await expect(page.getByRole('banner').first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true)
  }
})

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
  test(`tutorial stays compact and leaves editor controls clear at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.evaluate(() => localStorage.removeItem('space-map-editor-tutorial'))
    await page.reload()
    const welcome = page.getByRole('dialog', { name: 'Добро пожаловать в редактор' })
    await expect(welcome).toBeVisible()
    await expect.poll(async () => {
      const box = (await welcome.boundingBox())!
      return Math.abs(box.y + box.height / 2 - viewport.height / 2)
    }).toBeLessThan(2)
    const box = (await welcome.boundingBox())!
    expect(box.width).toBeLessThanOrEqual(288)
    expect(box.height).toBeLessThanOrEqual(240)
    await welcome.getByRole('button', { name: 'Начать', exact: true }).tap()
    const hint = page.getByRole('dialog', { name: 'Выбери инструмент' })
    await expect(hint).toBeVisible()
    const expand = hint.getByRole('button', { name: 'Развернуть подсказку' })
    if (await expand.isVisible()) await expand.tap()
    const expandedHeight = (await hint.boundingBox())!.height
    await hint.getByRole('button', { name: 'Свернуть подсказку' }).tap()
    expect((await hint.boundingBox())!.height).toBeLessThan(expandedHeight)
    expect((await hint.boundingBox())!.height).toBeLessThanOrEqual(60)
    const hintBox = (await hint.boundingBox())!
    const navigation = (await page.getByRole('navigation', { name: 'Навигация редактора' }).boundingBox())!
    expect(hintBox.y).toBeGreaterThanOrEqual(navigation.y + navigation.height)
    const canvasBox = (await canvas(page).boundingBox())!
    expect(hintBox.y + hintBox.height).toBeLessThanOrEqual(canvasBox.y)
    await page.getByRole('button', { name: 'Открыть инструменты', exact: true }).tap()
    const tools = (await page.getByRole('complementary', { name: 'Панель инструментов', exact: true }).boundingBox())!
    expect(hintBox.y + hintBox.height).toBeLessThanOrEqual(tools.y)
    await page.getByRole('button', { name: 'Прямоугольник', exact: true }).tap()
    await expect(page.getByRole('dialog', { name: 'Нарисуй комнату' })).toBeVisible()
    await page.screenshot({ path: `test-results/mobile-tutorial-${viewport.width}.png` })
  })
}
