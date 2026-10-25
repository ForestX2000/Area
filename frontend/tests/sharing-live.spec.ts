import { expect, test } from '@playwright/test'

// Run against the real backend: PLAYWRIGHT_LIVE_API=1 npx playwright test sharing-live.spec.ts
test.skip(!process.env.PLAYWRIGHT_LIVE_API, 'Requires a running backend on port 8000')

test('a created public link opens its plans, floors and panorama in a new anonymous browser context', async ({ page, browser }) => {
  await page.addInitScript(() => {
    localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'author', name: 'Автор', email: 'author@example.com', role: 'admin' }))
    if (!localStorage.getItem('space-map-projects')) localStorage.setItem('space-map-projects', JSON.stringify([{
      id: 'live-share', name: 'Публичный просмотр', description: 'Проверка гостевого доступа', createdAt: '2026-10-25',
      floors: [
        { id: 'default', number: 1, name: '1', drawings: [
          { id: 'room', type: 'rectangle', label: 'Холл', points: [{ x: 0, y: 0 }, { x: 200, y: 100 }] },
          { id: 'hall-360', type: 'marker', markerKind: 'navigation', label: 'Панорама холла', panoramaKey: 'saved', points: [{ x: 100, y: 50 }] },
        ] },
        { id: 'upper', number: 2, name: '2', drawings: [
          { id: 'office', type: 'rectangle', label: 'Кабинет', points: [{ x: 0, y: 0 }, { x: 150, y: 100 }] },
        ] },
      ],
    }]))
  })
  await page.goto('/projects/live-share/editor')
  await page.evaluate(async () => {
    // Seed the author's local images, which must be uploaded into the public snapshot.
    const storage = await import('/src/utils/mapStorage.ts')
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const context = canvas.getContext('2d')!
    context.fillStyle = '#2563eb'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#dd2538'
    context.fillRect(0, 0, canvas.width / 2, canvas.height)
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'))
    await storage.saveMapImage('live-share', new File([blob], 'plan.png', { type: 'image/png' }))
    await storage.savePanorama('live-share', 'hall-360', new File([blob], 'panorama.png', { type: 'image/png' }))
  })
  await page.getByRole('button', { name: 'Поделиться', exact: true }).click()
  const link = page.getByRole('dialog', { name: 'Публичный просмотр' }).getByLabel('Ссылка для просмотра')
  await expect(link).toHaveValue(/\/share\/[A-Za-z0-9_-]+$/)
  const url = await link.inputValue()

  const guest = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  try {
    const viewer = await guest.newPage()
    const errors: string[] = []
    viewer.on('pageerror', (error) => errors.push(error.message))
    await viewer.goto(url)
    await expect(viewer.getByRole('heading', { name: 'Публичный просмотр', level: 1 })).toBeVisible()
    await expect(viewer.getByText('Только просмотр')).toBeVisible()
    const plan = viewer.getByRole('img', { name: 'План: Публичный просмотр' })
    await expect(plan).toBeVisible()
    await expect.poll(() => plan.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(1024)
    await viewer.getByRole('button', { name: /Панорама холла/ }).click()
    await expect(viewer.locator('[data-viewer-status]')).toHaveAttribute('data-viewer-status', 'ready')
    await viewer.getByRole('button', { name: 'К плану', exact: true }).click()
    await viewer.getByLabel('Этаж', { exact: true }).selectOption('upper')
    await expect(viewer.getByRole('img', { name: 'План: Публичный просмотр' }).getByText('Кабинет', { exact: true })).toBeVisible()
    await viewer.reload()
    await expect(viewer.getByRole('heading', { name: 'Публичный просмотр', level: 1 })).toBeVisible()
    expect(await viewer.evaluate(() => localStorage.getItem('space-map-demo-user'))).toBeNull()
    await expect(viewer.getByRole('button', { name: 'Войти' })).toHaveCount(0)
    await expect(viewer.getByRole('application', { name: 'Холст чертежа' })).toHaveCount(0)
    expect(errors).toEqual([])
    // The same visitor still needs to sign in to use the editor.
    await viewer.goto('/projects/live-share/editor')
    await expect(viewer).toHaveURL(/\/login$/)
  } finally {
    await guest.close()
  }
})
