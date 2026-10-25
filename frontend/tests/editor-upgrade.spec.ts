import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { DrawingObject, Point } from '../src/types/drawing'

const canvas = (page: Page) => page.getByRole('application', { name: 'Холст чертежа' })
const object = (page: Page, id: string) => canvas(page).locator(`[data-object-id="${id}"]`)
const vertexHandles = (page: Page) => canvas(page).locator('[data-vertex-handle]')

async function screen(page: Page, point: Point) {
  await canvas(page).scrollIntoViewIfNeeded()
  return canvas(page).locator('[data-canvas-content]').evaluate((node, point) => {
    const result = new DOMPoint(point.x, point.y).matrixTransform((node as SVGGraphicsElement).getScreenCTM()!)
    return { x: result.x, y: result.y }
  }, point)
}

async function draw(page: Page, tool: string, a = { x: 100, y: 100 }, b = { x: 300, y: 250 }) {
  await page.getByRole('button', { name: tool, exact: true }).click()
  if (tool === 'Многоугольник') {
    for (const point of [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }, a]) {
      const position = await screen(page, point)
      await page.mouse.click(position.x, position.y)
    }
    return
  }
  const start = await screen(page, a)
  const end = await screen(page, b)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 5 })
  await page.mouse.up()
}

async function drawings(page: Page): Promise<DrawingObject[]> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('space-map-projects')!)[0].drawings ?? [])
}

async function polygonPoint(page: Page, point: Point) {
  const position = await screen(page, point)
  await page.mouse.click(position.x, position.y)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'upgrade', name: 'Тест', email: 'test@example.com', role: 'admin' }))
    if (!localStorage.getItem('space-map-projects')) localStorage.setItem('space-map-projects', JSON.stringify([
      { id: 'advanced', name: 'План офиса', description: '', createdAt: '2026-10-24' },
      { id: 'target', name: 'Другой корпус', description: '', createdAt: '2026-10-24', drawings: [{ id: 'target-room', type: 'rectangle', points: [{ x: 0, y: 0 }, { x: 100, y: 100 }] }] },
    ]))
  })
  await page.goto('/projects/advanced/editor')
  await expect(canvas(page)).toBeVisible()
})

for (const [tool, type, primitive, count] of [
  ['Эллипс', 'ellipse', 'ellipse', 2], ['Треугольник', 'polygon', 'polygon', 3],
  ['Ромб', 'polygon', 'polygon', 4], ['Пятиугольник', 'polygon', 'polygon', 5],
  ['Шестиугольник', 'polygon', 'polygon', 6], ['Звезда', 'polygon', 'polygon', 10],
  ['Стрелка', 'polygon', 'polygon', 7], ['Многоугольник', 'polygon', 'polygon', 4], ['Ломаная', 'polyline', 'polyline', 3],
] as const) {
  test(`${tool} can be created, saved, displayed on the map and previewed`, async ({ page }) => {
    await draw(page, tool)
    const stored = (await drawings(page))[0]
    expect(stored.type).toBe(type)
    expect(stored.points).toHaveLength(count)
    await expect(canvas(page).locator(`[data-object-id] ${primitive}`)).toBeVisible()
    await page.reload()
    await expect(canvas(page).locator(`[data-object-id] ${primitive}`)).toBeVisible()
    await page.getByRole('link', { name: '2D-карта и панорамы', exact: true }).click()
    await expect(page.getByRole('img', { name: 'План помещения', exact: true }).locator(primitive)).toBeVisible()
    await page.goto('/')
    await expect(page.getByRole('img', { name: 'Чертёж проекта «План офиса»', exact: true }).locator(primitive)).toBeVisible()
  })
}

