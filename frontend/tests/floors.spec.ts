import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { Project } from '../src/types/project'

const canvas = (page: Page) => page.getByRole('application', { name: 'Холст чертежа' })
const picker = (page: Page) => page.getByRole('dialog', { name: 'Этажи', exact: true })
const floorButton = (page: Page) => page.getByRole('button', { name: /^Этаж:/ }).last()

async function project(page: Page): Promise<Project> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('space-map-projects')!)[0])
}

async function openPicker(page: Page) {
  await floorButton(page).click()
  await expect(picker(page)).toBeVisible()
}

async function choose(page: Page, name: string) {
  await openPicker(page)
  await picker(page).getByRole('button', { name, exact: true }).click()
  await expect(floorButton(page)).toHaveText(`Этаж: ${name}▾`)
}

async function add(page: Page) {
  await openPicker(page)
  await picker(page).getByRole('button', { name: '+ Добавить этаж', exact: true }).click()
  await expect(floorButton(page)).toHaveText('Этаж: 2▾')
  return (await project(page)).activeFloorId!
}

async function draw(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click()
  await canvas(page).scrollIntoViewIfNeeded()
  const box = (await canvas(page).boundingBox())!
  await page.mouse.move(box.x + 100, box.y + 100)
  await page.mouse.down()
  await page.mouse.move(box.x + 300, box.y + 250, { steps: 4 })
  await page.mouse.up()
}

async function imageData(page: Page, colour = '#2863c7') {
  return page.evaluate((colour) => {
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = 256
    const context = canvas.getContext('2d')!
    context.fillStyle = colour; context.fillRect(0, 0, 512, 256)
    context.fillStyle = 'white'; context.fillRect(100, 60, 100, 120)
    return canvas.toDataURL('image/png').split(',')[1]
  }, colour)
}

async function seedLegacyMedia(page: Page) {
  const data = await imageData(page)
  await page.evaluate(async (data) => {
    const blob = await (await fetch(`data:image/png;base64,${data}`)).blob()
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('space-map-db', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('map-images')
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('map-images', 'readwrite')
      transaction.objectStore('map-images').put(blob, 'building')
      transaction.objectStore('map-images').put(blob, 'panorama:building:entrance')
      transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error)
    })
    db.close()
    localStorage.setItem('space-map-points', JSON.stringify({ building: [{ id: 'entrance', title: 'Первый этаж', x: 50, y: 50 }] }))
  }, data)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'floor-test', name: 'Тест', email: 'test@example.com', role: 'admin' }))
    if (!localStorage.getItem('space-map-projects')) {
      localStorage.setItem('space-map-projects', JSON.stringify([
        { id: 'building', name: 'Главный корпус', description: '', createdAt: '2026-10-24', drawings: [{ id: 'legacy-room', type: 'rectangle', points: [{ x: 50, y: 50 }, { x: 200, y: 200 }] }] },
        { id: 'other', name: 'Другой корпус', description: '', createdAt: '2026-10-24' },
      ]))
      localStorage.setItem('space-map-workspaces', JSON.stringify({ version: 1, activeId: 'campus', workspaces: [
        { id: 'campus', name: 'Кампус', nodes: [{ projectId: 'building', x: 40, y: 80 }], groups: [], view: { x: 0, y: 0, zoom: 1 } },
      ] }))
    }
  })
  await page.goto('/projects/building/editor')
  await expect(canvas(page)).toBeVisible()
})

test('floor control follows Workspace and precedes the mode switch; actions are at the bottom', async ({ page }, testInfo) => {
  const nav = page.getByRole('navigation', { name: 'Навигация редактора' })
  expect((await nav.getByRole('link', { name: 'Кампус' }).boundingBox())!.x).toBeLessThan((await floorButton(page).boundingBox())!.x)
  expect((await floorButton(page).boundingBox())!.x).toBeLessThan((await nav.getByRole('switch').boundingBox())!.x)
  await openPicker(page)
  await expect(picker(page).getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(picker(page).getByRole('button', { name: 'Удалить этаж', exact: true })).toBeDisabled()
  const edit = picker(page).getByRole('button', { name: 'Переименовать этаж 1' })
  expect((await edit.boundingBox())!.x).toBeGreaterThan((await picker(page).getByRole('button', { name: '1', exact: true }).boundingBox())!.x)
  const add = picker(page).getByRole('button', { name: '+ Добавить этаж', exact: true })
  const remove = picker(page).getByRole('button', { name: 'Удалить этаж', exact: true })
  expect((await add.boundingBox())!.y).toBeLessThan((await remove.boundingBox())!.y)
  await page.screenshot({ path: testInfo.outputPath('floor-picker.png'), fullPage: true })
})

test('floors are numbered and have separate drawings, selection and undo histories', async ({ page }) => {
  await expect(canvas(page).locator('[data-object-id="legacy-room"]')).toBeVisible()
  const secondId = await add(page)
  await expect(canvas(page).locator('[data-object-id]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Отменить · Ctrl + Z' })).toBeDisabled()
  await draw(page, 'Эллипс')
  await choose(page, '1')
  await expect(canvas(page).locator('[data-object-id="legacy-room"]')).toBeVisible()
  await expect(canvas(page).locator('[data-object-type="ellipse"]')).toHaveCount(0)
  await choose(page, '2')
  await expect(canvas(page).locator('[data-object-type="ellipse"]')).toBeVisible()
  await page.reload()
  await expect(floorButton(page)).toHaveText('Этаж: 2▾')
  await expect(canvas(page).locator('[data-object-type="ellipse"]')).toBeVisible()
  const stored = await project(page)
  expect(stored.drawings?.[0].id).toBe('legacy-room')
  expect(stored.floors?.find((floor) => floor.id === secondId)?.drawings?.[0].type).toBe('ellipse')
  await openPicker(page)
  await picker(page).getByRole('button', { name: '+ Добавить этаж', exact: true }).click()
  await expect(floorButton(page)).toHaveText('Этаж: 3▾')
})

