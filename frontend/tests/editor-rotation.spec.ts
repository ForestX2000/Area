import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { DrawingObject, Point } from '../src/types/drawing'
import { addVertex, deleteVertex, drawingPoints, hitObject, intersectsSelection, moveVertex, objectBounds, objectCenter, objectLocalBounds, resizeDrawing } from '../src/components/editor/drawingGeometry'

const canvas = (page: Page) => page.getByRole('application', { name: 'Холст чертежа' })
const handle = (page: Page) => canvas(page).locator('[data-rotation-handle]')
const shape = (page: Page, id = 'room') => canvas(page).locator(`[data-object-id="${id}"]`)

async function stored(page: Page): Promise<DrawingObject[]> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('space-map-projects')!)[0].drawings)
}

async function screen(page: Page, point: Point) {
  return canvas(page).locator('[data-canvas-content]').evaluate((node, point) => {
    const result = new DOMPoint(point.x, point.y).matrixTransform((node as SVGGraphicsElement).getScreenCTM()!)
    return { x: result.x, y: result.y }
  }, point)
}

async function select(page: Page, name = 'Комната', additive = false) {
  await page.getByLabel('Список объектов').getByRole('button', { name, exact: true }).click({ modifiers: additive ? ['Control'] : [] })
}

async function rotate(page: Page, center: Point, degrees: number, options: { hold?: boolean; shift?: boolean } = {}) {
  const start = await handle(page).evaluate((node) => {
    const point = new DOMPoint(0, 0).matrixTransform((node as SVGGraphicsElement).getScreenCTM()!)
    return { x: point.x, y: point.y }
  })
  const pivot = await screen(page, center)
  await page.mouse.move(start.x, start.y)
  if (options.shift) await page.keyboard.down('Shift')
  await page.mouse.down()
  for (let step = 1; step <= 12; step++) {
    const angle = degrees * step / 12 * Math.PI / 180
    const x = start.x - pivot.x, y = start.y - pivot.y
    await page.mouse.move(pivot.x + x * Math.cos(angle) - y * Math.sin(angle), pivot.y + x * Math.sin(angle) + y * Math.cos(angle))
  }
  if (!options.hold) await page.mouse.up()
  if (options.shift) await page.keyboard.up('Shift')
}

function expectPoint(actual: Point, expected: Point) {
  expect(actual.x).toBeCloseTo(expected.x, 7)
  expect(actual.y).toBeCloseTo(expected.y, 7)
}

test.describe('rotation geometry', () => {
  const rectangle: DrawingObject = { id: 'rect', type: 'rectangle', points: [{ x: 100, y: 200 }, { x: 300, y: 300 }], rotation: 37 }

  test('resizing a rotated rectangle fixes the opposite world corner and preserves its type and angle', () => {
    const before = drawingPoints(rectangle)
    const end = { x: before[2].x + 75, y: before[2].y + 50 }
    const resized = resizeDrawing(rectangle, 2, end)
    expect(resized.type).toBe('rectangle')
    expect(resized.rotation).toBe(37)
    expectPoint(drawingPoints(resized)[0], before[0])
    expectPoint(drawingPoints(resized)[2], end)
  })

  test('adding, moving and deleting rotated vertices keeps untouched world vertices fixed', () => {
    const before = drawingPoints(rectangle)
    const middle = { x: (before[0].x + before[1].x) / 2, y: (before[0].y + before[1].y) / 2 }
    const added = addVertex(rectangle, middle)
    const moved = moveVertex(added.object, added.index, { x: middle.x + 40, y: middle.y - 60 })
    const remaining = drawingPoints(moved).filter((_, index) => index !== added.index)
    before.forEach((point, index) => expectPoint(remaining[index], point))
    expectPoint(drawingPoints(moved)[added.index], { x: middle.x + 40, y: middle.y - 60 })
    const deleted = deleteVertex(moved, added.index)
    before.forEach((point, index) => expectPoint(drawingPoints(deleted)[index], point))
  })

  test('rotated rectangles and ellipses are selected by their actual geometry', () => {
    for (const type of ['rectangle', 'ellipse'] as const) {
      const object: DrawingObject = { id: type, type, points: [{ x: -100, y: -25 }, { x: 100, y: 25 }], rotation: 45 }
      expect(hitObject(object, { x: 60, y: 60 }, 0)).toBe(true)
      expect(hitObject(object, { x: 60, y: -60 }, 0)).toBe(false)
      expect(intersectsSelection(object, { x: 68, y: 68 }, { x: 72, y: 72 })).toBe(true)
      expect(intersectsSelection(object, { x: 58, y: -62 }, { x: 62, y: -58 })).toBe(false)
    }
    const ellipse: DrawingObject = { id: 'ellipse', type: 'ellipse', points: [{ x: -100, y: -25 }, { x: 100, y: 25 }], rotation: 90 }
    expect(objectBounds(ellipse).width).toBeCloseTo(50)
    expect(objectBounds(ellipse).height).toBeCloseTo(200)
  })
})