test('vertices can be added, moved and deleted with undo, redo and persistence', async ({ page }) => {
  await draw(page, 'Прямоугольник')
  const id = (await drawings(page))[0].id
  await page.getByRole('button', { name: 'Редактировать вершины', exact: true }).click()
  await expect(vertexHandles(page)).toHaveCount(4)
  await page.getByRole('button', { name: 'Добавить вершину', exact: true }).click()
  await expect(vertexHandles(page)).toHaveCount(5)
  expect((await drawings(page))[0].type).toBe('polygon')
  const selected = vertexHandles(page).nth(1)
  const handle = (await selected.boundingBox())!
  const end = await screen(page, { x: 200, y: 50 })
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 5 })
  await page.mouse.up()
  expect((await drawings(page))[0].points[1]).toEqual({ x: 200, y: 50 })
  await page.keyboard.press('Delete')
  expect((await drawings(page))[0].points).toHaveLength(4)
  await page.keyboard.press('Control+z')
  expect((await drawings(page))[0].points).toHaveLength(5)
  await page.keyboard.press('Control+z')
  expect((await drawings(page))[0].points[1]).toEqual({ x: 200, y: 100 })
  await page.keyboard.press('Control+y')
  expect((await drawings(page))[0].points[1]).toEqual({ x: 200, y: 50 })
  await page.reload()
  await expect(object(page, id).locator('polygon')).toBeVisible()
  expect((await drawings(page))[0].points[1]).toEqual({ x: 200, y: 50 })
})

test('double clicking an edge inserts a vertex; minimum vertex counts are protected', async ({ page }) => {
  await draw(page, 'Прямоугольник')
  await page.getByRole('button', { name: 'Редактировать вершины', exact: true }).click()
  const edge = await screen(page, { x: 200, y: 100 })
  await page.mouse.dblclick(edge.x, edge.y)
  await expect(vertexHandles(page)).toHaveCount(5)
  for (let index = 0; index < 2; index++) {
    await vertexHandles(page).first().click()
    await page.getByRole('button', { name: 'Удалить вершину', exact: true }).click()
  }
  await expect(vertexHandles(page)).toHaveCount(3)
  await vertexHandles(page).first().click()
  await expect(page.getByRole('button', { name: 'Удалить вершину', exact: true })).toBeDisabled()
  await page.keyboard.press('Delete')
  expect((await drawings(page))[0].points).toHaveLength(3)
})

test('an open line becomes an editable polyline; Escape cancels a vertex drag', async ({ page }) => {
  await draw(page, 'Линия', { x: 100, y: 200 }, { x: 300, y: 200 })
  await page.getByRole('button', { name: 'Добавить вершину', exact: true }).click()
  expect((await drawings(page))[0].type).toBe('polyline')
  const before = await drawings(page)
  const handle = (await vertexHandles(page).nth(1).boundingBox())!
  const end = await screen(page, { x: 200, y: 100 })
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 4 })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  expect(await drawings(page)).toEqual(before)
})

test('editor panels occupy the requested sides and the object list selects and deletes objects', async ({ page }, testInfo) => {
  await draw(page, 'Треугольник')
  await page.getByLabel('Название', { exact: true }).fill('Зона ожидания')
  const left = page.getByRole('complementary', { name: 'Панель инструментов' })
  const right = page.getByRole('complementary', { name: 'Свойства и объекты' })
  expect((await left.boundingBox())!.x).toBeLessThan((await canvas(page).boundingBox())!.x)
  expect((await right.boundingBox())!.x).toBeGreaterThan((await canvas(page).boundingBox())!.x)
  const grid = left.getByRole('region', { name: 'Настройки сетки и масштаба' })
  const marks = left.getByRole('region', { name: 'Метки', exact: true })
  const shapes = left.getByRole('region', { name: 'Инструменты и фигуры' })
  expect((await shapes.boundingBox())!.y).toBeLessThan((await marks.boundingBox())!.y)
  expect((await marks.boundingBox())!.y).toBeLessThan((await grid.boundingBox())!.y)
  await page.getByRole('region', { name: 'Список объектов' }).getByRole('button', { name: 'Зона ожидания', exact: true }).click()
  await expect(page.getByLabel('Название', { exact: true })).toHaveValue('Зона ожидания')
  await page.screenshot({ path: testInfo.outputPath('editor-upgraded.png'), fullPage: true })
  await page.getByRole('button', { name: 'Удалить объект', exact: true }).click()
  await expect(canvas(page).locator('[data-object-id]')).toHaveCount(0)
})