test('a pencil renames a floor without changing its drawings and keeps the name after reload', async ({ page }) => {
  await openPicker(page)
  await picker(page).getByRole('button', { name: 'Переименовать этаж 1' }).click()
  const input = picker(page).getByRole('textbox', { name: 'Название этажа' })
  await expect(input).toBeFocused()
  await input.fill('Лаборатория')
  await input.press('Enter')
  await expect(picker(page).getByRole('button', { name: 'Лаборатория', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(canvas(page).locator('[data-object-id="legacy-room"]')).toBeVisible()
  await page.reload()
  await expect(floorButton(page)).toHaveText('Этаж: Лаборатория▾')
  await openPicker(page)
  await picker(page).getByRole('button', { name: 'Переименовать этаж Лаборатория' }).click()
  await picker(page).getByRole('textbox').fill('Не сохранять')
  await page.keyboard.press('Escape')
  await expect(picker(page).getByRole('button', { name: 'Лаборатория', exact: true })).toBeVisible()
})

test('deletion requires confirmation, preserves other floors and persists after reload', async ({ page }) => {
  await add(page)
  await draw(page, 'Эллипс')
  await openPicker(page)
  await picker(page).getByRole('button', { name: 'Удалить этаж', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: 'Удалить этаж?', exact: true })
  await expect(confirmation).toContainText('Этаж «2»')
  await confirmation.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(floorButton(page)).toHaveText('Этаж: 2▾')
  expect((await project(page)).floors).toHaveLength(2)
  await picker(page).getByRole('button', { name: 'Удалить этаж', exact: true }).click()
  await confirmation.getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(floorButton(page)).toHaveText('Этаж: 1▾')
  await expect(canvas(page).locator('[data-object-id="legacy-room"]')).toBeVisible()
  await page.reload()
  expect((await project(page)).floors).toHaveLength(1)
  await openPicker(page)
  await expect(picker(page).getByRole('button', { name: 'Удалить этаж', exact: true })).toBeDisabled()
})

test('map images and panorama points are isolated and the floor is retained through 2D and 3D navigation', async ({ page }) => {
  await seedLegacyMedia(page)
  const secondId = await add(page)
  await page.getByRole('link', { name: '2D-карта и панорамы', exact: true }).click()
  await expect(page.getByRole('img', { name: 'План помещения', exact: true })).toHaveCount(0)
  const image = await imageData(page, '#dc2538')
  await page.locator('input[type=file]').first().setInputFiles({ name: 'second-plan.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') })
  const plan = page.getByRole('img', { name: 'План помещения', exact: true })
  await expect(plan).toBeVisible()
  await plan.click({ position: { x: 100, y: 100 } })
  await page.getByLabel('+ Загрузить панораму', { exact: true }).setInputFiles({ name: 'second-panorama.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') })
  await expect(page.getByText('second-panorama.png', { exact: true })).toBeVisible()
  await page.getByRole('switch', { name: 'Режим 3D', exact: true }).click()
  await expect(page.locator('[data-viewer-status]')).toHaveAttribute('data-viewer-status', 'ready')
  await choose(page, '1')
  await expect(page.locator('[data-viewer-status]')).toHaveAttribute('data-viewer-status', 'ready')
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Первый этаж', exact: true })).toBeVisible()
  await choose(page, '2')
  await expect(page.locator('[data-viewer-status]')).toHaveAttribute('data-viewer-status', 'ready')
  await page.getByRole('button', { name: 'К 2D-карте', exact: true }).click()
  await expect(page.getByText('second-plan.png', { exact: true })).toBeVisible()
  expect(new URL(page.url()).searchParams.get('floor')).toBe(secondId)
  const points = await page.evaluate(() => JSON.parse(localStorage.getItem('space-map-points')!))
  expect(points.building[0].id).toBe('entrance')
  expect(points[`building:floor:${secondId}`]).toHaveLength(1)
})

test('deleting the original floor cleans only its media and leaves later floor panoramas readable', async ({ page }) => {
  await seedLegacyMedia(page)
  const secondId = await add(page)
  await draw(page, 'Эллипс')
  await page.evaluate(async (secondId) => {
    const db = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open('space-map-db', 1); request.onsuccess = () => resolve(request.result) })
    const blob = await new Promise<Blob>((resolve) => { const request = db.transaction('map-images').objectStore('map-images').get('building'); request.onsuccess = () => resolve(request.result) })
    await new Promise<void>((resolve) => {
      const tx = db.transaction('map-images', 'readwrite')
      tx.objectStore('map-images').put(blob, `building:floor:${secondId}`)
      tx.objectStore('map-images').put(blob, `panorama:building:floor:${secondId}:room`)
      tx.oncomplete = () => resolve()
    })
    db.close()
    localStorage.setItem('space-map-points', JSON.stringify({ building: [{ id: 'entrance', title: 'Первый этаж', x: 50, y: 50 }], [`building:floor:${secondId}`]: [{ id: 'room', title: 'Второй этаж', x: 50, y: 50 }] }))
  }, secondId)
  await choose(page, '1')
  await openPicker(page)
  await picker(page).getByRole('button', { name: 'Удалить этаж', exact: true }).click()
  await page.getByRole('dialog', { name: 'Удалить этаж?', exact: true }).getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(floorButton(page)).toHaveText('Этаж: 2▾')
  const keys = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open('space-map-db', 1); request.onsuccess = () => resolve(request.result) })
    const keys = await new Promise<IDBValidKey[]>((resolve) => { const request = db.transaction('map-images').objectStore('map-images').getAllKeys(); request.onsuccess = () => resolve(request.result) })
    db.close(); return keys
  })
  expect(keys).not.toContain('building')
  expect(keys).not.toContain('panorama:building:entrance')
  expect(keys).toContain(`panorama:building:floor:${secondId}:room`)
  const points = await page.evaluate(() => JSON.parse(localStorage.getItem('space-map-points')!))
  expect(points.building).toBeUndefined()
  expect(points[`building:floor:${secondId}`]).toHaveLength(1)
  await page.getByRole('switch', { name: 'Режим 3D', exact: true }).click()
  await expect(page.locator('[data-viewer-status]')).toHaveAttribute('data-viewer-status', 'ready')
})

