import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@/test/render'
import type { CardId, CreditCard, Installment } from '@/domain/entities'
import type { Uuid } from '@/domain/ids'
import type { Cents } from '@/domain/money'
import { useCatalogStore } from '@/stores/catalog-store'
import { usePlanningStore } from '@/stores/planning-store'
import { useSettingsStore } from '@/stores/settings-store'
import { CardsScreen } from './CardsScreen'

const NUBANK: CreditCard = {
  id: 'nubank' as CardId,
  name: 'Nubank',
  color: 'oklch(0.64 0.10 168)',
  limit: 500000 as Cents,
  order: 0,
}
const ITAU: CreditCard = {
  id: 'itau' as CardId,
  name: 'Itaú',
  color: 'oklch(0.62 0.10 250)',
  limit: null,
  order: 1,
}

describe('CardsScreen', () => {
  beforeEach(() => {
    useCatalogStore.setState({ categories: [], creditCards: [NUBANK, ITAU] })
    usePlanningStore.setState({ installments: [], goals: [] })
    useSettingsStore.setState({ currency: 'BRL' })
  })

  it('lists every card in order', () => {
    render(<CardsScreen />)

    expect(screen.getByTestId('card-tile-nubank')).toBeInTheDocument()
    expect(screen.getByTestId('card-tile-itau')).toBeInTheDocument()
  })

  it('creates a card that then appears in the grid', async () => {
    const { user } = render(<CardsScreen />)

    await user.click(screen.getByTestId('card-new'))
    await user.type(screen.getByTestId('card-name'), 'Inter')
    await user.click(screen.getByTestId('card-form-submit'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const created = useCatalogStore.getState().creditCards.find((c) => c.name === 'Inter')
    expect(created).toBeDefined()
    expect(screen.getByTestId(`card-tile-${created?.id}`)).toHaveTextContent('Inter')
  })

  it('edits an existing card', async () => {
    const { user } = render(<CardsScreen />)

    await user.click(screen.getByTestId('card-edit-nubank'))
    const nameInput = screen.getByTestId('card-name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Nubank Platinum')
    await user.click(screen.getByTestId('card-form-submit'))

    expect(useCatalogStore.getState().creditCards.find((c) => c.id === 'nubank')?.name).toBe(
      'Nubank Platinum',
    )
    expect(screen.getByTestId('card-tile-nubank')).toHaveTextContent('Nubank Platinum')
  })

  // Regression: CardFormDialog used to be keyed by the edit target's id,
  // which forced React to unmount and remount the whole Dialog the instant
  // it closed (the key falls back to 'new' as soon as formTarget goes
  // null) — Radix's exit animation never got a chance to run, and its
  // default close-focus restore lost track of the trigger. The dialog
  // needs no key at all: its own useEffect already re-seeds from
  // initialValues on every open transition.
  it('cancelling an edit restores focus to the edit trigger (default Radix behaviour)', async () => {
    const { user } = render(<CardsScreen />)

    await user.click(screen.getByTestId('card-edit-nubank'))
    await user.click(screen.getByTestId('card-form-cancel'))

    await waitFor(() => expect(screen.getByTestId('card-edit-nubank')).toHaveFocus())
  })

  it('deletes a card through the confirm dialog, reassigning installments to the chosen card', async () => {
    const installment: Installment = {
      id: 'i1' as Uuid,
      name: 'Laptop',
      cardId: 'nubank' as CardId,
      totalInstallments: 6,
      amountPerInstallment: 50000 as Cents,
      startMonth: '2026-01' as never,
    }
    usePlanningStore.setState({ installments: [installment], goals: [] })

    const { user } = render(<CardsScreen />)

    await user.click(screen.getByTestId('card-delete-nubank'))
    await user.click(screen.getByTestId('delete-card-confirm'))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByTestId('card-tile-nubank')).not.toBeInTheDocument()
    expect(usePlanningStore.getState().installments[0]?.cardId).toBe('itau')
  })

  it('blocks deleting the only card', async () => {
    useCatalogStore.setState({ categories: [], creditCards: [NUBANK] })
    const { user } = render(<CardsScreen />)

    await user.click(screen.getByTestId('card-delete-nubank'))

    expect(screen.getByTestId('delete-card-confirm')).toBeDisabled()
  })

  it('opens the detail overlay for a card', async () => {
    const { user } = render(<CardsScreen />)

    await user.click(screen.getByTestId('card-detail-nubank'))

    expect(screen.getByTestId('card-detail-dialog')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nubank' })).toBeInTheDocument()
  })

  it('moves focus to New card after a delete, since the trigger tile is gone', async () => {
    const { user } = render(<CardsScreen />)

    await user.click(screen.getByTestId('card-delete-nubank'))
    await user.click(screen.getByTestId('delete-card-confirm'))

    await waitFor(() => expect(screen.getByTestId('card-new')).toHaveFocus())
  })

  it('reorders a card with the keyboard grip handle', async () => {
    const { user } = render(<CardsScreen />)

    const grip = screen.getByTestId('card-reorder-nubank')
    grip.focus()
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')

    expect(useCatalogStore.getState().creditCards.map((c) => c.id)).toEqual(['itau', 'nubank'])
  })
})
