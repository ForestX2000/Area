import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { WorkspaceCollection } from '../src/types/workspace'

const surface = (page: Page) => page.getByRole('application', { name: 'Холст Workspace' })
const node = (page: Page, id: string) => surface(page).locator(`[data-project-id="${id}"]`)
const groups = (page: Page) => surface(page).locator('[data-workspace-group]')
const choose = (page: Page, name: string) => page.getByRole('checkbox', { name: `Выбрать карту: ${name}`, exact: true })

async function stored(page: Page): Promise<WorkspaceCollection> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('space-map-workspaces')!))
}

// Workspace больше не создаются из формы проекта, поэтому тест сохраняет его в хранилище напрямую.
async function seedWorkspace(page: Page, name: string) {
  await page.evaluate((workspaceName) => {
    const saved = JSON.parse(localStorage.getItem('space-map-workspaces') ?? 'null')
    const collection = saved?.version === 1 ? saved : { version: 1, activeId: '', workspaces: [] }
    const workspace = { id: crypto.randomUUID(), name: workspaceName, description: '', nodes: [], groups: [], view: { x: 0, y: 0, zoom: 1 } }
    collection.workspaces.push(workspace)
    collection.activeId = workspace.id
    localStorage.setItem('space-map-workspaces', JSON.stringify(collection))
  }, name)
}

async function createFromProjects(page: Page, name: string) {
  await page.goto('/')
  await seedWorkspace(page, name)
  await page.reload()
  await page.getByRole('article').filter({ has: page.getByRole('heading', { name, exact: true }) }).getByRole('link', { name: 'Открыть Workspace' }).click()
}

async function positions(page: Page) {
  return surface(page).locator('[data-project-id]').evaluateAll((nodes) => nodes.map((node) => ({
    id: node.getAttribute('data-project-id'), x: parseFloat((node as HTMLElement).style.left), y: parseFloat((node as HTMLElement).style.top),
  })))
}

async function dragHeader(page: Page, id: string, dx: number, dy: number, cancel = false) {
  await node(page, id).scrollIntoViewIfNeeded()
  const box = (await node(page, id).boundingBox())!
  await page.mouse.move(box.x + 120, box.y + 24)
  await page.mouse.down()
  await page.mouse.move(box.x + 120 + dx, box.y + 24 + dy, { steps: 6 })
  if (cancel) await page.keyboard.press('Escape')
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'workspace', name: 'Тест', email: 'test@example.com', role: 'admin' }))
    if (!localStorage.getItem('space-map-projects')) {
      localStorage.setItem('space-map-projects', JSON.stringify([
        { id: 'a', name: 'Корпус А', description: '', createdAt: '2026-10-24', drawings: [
          { id: 'room-a', type: 'rectangle', points: [{ x: 0, y: 0 }, { x: 200, y: 100 }] },
        ] },
        { id: 'b', name: 'Корпус Б', description: '', createdAt: '2026-10-24', drawings: [
          { id: 'room-b', type: 'rectangle', points: [{ x: -50, y: -50 }, { x: 100, y: 100 }] },
        ] },
        { id: 'c', name: 'Склад', description: '', createdAt: '2026-10-24' },
      ]))
      localStorage.setItem('space-map-workspaces', JSON.stringify({ version: 1, activeId: 'main', workspaces: [{
        id: 'main', name: 'Основной Workspace', nodes: ['a', 'b', 'c'].map((projectId, index) => ({ projectId, x: 40 + index * 320, y: 80 })), groups: [], view: { x: 0, y: 0, zoom: 1 },
      }] }))
    }
  })
  await page.goto('/workspace')
  await expect(surface(page)).toBeVisible()
})

test('all existing maps appear on the initial board with links to the map and editor', async ({ page }, testInfo) => {
  await expect(surface(page).locator('[data-project-id]')).toHaveCount(3)
  await expect(node(page, 'a').getByRole('img', { name: 'Чертёж проекта «Корпус А»' })).toBeVisible()
  await expect(node(page, 'a').getByRole('link', { name: 'Открыть 2D-карту' })).toHaveAttribute('href', '/projects/a/map?mode=2d')
  await page.screenshot({ path: testInfo.outputPath('workspace-initial.png'), fullPage: true })
  await node(page, 'a').getByRole('link', { name: 'Открыть 2D-карту' }).click()
  await expect(page.getByRole('img', { name: 'План помещения', exact: true })).toBeVisible()
  await page.goto('/workspace')
  await node(page, 'a').getByRole('link', { name: 'Редактор', exact: true }).click()
  await expect(page.getByRole('application', { name: 'Холст чертежа' }).locator('[data-object-id="room-a"]')).toBeVisible()
})

