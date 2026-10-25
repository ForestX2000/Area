import { expect, test } from '@playwright/test'
import type { Page, Route } from '@playwright/test'
import type { Point } from '../src/types/drawing'

const canvas = (page: Page) => page.getByRole('application', { name: 'Холст чертежа' })
const stitchDialog = (page: Page) => page.getByRole('dialog', { name: /^Собрать панораму/ })
const HALL = { x: 150, y: 150 }

function image([width, height, hue]: [number, number, number]) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = `hsl(${hue} 60% 50%)`
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(width / 4, height / 4, width / 2, height / 2)
  return canvas.toDataURL('image/png').split(',')[1]
}

async function png(page: Page, width: number, height: number, hue: number) {
  return Buffer.from(await page.evaluate(image, [width, height, hue] as [number, number, number]), 'base64')
}

async function photos(page: Page, count: number, size = { width: 300, height: 400 }) {
  return Promise.all(Array.from({ length: count }, async (_, index) => ({
    name: `photo-${index + 1}.png`,
    mimeType: 'image/png',
    buffer: await png(page, size.width, size.height, index * 30),
  })))
}

async function mockStitch(page: Page, headers: Record<string, string>) {
  const body = await png(page, 1024, 512, 200)
  const requests: number[] = []
  await page.route('**/api/panoramas/stitch', async (route: Route) => {
    const data = route.request().postDataBuffer()?.toString('latin1') ?? ''
    requests.push(data.split('name="images"').length - 1)
    await route.fulfill({ status: 200, contentType: 'image/jpeg', headers, body })
  })
  return requests
}

async function screen(page: Page, point: Point) {
  await canvas(page).scrollIntoViewIfNeeded()
  return canvas(page).locator('[data-canvas-content]').evaluate((node, point) => {
    const result = new DOMPoint(point.x, point.y).matrixTransform((node as SVGGraphicsElement).getScreenCTM()!)
    return { x: result.x, y: result.y }
  }, point)
}

async function storedPanorama(page: Page, key: string) {
  return page.evaluate((key) => new Promise<boolean>((resolve, reject) => {
    const request = indexedDB.open('space-map-db')
    request.onupgradeneeded = () => request.result.createObjectStore('map-images')
    request.onsuccess = () => {
      const get = request.result.transaction('map-images', 'readonly').objectStore('map-images').get(key)
      get.onsuccess = () => { request.result.close(); resolve(get.result instanceof Blob) }
      get.onerror = () => reject(get.error)
    }
    request.onerror = () => reject(request.error)
  }), key)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(([hall]) => {
    localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'test', name: 'Тест', email: 'test@example.com', role: 'admin' }))
    if (localStorage.getItem('space-map-projects')) return
    localStorage.setItem('space-map-projects', JSON.stringify([
      { id: 'site', name: 'Корпус', description: '', createdAt: '2026-10-24', drawings: [
        { id: 'hall', type: 'marker', markerKind: 'navigation', label: 'Зал', points: [hall, hall] },
      ] },
      { id: 'tour', name: 'Тур', description: '', createdAt: '2026-10-24' },
    ]))
    localStorage.setItem('space-map-points', JSON.stringify({ tour: [{ id: 'lobby', title: 'Лобби', x: 40, y: 40 }] }))
  }, [HALL])
})

