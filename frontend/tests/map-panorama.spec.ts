import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const viewer = (page: Page) => page.getByRole('dialog')
const sphere = (page: Page) => viewer(page).getByRole('application')
const plan = (page: Page) => page.getByRole('img', { name: 'План помещения', exact: true })

function panoramaImage() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createLinearGradient(0, 0, 1024, 512)
  gradient.addColorStop(0, '#2563eb')
  gradient.addColorStop(0.5, '#e2bd86')
  gradient.addColorStop(1, '#dc2538')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1024, 512)
  ctx.fillStyle = '#342c29'
  ctx.fillRect(0, 380, 1024, 132)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 6
  for (let x = 0; x < 1024; x += 128) {
    ctx.strokeRect(x + 16, 170, 96, 180)
    ctx.font = '28px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(String(x / 128), x + 50, 150)
  }
  return canvas.toDataURL('image/png').split(',')[1]
}

async function uploadPanorama(page: Page) {
  const image = await page.evaluate(panoramaImage)
  await page.getByLabel('+ Загрузить панораму', { exact: true }).setInputFiles({
    name: 'room-360.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64'),
  })
  await expect(page.getByText('room-360.png', { exact: true })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'map', name: 'Тест', email: 'test@example.com', role: 'admin' }))
    if (!localStorage.getItem('space-map-projects')) {
      localStorage.setItem('space-map-projects', JSON.stringify(['empty', 'drawing', 'plan', 'tour', 'panorama-only', 'broken'].map((id) => ({
        id, name: id, description: '', createdAt: '2026-10-24',
        ...(id === 'drawing' ? { drawings: [
          { id: 'room', type: 'rectangle', label: 'Зал', points: [{ x: -200, y: -100 }, { x: 100, y: 100 }] },
          { id: 'dimension', type: 'dimension', points: [{ x: -200, y: 130 }, { x: 100, y: 130 }] },
        ] } : {}),
      }))))
      localStorage.setItem('space-map-points', JSON.stringify({
        tour: [
          { id: 'no-photo', title: 'Без фото', x: 10, y: 20 },
          { id: 'hall', title: 'Зал', x: 40, y: 40 },
          { id: 'entrance', title: 'Вход', x: 70, y: 60 },
        ],
        'panorama-only': [{ id: 'hall', title: 'Зал без плана', x: 50, y: 50 }],
        broken: [{ id: 'hall', title: 'Повреждённая панорама', x: 50, y: 50 }],
      }))
    }
  })
  await page.goto('/projects/empty')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('empty')
  const image = await page.evaluate(panoramaImage)
  await page.evaluate(async (image) => {
    const blob = await (await fetch(`data:image/png;base64,${image}`)).blob()
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('space-map-db', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('map-images')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('map-images', 'readwrite')
      const store = tx.objectStore('map-images')
      for (const id of ['plan', 'tour', 'broken']) store.put(blob, id)
      for (const key of ['panorama:tour:hall', 'panorama:tour:entrance', 'panorama:panorama-only:hall']) store.put(blob, key)
      store.put(new Blob(['broken'], { type: 'image/png' }), 'panorama:broken:hall')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, image)
})

test('a new project opens the editor and its saved drawing becomes a map with panorama points', async ({ page }, testInfo) => {
  await page.getByRole('link', { name: 'Открыть карту', exact: true }).click()
  await expect(page).toHaveURL('/projects/empty/editor')
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click()
  const canvas = page.getByRole('application', { name: 'Холст чертежа' })
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 100, box.y + 100)
  await page.mouse.down()
  await page.mouse.move(box.x + 300, box.y + 250)
  await page.mouse.up()
  await expect(canvas.locator('[data-object-id]')).toHaveCount(1)
  await page.getByRole('link', { name: '2D-карта и панорамы' }).click()
  await expect(plan(page).locator('rect')).toHaveAttribute('width', '200')
  await plan(page).click({ position: { x: 100, y: 100 } })
  await expect(page.getByRole('heading', { name: 'Редактирование точки' })).toBeVisible()
  await uploadPanorama(page)
  await page.getByRole('switch', { name: 'Режим 3D', exact: true }).click()
  await expect(sphere(page)).toHaveAttribute('data-viewer-status', 'ready')
  await expect(sphere(page).locator('canvas')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('new-project-panorama.png') })
  await page.getByRole('button', { name: 'К 2D-карте' }).click()
  await expect(plan(page)).toBeVisible()
  await page.goto('/projects/empty')
  await page.getByRole('link', { name: 'Открыть карту', exact: true }).click()
  await expect(sphere(page)).toHaveAttribute('data-viewer-status', 'ready')
})

