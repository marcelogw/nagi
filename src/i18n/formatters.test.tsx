import { beforeEach, describe, expect, it } from 'vitest'
import type { Month } from '@/domain/month'
import { render, screen } from '@/test/render'
import { useSettingsStore } from '@/stores/settings-store'
import { useFormatters } from './formatters'

// `<output>` carries the status role, so these read like any other component
// test: query by role, never by class or test id.

function Currency({ cents }: { cents: number }) {
  const format = useFormatters()

  return <output>{format.currency(cents)}</output>
}

function MonthName({ month }: { month: Month }) {
  const format = useFormatters()

  return <output>{format.month(month)}</output>
}

const formatted = () => screen.getByRole('status')

describe('format.currency', () => {
  beforeEach(() => {
    useSettingsStore.setState({ currency: 'BRL' })
  })

  it('reads its input as integer cents', () => {
    render(<Currency cents={123_456} />, { locale: 'pt-BR' })

    expect(formatted()).toHaveTextContent('R$ 1.234,56')
  })

  it('groups and places the symbol the way the locale does', () => {
    render(<Currency cents={123_456} />)

    expect(formatted()).toHaveTextContent('R$1,234.56')
  })

  it('takes the currency from the setting, not from the language', () => {
    // The conflict this card exists to settle: reading the app in English does
    // not mean being paid in dollars, and choosing dollars does not translate
    // the app. The two settings move independently.
    useSettingsStore.setState({ currency: 'USD' })
    render(<Currency cents={123_456} />, { locale: 'pt-BR' })

    expect(formatted()).toHaveTextContent('US$ 1.234,56')
  })
})

describe('format.month', () => {
  it('names the month the string actually denotes', () => {
    // The regression guard, and it only bites because the suite runs in São
    // Paulo: constructing the Date from the month string parses as UTC
    // midnight, which is 21:00 on 30 June here, so a naive implementation
    // prints June. Going through `monthToDate` prints July.
    render(<MonthName month="2026-07" />)

    expect(formatted()).toHaveTextContent('July 2026')
  })

  it('translates the month name', () => {
    render(<MonthName month="2026-07" />, { locale: 'pt-BR' })

    expect(formatted()).toHaveTextContent('julho de 2026')
  })
})

describe('the module surface', () => {
  it('exports nothing that formats outside a bound context', async () => {
    // A `formatCurrency(value, locale = 'pt-BR')` is what made the predecessor
    // render Brazilian currency to every user in every language. The defence is
    // that no such export exists — one hook, reachable only under the provider.
    expect(Object.keys(await import('./formatters'))).toEqual(['useFormatters'])
  })
})
