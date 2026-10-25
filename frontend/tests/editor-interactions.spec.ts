import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { DrawingObject, Point } from '../src/types/drawing'

const canvas = (page: Page) => page.getByRole('application', { name: 'Холст чертежа' })
const shapes = (page: Page) => canvas(page).locator('[data-object-id]')
const zoomInput = (page: Page) => page.getByRole('spinbutton', { name: 'Масштаб холста в процентах' })

async function view(page: Page) {
  return canvas(page).locator('[data-canvas-content]').evaluate((node) => {
    const { a, e, f } = (node as SVGGraphicsElement).transform.baseVal.consolidate()!.matrix
    return { zoom: a, x: e, y: f }
  })
}

async function pointOnScreen(page: Page, point: Point) {
  return canvas(page).locator('[data-canvas-content]').evaluate((node, point) => {
    const transformed = new DOMPoint(point.x, point.y).matrixTransform((node as SVGGraphicsElement).getScreenCTM()!)
    return { x: transformed.x, y: transformed.y }
  }, point)
}

async function drag(page: Page, start: Point, end: Point, button: 'left' | 'middle' = 'left') {
  const a = await pointOnScreen(page, start)
  const b = await pointOnScreen(page, end)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down({ button })
  await page.mouse.move(b.x, b.y, { steps: 5 })
  await page.mouse.up({ button })
}

async function stored(page: Page): Promise<DrawingObject[]> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('space-map-projects')!)[0].drawings ?? [])
}

async function rectangle(page: Page) {
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
  await drag(page, { x: 100, y: 100 }, { x: 300, y: 250 })
  await expect(shapes(page)).toHaveCount(1)
}

async function undo(page: Page) {
  await canvas(page).focus()
  await page.keyboard.press('Control+z')
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'test', name: 'Тест', email: 'test@example.com', role: 'admin' }))
    if (!localStorage.getItem('space-map-projects')) localStorage.setItem('space-map-projects', JSON.stringify([
      { id: 'interactions', name: 'Взаимодействия', description: '', createdAt: '2026-10-24' },
    ]))
  })
  await page.goto('/projects/interactions/editor')
  await expect(canvas(page)).toBeVisible()
})

test('middle-button dragging pans the grid and objects without creating or editing drawings', async ({ page }) => {
  await rectangle(page)
  const before = await stored(page)
  const pageScroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }))
  await drag(page, { x: 400, y: 350 }, { x: 475, y: 400 }, 'middle')
  expect(await view(page)).toEqual({ zoom: 1, x: 75, y: 50 })
  expect(await stored(page)).toEqual(before)
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(pageScroll)
  await expect(canvas(page)).not.toHaveClass(/cursor-grabbing/)
  // Moving the view is not a drawing edit: undo removes the created rectangle.
  await undo(page)
  await expect(shapes(page)).toHaveCount(0)
})

test('two-finger scroll pans in both axes and Ctrl zoom stays anchored after panning', async ({ page }) => {
  await rectangle(page)
  const before = await stored(page)
  const position = await pointOnScreen(page, { x: 200, y: 200 })
  await page.mouse.move(position.x, position.y)
  await page.mouse.wheel(45, 60)
  await expect.poll(() => view(page)).toEqual({ zoom: 1, x: -45, y: -60 })
  await expect(canvas(page).locator('pattern').first()).toHaveAttribute('x', '-45')
  await expect(canvas(page).locator('pattern').first()).toHaveAttribute('y', '-60')
  const anchor = await pointOnScreen(page, { x: 200, y: 200 })
  await page.mouse.move(anchor.x, anchor.y)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -150)
  await expect.poll(async () => (await view(page)).zoom).toBeGreaterThan(1)
  await page.keyboard.up('Control')
  const after = await pointOnScreen(page, { x: 200, y: 200 })
  expect(after.x).toBeCloseTo(anchor.x, 3)
  expect(after.y).toBeCloseTo(anchor.y, 3)
  expect(await stored(page)).toEqual(before)
})