test('storage failures leave existing floors intact and the popup fits a narrow screen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openPicker(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('floor-picker-mobile.png'), fullPage: true })
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) { if (key === 'space-map-projects') throw new DOMException('Full', 'QuotaExceededError'); original.call(this, key, value) }
  })
  await picker(page).getByRole('button', { name: '+ Добавить этаж', exact: true }).click()
  await expect(picker(page).getByRole('alert')).toContainText('Не удалось добавить этаж')
  await expect(picker(page).getByRole('button', { name: '1', exact: true })).toBeVisible()
  expect((await project(page)).floors).toHaveLength(1)
})

test('project cards and Workspace previews follow the selected floor, including direct links', async ({ page }) => {
  await add(page)
  await draw(page, 'Эллипс')
  await page.goto('/')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Главный корпус', exact: true }) })
  await expect(card.getByText('Этажей: 2', { exact: true })).toBeVisible()
  await expect(card.getByRole('img').locator('ellipse')).toBeVisible()
  await page.goto('/workspace/campus')
  await expect(page.locator('[data-project-id="building"]').getByRole('img').locator('ellipse')).toBeVisible()
  await page.goto('/projects/building/editor?floor=default')
  await expect(canvas(page).locator('[data-object-id="legacy-room"]')).toBeVisible()
  await expect.poll(async () => (await project(page)).activeFloorId).toBe('default')
  await page.goto('/')
  await expect(card.getByRole('img').locator('rect')).toBeVisible()
})

test('failed deletion leaves the floor and media intact; clicking outside saves a renamed floor', async ({ page }) => {
  await seedLegacyMedia(page)
  await add(page)
  await choose(page, '1')
  await openPicker(page)
  await picker(page).getByRole('button', { name: 'Переименовать этаж 1', exact: true }).click()
  await picker(page).getByRole('textbox').fill('Приёмная')
  await canvas(page).click({ position: { x: 10, y: 10 } })
  await expect(floorButton(page)).toHaveText('Этаж: Приёмная▾')
  await openPicker(page)
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) { if (key === 'space-map-projects') throw new DOMException('Full', 'QuotaExceededError'); original.call(this, key, value) }
  })
  await picker(page).getByRole('button', { name: 'Удалить этаж', exact: true }).click()
  await page.getByRole('dialog', { name: 'Удалить этаж?', exact: true }).getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(picker(page).getByRole('alert')).toContainText('Не удалось удалить этаж')
  expect((await project(page)).floors).toHaveLength(2)
  const exists = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open('space-map-db', 1); request.onsuccess = () => resolve(request.result) })
    const blob = await new Promise<Blob>((resolve) => { const request = db.transaction('map-images').objectStore('map-images').get('building'); request.onsuccess = () => resolve(request.result) })
    db.close(); return !!blob
  })
  expect(exists).toBe(true)
})
