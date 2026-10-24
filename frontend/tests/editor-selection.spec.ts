import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { DrawingObject, Point } from '../src/types/drawing'

const canvas = (page: Page) => page.getByRole('application', { name: 'Холст чертежа' })
const selected = (page: Page) => canvas(page).locator('[data-object-id][data-selected]')
const frame = (page: Page) => canvas(page).locator('[data-selection-box]')

async function pointOnScreen(page: Page, point: Point) {
  return canvas(page).locator('[data-canvas-content]').evaluate((node, point) => {
    const result = new DOMPoint(point.x, point.y).matrixTransform((node as SVGGraphicsElement).getScreenCTM()!)
    return { x: result.x, y: result.y }
  }, point)
}

async function startFrame(page: Page, start: Point, end: Point) {
  const a = await pointOnScreen(page, start)
  const b = await pointOnScreen(page, end)
  await page.mouse.click(a.x, a.y)
  await page.mouse.down({ clickCount: 2 })
  await page.mouse.move(b.x, b.y, { steps: 5 })
}

async function selectRooms(page: Page) {
  await startFrame(page, { x: 75, y: 75 }, { x: 375, y: 250 })
  await page.mouse.up()
  await expect(selected(page)).toHaveCount(2)
}

async function stored(page: Page): Promise<DrawingObject[]> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('space-map-projects')!)[0].drawings)
}

async function selectedIds(page: Page) {
  return selected(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-object-id')).sort())
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'test', name: 'Тест', email: 'test@example.com', role: 'admin' }))
    localStorage.setItem('space-map-projects', JSON.stringify([
      { id: 'selection', name: 'Выделение', description: '', createdAt: '2026-10-24', drawings: [
        { id: 'room-a', type: 'rectangle', points: [{ x: 100, y: 100 }, { x: 200, y: 200 }] },
        { id: 'room-b', type: 'rectangle', points: [{ x: 250, y: 125 }, { x: 350, y: 225 }] },
        { id: 'outside', type: 'rectangle', points: [{ x: 450, y: 350 }, { x: 550, y: 450 }] },
        { id: 'diagonal', type: 'line', points: [{ x: 450, y: 100 }, { x: 600, y: 250 }] },
        { id: 'crossing', type: 'line', points: [{ x: 50, y: 400 }, { x: 400, y: 400 }] },
        { id: 'dimension', type: 'dimension', points: [{ x: 100, y: 300 }, { x: 350, y: 300 }] },
      ] },
    ]))
  })
  await page.goto('/projects/selection/editor')
  await expect(canvas(page)).toBeVisible()
})

