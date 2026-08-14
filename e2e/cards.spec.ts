import { expect, test } from '@playwright/test'

/**
 * /cards smoke — card #127's exit criterion: create, appears in the grid,
 * edit, delete, confirm dialog with reassignment copy. A fresh install ships
 * with no cards, so the reassignment flow needs a second card created first
 * — `deleteCard` requires a *different* existing card to move installments
 * to, and the confirm dialog blocks deletion entirely when there is none.
 */

test('create, edit, and delete a card with a reassignment confirmation', async ({ page }) => {
  await page.goto('/cards')
  await expect(page.getByTestId('cards-screen')).toBeVisible()

  // A second card, so the one under test has somewhere to reassign to.
  await page.getByTestId('card-new').click()
  await page.getByTestId('card-name').fill('Itaú')
  await page.getByTestId('card-form-submit').click()

  // Create the card under test
  await page.getByTestId('card-new').click()
  await page.getByTestId('card-name').fill('Nubank')
  await page.getByTestId('card-form-submit').click()

  const nubankTile = page.locator('[data-testid^="card-tile-"]', { hasText: 'Nubank' })
  await expect(nubankTile).toBeVisible()
  const nubankId = (await nubankTile.getAttribute('data-testid'))?.replace('card-tile-', '')
  expect(nubankId).toBeTruthy()

  // Edit
  await page.getByTestId(`card-edit-${nubankId}`).click()
  await page.getByTestId('card-name').fill('Nubank Platinum')
  await page.getByTestId('card-form-submit').click()
  await expect(page.getByTestId(`card-tile-${nubankId}`)).toContainText('Nubank Platinum')

  // Delete, with the reassignment confirmation
  await page.getByTestId(`card-delete-${nubankId}`).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Nubank Platinum')
  await expect(page.getByTestId('card-reassign-select')).toBeVisible()

  await page.getByTestId('delete-card-confirm').click()

  await expect(page.getByTestId(`card-tile-${nubankId}`)).not.toBeVisible()
})

test('blocks deleting the only card, with the "add another card" message', async ({ page }) => {
  await page.goto('/cards')

  await page.getByTestId('card-new').click()
  await page.getByTestId('card-name').fill('Solo Card')
  await page.getByTestId('card-form-submit').click()

  const tile = page.locator('[data-testid^="card-tile-"]', { hasText: 'Solo Card' })
  const id = (await tile.getAttribute('data-testid'))?.replace('card-tile-', '')

  await page.getByTestId(`card-delete-${id}`).click()

  await expect(page.getByRole('alertdialog')).toContainText('Add another card first')
  await expect(page.getByTestId('delete-card-confirm')).toBeDisabled()
})

test('opens the card detail overlay', async ({ page }) => {
  await page.goto('/cards')

  await page.getByTestId('card-new').click()
  await page.getByTestId('card-name').fill('Nubank')
  await page.getByTestId('card-form-submit').click()

  const tile = page.locator('[data-testid^="card-tile-"]', { hasText: 'Nubank' })
  const id = (await tile.getAttribute('data-testid'))?.replace('card-tile-', '')

  await page.getByTestId(`card-detail-${id}`).click()

  await expect(page.getByTestId('card-detail-dialog')).toBeVisible()
  await expect(page.getByTestId('card-detail-dialog')).toContainText('Nubank')
})
