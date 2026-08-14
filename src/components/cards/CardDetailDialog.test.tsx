import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@/test/render'
import type { CardId, CreditCard, Installment } from '@/domain/entities'
import type { Uuid } from '@/domain/ids'
import type { Cents } from '@/domain/money'
import type { Month } from '@/domain/month'
import { useSettingsStore } from '@/stores/settings-store'
import { CardDetailDialog } from './CardDetailDialog'

const CARD: CreditCard = {
  id: 'nubank' as CardId,
  name: 'Nubank',
  color: 'oklch(0.64 0.10 168)',
  limit: 500000 as Cents,
  order: 0,
}

const MONTH = '2026-08' as Month

function makeInstallment(id: string, startMonth: Month, total: number): Installment {
  return {
    id: id as Uuid,
    name: `Item ${id}`,
    cardId: CARD.id,
    totalInstallments: total,
    amountPerInstallment: 10000 as Cents,
    startMonth,
  }
}

describe('CardDetailDialog', () => {
  beforeEach(() => {
    useSettingsStore.setState({ currency: 'BRL' })
  })

  it('renders as a dialog naming the card', () => {
    render(
      <CardDetailDialog card={CARD} installments={[]} month={MONTH} open onOpenChange={() => {}} />,
    )

    expect(screen.getByRole('dialog', { name: 'Nubank' })).toBeInTheDocument()
  })

  it('shows the empty state when there are no active installments', () => {
    render(
      <CardDetailDialog card={CARD} installments={[]} month={MONTH} open onOpenChange={() => {}} />,
    )

    expect(screen.getByText('No active installments.')).toBeInTheDocument()
    expect(screen.queryByTestId('card-detail-active-list')).not.toBeInTheDocument()
  })

  it('splits installments into active and completed lists', () => {
    const active = makeInstallment('active-1', '2026-06' as Month, 6) // 2026-06..2026-11, active in 08
    const completed = makeInstallment('done-1', '2025-01' as Month, 6) // 2025-01..2025-06, done by 08/2026

    render(
      <CardDetailDialog
        card={CARD}
        installments={[active, completed]}
        month={MONTH}
        open
        onOpenChange={() => {}}
      />,
    )

    const activeList = screen.getByTestId('card-detail-active-list')
    expect(activeList).toHaveTextContent('Item active-1')
    expect(activeList).toHaveTextContent('3/6')

    const completedList = screen.getByTestId('card-detail-completed-list')
    expect(completedList).toHaveTextContent('Item done-1')
  })

  it('renders nothing accessible when closed', () => {
    render(
      <CardDetailDialog
        card={CARD}
        installments={[]}
        month={MONTH}
        open={false}
        onOpenChange={() => {}}
      />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
