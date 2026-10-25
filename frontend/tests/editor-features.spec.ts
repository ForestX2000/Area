import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { DrawingObject, Point } from '../src/types/drawing'

const canvas = (page: Page) => page.getByRole('application', { name: 'Холст чертежа' })
const shapes = (page: Page) => canvas(page).locator('[data-object-id]')
const menu = (page: Page) => page.getByRole('menu', { name: 'Действия на холсте' })
const tool = (page: Page, name: string) => page.getByRole('button', { name, exact: true })

async function screenPoint(page: Page, point: Point) {
  return canvas(page).locator('[data-canvas-content]').evaluate((node, position) => {
    const result = new DOMPoint(position.x, position.y).matrixTransform((node as SVGGraphicsElement).getScreenCTM()!)
    return { x: result.x, y: result.y }
  }, point)
}

async function drag(page: Page, start: Point, end: Point) {
  const a = await screenPoint(page, start)
  const b = await screenPoint(page, end)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 4 })
  await page.mouse.up()
}

async function rightClick(page: Page, point: Point) {
  const position = await screenPoint(page, point)
  await page.mouse.click(position.x, position.y, { button: 'right' })
}

const drawings = (page: Page): Promise<DrawingObject[]> =>
  page.evaluate(() => JSON.parse(localStorage.getItem('space-map-projects')!)[0].floors?.[0]?.drawings ?? JSON.parse(localStorage.getItem('space-map-projects')!)[0].drawings ?? [])

const wall = (id: string, a: Point, b: Point) => ({ id, type: 'line', points: [a, b], stroke: 'var(--ttk-graphite)', strokeWidth: 2 })
const marker = (id: string, label: string, at: Point) => ({ id, type: 'marker', markerKind: 'info', label, points: [at, at] })
const stairs = (id: string, a: Point, b: Point, targetFloorId: string) => ({ id, type: 'rectangle', shapeKind: 'stairs', label: 'Лестница', targetFloorId, points: [a, b] })

function seed(page: Page, project: Record<string, unknown>) {
  return page.addInitScript((value) => {
    localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'test', name: 'Тест', email: 'test@example.com', role: 'admin' }))
    if (!localStorage.getItem('space-map-projects')) localStorage.setItem('space-map-projects', JSON.stringify([value]))
  }, { id: 'features', name: 'Новые функции', description: '', createdAt: '2026-10-25', ...project })
}