for (const [index, end, opposite] of [
  [0, { x: 50, y: 50 }, { x: 300, y: 250 }],
  [1, { x: 350, y: 50 }, { x: 100, y: 250 }],
  [2, { x: 350, y: 300 }, { x: 100, y: 100 }],
  [3, { x: 50, y: 300 }, { x: 300, y: 100 }],
] as const) {
  test(`rectangle corner ${index} stretches while keeping the opposite corner fixed`, async ({ page }) => {
    await rectangle(page)
    const handle = canvas(page).locator(`[data-resize-handle="${index}"]`)
    const bounds = (await handle.boundingBox())!
    const finish = await pointOnScreen(page, end)
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(finish.x, finish.y, { steps: 5 })
    // Storage and history change once, when the gesture is complete.
    expect((await stored(page))[0].points).toEqual([{ x: 100, y: 100 }, { x: 300, y: 250 }])
    await page.mouse.up()
    const object = (await stored(page))[0]
    expect(object.points).toEqual([opposite, end])
    expect(object.width).toBe(Math.abs(end.x - opposite.x))
    expect(object.height).toBe(Math.abs(end.y - opposite.y))
    await undo(page)
    expect((await stored(page))[0].points).toEqual([{ x: 100, y: 100 }, { x: 300, y: 250 }])
    await undo(page)
    await expect(shapes(page)).toHaveCount(0)
  })
}

test('resizing after pan and numeric zoom follows grid coordinates, supports crossing the opposite corner and persists', async ({ page }) => {
  await rectangle(page)
  await drag(page, { x: 400, y: 350 }, { x: 425, y: 375 }, 'middle')
  await zoomInput(page).fill('150')
  await zoomInput(page).press('Enter')
  await expect.poll(async () => (await view(page)).zoom).toBe(1.5)
  await drag(page, { x: 300, y: 250 }, { x: 52, y: 53 })
  expect((await stored(page))[0].points).toEqual([{ x: 100, y: 100 }, { x: 50, y: 50 }])
  await page.reload()
  await expect(shapes(page).locator('rect')).toHaveAttribute('width', '50')
  await expect(shapes(page).locator('rect')).toHaveAttribute('height', '50')
})

