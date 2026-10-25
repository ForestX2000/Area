import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const ADMIN = { email: 'demo@spacemap.ru', password: 'SpaceMap123!' }
const VIEWER = { email: 'user@spacemap.ru', password: 'Viewer123!' }

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

async function seed(page: Page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('space-map-projects')) return
    localStorage.setItem('space-map-projects', JSON.stringify([
      { id: 'office', name: 'Офис на Тверской', description: 'Открытое пространство', createdAt: '2026-10-24', drawings: [
        { id: 'hall', type: 'rectangle', label: 'Холл', points: [{ x: 0, y: 0 }, { x: 300, y: 200 }] },
        { id: 'to-store', type: 'marker', markerKind: 'navigation', label: 'В склад', targetProjectId: 'store', points: [{ x: 250, y: 150 }, { x: 250, y: 150 }] },
      ] },
      { id: 'store', name: 'Склад', description: '', createdAt: '2026-10-24', drawings: [
        { id: 'rack', type: 'rectangle', label: 'Стеллажи', points: [{ x: 0, y: 0 }, { x: 200, y: 100 }] },
      ] },
    ]))
    localStorage.setItem('space-map-points', JSON.stringify({ office: [{ id: 'lobby', title: 'Ресепшен', description: 'Встреча гостей', x: 30, y: 40 }] }))
  })
  await page.goto('/login')
  const image = await page.evaluate(panoramaImage)
  await page.evaluate(async (image) => {
    const blob = await (await fetch(`data:image/png;base64,${image}`)).blob()
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('space-map-db')
      request.onupgradeneeded = () => request.result.createObjectStore('map-images')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('map-images', 'readwrite')
      tx.objectStore('map-images').put(blob, 'panorama:office:lobby')
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    })
  }, image)
}

async function signIn(page: Page, account: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Пароль', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await seed(page)
})

test('registration creates a regular user who sees objects and cannot open admin pages', async ({ page }) => {
  await page.getByRole('tab', { name: 'Регистрация' }).click()
  await page.getByLabel('Имя').fill('Пётр')
  await page.getByLabel('Email').fill('petr@example.com')
  await page.getByLabel('Пароль', { exact: true }).fill('short')
  await expect(page.getByText('Пароль должен быть не короче 8 символов.')).toBeVisible()
  await page.getByLabel('Пароль', { exact: true }).fill('Secret123')
  await page.getByLabel('Повторите пароль').fill('Secret124')
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await expect(page.getByRole('alert')).toHaveText('Пароли не совпадают.')
  await page.getByLabel('Повторите пароль').fill('Secret123')
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Объекты' })).toBeVisible()
  await expect(page.getByText('Рабочая область')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Профиль: Пётр' })).toBeVisible()
  await page.getByRole('button', { name: 'Открыть меню' }).click()
  const menu = page.getByRole('navigation', { name: 'Главная навигация' })
  await expect(menu.getByRole('link')).toHaveText(['Объекты', 'Профиль'].map((label) => new RegExp(label)))
  await page.goto('/projects/office/editor')
  await expect(page).toHaveURL('/')
  await page.goto('/stats')
  await expect(page).toHaveURL('/')

  // Повторная регистрация на тот же адрес отклоняется.
  await page.getByRole('button', { name: 'Выйти из аккаунта' }).click()
  await page.getByRole('tab', { name: 'Регистрация' }).click()
  await page.getByLabel('Имя').fill('Другой')
  await page.getByLabel('Email').fill('PETR@example.com')
  await page.getByLabel('Пароль', { exact: true }).fill('Secret123')
  await page.getByLabel('Повторите пароль').fill('Secret123')
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await expect(page.getByRole('alert')).toHaveText('Пользователь с таким email уже зарегистрирован.')
  const stored = await page.evaluate(() => localStorage.getItem('space-map-accounts')!)
  expect(stored).not.toContain('Secret123')
})

test('login rejects a wrong password and fills demo access', async ({ page }) => {
  await signIn(page, { email: VIEWER.email, password: 'wrong-password1' })
  await expect(page.getByRole('alert')).toContainText('Неверный email или пароль')
  await page.getByRole('button', { name: 'Подставить вход: Администратор' }).click()
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Мои проекты' })).toBeVisible()
})

test('a user opens an object in 2D and 3D, follows a navigation marker and the visits reach admin statistics', async ({ page }) => {
  await signIn(page, VIEWER)
  const office = page.getByRole('listitem').filter({ hasText: 'Офис на Тверской' })
  const store = page.getByRole('listitem').filter({ hasText: 'Склад' })
  await expect(office.getByText('Есть панорамы 360°')).toBeVisible()
  await expect(store.getByRole('button', { name: 'Открыть в 3D' })).toBeDisabled()

  await office.getByRole('link', { name: 'Открыть в 2D' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Офис на Тверской' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Добавить|Удалить|Загрузить/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Точка: Ресепшен' }).click()
  await expect(page.getByText('Встреча гостей')).toBeVisible()
  await page.getByRole('button', { name: 'Открыть панораму 360°' }).click()
  const sphere = page.getByRole('dialog').getByRole('application')
  await expect(sphere).toHaveAttribute('data-viewer-status', 'ready')
  await expect(page).toHaveURL(/mode=3d/)
  await page.keyboard.press('Escape')
  await expect(sphere).toHaveCount(0)
  await expect(page).toHaveURL(/mode=2d/)

  await page.getByRole('button', { name: 'Метка: В склад' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Склад' })).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Режим 3D' })).toBeDisabled()

  await page.goto('/')
  await office.getByRole('link', { name: 'Открыть в 3D' }).click()
  await expect(sphere).toHaveAttribute('data-viewer-status', 'ready')

  // Администратор видит эти посещения в статистике проекта.
  await page.getByRole('dialog').getByRole('button', { name: 'К плану' }).click()
  await page.getByRole('button', { name: 'Выйти из аккаунта' }).click()
  await signIn(page, ADMIN)
  const card = page.locator('article').filter({ hasText: 'Офис на Тверской' })
  await card.getByRole('link', { name: 'Посмотреть статистику: Офис на Тверской' }).click()
  await expect(page).toHaveURL('/stats/office')
  await expect(page.getByRole('heading', { level: 1, name: 'Статистика: Офис на Тверской' })).toBeVisible()
  const sources = page.getByRole('region', { name: 'Источники переходов' })
  await expect(sources.getByText('Список объектов', { exact: true })).toBeVisible()
  await expect(sources.getByText('Навигационная метка', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Нажатия кнопок' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Самые активные' })).toHaveCount(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('space-map-analytics')!).some((event: { type: string }) => event.type === 'click'))).toBe(false)
  await expect(page.getByRole('region', { name: 'Доля проекта' }).getByRole('meter', { name: 'Доля просмотров' })).toBeVisible()
  await page.goto('/stats/store')
  await expect(page.getByRole('region', { name: 'Источники переходов' }).getByText('Навигационная метка', { exact: true })).toBeVisible()
})

