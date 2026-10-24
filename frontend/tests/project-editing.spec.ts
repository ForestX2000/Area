import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('space-map-demo-user', JSON.stringify({ id: 'edit', name: 'Тест', email: 'test@example.com', role: 'admin' }))
    if (!localStorage.getItem('space-map-projects')) {
      localStorage.setItem('space-map-projects', JSON.stringify([{
        id: 'office', name: 'Главный офис', description: 'Первый этаж', createdAt: '2026-10-24',
        drawings: [{ id: 'room', type: 'rectangle', points: [{ x: 10, y: 20 }, { x: 100, y: 80 }] }],
      }]))
    }
  })
  await page.goto('/projects/office')
})

test('pencils open the relevant field and save without losing the drawing', async ({ page }, testInfo) => {
  await expect(page.getByRole('button', { name: 'Редактировать', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Редактор чертежа' })).toHaveText('Редактор чертежа')
  await page.screenshot({ path: testInfo.outputPath('project-details.png'), fullPage: true })

  await page.getByRole('button', { name: 'Редактировать название' }).click()
  const dialog = page.getByRole('dialog', { name: 'Редактирование проекта' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Название проекта')).toBeFocused()
  await dialog.getByLabel('Название проекта').fill('Новый офис')
  await dialog.getByRole('button', { name: 'Сохранить изменения' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Новый офис')

  await page.getByRole('button', { name: 'Редактировать описание' }).click()
  await expect(dialog.getByLabel('Описание', { exact: true })).toBeFocused()
  await dialog.getByLabel('Описание', { exact: true }).fill('Второй этаж')
  await page.screenshot({ path: testInfo.outputPath('project-edit-dialog.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Сохранить изменения' }).click()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Новый офис')
  await expect(page.getByText('Второй этаж', { exact: true })).toBeVisible()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('space-map-projects')!)[0])
  expect(stored.drawings).toEqual([{ id: 'room', type: 'rectangle', points: [{ x: 10, y: 20 }, { x: 100, y: 80 }] }])
})

test('cancel, Escape and close discard edits and return focus to the pencil', async ({ page }) => {
  const pencil = page.getByRole('button', { name: 'Редактировать название' })
  const dialog = page.getByRole('dialog')
  for (const close of ['Отмена', 'Escape', 'Закрыть окно редактирования']) {
    await pencil.click()
    await expect(dialog.getByLabel('Название проекта')).toHaveValue('Главный офис')
    await dialog.getByLabel('Название проекта').fill('Не сохранять')
    if (close === 'Escape') await page.keyboard.press('Escape')
    else await dialog.getByRole('button', { name: close, exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await expect(pencil).toBeFocused()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Главный офис')
  }
})

test('empty descriptions remain editable on a narrow screen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const pencil = page.getByRole('button', { name: 'Редактировать описание' })
  await pencil.click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Описание', { exact: true }).fill('')
  await dialog.getByRole('button', { name: 'Сохранить изменения' }).click()
  await expect(page.getByText('Описание пока не добавлено.')).toBeVisible()
  await pencil.click()
  await expect(dialog.getByLabel('Описание', { exact: true })).toBeFocused()
  await expect(dialog.getByLabel('Описание', { exact: true })).toHaveValue('')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('project-edit-mobile.png'), fullPage: true })
})
