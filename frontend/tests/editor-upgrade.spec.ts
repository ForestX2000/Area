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
  const left = page.getByRole('complementary', { name: 'Свойства и объекты' })
  const right = page.getByRole('complementary', { name: 'Панель инструментов' })
  expect((await left.boundingBox())!.x).toBeLessThan((await canvas(page).boundingBox())!.x)
  expect((await right.boundingBox())!.x).toBeGreaterThan((await canvas(page).boundingBox())!.x)
  const grid = right.getByRole('region', { name: 'Настройки сетки и масштаба' })
  const marks = right.getByRole('region', { name: 'Метки', exact: true })
  const shapes = right.getByRole('region', { name: 'Инструменты и фигуры' })
  expect((await grid.boundingBox())!.y).toBeLessThan((await marks.boundingBox())!.y)
  expect((await marks.boundingBox())!.y).toBeLessThan((await shapes.boundingBox())!.y)
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
  await expect(page.getByRole('button', { name: 'Служебная метка', exact: true })).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Режим разработчика' }).check()
  await draw(page, 'Служебная метка', { x: 500, y: 300 }, { x: 500, y: 300 })
  expect(await drawings(page)).toHaveLength(4)
  await page.getByRole('checkbox', { name: 'Режим разработчика' }).uncheck()
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

test('projects and Workspace share the card list and creation form with type filters', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Создать проект', exact: true }).click()
  await page.getByLabel('Тип проекта', { exact: true }).selectOption('workspace')
  await page.getByLabel('Название проекта', { exact: true }).fill('План кампуса')
  await page.getByRole('button', { name: 'Создать Workspace', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(3)
  await page.getByRole('navigation', { name: 'Фильтр проектов' }).getByRole('button', { name: 'Workspace', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByRole('navigation', { name: 'Фильтр проектов' }).getByRole('button', { name: 'Карты', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(2)
  await page.getByRole('navigation', { name: 'Фильтр проектов' }).getByRole('button', { name: 'Все', exact: true }).click()
  await page.screenshot({ path: testInfo.outputPath('projects-mixed.png'), fullPage: true })
  await page.getByRole('link', { name: 'Открыть Workspace' }).click()
  await expect(page.getByRole('button', { name: '+ Новый Workspace', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Добавить карту: План офиса', exact: true }).click()
  await page.getByRole('link', { name: 'Редактор', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Навигация редактора' }).getByRole('link', { name: 'План кампуса', exact: true })).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Режим 3D', exact: true })).toBeDisabled()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('editor-upgraded-mobile.png'), fullPage: true })
})
