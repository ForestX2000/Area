import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { DrawingObject } from '../src/types/drawing'

const admin = { id: 'admin', name: 'Иван', email: 'demo@spacemap.ru', role: 'admin' }
const room = (id: string, label: string) => ({ id, type: 'rectangle', label, points: [{ x: 0, y: 0 }, { x: 200, y: 100 }] })

function seed(page: Page, projects: unknown[], user: unknown = admin) {
  return page.addInitScript(({ projects, user }) => {
    if (user) localStorage.setItem('space-map-demo-user', JSON.stringify(user))
    if (!localStorage.getItem('space-map-projects')) localStorage.setItem('space-map-projects', JSON.stringify(projects))
  }, { projects, user })
}

const canvas = (page: Page) => page.getByRole('application', { name: 'Холст чертежа' })
const floorDrawings = (page: Page, floorId: string): Promise<DrawingObject[]> => page.evaluate((id) =>
  JSON.parse(localStorage.getItem('space-map-projects')!)[0].floors.find((floor: { id: string }) => floor.id === id).drawings, floorId)

test('Workspace works as project folders: create a folder, drop a map into it, open and empty it', async ({ page }) => {
  await seed(page, [
    { id: 'office', name: 'Офис', description: '', createdAt: '2026-10-25' },
    { id: 'store', name: 'Склад', description: '', createdAt: '2026-10-25' },
  ])
  await page.goto('/')
  const filters = page.getByRole('navigation', { name: 'Фильтр проектов' })
  await filters.getByRole('button', { name: 'Workspace', exact: true }).click()
  await expect(page.getByText('Нет папок проектов')).toBeVisible()

  await page.getByRole('button', { name: 'Создать проект' }).first().click()
  await expect(page.getByRole('heading', { name: 'Создание папки' })).toBeVisible()
  await page.getByLabel('Название папки').fill('Филиал на Ленина')
  await page.getByRole('button', { name: 'Создать папку', exact: true }).click()
  const folder = page.getByRole('article', { name: 'Папка: Филиал на Ленина', exact: true })
  await expect(folder).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('space-map-projects')!).length)).toBe(2)

  await filters.getByRole('button', { name: 'Все', exact: true }).click()
  await page.locator('[draggable="true"]').filter({ hasText: 'Офис' }).dragTo(folder)
  await expect(folder).toContainText('Карт в папке: 1')

  await folder.getByRole('button', { name: 'Открыть папку' }).click()
  const opened = page.getByRole('region', { name: 'Папка Филиал на Ленина' })
  await expect(opened.getByRole('heading', { name: 'Офис' })).toBeVisible()
  await opened.getByLabel('Карта для папки').selectOption({ label: 'Склад' })
  await opened.getByRole('button', { name: 'Добавить в папку' }).click()
  await expect(opened.getByRole('heading', { name: 'Склад' })).toBeVisible()
  await opened.getByRole('button', { name: 'Убрать из папки' }).first().click()
  await expect(opened.getByRole('heading', { name: 'Офис' })).toHaveCount(0)
  // Карта убрана только из папки, сам проект остался.
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('space-map-projects')!).length)).toBe(2)
})

test('the whole plan can be copied on one floor and pasted on another at the same place', async ({ page }) => {
  await seed(page, [{ id: 'tower', name: 'Башня', description: '', createdAt: '2026-10-25', activeFloorId: 'default', floors: [
    { id: 'default', number: 1, name: '1', drawings: [room('hall', 'Холл'), { id: 'wall', type: 'line', points: [{ x: 0, y: 150 }, { x: 300, y: 150 }] }] },
    { id: 'second', number: 2, name: '2', drawings: [] },
  ] }])
  await page.goto('/projects/tower/editor?floor=default')
  await canvas(page).click({ position: { x: 600, y: 400 }, button: 'right' })
  await page.getByRole('menuitem', { name: 'Копировать весь этаж' }).click()

  await page.goto('/projects/tower/editor?floor=second')
  await expect(canvas(page)).toBeVisible()
  await canvas(page).focus()
  await page.keyboard.press('Control+v')
  await expect(canvas(page).locator('[data-object-id]')).toHaveCount(2)
  const pasted = await floorDrawings(page, 'second')
  const original = await floorDrawings(page, 'default')
  expect(pasted.map((object) => object.points)).toEqual(original.map((object) => object.points))
  expect(pasted.map((object) => object.label)).toEqual(['Холл', undefined])
  expect(new Set([...pasted, ...original].map((object) => object.id)).size).toBe(4)
})

test.describe('sharing', () => {
  const snapshot = {
    version: 1, name: 'Выставочный центр', description: 'Павильон 3',
    floors: [{ id: 'default', number: 1, name: '1', drawings: [room('hall', 'Главный зал'),
      { id: 'info', type: 'marker', markerKind: 'info', label: 'Касса', description: 'Работает до 20:00', points: [{ x: 100, y: 50 }, { x: 100, y: 50 }] }],
    points: [], panoramas: [], hotspots: {} }],
  }

  test('the admin creates a link from the editor', async ({ page }) => {
    await seed(page, [{ id: 'expo', name: 'Выставочный центр', description: '', createdAt: '2026-10-25', drawings: [room('hall', 'Главный зал')] }])
    let uploaded: Record<string, unknown> | null = null
    await page.route('**/api/shares', async (route) => {
      const body = route.request().postData() ?? ''
      const json = body.match(/name="snapshot"\r\n\r\n([\s\S]*?)\r\n--/)?.[1]
      uploaded = json ? JSON.parse(json) : null
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'expo-share-1' }) })
    })
    await page.goto('/projects/expo/editor')
    await page.getByRole('button', { name: 'Поделиться' }).click()
    const dialog = page.getByRole('dialog', { name: 'Выставочный центр' })
    await dialog.getByRole('button', { name: 'Создать ссылку' }).click()
    await expect(dialog.getByLabel('Ссылка для просмотра')).toHaveValue(/\/share\/expo-share-1$/)
    expect(uploaded).toMatchObject({ version: 1, name: 'Выставочный центр', floors: [{ id: 'default', drawings: [{ label: 'Главный зал' }] }] })
  })

  test('a visitor opens the link without login and can only view the project', async ({ page }) => {
    await seed(page, [], null)
    await page.route('**/api/shares/viewer-share-1', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'viewer-share-1', snapshot, files: [] }) }))
    await page.goto('/share/viewer-share-1')
    await expect(page).toHaveURL(/\/share\/viewer-share-1$/)
    await expect(page.getByRole('heading', { name: 'Выставочный центр', level: 1 })).toBeVisible()
    await expect(page.getByText('Только просмотр')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Войти' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Метка: Касса' }).click()
    await expect(page.getByRole('region', { name: 'Выбранный объект' })).toContainText('Работает до 20:00')
    await expect(page.getByRole('application', { name: 'Холст чертежа' })).toHaveCount(0)
  })

  test('an unknown link explains the problem instead of asking to log in', async ({ page }) => {
    await seed(page, [], null)
    await page.route('**/api/shares/missing-share', (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"Ссылка не найдена."}' }))
    await page.goto('/share/missing-share')
    await expect(page.getByRole('alert')).toContainText('Ссылка не найдена')
    await expect(page).toHaveURL(/\/share\/missing-share$/)
  })
})
