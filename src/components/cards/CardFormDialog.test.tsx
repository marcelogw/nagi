import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/render'
import type { HexColor } from '@/domain/entities'
import type { Cents } from '@/domain/money'
import { useSettingsStore } from '@/stores/settings-store'
import { CardFormDialog } from './CardFormDialog'

const BLANK = { name: '', color: 'oklch(0.64 0.10 168)' as HexColor, limit: null }

describe('CardFormDialog', () => {
  beforeEach(() => {
    useSettingsStore.setState({ currency: 'BRL' })
  })

  it('renders as a dialog with a title matching the mode', () => {
    render(
      <CardFormDialog
        open
        onOpenChange={() => {}}
        mode="create"
        initialValues={BLANK}
        onSubmit={() => {}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'New card' })).toBeInTheDocument()
  })

  it('seeds the form from initialValues in edit mode, including a formatted limit', () => {
    render(
      <CardFormDialog
        open
        onOpenChange={() => {}}
        mode="edit"
        initialValues={{
          name: 'Nubank',
          color: 'oklch(0.64 0.10 168)' as HexColor,
          limit: 500000 as Cents,
        }}
        onSubmit={() => {}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Edit card' })).toBeInTheDocument()
    expect(screen.getByTestId('card-name')).toHaveValue('Nubank')
    expect(screen.getByTestId('card-limit')).toHaveValue('R$5,000.00')
  })

  it('disables submit until a name is typed, and submits with no limit', async () => {
    const onSubmit = vi.fn()
    const { user } = render(
      <CardFormDialog
        open
        onOpenChange={() => {}}
        mode="create"
        initialValues={BLANK}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByTestId('card-form-submit')).toBeDisabled()

    await user.type(screen.getByTestId('card-name'), 'Nubank')
    expect(screen.getByTestId('card-form-submit')).toBeEnabled()

    await user.click(screen.getByTestId('card-form-submit'))

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Nubank', color: BLANK.color, limit: null })
  })

  it('parses a typed limit into Cents on submit', async () => {
    const onSubmit = vi.fn()
    const { user } = render(
      <CardFormDialog
        open
        onOpenChange={() => {}}
        mode="create"
        initialValues={{ ...BLANK, name: 'Nubank' }}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByTestId('card-limit'), '5000')
    await user.click(screen.getByTestId('card-form-submit'))

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Nubank', color: BLANK.color, limit: 500000 })
  })

  it('closes without submitting when cancelled', async () => {
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn()
    const { user } = render(
      <CardFormDialog
        open
        onOpenChange={onOpenChange}
        mode="create"
        initialValues={{ ...BLANK, name: 'Nubank' }}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByTestId('card-form-cancel'))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
