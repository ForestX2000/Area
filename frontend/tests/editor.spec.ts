import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { DrawingObject, Point } from '../src/types/drawing'

const canvas = (page: Page) => page.getByRole('application', { name: 'Холст чертежа' })
const shapes = (page: Page) => canvas(page).locator('[data-object-id]')

async function screenPoint(page: Page, point: Point) {
  return canvas(page).locator('[data-canvas-content]').evaluate((node, position) => {
    const result = new DOMPoint(position.x, position.y).matrixTransform((node as SVGGraphicsElement).getScreenCTM()!)
    return { x: result.x, y: result.y }
  }, point)
}

async function drag(page: Page, start: Point, end: Point) {
  await canvas(page).scrollIntoViewIfNeeded()
  const a = await screenPoint(page, start)
  const b = await screenPoint(page, end)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 4 })
  await page.mouse.up()
}

async function drawings(page: Page): Promise<DrawingObject[]> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('space-map-projects')!)[0].drawings ?? [])
}

async function scale(page: Page) {
  return canvas(page).locator('[data-canvas-content]').evaluate((node) =>
    (node as SVGGraphicsElement).transform.baseVal.consolidate()!.matrix.a)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'test', name: 'Тест', email: 'test@example.com', role: 'admin' }))
    if (!localStorage.getItem('space-map-projects')) localStorage.setItem('space-map-projects', JSON.stringify([
      { id: 'editor-test', name: 'Проверка чертежа', description: '', createdAt: '2026-10-24' },
    ]))
  })
  await page.goto('/projects/editor-test/editor')
  await expect(canvas(page)).toBeVisible()
})

test('rectangle is visible, has grid-aligned dimensions and survives reload', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
  await drag(page, { x: 102, y: 103 }, { x: 248, y: 202 })
  await expect(shapes(page)).toHaveCount(1)
  await expect(shapes(page).locator('rect')).toHaveAttribute('width', '150')
  await expect(shapes(page).locator('rect')).toHaveAttribute('height', '100')
  await expect(page.getByLabel('Ширина', { exact: true })).toHaveValue('3')
  await page.reload()
  await expect(shapes(page)).toHaveCount(1)
  await expect(shapes(page).locator('rect')).toHaveAttribute('width', '150')
  expect(errors).toEqual([])
})

test('rectangle preview works in all four directions and square creation is removed', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Квадрат', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
  const ends = [{ x: 400, y: 350 }, { x: 200, y: 350 }, { x: 200, y: 250 }, { x: 400, y: 250 }]
  for (const end of ends) {
    await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
    const a = await screenPoint(page, { x: 300, y: 300 })
    const b = await screenPoint(page, end)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    await page.mouse.move(b.x, b.y)
    const preview = canvas(page).locator('[data-preview] rect')
    await expect(preview).toHaveAttribute('width', '100')
    await expect(preview).toHaveAttribute('height', '50')
    await page.mouse.up()
  }
  await expect(shapes(page)).toHaveCount(4)
  for (const object of await drawings(page)) {
    expect(object.isSquare).toBeUndefined()
    expect(Math.abs(object.points[1].x - object.points[0].x)).toBe(100)
    expect(Math.abs(object.points[1].y - object.points[0].y)).toBe(50)
  }
})

test('line and dimension tools both create objects; zero-size clicks do not', async ({ page }) => {
  await page.getByRole('button', { name: 'Линия', exact: true }).click()
  await drag(page, { x: 100, y: 100 }, { x: 250, y: 100 })
  await page.getByRole('button', { name: 'Линейка', exact: true }).click()
  await drag(page, { x: 100, y: 200 }, { x: 250, y: 200 })
  await expect(canvas(page).locator('[data-object-type="dimension"] text')).toHaveText('3.00 м')
  for (const tool of ['Линия', 'Прямоугольник', 'Линейка']) {
    await page.getByRole('button', { name: tool, exact: true }).click()
    const point = await screenPoint(page, { x: 400, y: 300 })
    await page.mouse.click(point.x, point.y)
  }
  await expect(shapes(page)).toHaveCount(2)
})

test('ruler is renamed and right click removes only the current ruler with undo and redo', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Размер', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
  await drag(page, { x: 50, y: 50 }, { x: 150, y: 125 })
  await page.getByRole('button', { name: 'Линейка', exact: true }).click()
  await drag(page, { x: 100, y: 200 }, { x: 250, y: 200 })
  await page.getByRole('button', { name: 'Линейка', exact: true }).click()
  await drag(page, { x: 100, y: 300 }, { x: 300, y: 300 })
  const before = await drawings(page)
  const empty = await screenPoint(page, { x: 450, y: 400 })
  await page.mouse.click(empty.x, empty.y, { button: 'right' })
  await expect(shapes(page)).toHaveCount(2)
  expect(await drawings(page)).toEqual(before.slice(0, 2))
  await page.keyboard.press('Control+z')
  await expect(shapes(page)).toHaveCount(3)
  expect(await drawings(page)).toEqual(before)
  await page.keyboard.press('Control+y')
  await expect(shapes(page)).toHaveCount(2)
  await page.reload()
  await expect(shapes(page)).toHaveCount(2)
  expect(await drawings(page)).toEqual(before.slice(0, 2))
})

