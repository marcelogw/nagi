import { beforeEach, describe, expect, it } from 'vitest'
import { act } from '@testing-library/react'
import { useTranslations } from 'use-intl'
import { render, screen } from '@/test/render'
import { useSettingsStore } from '@/stores/settings-store'
import { AppIntlProvider } from './provider'

/** A key the product actually renders — a fixture-only key would be a dead string. */
function NavLabel() {
  const t = useTranslations('nav')

  return <p>{t('dashboard')}</p>
}

describe('AppIntlProvider', () => {
  beforeEach(() => {
    useSettingsStore.setState({ locale: 'en' })
  })

  it('follows the store, and swaps the copy without remounting', () => {
    render(
      <AppIntlProvider>
        <NavLabel />
      </AppIntlProvider>,
    )
    const paragraph = screen.getByText('Dashboard')

    act(() => {
      useSettingsStore.getState().setLocale('pt-BR')
    })

    // The same DOM node, retranslated. A held reference is what distinguishes a
    // re-render from a remount — and a remount is what a page reload would look
    // like from here, which is precisely what a language switch must not do.
    expect(paragraph).toHaveTextContent('Painel')
  })
})