test('line and dimension endpoints can be stretched and undone', async ({ page }) => {
  for (const tool of ['Линия', 'Линейка']) {
    await page.getByRole('button', { name: tool, exact: true }).click()
    await drag(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await drag(page, { x: 250, y: 200 }, { x: 350, y: 275 })
    expect((await stored(page))[0].points).toEqual([{ x: 100, y: 100 }, { x: 350, y: 275 }])
    await undo(page)
    expect((await stored(page))[0].points).toEqual([{ x: 100, y: 100 }, { x: 250, y: 200 }])
    await undo(page)
    await expect(shapes(page)).toHaveCount(0)
  }
})

test('Ctrl+Z reverses move, property edit, delete and creation in order, preserving the undone result on reload', async ({ page }) => {
  await rectangle(page)
  const original = (await stored(page))[0]
  await page.getByRole('button', { name: 'Выделение', exact: true }).click()
  await drag(page, { x: 200, y: 175 }, { x: 250, y: 225 })
  expect((await stored(page))[0].points).toEqual([{ x: 150, y: 150 }, { x: 350, y: 300 }])
  await page.getByLabel('Ширина', { exact: true }).fill('6')
  await page.getByRole('button', { name: 'Удалить объект' }).click()
  await expect(shapes(page)).toHaveCount(0)
  // The deleted object's controls lose focus; undo must still work immediately.
  await page.keyboard.press('Control+z')
  await expect(shapes(page)).toHaveCount(1)
  expect((await stored(page))[0].width).toBe(300)
  await undo(page)
  expect((await stored(page))[0].width).toBe(200)
  await undo(page)
  expect((await stored(page))[0]).toEqual(original)
  await undo(page)
  await expect(shapes(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Отменить · Ctrl + Z' })).toBeDisabled()
  await undo(page)
  await page.reload()
  await expect(shapes(page)).toHaveCount(0)
})

test('Ctrl+Z in a text field leaves drawing history intact; clicking without moving adds no action', async ({ page }) => {
  await rectangle(page)
  await page.getByRole('button', { name: 'Выделение', exact: true }).click()
  const point = await pointOnScreen(page, { x: 200, y: 175 })
  await page.mouse.click(point.x, point.y)
  await page.getByLabel('Название', { exact: true }).focus()
  await page.keyboard.press('Control+z')
  await expect(shapes(page)).toHaveCount(1)
  await undo(page)
  await expect(shapes(page)).toHaveCount(0)
})

test('Escape and Ctrl+Z cancel the current resize or drawing without undoing a completed action', async ({ page }) => {
  await rectangle(page)
  const start = await pointOnScreen(page, { x: 300, y: 250 })
  const end = await pointOnScreen(page, { x: 400, y: 350 })
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y)
  await page.keyboard.press('Escape')
  await page.mouse.up()
  expect((await stored(page))[0].width).toBe(200)
  // После создания фигуры редактор переключается на «Выделение».
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
  const a = await pointOnScreen(page, { x: 400, y: 400 })
  const b = await pointOnScreen(page, { x: 500, y: 500 })
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y)
  await page.keyboard.press('Control+z')
  await page.mouse.up()
  await expect(shapes(page)).toHaveCount(1)
  await expect(canvas(page).locator('[data-preview]')).toHaveCount(0)
  await undo(page)
  await expect(shapes(page)).toHaveCount(0)
})

test('numeric zoom accepts Enter and blur, clamps limits and rejects empty input; Escape restores the current value', async ({ page }) => {
  await zoomInput(page).fill('175')
  await zoomInput(page).press('Enter')
  expect((await view(page)).zoom).toBe(1.75)
  await zoomInput(page).fill('999')
  await zoomInput(page).press('Tab')
  expect((await view(page)).zoom).toBe(4)
  await expect(zoomInput(page)).toHaveValue('400')
  await zoomInput(page).fill('1')
  await zoomInput(page).press('Enter')
  expect((await view(page)).zoom).toBeCloseTo(0.01, 5)
  await zoomInput(page).fill('')
  await zoomInput(page).press('Tab')
  await expect(zoomInput(page)).toHaveValue('1')
  await zoomInput(page).fill('200')
  await zoomInput(page).press('Escape')
  await zoomInput(page).press('Tab')
  expect((await view(page)).zoom).toBeCloseTo(0.01, 5)
  await expect(zoomInput(page)).toHaveValue('1')
})

test('Ctrl+Y and the redo button restore creation, move, resize, properties and deletion in order', async ({ page }) => {
  const redo = page.getByRole('button', { name: 'Вернуть · Ctrl + Y' })
  await expect(redo).toBeDisabled()
  const states: DrawingObject[][] = []
  await rectangle(page)
  states.push(await stored(page))
  await page.getByRole('button', { name: 'Выделение', exact: true }).click()
  await drag(page, { x: 200, y: 175 }, { x: 250, y: 225 })
  states.push(await stored(page))
  await drag(page, { x: 350, y: 300 }, { x: 400, y: 350 })
  states.push(await stored(page))
  await page.getByLabel('Ширина', { exact: true }).fill('6')
  states.push(await stored(page))
  await page.getByRole('button', { name: 'Удалить объект' }).click()
  states.push(await stored(page))
  for (let index = 0; index < states.length; index++) await undo(page)
  await expect(shapes(page)).toHaveCount(0)
  for (const [index, state] of states.entries()) {
    if (index % 2 === 0) {
      await canvas(page).focus()
      await page.keyboard.press('Control+y')
    } else {
      await redo.click()
    }
    expect(await stored(page)).toEqual(state)
  }
  await expect(redo).toBeDisabled()
  await undo(page)
  await page.reload()
  expect(await stored(page)).toEqual(states[3])
  await expect(shapes(page)).toHaveCount(1)
})

test('a new edit clears redo history while selection and navigation preserve it', async ({ page }) => {
  await rectangle(page)
  await undo(page)
  const redo = page.getByRole('button', { name: 'Вернуть · Ctrl + Y' })
  await expect(redo).toBeEnabled()
  await page.getByRole('button', { name: 'Выделение', exact: true }).click()
  await drag(page, { x: 400, y: 400 }, { x: 425, y: 425 }, 'middle')
  await expect(redo).toBeEnabled()
  await page.getByRole('button', { name: 'Линия', exact: true }).click()
  await drag(page, { x: 100, y: 100 }, { x: 200, y: 200 })
  await expect(redo).toBeDisabled()
  await canvas(page).focus()
  await page.keyboard.press('Control+y')
  expect((await stored(page)).map((object) => object.type)).toEqual(['line'])
})

test('redo does not interrupt text input or an active drawing gesture', async ({ page }) => {
  await rectangle(page)
  await undo(page)
  await zoomInput(page).focus()
  await page.keyboard.press('Control+y')
  await expect(shapes(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
  const a = await pointOnScreen(page, { x: 400, y: 400 })
  const b = await pointOnScreen(page, { x: 500, y: 500 })
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y)
  await page.keyboard.press('Control+y')
  await expect(shapes(page)).toHaveCount(0)
  await expect(canvas(page).locator('[data-preview]')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await page.keyboard.press('Control+y')
  await expect(shapes(page)).toHaveCount(1)
})