test('statistics show totals, the project share and filter by source', async ({ page }) => {
  await page.evaluate(() => {
    const now = Date.now()
    const event = (projectId: string, type: string, extra: object = {}) => ({ id: Math.random().toString(36), ts: now - 1000, type, projectId, userId: 'u1', role: 'user', page: 'viewer', source: 'direct', entry: 'direct', mode: '2d', ...extra })
    localStorage.setItem('space-map-analytics', JSON.stringify([
      event('office', 'view'), event('office', 'view', { userId: 'u2' }), event('office', 'view', { source: 'utm:telegram', entry: 'utm:telegram', mode: '3d' }),
      event('store', 'view'),
      event('office', 'click', { target: 'Открыть в 3D' }), event('office', 'click', { target: 'Открыть в 3D', entry: 'utm:telegram' }),
      event('office', 'panorama', { target: 'Ресепшен' }),
    ]))
  })
  await signIn(page, ADMIN)
  await page.goto('/stats/office')
  const tile = (label: string) => page.getByRole('group', { name: label, exact: true })
  await expect(tile('Просмотры')).toContainText('3')
  await expect(tile('Уникальные посетители')).toContainText('2')
  await expect(tile('Нажатия кнопок')).toHaveCount(0)
  await expect(tile('Открытия панорам')).toContainText('1')
  await expect(page.getByRole('meter', { name: 'Доля просмотров' })).toHaveAttribute('aria-valuenow', '75')
  await expect(page.getByText('1 из 2')).toBeVisible()
  // Посещаемость всего сайта за сегодня не зависит от проекта и фильтров.
  const today = page.getByRole('region', { name: 'Сегодня на сайте' })
  const todayViews = await tile('Просмотры сегодня').textContent()
  expect(Number(todayViews!.match(/\d+/)![0])).toBeGreaterThanOrEqual(4)

  await page.getByLabel('Источник', { exact: true }).selectOption('utm:telegram')
  await expect(tile('Просмотры')).toContainText('1')
  await expect(today.getByRole('group', { name: 'Просмотры сегодня', exact: true })).toHaveText(todayViews!)
  await expect(page.getByRole('region', { name: 'Источники переходов' }).getByText('Кампания «telegram»', { exact: true })).toBeVisible()

  await page.getByLabel('Проект', { exact: true }).selectOption('')
  await expect(page).toHaveURL('/stats')
  await expect(page.getByRole('region', { name: 'Проекты' }).getByRole('link', { name: 'Офис на Тверской' })).toBeVisible()
  // Клики по самой странице статистики не записываются.
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('space-map-analytics')!).length)
  await page.getByRole('radio', { name: '7 дней' }).click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('space-map-analytics')!).length)).toBe(before)
})

test('demo statistics can be generated and removed', async ({ page }) => {
  await signIn(page, ADMIN)
  await page.goto('/stats')
  await expect(page.getByRole('heading', { name: 'Нет посещений' })).toBeVisible()
  await page.getByRole('button', { name: 'Сгенерировать демо-данные' }).first().click()
  await expect(page.getByRole('heading', { name: 'Нет посещений' })).toHaveCount(0)
  await expect(page.getByRole('img', { name: /^Просмотры по дням: всего/ })).toBeVisible()
  await page.getByRole('button', { name: 'Удалить демо-данные' }).click()
  await expect(page.getByRole('heading', { name: 'Нет посещений' })).toBeVisible()
})