test('combined maps move together, retain offsets, split and survive reload without changing source projects', async ({ page }, testInfo) => {
  const originalProjects = await page.evaluate(() => localStorage.getItem('space-map-projects'))
  await choose(page, 'Корпус А').check()
  await choose(page, 'Корпус Б').check()
  await page.getByRole('button', { name: 'Объединить', exact: true }).click()
  await expect(groups(page)).toHaveCount(1)
  await page.getByLabel('Название контейнера', { exact: true }).fill('Первый этаж')
  await page.getByLabel('Название контейнера', { exact: true }).press('Enter')
  const before = await positions(page)
  await dragHeader(page, 'a', 80, 40)
  const after = await positions(page)
  for (const item of after) {
    const previous = before.find((node) => node.id === item.id)!
    expect(item.x - previous.x).toBe(item.id === 'c' ? 0 : 80)
    expect(item.y - previous.y).toBe(item.id === 'c' ? 0 : 40)
  }
  await page.screenshot({ path: testInfo.outputPath('workspace-group.png'), fullPage: true })
  await page.reload()
  expect(await positions(page)).toEqual(after)
  await expect(groups(page).getByRole('button')).toHaveText('Первый этаж · 2 карты')
  await choose(page, 'Корпус А').check()
  await expect(choose(page, 'Корпус Б')).toBeChecked()
  await page.getByRole('button', { name: 'Разделить', exact: true }).click()
  await expect(groups(page)).toHaveCount(0)
  expect(await positions(page)).toEqual(after)
  await dragHeader(page, 'a', -40, 0)
  expect((await positions(page)).find((node) => node.id === 'b')).toEqual(after.find((node) => node.id === 'b'))
  expect(await page.evaluate(() => localStorage.getItem('space-map-projects'))).toBe(originalProjects)
})

test('several workspaces have independent membership, groups and placement', async ({ page }) => {
  await choose(page, 'Корпус А').check()
  await choose(page, 'Корпус Б').check()
  await page.getByRole('button', { name: 'Объединить', exact: true }).click()
  const initial = (await stored(page)).activeId
  await createFromProjects(page, 'Второй этаж')
  await expect(surface(page).locator('[data-project-id]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Добавить карту: Корпус А', exact: true }).click()
  await expect(surface(page).locator('[data-project-id]')).toHaveCount(1)
  await expect(groups(page)).toHaveCount(0)
  await dragHeader(page, 'a', 40, 20)
  const secondPosition = await positions(page)
  const second = (await stored(page)).activeId
  await page.getByLabel('Выбрать Workspace', { exact: true }).selectOption(initial)
  await expect(surface(page).locator('[data-project-id]')).toHaveCount(3)
  await expect(groups(page)).toHaveCount(1)
  await page.getByLabel('Выбрать Workspace', { exact: true }).selectOption(second)
  expect(await positions(page)).toEqual(secondPosition)
  await page.reload()
  await expect(page.getByLabel('Выбрать Workspace', { exact: true })).toHaveValue(second)
  expect(await positions(page)).toEqual(secondPosition)
  await page.getByLabel('Название текущего Workspace', { exact: true }).fill('План второго этажа')
  await page.getByLabel('Название текущего Workspace', { exact: true }).press('Enter')
  await expect(page.getByLabel('Выбрать Workspace', { exact: true })).toContainText('План второго этажа')
  await page.getByRole('button', { name: 'Удалить Workspace', exact: true }).click()
  await page.getByRole('dialog', { name: 'Удалить Workspace?', exact: true }).getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(page.getByLabel('Выбрать Workspace', { exact: true })).toHaveValue(initial)
  await expect(groups(page)).toHaveCount(1)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('space-map-projects')!).length)).toBe(3)
})

