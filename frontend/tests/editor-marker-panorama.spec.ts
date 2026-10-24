import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { DrawingObject, Point } from '../src/types/drawing'

const canvas = (page: Page) => page.getByRole('application', { name: 'Холст чертежа' })
const viewer = (page: Page) => page.getByRole('dialog', { name: /./ }).filter({ has: page.getByRole('application') })
const sphere = (page: Page) => viewer(page).getByRole('application')

const HALL = { x: 150, y: 150 }
const ENTRANCE = { x: 350, y: 200 }
const EXIT = { x: 500, y: 300 }

function panoramaImage() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createLinearGradient(0, 0, 1024, 512)
  gradient.addColorStop(0, '#2563eb')
  gradient.addColorStop(1, '#dc2538')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1024, 512)
  return canvas.toDataURL('image/png').split(',')[1]
}

async function screen(page: Page, point: Point) {
  await canvas(page).scrollIntoViewIfNeeded()
  return canvas(page).locator('[data-canvas-content]').evaluate((node, point) => {
    const result = new DOMPoint(point.x, point.y).matrixTransform((node as SVGGraphicsElement).getScreenCTM()!)
    return { x: result.x, y: result.y }
  }, point)
}

async function selectMarker(page: Page, point: Point, name: string) {
  const position = await screen(page, point)
  await page.mouse.click(position.x, position.y)
  await expect(page.getByLabel('Название', { exact: true })).toHaveValue(name)
}

async function upload(page: Page, label: 'Создать панораму' | 'Заменить панораму', name: string) {
  const image = await page.evaluate(panoramaImage)
  await page.getByLabel(label, { exact: true }).setInputFiles({ name, mimeType: 'image/png', buffer: Buffer.from(image, 'base64') })
  await expect(page.getByText('Панорама: загружена', { exact: true })).toBeVisible()
}

async function drawings(page: Page): Promise<DrawingObject[]> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('space-map-projects')!)[0].drawings ?? [])
}

async function storedPanorama(page: Page, key: string) {
  return page.evaluate((key) => new Promise<boolean>((resolve, reject) => {
    const request = indexedDB.open('space-map-db', 1)
    request.onsuccess = () => {
      const get = request.result.transaction('map-images', 'readonly').objectStore('map-images').get(key)
      get.onsuccess = () => { request.result.close(); resolve(get.result instanceof Blob) }
      get.onerror = () => reject(get.error)
    }
    request.onerror = () => reject(request.error)
  }), key)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(([hall, entrance, exit]) => {
    localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'test', name: 'Тест', email: 'test@example.com', role: 'admin' }))
    if (localStorage.getItem('space-map-projects')) return
    localStorage.setItem('space-map-projects', JSON.stringify([
      { id: 'site', name: 'Корпус', description: '', createdAt: '2026-10-24', drawings: [
        { id: 'hall', type: 'marker', markerKind: 'navigation', label: 'Зал', points: [hall, hall] },
        { id: 'entrance', type: 'marker', markerKind: 'navigation', label: 'Вход', points: [entrance, entrance] },
        { id: 'exit', type: 'marker', markerKind: 'navigation', label: 'Выход', targetProjectId: 'target', points: [exit, exit] },
      ] },
      { id: 'target', name: 'Соседний корпус', description: '', createdAt: '2026-10-24', drawings: [
        { id: 'room', type: 'rectangle', label: 'Холл', points: [{ x: 0, y: 0 }, { x: 200, y: 100 }] },
      ] },
    ]))
  }, [HALL, ENTRANCE, EXIT])
  await page.goto('/projects/site/editor')
  await expect(canvas(page)).toBeVisible()
})

test('navigation markers create, open, switch, replace and delete their panoramas', async ({ page }) => {
  await selectMarker(page, HALL, 'Зал')
  await expect(page.getByText('Панорама: не добавлена', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Открыть панораму', exact: true })).toHaveCount(0)
  await upload(page, 'Создать панораму', 'hall-360.png')
  expect((await drawings(page)).find((object) => object.id === 'hall')?.panoramaKey).toBe('panorama:site:hall')
  expect(await storedPanorama(page, 'panorama:site:hall')).toBe(true)

  await page.getByRole('button', { name: 'Открыть панораму', exact: true }).click()
  await expect(sphere(page)).toHaveAttribute('data-viewer-status', 'ready')
  await expect(viewer(page).getByRole('heading', { name: 'Зал', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(sphere(page)).toHaveCount(0)

  // Double click activates the marker: it opens its panorama instead of another map.
  const hall = await screen(page, HALL)
  await page.mouse.dblclick(hall.x, hall.y)
  await expect(sphere(page)).toHaveAttribute('data-viewer-status', 'ready')
  await page.keyboard.press('Escape')

  await selectMarker(page, ENTRANCE, 'Вход')
  await upload(page, 'Создать панораму', 'entrance-360.png')
  await page.getByRole('button', { name: 'Открыть панораму', exact: true }).click()
  await expect(viewer(page).getByRole('heading', { name: 'Вход', exact: true })).toBeVisible()
  await viewer(page).getByLabel('Панорама точки', { exact: true }).selectOption('hall')
  await expect(viewer(page).getByRole('heading', { name: 'Зал', exact: true })).toBeVisible()
  await expect(sphere(page)).toHaveAttribute('data-viewer-status', 'ready')
  await page.keyboard.press('Escape')

  await selectMarker(page, ENTRANCE, 'Вход')
  await upload(page, 'Заменить панораму', 'entrance-new-360.png')
  expect(await storedPanorama(page, 'panorama:site:entrance')).toBe(true)

  await page.getByRole('button', { name: 'Удалить панораму', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: 'Удалить панораму?', exact: true })
  await confirmation.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(page.getByText('Панорама: загружена', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Удалить панораму', exact: true }).click()
  await confirmation.getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(page.getByText('Панорама: не добавлена', { exact: true })).toBeVisible()
  expect(await storedPanorama(page, 'panorama:site:entrance')).toBe(false)
  expect((await drawings(page)).find((object) => object.id === 'entrance')?.panoramaKey).toBeUndefined()
  expect(await drawings(page)).toHaveLength(3)
})

test('a navigation marker without a panorama still leads to its target map', async ({ page }) => {
  const exit = await screen(page, EXIT)
  await page.mouse.click(exit.x, exit.y)
  await page.mouse.dblclick(exit.x, exit.y)
  await expect(page).toHaveURL('/projects/target/map')
})

test('a missing panorama file closes the viewer with a message', async ({ page }) => {
  await selectMarker(page, HALL, 'Зал')
  await upload(page, 'Создать панораму', 'hall-360.png')
  // The marker keeps its key while the file disappears, e.g. after undoing a deletion.
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('space-map-db', 1)
    request.onsuccess = () => {
      const tx = request.result.transaction('map-images', 'readwrite')
      tx.objectStore('map-images').delete('panorama:site:hall')
      tx.oncomplete = () => { request.result.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    }
    request.onerror = () => reject(request.error)
  }))
  await page.getByRole('button', { name: 'Открыть панораму', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Панорама не найдена' })).toBeVisible()
  await expect(sphere(page)).toHaveCount(0)
})