test('information, status and navigation markers persist and work on the map; developer markers stay hidden', async ({ page }) => {
  for (const [tool, point, name] of [
    ['Информационная метка', { x: 100, y: 100 }, 'Стойка информации'],
    ['Статусная метка', { x: 250, y: 150 }, 'Лифт'],
    ['Навигационная метка', { x: 400, y: 200 }, 'В другой корпус'],
  ] as const) {
    await draw(page, tool, point, point)
    await page.getByLabel('Название', { exact: true }).fill(name)
    if (tool === 'Информационная метка') await page.getByLabel('Описание метки', { exact: true }).fill('Работает с 9 до 18')
    if (tool === 'Статусная метка') await page.getByLabel('Статус метки', { exact: true }).selectOption('blocked')
    if (tool === 'Навигационная метка') await page.getByLabel('Переход на карту', { exact: true }).selectOption('target')
  }
  await expect(page.getByRole('button', { name: 'Служебная метка', exact: true })).toBeVisible()
  await draw(page, 'Служебная метка', { x: 500, y: 300 }, { x: 500, y: 300 })
  expect(await drawings(page)).toHaveLength(4)
  await expect(page.getByRole('checkbox', { name: 'Показывать служебные метки' })).toBeChecked()
  await page.getByRole('checkbox', { name: 'Показывать служебные метки' }).uncheck()
  await expect(canvas(page).locator('[data-marker-kind="service"]')).toHaveCount(0)
  await page.getByRole('link', { name: '2D-карта и панорамы', exact: true }).click()
  await page.getByRole('button', { name: 'Метка: Стойка информации', exact: true }).click()
  await expect(page.getByText('Работает с 9 до 18', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Метка: Лифт', exact: true }).click()
  await expect(page.getByText('Статус: Недоступно', { exact: true })).toBeVisible()
  await expect(page.locator('[data-marker-kind="service"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Метка: В другой корпус', exact: true }).click()
  await expect(page).toHaveURL('/projects/target/map')
})

test('projects and Workspace share the card list with type filters; the form creates only maps', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Создать проект', exact: true }).click()
  await expect(page.getByLabel('Тип проекта', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Создать Workspace', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Отмена', exact: true }).click()
  await page.evaluate(() => localStorage.setItem('space-map-workspaces', JSON.stringify({
    version: 1, activeId: 'campus', workspaces: [{ id: 'campus', name: 'План кампуса', description: '', nodes: [], groups: [], view: { x: 0, y: 0, zoom: 1 } }],
  })))
  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(3)
  await page.getByRole('navigation', { name: 'Фильтр проектов' }).getByRole('button', { name: 'Workspace', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByRole('navigation', { name: 'Фильтр проектов' }).getByRole('button', { name: 'Карты', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(2)
  await page.getByRole('navigation', { name: 'Фильтр проектов' }).getByRole('button', { name: 'Все', exact: true }).click()
  await page.screenshot({ path: testInfo.outputPath('projects-mixed.png'), fullPage: true })
  await page.getByRole('button', { name: 'Открыть папку' }).first().click()
  await page.getByRole('link', { name: 'Открыть как доску' }).click()
  await expect(page.getByRole('button', { name: '+ Новый Workspace', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Добавить карту: План офиса', exact: true }).click()
  await page.getByRole('link', { name: 'Редактор', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Навигация редактора' }).getByRole('link', { name: 'План кампуса', exact: true })).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Режим 3D', exact: true })).toBeDisabled()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('editor-upgraded-mobile.png'), fullPage: true })
})

test('a polygon is committed once only when its points close at the first vertex', async ({ page }) => {
  await page.getByRole('button', { name: 'Многоугольник', exact: true }).click()
  const points = [{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 275, y: 250 }, { x: 125, y: 275 }]
  for (const point of points) {
    await polygonPoint(page, point)
    expect(await drawings(page)).toHaveLength(0)
  }
  await expect(canvas(page).locator('[data-polygon-point]')).toHaveCount(4)
  await page.getByRole('button', { name: 'Замкнуть многоугольник', exact: true }).click()
  expect((await drawings(page))[0].points).toEqual(points)
  await expect(canvas(page).locator('[data-polygon-construction]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Выделение', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Control+z')
  expect(await drawings(page)).toHaveLength(0)
  await expect(page.getByRole('button', { name: 'Отменить · Ctrl + Z', exact: true })).toBeDisabled()
  await page.keyboard.press('Control+y')
  expect((await drawings(page))[0].points).toEqual(points)
  await page.reload()
  expect((await drawings(page))[0].points).toEqual(points)
})

test('two points or collinear points cannot close a polygon', async ({ page }) => {
  await page.getByRole('button', { name: 'Многоугольник', exact: true }).click()
  await polygonPoint(page, { x: 100, y: 100 })
  await polygonPoint(page, { x: 200, y: 100 })
  await polygonPoint(page, { x: 100, y: 100 })
  await expect(canvas(page).locator('[data-polygon-point]')).toHaveCount(2)
  await polygonPoint(page, { x: 300, y: 100 })
  await polygonPoint(page, { x: 100, y: 100 })
  expect(await drawings(page)).toHaveLength(0)
  await polygonPoint(page, { x: 300, y: 250 })
  await polygonPoint(page, { x: 100, y: 100 })
  expect((await drawings(page))[0].points).toHaveLength(4)
})

test('polygon drafts support local Ctrl+Z, Escape and switching tools without changing saved objects', async ({ page }) => {
  await draw(page, 'Треугольник')
  const before = await drawings(page)
  await page.getByRole('button', { name: 'Многоугольник', exact: true }).click()
  await polygonPoint(page, { x: 100, y: 300 })
  await polygonPoint(page, { x: 300, y: 300 })
  await page.keyboard.press('Control+z')
  await expect(canvas(page).locator('[data-polygon-point]')).toHaveCount(1)
  expect(await drawings(page)).toEqual(before)
  await page.keyboard.press('Escape')
  await expect(canvas(page).locator('[data-polygon-point]')).toHaveCount(0)
  await polygonPoint(page, { x: 100, y: 300 })
  await page.getByRole('button', { name: 'Выделение', exact: true }).click()
  await page.getByRole('button', { name: 'Многоугольник', exact: true }).click()
  await expect(canvas(page).locator('[data-polygon-point]')).toHaveCount(0)
  expect(await drawings(page)).toEqual(before)
})

test('polygon points remain in world coordinates through panning and zooming', async ({ page }) => {
  await page.getByRole('button', { name: 'Многоугольник', exact: true }).click()
  const points = [{ x: 100, y: 100 }, { x: 250, y: 100 }, { x: 200, y: 250 }]
  await polygonPoint(page, points[0])
  await page.getByRole('spinbutton', { name: 'Масштаб холста в процентах' }).fill('150')
  await page.getByRole('spinbutton', { name: 'Масштаб холста в процентах' }).press('Enter')
  const position = await screen(page, { x: 100, y: 100 })
  await page.mouse.move(position.x, position.y)
  await page.mouse.wheel(-30, -20)
  await polygonPoint(page, points[1])
  await polygonPoint(page, points[2])
  await polygonPoint(page, points[0])
  expect((await drawings(page))[0].points).toEqual(points)
})

test('Ctrl+A selects all visible objects, preserves hidden service marks and does not override text selection', async ({ page }) => {
  await draw(page, 'Прямоугольник')
  await page.getByLabel('Название', { exact: true }).fill('Комната')
  await draw(page, 'Линия', { x: 100, y: 325 }, { x: 300, y: 325 })
  await draw(page, 'Служебная метка', { x: 400, y: 100 }, { x: 400, y: 100 })
  await expect(canvas(page).locator('[data-marker-kind="service"]')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Показывать служебные метки' }).uncheck()
  await page.keyboard.press('Control+a')
  await expect(canvas(page).locator('[data-selected]')).toHaveCount(2)
  await expect(page.getByRole('status')).toHaveText('Выделено объектов: 2')
  await page.keyboard.press('Delete')
  expect((await drawings(page)).map((object) => object.markerKind)).toEqual(['service'])
  await page.keyboard.press('Control+z')
  expect(await drawings(page)).toHaveLength(3)
  await page.getByRole('region', { name: 'Список объектов' }).getByRole('button', { name: 'Комната', exact: true }).click()
  const name = page.getByLabel('Название', { exact: true })
  await name.focus()
  await name.press('Control+a')
  expect(await name.evaluate((node) => [(node as HTMLInputElement).selectionStart, (node as HTMLInputElement).selectionEnd])).toEqual([0, 'Комната'.length])
  await expect(canvas(page).locator('[data-selected]')).toHaveCount(1)
  await page.getByRole('checkbox', { name: 'Показывать служебные метки' }).check()
  await page.keyboard.press('Control+a')
  await expect(canvas(page).locator('[data-selected]')).toHaveCount(3)
})

test('Ctrl+A cancels an unfinished polygon and selects existing objects without saving the draft', async ({ page }) => {
  await draw(page, 'Прямоугольник')
  await page.getByRole('button', { name: 'Многоугольник', exact: true }).click()
  await polygonPoint(page, { x: 100, y: 300 })
  await polygonPoint(page, { x: 300, y: 300 })
  await page.keyboard.press('Control+a')
  await expect(canvas(page).locator('[data-polygon-construction]')).toHaveCount(0)
  await expect(canvas(page).locator('[data-selected]')).toHaveCount(1)
  expect(await drawings(page)).toHaveLength(1)
})

test('polygon edge lengths follow the cursor and disappear after closing the figure', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Многоугольник', exact: true }).click()
  await polygonPoint(page, { x: 100, y: 100 })
  const cursor = await screen(page, { x: 250, y: 100 })
  await page.mouse.move(cursor.x, cursor.y)
  const lengths = canvas(page).locator('[data-polygon-edge-length]')
  await expect(lengths).toHaveText(['3.00 м'])
  await expect(lengths.first()).toHaveAttribute('data-current-edge', 'true')
  await polygonPoint(page, { x: 250, y: 100 })
  const next = await screen(page, { x: 250, y: 200 })
  await page.mouse.move(next.x, next.y)
  await expect(lengths).toHaveText(['3.00 м', '2.00 м'])
  await polygonPoint(page, { x: 250, y: 200 })
  const first = await screen(page, { x: 100, y: 100 })
  await page.mouse.move(first.x, first.y)
  await expect(lengths).toHaveText(['3.00 м', '2.00 м', '3.61 м'])
  await page.screenshot({ path: testInfo.outputPath('polygon-edge-lengths.png'), fullPage: true })
  await page.mouse.click(first.x, first.y)
  await expect(lengths).toHaveCount(0)
  const saved = (await drawings(page))[0]
  await expect(object(page, saved.id).locator('text')).toHaveCount(0)
  await page.reload()
  await expect(canvas(page).locator('[data-polygon-edge-length]')).toHaveCount(0)
})

test('edge lengths use world distances and keep a constant text size after zooming', async ({ page }) => {
  await page.getByRole('button', { name: 'Многоугольник', exact: true }).click()
  await polygonPoint(page, { x: 100, y: 100 })
  await polygonPoint(page, { x: 250, y: 100 })
  const edge = canvas(page).locator('[data-polygon-edge-length="0"]')
  await expect(edge).toHaveText('3.00 м')
  await expect(edge).toHaveAttribute('font-size', '12')
  await page.getByRole('spinbutton', { name: 'Масштаб холста в процентах' }).fill('150')
  await page.getByRole('spinbutton', { name: 'Масштаб холста в процентах' }).press('Enter')
  await expect(edge).toHaveText('3.00 м')
  await expect(edge).toHaveAttribute('font-size', '8')
  const position = await screen(page, { x: 100, y: 100 })
  await page.mouse.move(position.x, position.y)
  await page.mouse.wheel(-40, -20)
  await expect(edge).toHaveText('3.00 м')
})

test('right click cancels the polygon draft without saving, opens no context menu and permits a fresh polygon', async ({ page }) => {
  await draw(page, 'Прямоугольник')
  const before = await drawings(page)
  await page.getByRole('button', { name: 'Многоугольник', exact: true }).click()
  for (const point of [{ x: 100, y: 300 }, { x: 300, y: 300 }, { x: 250, y: 400 }]) await polygonPoint(page, point)
  await expect(canvas(page).locator('[data-polygon-edge-length]')).not.toHaveCount(0)
  await page.evaluate(() => {
    window.addEventListener('contextmenu', (event) => Reflect.set(window, 'polygonMenuPrevented', event.defaultPrevented))
  })
  const position = await screen(page, { x: 250, y: 400 })
  await page.mouse.click(position.x, position.y, { button: 'right' })
  await expect(canvas(page).locator('[data-polygon-construction]')).toHaveCount(0)
  expect(await page.evaluate(() => Reflect.get(window, 'polygonMenuPrevented'))).toBe(true)
  expect(await drawings(page)).toEqual(before)
  for (const point of [{ x: 100, y: 300 }, { x: 200, y: 300 }, { x: 200, y: 400 }, { x: 100, y: 300 }]) await polygonPoint(page, point)
  expect((await drawings(page))[1].points).toEqual([{ x: 100, y: 300 }, { x: 200, y: 300 }, { x: 200, y: 400 }])
  // Без черновика правая кнопка открывает меню действий редактора вместо меню браузера.
  const prevented = await canvas(page).evaluate((node) => !node.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })))
  expect(prevented).toBe(true)
  await expect(page.getByRole('menu', { name: 'Действия на холсте' })).toBeVisible()
})