test('grouping, moving and removal can be undone and redone; Escape cancels a move', async ({ page }) => {
  await choose(page, 'Корпус А').check()
  await choose(page, 'Корпус Б').check()
  await page.getByRole('button', { name: 'Объединить', exact: true }).click()
  const original = await positions(page)
  await dragHeader(page, 'a', 60, 40, true)
  expect(await positions(page)).toEqual(original)
  await dragHeader(page, 'a', 60, 40)
  const moved = await positions(page)
  await surface(page).focus()
  await page.keyboard.press('Control+z')
  expect(await positions(page)).toEqual(original)
  await page.keyboard.press('Control+y')
  expect(await positions(page)).toEqual(moved)
  await choose(page, 'Корпус А').check()
  await surface(page).focus()
  await page.keyboard.press('Delete')
  await expect(surface(page).locator('[data-project-id]')).toHaveCount(1)
  await page.keyboard.press('Control+z')
  await expect(surface(page).locator('[data-project-id]')).toHaveCount(3)
  await expect(groups(page)).toHaveCount(1)
  await page.keyboard.press('Control+z')
  expect(await positions(page)).toEqual(original)
  await page.keyboard.press('Control+z')
  await expect(groups(page)).toHaveCount(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('space-map-projects')!).length)).toBe(3)
})

test('marquee selection works after zoom and panning, and can merge an existing group with another map', async ({ page }) => {
  await surface(page).focus()
  await page.getByRole('spinbutton', { name: 'Масштаб Workspace в процентах' }).fill('75')
  await page.getByRole('spinbutton', { name: 'Масштаб Workspace в процентах' }).press('Enter')
  const surfaceBox = (await surface(page).boundingBox())!
  await page.mouse.move(surfaceBox.x + 20, surfaceBox.y + 20)
  await page.mouse.wheel(40, 40)
  const a = (await node(page, 'a').boundingBox())!
  const b = (await node(page, 'b').boundingBox())!
  await page.mouse.move(a.x - 10, a.y - 10)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width + 5, b.y + b.height + 5, { steps: 7 })
  await page.mouse.up()
  await expect(choose(page, 'Корпус А')).toBeChecked()
  await expect(choose(page, 'Корпус Б')).toBeChecked()
  await expect(choose(page, 'Склад')).not.toBeChecked()
  await page.getByRole('button', { name: 'Объединить', exact: true }).click()
  await choose(page, 'Склад').check()
  await page.getByRole('button', { name: 'Объединить', exact: true }).click()
  await expect(groups(page)).toHaveCount(1)
  expect((await stored(page)).workspaces[0].groups[0].projectIds.sort()).toEqual(['a', 'b', 'c'])
})

test('Ctrl+wheel zooms only the board around the cursor; plain wheel and middle drag pan it', async ({ page }) => {
  const header = await page.locator('header').first().boundingBox()
  const box = (await surface(page).boundingBox())!
  const cursor = { x: box.x + 200, y: box.y + 200 }
  const before = (await node(page, 'a').boundingBox())!
  await page.mouse.move(cursor.x, cursor.y)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -150)
  await page.keyboard.up('Control')
  await expect.poll(async () => Number(await surface(page).getAttribute('data-zoom'))).toBeGreaterThan(1)
  const zoom = Number(await surface(page).getAttribute('data-zoom'))
  const after = (await node(page, 'a').boundingBox())!
  expect(after.width / before.width).toBeCloseTo(zoom, 3)
  expect(after.x).toBeCloseTo(cursor.x + (before.x - cursor.x) * zoom, 2)
  expect(await page.locator('header').first().boundingBox()).toEqual(header)
  expect(await page.evaluate(() => window.visualViewport!.scale)).toBe(1)
  const x = Number(await surface(page).getAttribute('data-pan-x'))
  await page.mouse.wheel(50, 25)
  await expect.poll(async () => Number(await surface(page).getAttribute('data-pan-x'))).toBeCloseTo(x - 50, 3)
  const pan = Number(await surface(page).getAttribute('data-pan-x'))
  await page.mouse.down({ button: 'middle' })
  await page.mouse.move(cursor.x + 40, cursor.y + 20, { steps: 5 })
  await page.mouse.up({ button: 'middle' })
  await expect.poll(async () => Number(await surface(page).getAttribute('data-pan-x'))).toBeCloseTo(pan + 40, 3)
  await page.reload()
  await expect(surface(page)).toHaveAttribute('data-zoom', String(zoom))
})