test('a navigation marker panorama is stitched from photos with shooting tips and result hints', async ({ page }) => {
  const requests = await mockStitch(page, {
    'X-Panorama-Horizontal-Coverage': '200',
    'X-Panorama-Vertical-Coverage': '60',
    'X-Panorama-Used-Images': '0,2',
    'X-Panorama-Total-Images': '3',
  })
  await page.goto('/projects/site/editor')
  const hall = await screen(page, HALL)
  await page.mouse.click(hall.x, hall.y)
  await page.getByRole('button', { name: 'Создать панораму', exact: true }).click()

  const dialog = stitchDialog(page)
  await expect(dialog.getByRole('heading', { name: 'Собрать панораму: Зал' })).toBeVisible()
  await expect(dialog.getByText('Не сходите с места.')).toBeVisible()
  await expect(dialog.getByRole('img', { name: 'Схема съёмки: снимков 0 из 12' })).toBeVisible()
  const stitch = dialog.getByRole('button', { name: 'Собрать панораму', exact: true })
  await expect(stitch).toBeDisabled()

  await dialog.getByLabel('Добавить снимки', { exact: true }).setInputFiles(await photos(page, 1))
  await expect(dialog.getByText('Добавьте минимум 2 снимка.', { exact: false })).toBeVisible()
  await expect(stitch).toBeDisabled()

  await dialog.getByLabel('Добавить снимки', { exact: true }).setInputFiles([
    ...await photos(page, 2),
    { name: 'landscape.png', mimeType: 'image/png', buffer: (await photos(page, 1, { width: 400, height: 300 }))[0].buffer },
  ])
  await expect(dialog.getByRole('img', { name: /^Снимок / })).toHaveCount(4)
  await expect(dialog.getByRole('img', { name: 'Схема съёмки: снимков 4 из 12' })).toBeVisible()
  await expect(dialog.getByText(/Для полного круга обычно нужно/)).toBeVisible()
  await expect(dialog.getByText(/Снимки разной ориентации/)).toBeVisible()

  await dialog.getByRole('button', { name: 'Убрать снимок 4', exact: true }).click()
  await expect(dialog.getByRole('img', { name: /^Снимок / })).toHaveCount(3)
  await expect(dialog.getByText(/Снимки разной ориентации/)).toHaveCount(0)

  await stitch.click()
  await expect(dialog.getByRole('status').filter({ hasText: 'Охват: 200° по горизонтали, 60° по вертикали' })).toBeVisible()
  expect(requests).toEqual([3])
  await expect(dialog.getByText(/Круг не замкнут: снято около 200°/)).toBeVisible()
  await expect(dialog.getByText(/Пол и потолок не сняты/)).toBeVisible()
  await expect(dialog.getByText(/Снимки 2 не удалось связать/)).toBeVisible()
  await expect(dialog.getByText('не вошёл', { exact: true })).toHaveCount(1)
  await expect(dialog.getByRole('img', { name: 'Склеенная панорама: Зал' })).toBeVisible()

  await dialog.getByRole('button', { name: 'Сохранить панораму', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Панорама: загружена', { exact: true })).toBeVisible()
  expect(await storedPanorama(page, 'panorama:site:hall')).toBe(true)
  await expect(page.getByRole('button', { name: 'Пересобрать из фото', exact: true })).toBeVisible()
})

test('a stitching error keeps the photos and shows the server advice', async ({ page }) => {
  await page.route('**/api/panoramas/stitch', (route) => route.fulfill({
    status: 422, contentType: 'application/json',
    body: JSON.stringify({ detail: 'Не удалось найти общие детали между снимками.' }),
  }))
  await page.goto('/projects/site/editor')
  const hall = await screen(page, HALL)
  await page.mouse.click(hall.x, hall.y)
  await page.getByRole('button', { name: 'Создать панораму', exact: true }).click()
  const dialog = stitchDialog(page)
  await dialog.getByLabel('Добавить снимки', { exact: true }).setInputFiles(await photos(page, 2))
  await dialog.getByRole('button', { name: 'Собрать панораму', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Не удалось найти общие детали между снимками.')
  await expect(dialog.getByRole('img', { name: /^Снимок / })).toHaveCount(2)

  await dialog.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Панорама: не добавлена', { exact: true })).toBeVisible()
})

test('a map point panorama is stitched from photos and shown on the map', async ({ page }) => {
  await mockStitch(page, {
    'X-Panorama-Horizontal-Coverage': '360',
    'X-Panorama-Vertical-Coverage': '150',
    'X-Panorama-Used-Images': '0,1,2,3,4,5,6,7',
    'X-Panorama-Total-Images': '8',
  })
  await page.goto('/projects/tour')
  const plan = (await png(page, 800, 600, 120)).toString('base64')
  await page.evaluate(async (plan) => {
    const blob = await (await fetch(`data:image/png;base64,${plan}`)).blob()
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('space-map-db')
      request.onupgradeneeded = () => request.result.createObjectStore('map-images')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('map-images', 'readwrite')
      tx.objectStore('map-images').put(blob, 'tour')
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    })
  }, plan)
  await page.goto('/projects/tour/map?mode=2d')
  await page.getByRole('button', { name: 'Выбрать точку: Лобби', exact: true }).click()
  await page.getByRole('button', { name: 'Собрать из нескольких фото', exact: true }).click()

  const dialog = stitchDialog(page)
  await dialog.getByLabel('Добавить снимки', { exact: true }).setInputFiles(await photos(page, 8))
  await expect(dialog.getByText(/Для полного круга обычно нужно/)).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Собрать панораму', exact: true }).click()
  await expect(dialog.getByText('Полная панорама — можно сохранять.', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Сохранить панораму', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('img', { name: 'Панорама: Лобби', exact: true })).toBeVisible()
  expect(await storedPanorama(page, 'panorama:tour:lobby')).toBe(true)
})
