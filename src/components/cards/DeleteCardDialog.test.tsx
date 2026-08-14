import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/render'
import type { CardId } from '@/domain/entities'
import { DeleteCardDialog } from './DeleteCardDialog'

const OTHER_CARDS = [
  { id: 'itau' as CardId, name: 'Itaú' },
  { id: 'inter' as CardId, name: 'Inter' },
]

describe('DeleteCardDialog', () => {
  it('renders as an alertdialog naming the card, interpolated not concatenated', () => {
    render(
      <DeleteCardDialog
        cardName="Nubank"
        open
        onOpenChange={() => {}}
        activeInstallmentCount={0}
        otherCards={OTHER_CARDS}
        onConfirm={() => {}}
      />,
    )

    expect(screen.getByRole('alertdialog', { name: 'Delete Nubank?' })).toBeInTheDocument()
  })

  it('renders the reassignment select as a real combobox, defaulted to the first other card', () => {
    render(
      <DeleteCardDialog
        cardName="Nubank"
        open
        onOpenChange={() => {}}
        activeInstallmentCount={2}
        otherCards={OTHER_CARDS}
        onConfirm={() => {}}
      />,
    )

    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(
      '2 active installments move to the card you choose.',
    )
    expect(screen.getByTestId('card-reassign-select')).toHaveTextContent('Itaú')
  })

  it('confirms with the selected reassignment target', async () => {
    const onConfirm = vi.fn()
    const { user } = render(
      <DeleteCardDialog
        cardName="Nubank"
        open
        onOpenChange={() => {}}
        activeInstallmentCount={0}
        otherCards={OTHER_CARDS}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByTestId('card-reassign-select'))
    await user.click(screen.getByRole('option', { name: 'Inter' }))
    await user.click(screen.getByTestId('delete-card-confirm'))

    expect(onConfirm).toHaveBeenCalledWith('inter')
  })

  it('blocks deletion and shows the "add another card" message when there is nowhere to reassign to', () => {
    const onConfirm = vi.fn()
    render(
      <DeleteCardDialog
        cardName="Nubank"
        open
        onOpenChange={() => {}}
        activeInstallmentCount={1}
        otherCards={[]}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(
      "Add another card first — there is nowhere to move Nubank's installments.",
    )
    expect(screen.queryByTestId('card-reassign-select')).not.toBeInTheDocument()
    expect(screen.getByTestId('delete-card-confirm')).toBeDisabled()
  })

  it('closes without confirming on cancel', async () => {
    const onConfirm = vi.fn()
    const { user } = render(
      <DeleteCardDialog
        cardName="Nubank"
        open
        onOpenChange={() => {}}
        activeInstallmentCount={0}
        otherCards={OTHER_CARDS}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByTestId('delete-card-cancel'))

    expect(onConfirm).not.toHaveBeenCalled()
  })
})