test.describe('editor tools', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, {})
    await page.goto('/projects/features/editor')
    await expect(canvas(page)).toBeVisible()
  })

  test('the ruler sits next to selection with a ruler icon; creating a shape switches back to selection', async ({ page }) => {
    const buttons = page.getByRole('region', { name: 'Инструменты и фигуры' }).locator('[data-tool]')
    await expect(buttons.nth(0)).toHaveAccessibleName('Выделение')
    await expect(buttons.nth(1)).toHaveAccessibleName('Линейка')
    await expect(buttons.nth(1).locator('svg[data-icon="ruler"]')).toBeVisible()
    await tool(page, 'Прямоугольник').click()
    await drag(page, { x: 100, y: 100 }, { x: 200, y: 200 })
    await expect(tool(page, 'Выделение')).toHaveAttribute('aria-pressed', 'true')
    await expect(shapes(page)).toHaveAttribute('data-selected', 'true')
    // Сразу после создания фигуру можно перетащить.
    await drag(page, { x: 150, y: 150 }, { x: 200, y: 150 })
    expect((await drawings(page))[0].points).toEqual([{ x: 150, y: 100 }, { x: 250, y: 200 }])
    // Линейка остаётся активной для серии замеров.
    await tool(page, 'Линейка').click()
    await drag(page, { x: 100, y: 300 }, { x: 250, y: 300 })
    await expect(tool(page, 'Линейка')).toHaveAttribute('aria-pressed', 'true')
  })

  test('the canvas context menu duplicates, reorders, rotates, pastes and deletes', async ({ page }) => {
    await tool(page, 'Прямоугольник').click()
    await drag(page, { x: 100, y: 100 }, { x: 200, y: 150 })
    await rightClick(page, { x: 150, y: 125 })
    await expect(menu(page)).toBeVisible()
    await expect(menu(page).getByRole('menuitem').first()).toBeFocused()
    await menu(page).getByRole('menuitem', { name: /Дублировать/ }).click()
    await expect(menu(page)).toHaveCount(0)
    await expect(shapes(page)).toHaveCount(2)
    const [original, copy] = await drawings(page)
    expect(copy.id).not.toBe(original.id)
    expect(copy.points).toEqual([{ x: 125, y: 125 }, { x: 225, y: 175 }])

    await rightClick(page, { x: 200, y: 160 })
    await menu(page).getByRole('menuitem', { name: 'На задний план' }).click()
    expect((await drawings(page))[0].id).toBe(copy.id)

    await rightClick(page, { x: 200, y: 160 })
    await menu(page).getByRole('menuitem', { name: 'Повернуть на 90°' }).click()
    expect((await drawings(page)).find((object) => object.id === copy.id)!.rotation).toBe(90)

    await rightClick(page, { x: 200, y: 160 })
    await menu(page).getByRole('menuitem', { name: /Копировать/ }).click()
    await rightClick(page, { x: 500, y: 400 })
    await menu(page).getByRole('menuitem', { name: /Вставить сюда/ }).click()
    await expect(shapes(page)).toHaveCount(3)

    await rightClick(page, { x: 500, y: 400 })
    await page.keyboard.press('Escape')
    await expect(menu(page)).toHaveCount(0)
    await rightClick(page, { x: 500, y: 400 })
    await menu(page).getByRole('menuitem', { name: /Удалить/ }).click()
    await expect(shapes(page)).toHaveCount(2)
    await page.keyboard.press('Control+z')
    await expect(shapes(page)).toHaveCount(3)
  })

  test('Ctrl+C / Ctrl+V and Ctrl+D copy shapes with new ids', async ({ page }) => {
    await tool(page, 'Эллипс').click()
    await drag(page, { x: 100, y: 100 }, { x: 200, y: 200 })
    await canvas(page).focus()
    await page.keyboard.press('Control+c')
    await page.keyboard.press('Control+v')
    await expect(shapes(page)).toHaveCount(2)
    await page.keyboard.press('Control+d')
    await expect(shapes(page)).toHaveCount(3)
    expect(new Set((await drawings(page)).map((object) => object.id)).size).toBe(3)
  })

  test('stairs are drawn with steps and keep no vertex editing', async ({ page }) => {
    await tool(page, 'Лестница').click()
    await drag(page, { x: 100, y: 100 }, { x: 150, y: 250 })
    await expect(shapes(page).locator('[data-stairs] line')).not.toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Объект: Лестница' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Редактировать вершины' })).toHaveCount(0)
    await expect(page.getByLabel('Лестница ведёт на этаж')).toBeVisible()
    expect((await drawings(page))[0]).toMatchObject({ type: 'rectangle', shapeKind: 'stairs' })
  })
})

test('the route goes around a wall and reports its length', async ({ page }) => {
  await seed(page, { drawings: [
    marker('a', 'Вход', { x: 0, y: 100 }), marker('b', 'Касса', { x: 300, y: 100 }),
    wall('wall', { x: 150, y: 0 }, { x: 150, y: 200 }),
  ] })
  await page.goto('/projects/features/editor')
  const panel = page.getByRole('region', { name: 'Маршрут' })
  await panel.getByLabel('Маршрут: откуда').selectOption({ label: 'Вход' })
  await panel.getByLabel('Маршрут: куда').selectOption({ label: 'Касса' })
  const result = panel.getByRole('status', { name: 'Результат маршрута' })
  await expect(result).toContainText('м')
  const metres = Number((await result.textContent())!.match(/([\d.]+) м/)![1])
  // Прямо было бы 6 м; обход конца стены (150, 200) — не меньше 2 · √(3² + 2²) ≈ 7,2 м.
  expect(metres).toBeGreaterThan(7.2)
  expect(metres).toBeLessThan(8)
  await expect(canvas(page).locator('[data-route-overlay] polyline')).toHaveCount(2)
  await panel.getByRole('button', { name: 'Сбросить' }).click()
  await expect(canvas(page).locator('[data-route-overlay]')).toHaveCount(0)
})

test('the route crosses floors through linked stairs; the context menu sets endpoints', async ({ page }) => {
  await seed(page, { activeFloorId: 'default', floors: [
    { id: 'default', number: 1, name: '1', drawings: [marker('start', 'Вход', { x: 0, y: 0 }), stairs('up', { x: 200, y: 0 }, { x: 250, y: 100 }, 'second')] },
    { id: 'second', number: 2, name: '2', drawings: [stairs('down', { x: 200, y: 0 }, { x: 250, y: 100 }, 'default'), marker('office', 'Офис', { x: 400, y: 50 })] },
  ] })
  await page.goto('/projects/features/editor')
  const panel = page.getByRole('region', { name: 'Маршрут' })
  await rightClick(page, { x: 0, y: 0 })
  await menu(page).getByRole('menuitem', { name: 'Маршрут отсюда' }).click()
  await panel.getByLabel('Маршрут: куда').selectOption({ label: 'Офис · этаж 2' })
  const result = panel.getByRole('status', { name: 'Результат маршрута' })
  await expect(result).toContainText('Этаж 1')
  await expect(result).toContainText('лестница')
  await expect(canvas(page).locator('[data-route-leg="0"]')).toHaveCount(1)
  await result.getByRole('button', { name: 'Показать' }).click()
  await expect(page).toHaveURL(/floor=second/)
  await expect(canvas(page).locator('[data-route-leg="1"]')).toHaveCount(1)
  // Двойной клик по лестнице открывает связанный этаж.
  const point = await screenPoint(page, { x: 225, y: 50 })
  await page.mouse.click(point.x, point.y)
  await page.mouse.dblclick(point.x, point.y)
  await expect(page).toHaveURL(/floor=default/)
})