test('double press and hold shows a live frame, selects several objects and leaves drawing history unchanged', async ({ page }, testInfo) => {
  const before = await stored(page)
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
  await startFrame(page, { x: 75, y: 75 }, { x: 375, y: 250 })
  await expect(frame(page)).toHaveAttribute('width', '300')
  await expect(frame(page)).toHaveAttribute('height', '175')
  await expect(selected(page)).toHaveCount(2)
  expect(await selectedIds(page)).toEqual(['room-a', 'room-b'])
  await page.screenshot({ path: testInfo.outputPath('marquee.png') })
  await page.mouse.up()
  await expect(frame(page)).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveText('Выделено объектов: 2')
  await expect(page.getByRole('button', { name: 'Выделение', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Отменить · Ctrl + Z' })).toBeDisabled()
  expect(await stored(page)).toEqual(before)
})

async function clickObject(page: Page, point: Point, shift = false) {
  const position = await pointOnScreen(page, point)
  if (shift) await page.keyboard.down('Shift')
  await page.mouse.click(position.x, position.y)
  if (shift) await page.keyboard.up('Shift')
}

test('Shift + click toggles objects, preserves selection on empty space and adds no history', async ({ page }) => {
  const before = await stored(page)
  await clickObject(page, { x: 150, y: 150 })
  await clickObject(page, { x: 300, y: 175 }, true)
  expect(await selectedIds(page)).toEqual(['room-a', 'room-b'])
  await expect(canvas(page).locator('[data-rotation-handle]')).toHaveAttribute('aria-label', 'Повернуть выделенные объекты')
  await clickObject(page, { x: 150, y: 150 }, true)
  expect(await selectedIds(page)).toEqual(['room-b'])
  await clickObject(page, { x: 150, y: 150 }, true)
  expect(await selectedIds(page)).toEqual(['room-a', 'room-b'])
  await expect(frame(page)).toHaveCount(0)
  await clickObject(page, { x: 400, y: 275 }, true)
  expect(await selectedIds(page)).toEqual(['room-a', 'room-b'])
  expect(await stored(page)).toEqual(before)
  await expect(page.getByRole('button', { name: 'Отменить · Ctrl + Z', exact: true })).toBeDisabled()
  await clickObject(page, { x: 500, y: 400 })
  expect(await selectedIds(page)).toEqual(['outside'])
  await clickObject(page, { x: 400, y: 275 })
  expect(await selectedIds(page)).toEqual([])
})

test('a group selected by Shift + click moves and rotates as one undoable action', async ({ page }) => {
  await clickObject(page, { x: 150, y: 150 }, true)
  await clickObject(page, { x: 300, y: 175 }, true)
  const before = await stored(page)
  const a = await pointOnScreen(page, { x: 150, y: 150 })
  const b = await pointOnScreen(page, { x: 200, y: 200 })
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 5 })
  await page.mouse.up()
  const moved = await stored(page)
  for (let index = 0; index < 2; index++) {
    expect(moved[index].points).toEqual(before[index].points.map((point) => ({ x: point.x + 50, y: point.y + 50 })))
  }
  expect(moved.slice(2)).toEqual(before.slice(2))
  await page.keyboard.press('Control+z')
  expect(await stored(page)).toEqual(before)
  await clickObject(page, { x: 150, y: 150 }, true)
  await clickObject(page, { x: 300, y: 175 }, true)
  await canvas(page).locator('[data-rotation-handle]').focus()
  await page.keyboard.press('Shift+ArrowRight')
  const rotated = await stored(page)
  expect(rotated[0].rotation).toBeCloseTo(15)
  expect(rotated[1].rotation).toBeCloseTo(15)
  expect(rotated.slice(2)).toEqual(before.slice(2))
  await page.keyboard.press('Control+z')
  expect(await stored(page)).toEqual(before)
  await page.keyboard.press('Control+y')
  expect(await stored(page)).toEqual(rotated)
})

test('Shift + click works after panning and zooming and selects thin lines and rulers', async ({ page }) => {
  const initial = await pointOnScreen(page, { x: 400, y: 350 })
  await page.mouse.move(initial.x, initial.y)
  await page.mouse.wheel(-25, -25)
  await page.getByLabel('Масштаб холста в процентах').fill('150')
  await page.getByLabel('Масштаб холста в процентах').press('Enter')
  const before = await stored(page)
  await clickObject(page, { x: 150, y: 150 }, true)
  await clickObject(page, { x: 300, y: 175 }, true)
  await clickObject(page, { x: 200, y: 300 }, true)
  await clickObject(page, { x: 200, y: 400 }, true)
  expect(await selectedIds(page)).toEqual(['crossing', 'dimension', 'room-a', 'room-b'])
  expect(await stored(page)).toEqual(before)
})

test('the frame works in the opposite direction after panning and zooming', async ({ page }) => {
  const position = await pointOnScreen(page, { x: 400, y: 350 })
  await page.mouse.move(position.x, position.y)
  await page.mouse.wheel(-25, -25)
  await page.getByRole('spinbutton', { name: 'Масштаб холста в процентах' }).fill('150')
  await page.getByRole('spinbutton', { name: 'Масштаб холста в процентах' }).press('Enter')
  await startFrame(page, { x: 375, y: 250 }, { x: 75, y: 75 })
  await page.mouse.up()
  expect(await selectedIds(page)).toEqual(['room-a', 'room-b'])
})

for (const scenario of [
  { name: 'a line crossing the frame with both endpoints outside', start: { x: 100, y: 375 }, end: { x: 350, y: 425 }, ids: ['crossing'] },
  { name: 'dimension segments', start: { x: 175, y: 275 }, end: { x: 275, y: 325 }, ids: ['dimension'] },
  { name: 'a diagonal bounding box without intersecting the segment', start: { x: 560, y: 100 }, end: { x: 590, y: 140 }, ids: [] },
]) {
  test(`selection handles ${scenario.name}`, async ({ page }) => {
    await startFrame(page, scenario.start, scenario.end)
    await page.mouse.up()
    expect(await selectedIds(page)).toEqual(scenario.ids)
  })
}

test('moving the selection preserves offsets and is undone and redone as one action', async ({ page }) => {
  const before = await stored(page)
  await selectRooms(page)
  const a = await pointOnScreen(page, { x: 150, y: 150 })
  const b = await pointOnScreen(page, { x: 200, y: 200 })
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 5 })
  expect(await stored(page)).toEqual(before)
  await page.mouse.up()
  const after = await stored(page)
  for (const object of after) {
    const original = before.find((previous) => previous.id === object.id)!
    const delta = ['room-a', 'room-b'].includes(object.id) ? 50 : 0
    expect(object.points).toEqual(original.points.map((point) => ({ x: point.x + delta, y: point.y + delta })))
  }
  await page.keyboard.press('Control+z')
  expect(await stored(page)).toEqual(before)
  await page.keyboard.press('Control+y')
  expect(await stored(page)).toEqual(after)
})