test('right click cancels a ruler draft without deleting previous measurements or adding history', async ({ page }) => {
  await page.getByRole('button', { name: 'Линейка', exact: true }).click()
  await drag(page, { x: 100, y: 200 }, { x: 250, y: 200 })
  const before = await drawings(page)
  const start = await screenPoint(page, { x: 100, y: 300 })
  const end = await screenPoint(page, { x: 300, y: 300 })
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 4 })
  await expect(canvas(page).locator('[data-preview]')).toHaveCount(1)
  await page.mouse.click(end.x, end.y, { button: 'right' })
  await expect(canvas(page).locator('[data-preview]')).toHaveCount(0)
  await page.mouse.up()
  expect(await drawings(page)).toEqual(before)
  await page.keyboard.press('Control+z')
  await expect(shapes(page)).toHaveCount(0)
  await drag(page, { x: 100, y: 300 }, { x: 300, y: 300 })
  await expect(shapes(page)).toHaveCount(1)
})

test('right click on an existing ruler removes it without removing a selected shape', async ({ page }) => {
  await page.getByRole('button', { name: 'Линейка', exact: true }).click()
  await drag(page, { x: 100, y: 200 }, { x: 250, y: 200 })
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
  await drag(page, { x: 100, y: 300 }, { x: 250, y: 400 })
  const rectangle = (await drawings(page))[1]
  await page.getByRole('button', { name: 'Выделение', exact: true }).click()
  const center = await screenPoint(page, { x: 175, y: 350 })
  await page.mouse.click(center.x, center.y)
  await page.mouse.click(center.x, center.y, { button: 'right' })
  await expect(shapes(page)).toHaveCount(2)
  const ruler = await screenPoint(page, { x: 175, y: 200 })
  await page.mouse.click(ruler.x, ruler.y, { button: 'right' })
  await expect(shapes(page)).toHaveCount(1)
  expect(await drawings(page)).toEqual([rectangle])
  await expect(shapes(page)).toHaveAttribute('data-selected', 'true')
})

test('pointer capture finishes drawings when released outside the canvas', async ({ page }) => {
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
  const start = await screenPoint(page, { x: 300, y: 100 })
  const bounds = (await canvas(page).boundingBox())!
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width + 50, start.y + 100)
  await page.mouse.up()
  await expect(shapes(page)).toHaveCount(1)
  await expect(canvas(page).locator('[data-preview]')).toHaveCount(0)
  await drag(page, { x: 100, y: 300 }, { x: 200, y: 400 })
  await expect(shapes(page)).toHaveCount(2)
})

test('Ctrl + wheel zooms grid and objects around the cursor without resizing the page', async ({ page }) => {
  const warnings: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') warnings.push(message.text()) })
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
  await drag(page, { x: 100, y: 100 }, { x: 200, y: 200 })
  const beforePage = await page.locator('header').boundingBox()
  const beforeShape = (await shapes(page).locator('rect').boundingBox())!
  const anchor = await screenPoint(page, { x: 200, y: 200 })
  await page.mouse.move(anchor.x, anchor.y)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -200)
  await page.keyboard.up('Control')
  await expect.poll(() => scale(page)).toBeGreaterThan(1)
  const zoom = await scale(page)
  const afterShape = (await shapes(page).locator('rect').boundingBox())!
  // The visible bounds include the constant 2 px stroke on both zoom levels.
  expect((afterShape.width - 2) / (beforeShape.width - 2)).toBeCloseTo(zoom, 4)
  const afterAnchor = await screenPoint(page, { x: 200, y: 200 })
  expect(afterAnchor.x).toBeCloseTo(anchor.x, 3)
  expect(afterAnchor.y).toBeCloseTo(anchor.y, 3)
  expect(Number(await canvas(page).locator('pattern').first().getAttribute('width')) / 25).toBeCloseTo(zoom, 4)
  expect(await page.locator('header').boundingBox()).toEqual(beforePage)
  expect(await page.evaluate(() => window.visualViewport!.scale)).toBe(1)
  expect(warnings).toEqual([])
  // Drawing coordinates still follow the displayed grid after zooming.
  await drag(page, { x: 250, y: 250 }, { x: 350, y: 300 })
  expect((await drawings(page))[1].points).toEqual([{ x: 250, y: 250 }, { x: 350, y: 300 }])
})