test.describe('rotation in the editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'rotation', name: 'Тест', email: 'test@example.com', role: 'admin' }))
      if (!localStorage.getItem('space-map-projects')) localStorage.setItem('space-map-projects', JSON.stringify([{
        id: 'rotation', name: 'Поворот', createdAt: '2026-10-24', description: '', drawings: [
          { id: 'room', type: 'rectangle', label: 'Комната', points: [{ x: 100, y: 250 }, { x: 300, y: 350 }] },
          { id: 'ellipse', type: 'ellipse', label: 'Эллипс', points: [{ x: 400, y: 250 }, { x: 560, y: 350 }] },
          { id: 'line', type: 'line', label: 'Линия', points: [{ x: 100, y: 500 }, { x: 300, y: 500 }] },
          { id: 'marker', type: 'marker', markerKind: 'info', label: 'Метка', points: [{ x: 550, y: 500 }, { x: 550, y: 500 }] },
        ],
      }]))
    })
    await page.goto('/projects/rotation/editor')
    await expect(canvas(page)).toBeVisible()
  })

  test('single rotation previews without saving and becomes one undoable action that survives reload', async ({ page }, testInfo) => {
    await expect(handle(page)).toHaveCount(0)
    await select(page)
    await expect(handle(page)).toHaveAttribute('aria-label', 'Повернуть объект')
    const before = await stored(page)
    await rotate(page, { x: 200, y: 300 }, 90, { hold: true })
    expect(await stored(page)).toEqual(before)
    expect(Number(await shape(page).getAttribute('data-rotation'))).toBeCloseTo(90)
    await page.screenshot({ path: testInfo.outputPath('rotate-object.png') })
    await page.mouse.up()
    const after = await stored(page)
    expect(after[0].rotation).toBeCloseTo(90)
    expect(after[0].type).toBe('rectangle')
    expect(after[0].points).toEqual(before[0].points)
    await expect(page.getByLabel('Ширина', { exact: true })).toHaveValue('4')
    await expect(page.getByLabel('Высота', { exact: true })).toHaveValue('2')
    await page.keyboard.press('Control+z')
    expect(await stored(page)).toEqual(before)
    await expect(handle(page)).toHaveCount(0)
    await page.keyboard.press('Control+y')
    expect(await stored(page)).toEqual(after)
    await page.reload()
    await expect(shape(page)).toHaveAttribute('data-rotation', String(after[0].rotation))
  })

  test('a group rotates rigidly around its common center, preserving unrelated objects and one-step undo', async ({ page }, testInfo) => {
    await select(page)
    await select(page, 'Эллипс', true)
    await expect(handle(page)).toHaveAttribute('aria-label', 'Повернуть выделенные объекты')
    const before = await stored(page)
    await rotate(page, { x: 330, y: 300 }, 90)
    const after = await stored(page)
    expectPoint(objectCenter(after[0]), { x: 330, y: 170 })
    expectPoint(objectCenter(after[1]), { x: 330, y: 450 })
    expect(after[0].rotation).toBeCloseTo(90)
    expect(after[1].rotation).toBeCloseTo(90)
    expect(after.slice(2)).toEqual(before.slice(2))
    await page.screenshot({ path: testInfo.outputPath('rotate-group.png') })
    await page.keyboard.press('Control+z')
    expect(await stored(page)).toEqual(before)
    await expect(page.getByRole('button', { name: 'Отменить · Ctrl + Z', exact: true })).toBeDisabled()
    await page.keyboard.press('Control+y')
    expect(await stored(page)).toEqual(after)
  })

  test('rotation follows world coordinates after pan and zoom, Shift snaps angles and handle size stays constant', async ({ page }) => {
    await select(page)
    const initial = (await handle(page).boundingBox())!
    await page.getByLabel('Масштаб холста в процентах').fill('150')
    await page.getByLabel('Масштаб холста в процентах').press('Enter')
    const location = await screen(page, { x: 100, y: 100 })
    await page.mouse.move(location.x, location.y)
    await page.mouse.wheel(-40, -30)
    const zoomed = (await handle(page).boundingBox())!
    expect(zoomed.width).toBeCloseTo(initial.width)
    expect(zoomed.height).toBeCloseTo(initial.height)
    await rotate(page, { x: 200, y: 300 }, 37, { shift: true })
    expect((await stored(page))[0].rotation).toBeCloseTo(30)
  })

  for (const key of ['Escape', 'Control+z']) {
    test(`${key} cancels a live rotation without altering geometry or history`, async ({ page }) => {
      await select(page)
      const before = await stored(page)
      await rotate(page, { x: 200, y: 300 }, 65, { hold: true })
      await page.keyboard.press(key)
      await page.mouse.up()
      expect(await stored(page)).toEqual(before)
      await expect(shape(page)).toHaveAttribute('data-rotation', '0')
      await expect(page.getByRole('button', { name: 'Отменить · Ctrl + Z', exact: true })).toBeDisabled()
      await rotate(page, { x: 200, y: 300 }, -30)
      expect((await stored(page))[0].rotation).toBeCloseTo(330)
    })
  }

  test('clicking the handle adds no history and keyboard arrows rotate all shape types', async ({ page }) => {
    await select(page)
    await handle(page).click()
    await expect(page.getByRole('button', { name: 'Отменить · Ctrl + Z', exact: true })).toBeDisabled()
    for (const name of ['Комната', 'Эллипс', 'Линия', 'Метка']) {
      await select(page, name)
      await handle(page).focus()
      await page.keyboard.press('Shift+ArrowRight')
    }
    for (const object of await stored(page)) expect(object.rotation).toBeCloseTo(15)
    await page.keyboard.press('Control+z')
    expect((await stored(page))[3].rotation).toBeUndefined()
  })

  test('rotated corners resize without moving the opposite corner and numeric sizes keep the rotation', async ({ page }) => {
    await select(page)
    await rotate(page, { x: 200, y: 300 }, 90)
    const before = (await stored(page))[0]
    const opposite = drawingPoints(before)[0]
    const corner = await shape(page).locator('[data-resize-handle="2"]').boundingBox()
    const end = await screen(page, { x: 100, y: 450 })
    await page.mouse.move(corner!.x + corner!.width / 2, corner!.y + corner!.height / 2)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 5 })
    await page.mouse.up()
    const resized = (await stored(page))[0]
    expectPoint(drawingPoints(resized)[0], opposite)
    expectPoint(drawingPoints(resized)[2], { x: 100, y: 450 })
    expect(resized.rotation).toBeCloseTo(90)
    await page.getByLabel('Ширина', { exact: true }).fill('6')
    const scaled = (await stored(page))[0]
    expect(objectLocalBounds(scaled).width).toBeCloseTo(300)
    expect(scaled.rotation).toBeCloseTo(90)
  })

  test('rotated shapes remain selectable at their visible locations and vertices can be edited', async ({ page }) => {
    await select(page)
    await rotate(page, { x: 200, y: 300 }, 90)
    const outside = await screen(page, { x: 110, y: 300 })
    await page.mouse.click(outside.x, outside.y)
    await expect(handle(page)).toHaveCount(0)
    const inside = await screen(page, { x: 200, y: 390 })
    await page.mouse.click(inside.x, inside.y)
    await expect(shape(page)).toHaveAttribute('data-selected', 'true')
    await page.getByRole('button', { name: 'Вершины', exact: true }).click()
    await expect(handle(page)).toHaveCount(0)
    const edge = await screen(page, { x: 250, y: 300 })
    await page.mouse.dblclick(edge.x, edge.y)
    await expect(shape(page).locator('[data-vertex-handle]')).toHaveCount(5)
    const added = (await stored(page))[0]
    expect(added.type).toBe('polygon')
    expect(added.rotation).toBeCloseTo(90)
    expect(drawingPoints(added).some((point) => Math.hypot(point.x - 250, point.y - 300) < 1e-7)).toBe(true)
  })

  test('the map and card previews retain rotations and fit the rotated geometry', async ({ page }) => {
    await select(page)
    await rotate(page, { x: 200, y: 300 }, 90)
    await page.getByRole('link', { name: '2D-карта и панорамы', exact: true }).click()
    const plan = page.getByRole('img', { name: 'План помещения', exact: true })
    const rect = plan.locator('[data-plan-object-id="room"] rect')
    await expect(rect).toHaveAttribute('transform', /^rotate\(90 /)
    const imageBounds = (await plan.boundingBox())!
    const rotatedBounds = (await rect.boundingBox())!
    expect(rotatedBounds.y).toBeGreaterThan(imageBounds.y)
    expect(rotatedBounds.y + rotatedBounds.height).toBeLessThan(imageBounds.y + imageBounds.height)
    await page.goto('/')
    await expect(page.getByRole('img', { name: 'Чертёж проекта «Поворот»', exact: true }).locator('rect')).toHaveAttribute('transform', /^rotate\(90 /)
  })
})