test('unlinked floors explain that stairs are needed', async ({ page }) => {
  await seed(page, { floors: [
    { id: 'default', number: 1, name: '1', drawings: [marker('start', 'Вход', { x: 0, y: 0 })] },
    { id: 'second', number: 2, name: '2', drawings: [marker('office', 'Офис', { x: 400, y: 50 })] },
  ] })
  await page.goto('/projects/features/editor')
  const panel = page.getByRole('region', { name: 'Маршрут' })
  await panel.getByLabel('Маршрут: откуда').selectOption({ label: 'Вход · этаж 1' })
  await panel.getByLabel('Маршрут: куда').selectOption({ label: 'Офис · этаж 2' })
  await expect(panel.getByRole('alert')).toContainText('лестниц')
})

test.describe('interactive tutorial', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('starts on the first visit, advances only after real actions and can be repeated', async ({ page }) => {
    await seed(page, {})
    await page.goto('/projects/features/editor')
    const card = page.getByRole('dialog', { name: /Добро пожаловать/ })
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Начать' }).click()
    await expect(page.getByRole('dialog', { name: 'Выбери инструмент' })).toBeVisible()
    await expect(page.locator('[data-tutorial-highlight]')).toBeVisible()
    await tool(page, 'Прямоугольник').click()
    await expect(page.getByRole('dialog', { name: 'Нарисуй комнату' })).toBeVisible()
    await drag(page, { x: 100, y: 200 }, { x: 250, y: 300 })
    await expect(page.getByRole('dialog', { name: 'Перетащи комнату' })).toBeVisible()
    await drag(page, { x: 150, y: 250 }, { x: 200, y: 250 })
    await expect(page.getByRole('dialog', { name: 'Подпиши помещение' })).toBeVisible()
    await page.getByLabel('Название', { exact: true }).fill('Кухня')
    await expect(page.getByRole('dialog', { name: 'Поверни комнату' })).toBeVisible()
    await page.getByRole('dialog', { name: 'Поверни комнату' }).getByRole('button', { name: 'Пропустить шаг' }).click()
    await expect(page.getByRole('dialog', { name: 'Открой меню действий' })).toBeVisible()
    await page.getByRole('button', { name: 'Закрыть обучение' }).click()
    await expect(page.getByRole('dialog', { name: /Открой меню/ })).toHaveCount(0)
    await page.reload()
    await expect(canvas(page)).toBeVisible()
    await expect(page.getByRole('dialog', { name: /Добро пожаловать/ })).toHaveCount(0)
    await page.getByRole('button', { name: '? Обучение' }).click()
    await expect(page.getByRole('dialog', { name: /Добро пожаловать/ })).toBeVisible()
  })
})

test('the viewer shows a route for regular users', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'viewer', name: 'Мария', email: 'user@example.com', role: 'user' }))
    localStorage.setItem('space-map-projects', JSON.stringify([{ id: 'features', name: 'Новые функции', description: '', createdAt: '2026-10-25', drawings: [
      { id: 'a', type: 'marker', markerKind: 'info', label: 'Вход', points: [{ x: 0, y: 0 }, { x: 0, y: 0 }] },
      { id: 'b', type: 'marker', markerKind: 'info', label: 'Касса', points: [{ x: 300, y: 0 }, { x: 300, y: 0 }] },
    ] }]))
  })
  await page.goto('/objects/features?mode=2d')
  const panel = page.getByRole('region', { name: 'Маршрут' })
  await panel.getByLabel('Маршрут: откуда').selectOption({ label: 'Вход' })
  await panel.getByLabel('Маршрут: куда').selectOption({ label: 'Касса' })
  await expect(panel.getByRole('status', { name: 'Результат маршрута' })).toContainText('6.0 м')
  await expect(page.getByRole('img', { name: 'План: Новые функции' }).locator('[data-route-overlay]')).toHaveCount(1)
})
