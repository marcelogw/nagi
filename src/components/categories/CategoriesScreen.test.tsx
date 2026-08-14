import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@/test/render'
import { DEFAULT_CATEGORIES } from '@/domain/categories'
import { SYSTEM_CATEGORY_ID, type Category } from '@/domain/entities'
import { useCatalogStore } from '@/stores/catalog-store'
import { useLedgerStore } from '@/stores/ledger-store'
import { CategoriesScreen } from './CategoriesScreen'

const SYSTEM_CATEGORY: Category = {
  id: SYSTEM_CATEGORY_ID,
  color: 'brand-ink',
  icon: null,
  isSystem: true,
  order: 0,
}

describe('CategoriesScreen', () => {
  beforeEach(() => {
    useCatalogStore.setState({
      categories: [SYSTEM_CATEGORY, ...DEFAULT_CATEGORIES],
      creditCards: [],
    })
    useLedgerStore.setState({ incomes: {}, expenses: {}, savingsEntries: {}, recurrences: [] })
  })

  it('lists every category, including the system one, in order', () => {
    render(<CategoriesScreen />)

    const rows = screen.getAllByTestId(/^category-row-/)
    expect(rows).toHaveLength(SYSTEM_CATEGORY.order === 0 ? DEFAULT_CATEGORIES.length + 1 : 0)
    expect(rows[0]).toHaveAttribute('data-testid', `category-row-${SYSTEM_CATEGORY_ID}`)
  })

  it('hides edit/delete for the protected system category', () => {
    render(<CategoriesScreen />)

    const systemRow = screen.getByTestId(`category-row-${SYSTEM_CATEGORY_ID}`)
    expect(
      within(systemRow).queryByTestId(`category-edit-${SYSTEM_CATEGORY_ID}`),
    ).not.toBeInTheDocument()
    expect(
      within(systemRow).queryByTestId(`category-delete-${SYSTEM_CATEGORY_ID}`),
    ).not.toBeInTheDocument()
  })

  it('creates a category that then appears in the list', async () => {
    const { user } = render(<CategoriesScreen />)

    await user.click(screen.getByTestId('category-new'))
    await user.type(screen.getByTestId('category-name'), 'Pets & Vet')
    await user.click(screen.getByTestId('category-form-submit'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const created = useCatalogStore.getState().categories.find((c) => c.id === 'pets-vet')
    expect(created).toMatchObject({ customLabel: 'Pets & Vet' })
    expect(screen.getByTestId('category-row-pets-vet')).toHaveTextContent('Pets & Vet')
  })

  it('shows a duplicate-name error inline rather than throwing past the dialog', async () => {
    const { user } = render(<CategoriesScreen />)

    await user.click(screen.getByTestId('category-new'))
    await user.type(screen.getByTestId('category-name'), 'Groceries')
    await user.click(screen.getByTestId('category-form-submit'))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('category-name')).toHaveAccessibleDescription(
      'A category with this name already exists.',
    )
  })

  it('edits an existing category', async () => {
    const { user } = render(<CategoriesScreen />)

    await user.click(screen.getByTestId('category-edit-groceries'))
    const nameInput = screen.getByTestId('category-name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Supermarket')
    await user.click(screen.getByTestId('category-form-submit'))

    const updated = useCatalogStore.getState().categories.find((c) => c.id === 'groceries')
    expect(updated?.customLabel).toBe('Supermarket')
    expect(screen.getByTestId('category-row-groceries')).toHaveTextContent('Supermarket')
  })

  it('deletes a category through the confirm dialog, reassigning its expenses to Other', async () => {
    useLedgerStore.setState({
      incomes: {},
      expenses: {
        ['2026-08' as never]: [
          {
            id: 'e1',
            month: '2026-08',
            description: 'Milk',
            amount: 500,
            categoryId: 'groceries',
            kind: 'variable',
            date: '2026-08-01',
          } as never,
        ],
      },
      savingsEntries: {},
      recurrences: [],
    })

    const { user } = render(<CategoriesScreen />)

    await user.click(screen.getByTestId('category-delete-groceries'))
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(
      'Groceries will be removed. Expenses using it move to Other.',
    )

    await user.click(screen.getByTestId('delete-category-confirm'))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByTestId('category-row-groceries')).not.toBeInTheDocument()
    expect(useLedgerStore.getState().expenses['2026-08' as never]?.[0]?.categoryId).toBe(
      SYSTEM_CATEGORY_ID,
    )
  })

  it('reorders a category with the keyboard grip handle', async () => {
    const { user } = render(<CategoriesScreen />)

    // System category is order 0; 'housing' and 'utilities' are the first
    // two defaults (DEFAULT_CATEGORY_SEEDS) — Alt+ArrowDown on 'housing'
    // should swap the two.
    const grip = screen.getByTestId('category-reorder-housing')
    grip.focus()
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')

    const ids = useCatalogStore.getState().categories.map((c) => c.id)
    expect(ids.slice(0, 3)).toEqual([SYSTEM_CATEGORY_ID, 'utilities', 'housing'])
  })
})
