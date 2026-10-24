import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

async function pixel(image: Locator) {
  await expect(image).toBeVisible()
  await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  return image.evaluate((node) => {
    const image = node as HTMLImageElement
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    return [...context.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data].slice(0, 3)
  })
}

async function home(page: Page) {
  await page.getByRole('link', { name: /Все проекты/ }).click()
  await expect(page).toHaveURL('/')
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'preview', name: 'Тест', email: 'test@example.com', role: 'admin' }))
    if (!localStorage.getItem('space-map-projects')) {
      localStorage.setItem('space-map-projects', JSON.stringify([
        { id: 'photo', name: 'Офис', description: '', createdAt: '2026-10-24' },
        { id: 'plan', name: 'План', description: '', createdAt: '2026-10-24' },
        { id: 'drawing', name: 'Чертёж', description: '', createdAt: '2026-10-24', drawings: [
          { id: 'room', type: 'rectangle', points: [{ x: -300, y: -50 }, { x: -100, y: 100 }] },
          { id: 'line', type: 'line', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] },
        ] },
        { id: 'empty', name: 'Новый проект', description: '', createdAt: '2026-10-24' },
        { id: 'broken', name: 'Резерв', description: '', createdAt: '2026-10-24' },
      ]))
      localStorage.setItem('space-map-points', JSON.stringify({
        photo: [
          { id: 'without-image', title: 'Без фото', x: 10, y: 10 },
          { id: 'room', title: 'Помещение', x: 50, y: 50 },
        ],
        broken: [{ id: 'room', title: 'Помещение', x: 50, y: 50 }],
      }))
    }
  })
  await page.goto('/')
  await page.evaluate(async () => {
    const image = async (colour: string) => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 32
      const context = canvas.getContext('2d')!
      context.fillStyle = colour
      context.fillRect(0, 0, canvas.width, canvas.height)
      return new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'))
    }
    const [red, blue, yellow] = await Promise.all([image('#d43a4f'), image('#2863c7'), image('#e7bb36')])
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('space-map-db', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('map-images')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('map-images', 'readwrite')
      const store = transaction.objectStore('map-images')
      store.put(red, 'panorama:photo:room')
      store.put(blue, 'photo')
      store.put(blue, 'plan')
      store.put(new Blob(['invalid image'], { type: 'image/png' }), 'panorama:broken:room')
      store.put(yellow, 'broken')
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    db.close()
  })
  await page.reload()
})

test('cards show their actual photos, plans or drawings and skip unreadable photos', async ({ page }, testInfo) => {
  const photo = page.getByRole('img', { name: 'Фото проекта «Офис»' })
  const red = await pixel(photo)
  expect(Math.abs(red[0] - 212)).toBeLessThanOrEqual(3)
  expect(Math.abs(red[1] - 58)).toBeLessThanOrEqual(3)
  expect(Math.abs(red[2] - 79)).toBeLessThanOrEqual(3)
  expect(await pixel(page.getByRole('img', { name: 'План проекта «План»' }))).toEqual([40, 99, 199])
  expect(await pixel(page.getByRole('img', { name: 'План проекта «Резерв»' }))).toEqual([231, 187, 54])
  expect(await photo.evaluate((node) => [(node as HTMLImageElement).naturalWidth, (node as HTMLImageElement).naturalHeight])).toEqual([640, 360])
  const drawing = page.getByRole('img', { name: 'Чертёж проекта «Чертёж»' })
  await expect(drawing.locator('rect')).toHaveAttribute('width', '200')
  await expect(drawing.locator('rect')).toHaveAttribute('height', '150')
  await expect(drawing.locator('line')).toHaveAttribute('x2', '100')
  const empty = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Новый проект', exact: true }) })
  await expect(empty.getByText('Добавьте план, панораму или чертёж')).toBeVisible()
  await expect(empty.getByRole('img')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('project-previews.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('replacing the plan through the map updates the cover on returning to projects', async ({ page }) => {
  await page.goto('/projects/plan/map')
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 32
    const context = canvas.getContext('2d')!
    context.fillStyle = '#2e9c65'
    context.fillRect(0, 0, 64, 32)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.locator('input[type=file]').first().setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') })
  await expect(page.getByText('replacement.png', { exact: true }).first()).toBeVisible()
  await home(page)
  expect(await pixel(page.getByRole('img', { name: 'План проекта «План»' }))).toEqual([46, 156, 101])
})

test('removing the plan removes the obsolete cover', async ({ page }) => {
  await page.goto('/projects/plan/map')
  await expect(page.getByRole('img', { name: 'План помещения' })).toBeVisible()
  await page.getByRole('button', { name: 'Удалить план', exact: true }).click()
  await page.getByRole('dialog', { name: 'Удалить план?', exact: true }).getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(page.getByRole('img', { name: 'План помещения' })).toHaveCount(0)
  await home(page)
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'План', exact: true }) })
  await expect(card.getByText('Добавьте план, панораму или чертёж')).toBeVisible()
  await expect(card.getByRole('img')).toHaveCount(0)
})

test('unavailable image storage leaves the saved drawing and project navigation usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { get: () => { throw new Error('Unavailable image storage') } })
  })
  await page.reload()
  await expect(page.getByRole('img', { name: 'Чертёж проекта «Чертёж»' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Открыть проект', exact: true })).toHaveCount(5)
})

test('leaving the project list releases the thumbnail URLs', async ({ page }) => {
  const photo = page.getByRole('img', { name: 'Фото проекта «Офис»' })
  await pixel(photo)
  const source = (await photo.getAttribute('src'))!
  await page.evaluate(() => {
    const revoked: string[] = []
    Reflect.set(window, 'previewRevokedUrls', revoked)
    const revoke = URL.revokeObjectURL.bind(URL)
    URL.revokeObjectURL = (url) => { revoked.push(url); revoke(url) }
  })
  await page.getByRole('link', { name: 'Открыть проект', exact: true }).first().click()
  await expect(page).toHaveURL('/projects/photo')
  expect(await page.evaluate((url) => Reflect.get(window, 'previewRevokedUrls').includes(url), source)).toBe(true)
})