test('wheel pans only this canvas, Ctrl zooms and respects zoom limits', async ({ page }) => {
  const dispatchWheel = (ctrlKey: boolean, deltaY: number) => canvas(page).evaluate((node, args) => {
    const event = new WheelEvent('wheel', { ...args, bubbles: true, cancelable: true, clientX: 500, clientY: 300 })
    node.dispatchEvent(event)
    return event.defaultPrevented
  }, { ctrlKey, deltaY })
  expect(await dispatchWheel(false, -200)).toBe(true)
  expect(await scale(page)).toBe(1)
  const outsidePrevented = await page.getByLabel('Размер ячейки').evaluate((node) => {
    const event = new WheelEvent('wheel', { ctrlKey: true, deltaY: -200, bubbles: true, cancelable: true })
    node.dispatchEvent(event)
    return event.defaultPrevented
  })
  expect(outsidePrevented).toBe(false)
  expect(await scale(page)).toBe(1)
  expect(await dispatchWheel(true, -10000)).toBe(true)
  await expect.poll(() => scale(page)).toBe(4)
  await dispatchWheel(true, 10000)
  await expect.poll(() => scale(page)).toBe(0.25)
})

test('editing geometry and labels persists; selection shows current properties', async ({ page }) => {
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
  await drag(page, { x: 100, y: 100 }, { x: 200, y: 200 })
  await page.getByLabel('Название', { exact: true }).fill('Комната')
  await page.getByLabel('Ширина', { exact: true }).fill('4')
  await page.getByLabel('Высота', { exact: true }).fill('3')
  await expect(shapes(page).locator('rect')).toHaveAttribute('width', '200')
  await expect(shapes(page).locator('rect')).toHaveAttribute('height', '150')
  await page.reload()
  const point = await screenPoint(page, { x: 150, y: 150 })
  await page.mouse.click(point.x, point.y)
  await expect(page.getByLabel('Название', { exact: true })).toHaveValue('Комната')
  await expect(page.getByLabel('Ширина', { exact: true })).toHaveValue('4')
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
  await drag(page, { x: 400, y: 300 }, { x: 500, y: 350 })
  await expect(page.getByLabel('Название', { exact: true })).toHaveValue('')
  await page.getByLabel('Высота', { exact: true }).fill('3')
  await expect(page.getByLabel('Ширина', { exact: true })).toHaveValue('2')
  await expect(shapes(page).last().locator('rect')).toHaveAttribute('width', '100')
  await expect(shapes(page).last().locator('rect')).toHaveAttribute('height', '150')
})

test('moving a descending line preserves its direction, and deleting does not reuse IDs', async ({ page }) => {
  await page.getByRole('button', { name: 'Линия', exact: true }).click()
  await drag(page, { x: 400, y: 100 }, { x: 300, y: 200 })
  const originalId = (await drawings(page))[0].id
  await page.getByRole('button', { name: 'Выделение', exact: true }).click()
  await drag(page, { x: 350, y: 150 }, { x: 400, y: 200 })
  expect((await drawings(page))[0].points).toEqual([{ x: 450, y: 150 }, { x: 350, y: 250 }])
  await page.getByRole('button', { name: 'Удалить объект' }).click()
  await expect(shapes(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Линия', exact: true }).click()
  await drag(page, { x: 100, y: 100 }, { x: 200, y: 200 })
  expect((await drawings(page))[0].id).not.toBe(originalId)
  await page.reload()
  await expect(shapes(page)).toHaveCount(1)
})

test('Shift snaps to other objects; disabling grid snap allows free coordinates', async ({ page }) => {
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
  await drag(page, { x: 100, y: 100 }, { x: 200, y: 200 })
  await page.getByLabel('Прилипание к сетке').uncheck()
  await page.getByRole('button', { name: 'Линия', exact: true }).click()
  await page.keyboard.down('Shift')
  await drag(page, { x: 203, y: 204 }, { x: 313, y: 277 })
  await page.keyboard.up('Shift')
  const line = (await drawings(page))[1]
  expect(line.points[0]).toEqual({ x: 200, y: 200 })
  expect(line.points[1].x).toBeCloseTo(313)
  expect(line.points[1].y).toBeCloseTo(277)
})

test('tools and canvas remain usable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
  await canvas(page).scrollIntoViewIfNeeded()
  const bounds = (await canvas(page).boundingBox())!
  expect(bounds.height).toBeGreaterThanOrEqual(384)
  expect(bounds.width).toBeGreaterThan(300)
  await drag(page, { x: 50, y: 50 }, { x: 200, y: 200 })
  await expect(shapes(page)).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