test('the editor also allows uploading an image plan before drawing anything', async ({ page }) => {
  await page.goto('/projects/empty/map')
  await expect(page).toHaveURL('/projects/empty/editor')
  await page.getByRole('link', { name: '2D-карта и панорамы' }).click()
  await expect(page).toHaveURL('/projects/empty/map?mode=2d')
  await expect(page.getByRole('heading', { name: 'Начни с плана помещения' })).toBeVisible()
  const image = await page.evaluate(panoramaImage)
  await page.locator('input[type=file]').first().setInputFiles({ name: 'plan.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') })
  await expect(plan(page)).toBeVisible()
  await page.reload()
  await expect(plan(page)).toBeVisible()
})

test('a saved plan opens in 2D until a panorama is added', async ({ page }) => {
  await page.goto('/projects/plan')
  await page.getByRole('link', { name: 'Открыть карту', exact: true }).click()
  await expect(plan(page)).toBeVisible()
  await expect(viewer(page)).toHaveCount(0)
  await expect(page.getByRole('switch', { name: 'Режим 3D', exact: true })).toBeDisabled()
})

test('negative drawing coordinates and dimensions render on the map and can receive points', async ({ page }, testInfo) => {
  await page.goto('/projects/drawing/map')
  await expect(plan(page).locator('[data-plan-object-id="room"] rect')).toHaveAttribute('x', '-200')
  await expect(plan(page).getByText('6.00 м')).toBeVisible()
  await plan(page).click({ position: { x: 100, y: 100 } })
  await expect(page.getByRole('button', { name: 'Выбрать точку: Точка 1', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Выбрать точку: Точка 1', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('drawing-map.png'), fullPage: true })
})

for (const id of ['tour', 'panorama-only']) {
  test(`opening ${id} automatically starts a real spherical viewer`, async ({ page }) => {
    await page.goto(`/projects/${id}`)
    await page.getByRole('link', { name: 'Открыть карту', exact: true }).click()
    await expect(sphere(page)).toHaveAttribute('data-viewer-status', 'ready')
    await expect(sphere(page).locator('.pnlm-render-container canvas')).toBeVisible()
    await expect(viewer(page).getByRole('switch', { name: 'Режим 3D', exact: true })).toBeChecked()
    await expect(viewer(page).locator('img')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(viewer(page)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Карта пространства', exact: true })).toBeVisible()
  })
}

test('Pannellum renders different views on drag, zooms, resets and switches between panoramas', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/projects/tour/map')
  await expect(sphere(page)).toHaveAttribute('data-viewer-status', 'ready')
  const renderer = sphere(page).locator('canvas')
  const before = await renderer.screenshot()
  const box = (await sphere(page).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2 + 40, { steps: 10 })
  await page.mouse.up()
  expect((await renderer.screenshot()).equals(before)).toBe(false)
  await page.getByRole('button', { name: 'Увеличить масштаб панорамы' }).click()
  await expect(page.getByLabel('Масштаб панорамы', { exact: true })).toHaveAttribute('data-hfov', '90')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, -150)
  await expect.poll(async () => Number(await page.getByLabel('Масштаб панорамы', { exact: true }).getAttribute('data-hfov'))).toBeLessThan(90)
  await page.getByRole('button', { name: 'Сбросить вид' }).click()
  await expect(page.getByLabel('Масштаб панорамы', { exact: true })).toHaveAttribute('data-hfov', '100')
  await page.getByLabel('Панорама точки', { exact: true }).selectOption('entrance')
  await expect(viewer(page).getByRole('heading', { name: 'Вход', exact: true })).toBeVisible()
  await expect(sphere(page)).toHaveAttribute('data-viewer-status', 'ready')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(renderer).toBeVisible()
  expect(await viewer(page).evaluate((node) => node.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('panorama-mobile.png') })
  await page.getByRole('button', { name: 'К 2D-карте' }).click()
  await expect(plan(page)).toBeVisible()
  expect(errors).toEqual([])
})

test('2D mode suppresses automatic panorama opening; corrupt images allow recovery', async ({ page }) => {
  await page.goto('/projects/tour/map?mode=2d')
  await expect(plan(page)).toBeVisible()
  await expect(viewer(page)).toHaveCount(0)
  await page.getByRole('switch', { name: 'Режим 3D', exact: true }).click()
  await expect(sphere(page)).toHaveAttribute('data-viewer-status', 'ready')
  await viewer(page).getByRole('switch', { name: 'Режим 3D', exact: true }).click()
  await expect(plan(page)).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Режим 3D', exact: true })).not.toBeChecked()
  await page.goto('/projects/broken/map')
  await expect(sphere(page)).toHaveAttribute('data-viewer-status', 'error')
  await expect(viewer(page).getByRole('alert')).toContainText('Не удалось открыть панораму')
  await page.getByRole('button', { name: 'К 2D-карте' }).click()
  const image = await page.evaluate(panoramaImage)
  await page.getByLabel('Заменить изображение', { exact: true }).setInputFiles({ name: 'fixed.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') })
  await expect(page.getByText('fixed.png', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Открыть просмотр →', exact: true }).click()
  await expect(sphere(page)).toHaveAttribute('data-viewer-status', 'ready')
})

test('switching modes destroys viewers and leaving the map releases all image URLs', async ({ page }) => {
  await page.addInitScript(() => {
    const lifetimes: { destroyed: boolean }[] = []
    const urls = new Set<string>()
    Reflect.set(window, 'panoramaLifetimes', lifetimes)
    Reflect.set(window, 'activePanoramaUrls', urls)
    let api: Window['pannellum']
    Object.defineProperty(window, 'pannellum', {
      configurable: true,
      get: () => api,
      set(value: Window['pannellum']) {
        api = {
          viewer(container, config) {
            const instance = value.viewer(container, config)
            const lifetime = { destroyed: false }
            lifetimes.push(lifetime)
            const destroy = instance.destroy.bind(instance)
            instance.destroy = () => { lifetime.destroyed = true; destroy() }
            return instance
          },
        }
      },
    })
    const create = URL.createObjectURL.bind(URL)
    const revoke = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = (blob) => { const url = create(blob); urls.add(url); return url }
    URL.revokeObjectURL = (url) => { urls.delete(url); revoke(url) }
  })
  await page.goto('/projects/tour/map')
  await expect(sphere(page)).toHaveAttribute('data-viewer-status', 'ready')
  await page.getByRole('button', { name: 'К 2D-карте' }).click()
  await expect(page.locator('.pnlm-container')).toHaveCount(0)
  expect(await page.evaluate(() => Reflect.get(window, 'panoramaLifetimes'))).toEqual([{ destroyed: true }])
  await page.getByRole('switch', { name: 'Режим 3D', exact: true }).click()
  await expect(sphere(page)).toHaveAttribute('data-viewer-status', 'ready')
  await page.getByLabel('Панорама точки', { exact: true }).selectOption('entrance')
  await expect(viewer(page).getByRole('heading', { name: 'Вход', exact: true })).toBeVisible()
  await expect(sphere(page)).toHaveAttribute('data-viewer-status', 'ready')
  await page.getByRole('button', { name: 'К 2D-карте' }).click()
  await page.getByRole('link', { name: 'Редактировать чертёж', exact: true }).click()
  expect(await page.evaluate(() => Reflect.get(window, 'panoramaLifetimes'))).toEqual([
    { destroyed: true }, { destroyed: true }, { destroyed: true },
  ])
  expect(await page.evaluate(() => Reflect.get(window, 'activePanoramaUrls').size)).toBe(0)
})

test('missing WebGL reports an error and still allows returning to the map', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        return type.includes('webgl') ? null : Reflect.apply(getContext, this, [type, ...args])
      },
    })
  })
  await page.goto('/projects/tour/map')
  await expect(sphere(page)).toHaveAttribute('data-viewer-status', 'error')
  await expect(viewer(page).getByRole('alert')).toContainText('WebGL')
  await page.getByRole('button', { name: 'К 2D-карте' }).click()
  await expect(plan(page)).toBeVisible()
})

test('unavailable media storage preserves the saved drawing instead of treating the project as empty', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { get: () => { throw new Error('Unavailable') } })
  })
  await page.goto('/projects/drawing/map')
  await expect(plan(page)).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Не удалось загрузить план проекта')
  await expect(page).toHaveURL('/projects/drawing/map')
})