test('the dark theme keeps the palette and persists after reload', async ({ page }) => {
  await signIn(page, VIEWER)
  const toggle = page.getByRole('switch', { name: 'Тёмная тема' })
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(background).toBe('rgb(18, 19, 19)')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('switch', { name: 'Тёмная тема' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('img', { name: 'ТТК · ТрансТелеКом' })).toHaveAttribute('src', '/ttk-logo-dark.svg')
  await page.getByRole('switch', { name: 'Тёмная тема' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('profile changes the name and password; a regular user has no photo', async ({ page }) => {
  await signIn(page, VIEWER)
  await page.getByRole('link', { name: 'Профиль: Мария' }).click()
  await page.getByRole('textbox', { name: 'Имя', exact: true }).fill('Мария Иванова')
  await page.getByRole('button', { name: 'Сохранить имя' }).click()
  await expect(page.getByRole('link', { name: 'Профиль: Мария Иванова' })).toBeVisible()

  const passwords = page.getByRole('region', { name: 'Пароль' })
  await passwords.getByLabel('Текущий пароль').fill('wrong-pass1')
  await passwords.getByLabel('Новый пароль').fill('NewViewer1')
  await passwords.getByLabel('Повторите пароль').fill('NewViewer1')
  await passwords.getByRole('button', { name: 'Сменить пароль' }).click()
  await expect(passwords.getByRole('alert')).toHaveText('Неверный текущий пароль.')
  await passwords.getByLabel('Текущий пароль').fill(VIEWER.password)
  await passwords.getByRole('button', { name: 'Сменить пароль' }).click()
  await expect(passwords.getByRole('status')).toHaveText('Пароль изменён.')

  await expect(page.getByLabel('Загрузить фото профиля')).toHaveCount(0)
  // Фото, сохранённое до запрета, у обычного пользователя не показывается.
  await page.evaluate(() => {
    const accounts = JSON.parse(localStorage.getItem('space-map-accounts')!)
    for (const account of accounts) if (account.email === 'user@spacemap.ru') account.avatar = 'data:image/png;base64,iVBORw0KGgo='
    localStorage.setItem('space-map-accounts', JSON.stringify(accounts))
    const session = JSON.parse(localStorage.getItem('space-map-demo-user')!)
    localStorage.setItem('space-map-demo-user', JSON.stringify({ ...session, avatar: 'data:image/png;base64,iVBORw0KGgo=' }))
  })
  await page.reload()
  await expect(page.getByRole('link', { name: 'Профиль: Мария Иванова' }).getByRole('img')).toHaveCount(0)

  await page.getByRole('button', { name: 'Выйти из аккаунта' }).first().click()
  await signIn(page, { email: VIEWER.email, password: 'NewViewer1' })
  await expect(page.getByRole('link', { name: 'Профиль: Мария Иванова' })).toBeVisible()
})

test('an administrator uploads a cropped profile photo', async ({ page }) => {
  await signIn(page, ADMIN)
  await page.getByRole('link', { name: 'Профиль: Иван' }).click()
  const photo = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 600
    canvas.height = 400
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#2563eb'
    ctx.fillRect(0, 0, 600, 400)
    ctx.fillStyle = '#dc2538'
    ctx.fillRect(250, 150, 100, 100)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.getByLabel('Загрузить фото профиля').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: Buffer.from(photo, 'base64') })
  const crop = page.getByRole('dialog', { name: 'Кадрирование аватара' })
  await crop.getByLabel('Масштаб').fill('2')
  const area = crop.getByRole('application', { name: 'Область кадрирования' })
  const box = (await area.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 4 })
  await page.mouse.up()
  await crop.getByRole('button', { name: 'Сохранить аватар' }).click()
  await expect(crop).toHaveCount(0)
  const avatar = page.getByRole('link', { name: 'Профиль: Иван' }).getByRole('img')
  await expect(avatar).toHaveAttribute('src', /^data:image\/jpeg;base64,/)
  const size = await avatar.evaluate((node: HTMLImageElement) => new Promise<number[]>((resolve) => {
    const image = new Image()
    image.onload = () => resolve([image.naturalWidth, image.naturalHeight])
    image.src = node.src
  }))
  expect(size).toEqual([256, 256])
})

test('the menu item opens the same project creation form as the header button', async ({ page }) => {
  await signIn(page, ADMIN)
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Открыть меню' }).click()
  await page.getByRole('navigation', { name: 'Главная навигация' }).getByRole('link', { name: 'Создать проект' }).click()
  await page.getByLabel('Название проекта', { exact: true }).fill('Новый корпус')
  await page.getByRole('button', { name: 'Создать проект', exact: true }).last().click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Новый корпус' })).toBeVisible()
  await page.goto('/projects/new')
  await expect(page).toHaveURL('/?create=project')
  await expect(page.getByLabel('Название проекта', { exact: true })).toBeVisible()
})