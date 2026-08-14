import { expect, test } from '@playwright/test'

/**
 * /categories smoke — card #126's exit criterion, verbatim: create, appears
 * in the list, edit, delete, confirm dialog. The reassignment-to-`other` half
 * of "delete -> confirm -> reassigned to other" is verified at the store/
 * integration level (catalog-store.test.ts, CategoriesScreen.test.tsx) rather
 * than here: there is no ledger screen yet (Phase 3) for a browser to show
 * "this expense now reads Other" on — the only observable signal in a real
 * browser today is that the deleted category's row is gone and nothing errors.
 */

test('create, edit, and delete a category with confirmation', async ({ page }) => {
  await page.goto('/categories')
  await expect(page.getByTestId('categories-screen')).toBeVisible()

  const before = await page.getByTestId(/^category-row-/).count()

  // Create
  await page.getByTestId('category-new').click()
  await page.getByTestId('category-name').fill('Pets & Vet')
  await page.getByTestId('category-form-submit').click()

  await expect(page.getByTestId('category-row-pets-vet')).toBeVisible()
  await expect(page.getByTestId(/^category-row-/)).toHaveCount(before + 1)

  // Edit
  await page.getByTestId('category-edit-pets-vet').click()
  await page.getByTestId('category-name').fill('Vet & Pets')
  await page.getByTestId('category-form-submit').click()

  const row = page.getByTestId('category-row-pets-vet')
  await expect(row).toContainText('Vet & Pets')

  // Delete, with confirmation
  await page.getByTestId('category-delete-pets-vet').click()
  await expect(page.getByRole('alertdialog')).toBeVisible()

  await page.getByTestId('delete-category-confirm').click()

  await expect(page.getByTestId('category-row-pets-vet')).not.toBeVisible()
  await expect(page.getByTestId(/^category-row-/)).toHaveCount(before)
})

test('cancelling the delete confirmation keeps the category', async ({ page }) => {
  await page.goto('/categories')

  await page.getByTestId('category-delete-groceries').click()
  await page.getByTestId('delete-category-cancel').click()

  await expect(page.getByRole('alertdialog')).not.toBeVisible()
  await expect(page.getByTestId('category-row-groceries')).toBeVisible()
})