test('deleted projects are removed from workspaces and incomplete groups dissolve', async ({ page }) => {
  await choose(page, 'Корпус А').check()
  await choose(page, 'Корпус Б').check()
  await page.getByRole('button', { name: 'Объединить', exact: true }).click()
  await page.evaluate(() => {
    const projects = JSON.parse(localStorage.getItem('space-map-projects')!)
    localStorage.setItem('space-map-projects', JSON.stringify(projects.filter((project: { id: string }) => project.id !== 'b')))
  })
  await page.reload()
  await expect(surface(page).locator('[data-project-id]')).toHaveCount(2)
  await expect(groups(page)).toHaveCount(0)
})

test('Ctrl+A selects every map in the active Workspace and removal is undoable', async ({ page }) => {
  await surface(page).focus()
  await page.keyboard.press('Control+a')
  await expect(surface(page).locator('[data-selected]')).toHaveCount(3)
  await page.keyboard.press('Delete')
  await expect(surface(page).locator('[data-project-id]')).toHaveCount(0)
  await page.keyboard.press('Control+z')
  await expect(surface(page).locator('[data-project-id]')).toHaveCount(3)
})

test('dragging the container header moves all members and a second Workspace can add all maps', async ({ page }) => {
  await choose(page, 'Корпус А').check()
  await choose(page, 'Корпус Б').check()
  await page.getByRole('button', { name: 'Объединить', exact: true }).click()
  const before = await positions(page)
  const header = groups(page).getByRole('button')
  const box = (await header.boundingBox())!
  await page.mouse.move(box.x + 50, box.y + 10)
  await page.mouse.down()
  await page.mouse.move(box.x + 90, box.y + 50, { steps: 5 })
  await page.mouse.up()
  const after = await positions(page)
  expect(after[0].x - before[0].x).toBe(40)
  expect(after[1].y - before[1].y).toBe(40)
  expect(after[2]).toEqual(before[2])
  await createFromProjects(page, 'Следующий Workspace')
  await page.getByRole('button', { name: 'Добавить все карты', exact: true }).click()
  await expect(surface(page).locator('[data-project-id]')).toHaveCount(3)
  await page.getByRole('spinbutton', { name: 'Масштаб Workspace в процентах' }).fill('150')
  await page.getByRole('spinbutton', { name: 'Масштаб Workspace в процентах' }).press('Escape')
  await page.getByRole('spinbutton', { name: 'Масштаб Workspace в процентах' }).press('Tab')
  expect(Number(await surface(page).getAttribute('data-zoom'))).toBeLessThanOrEqual(1)
})

test('Workspace previews show the 2D plan even when the project has a panorama', async ({ page }) => {
  await page.evaluate(async () => {
    const makeImage = async (colour: string) => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 32
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = colour
      ctx.fillRect(0, 0, 64, 32)
      return await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!)))
    }
    const [plan, panorama] = await Promise.all([makeImage('#2863c7'), makeImage('#dd2538')])
    localStorage.setItem('space-map-points', JSON.stringify({ a: [{ id: 'room', title: 'Room', x: 50, y: 50 }] }))
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('space-map-db')
      request.onupgradeneeded = () => request.result.createObjectStore('map-images')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('map-images', 'readwrite')
      tx.objectStore('map-images').put(plan, 'a')
      tx.objectStore('map-images').put(panorama, 'panorama:a:room')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  })
  await page.reload()
  const image = node(page, 'a').getByRole('img', { name: 'План проекта «Корпус А»', exact: true })
  await expect(image).toBeVisible()
  await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  const pixel = await image.evaluate((node) => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(node as HTMLImageElement, 0, 0, 64, 32)
    return [...ctx.getImageData(32, 16, 1, 1).data]
  })
  expect(pixel).toEqual([40, 99, 199, 255])
})

test('empty projects, malformed layouts and storage errors keep navigation usable on a small screen', async ({ page }, testInfo) => {
  await page.evaluate(() => {
    localStorage.setItem('space-map-projects', '[]')
    localStorage.setItem('space-map-workspaces', '{broken')
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Нет Workspace' })).toBeVisible()
  await createFromProjects(page, 'Пустой Workspace')
  await expect(surface(page).getByText('Добавьте карты в Workspace', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Создать первую карту' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('workspace-mobile.png'), fullPage: true })
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'space-map-workspaces') throw new DOMException('Full', 'QuotaExceededError')
      setItem.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: 'Увеличить масштаб Workspace' }).click()
  await expect(page.getByRole('alert')).toContainText('Не удалось сохранить Workspace')
})