test('the selection can be deleted, restored and deleted again as one action', async ({ page }) => {
  const before = await stored(page)
  await selectRooms(page)
  await page.getByRole('button', { name: 'Удалить выбранные', exact: true }).click()
  expect((await stored(page)).map((object) => object.id)).toEqual(['outside', 'diagonal', 'crossing', 'dimension'])
  await page.keyboard.press('Control+z')
  expect(await stored(page)).toEqual(before)
  await page.keyboard.press('Control+y')
  expect(await stored(page)).toHaveLength(4)
})

for (const group of [false, true]) {
  test(`Delete removes ${group ? 'a selected group' : 'a selected object'} as one undoable action`, async ({ page }) => {
    const before = await stored(page)
    // Without selection, Delete must not create a history entry.
    await canvas(page).focus()
    await page.keyboard.press('Delete')
    expect(await stored(page)).toEqual(before)
    await expect(page.getByRole('button', { name: 'Отменить · Ctrl + Z' })).toBeDisabled()

    if (group) await selectRooms(page)
    else {
      const room = await pointOnScreen(page, { x: 150, y: 150 })
      await page.mouse.click(room.x, room.y)
    }
    await page.keyboard.press('Delete')
    const after = before.filter((object) => !(group ? ['room-a', 'room-b'] : ['room-a']).includes(object.id))
    expect(await stored(page)).toEqual(after)
    await expect(canvas(page).locator('[data-object-id]')).toHaveCount(after.length)
    await expect(selected(page)).toHaveCount(0)
    await page.keyboard.press('Control+z')
    expect(await stored(page)).toEqual(before)
    await expect(page.getByRole('button', { name: 'Отменить · Ctrl + Z' })).toBeDisabled()
    await page.keyboard.press('Control+y')
    expect(await stored(page)).toEqual(after)
  })
}

test('Delete edits text and leaves the selected object intact while a field has focus', async ({ page }) => {
  const room = await pointOnScreen(page, { x: 150, y: 150 })
  await page.mouse.click(room.x, room.y)
  const label = page.getByLabel('Название', { exact: true })
  await label.fill('Комната')
  await label.press('Home')
  await label.press('Delete')
  await expect(label).toHaveValue('омната')
  await expect(selected(page)).toHaveCount(1)
  expect(await stored(page)).toHaveLength(6)

  const width = page.getByLabel('Ширина', { exact: true })
  await width.focus()
  await width.press('Delete')
  await expect(selected(page)).toHaveCount(1)
  expect(await stored(page)).toHaveLength(6)
})

test('Escape restores the previous selection and pointer cancellation removes the frame', async ({ page }) => {
  const room = await pointOnScreen(page, { x: 150, y: 150 })
  await page.mouse.click(room.x, room.y)
  await expect(selected(page)).toHaveCount(1)
  await startFrame(page, { x: 75, y: 75 }, { x: 375, y: 250 })
  await expect(selected(page)).toHaveCount(2)
  await page.keyboard.press('Escape')
  await page.mouse.up()
  expect(await selectedIds(page)).toEqual(['room-a'])
  await expect(frame(page)).toHaveCount(0)
  await startFrame(page, { x: 75, y: 75 }, { x: 375, y: 250 })
  await canvas(page).dispatchEvent('pointercancel', { pointerId: 1 })
  await page.mouse.up()
  await expect(frame(page)).toHaveCount(0)
  expect(await selectedIds(page)).toEqual(['room-a'])
})

test('releasing outside the canvas completes selection; a plain double click selects one object', async ({ page }) => {
  const a = await pointOnScreen(page, { x: 75, y: 75 })
  const bounds = (await canvas(page).boundingBox())!
  const end = await pointOnScreen(page, { x: 0, y: 300 })
  await page.mouse.click(a.x, a.y)
  await page.mouse.down({ clickCount: 2 })
  await page.mouse.move(bounds.x + bounds.width + 25, end.y, { steps: 5 })
  await page.mouse.up()
  expect(await selectedIds(page)).toEqual(['diagonal', 'dimension', 'room-a', 'room-b'])
  await expect(frame(page)).toHaveCount(0)
  const room = await pointOnScreen(page, { x: 150, y: 150 })
  await page.mouse.dblclick(room.x, room.y)
  expect(await selectedIds(page)).toEqual(['room-a'])
  await expect(page.getByLabel('Ширина', { exact: true })).toHaveValue('2')
})
