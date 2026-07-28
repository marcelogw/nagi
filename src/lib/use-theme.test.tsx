import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { render, screen } from '@/test/render'
import { useSettingsStore } from '@/stores/settings-store'
import { useAppliedTheme } from './use-theme'

/**
 * The hook, rather than the functions under it.
 *
 * `theme.test.ts` proves the pieces work in isolation — resolution, the class
 * on the document, the media-query subscription. None of that says the hook
 * wires them together: an earlier version could have had its whole
 * OS-subscription effect deleted with the suite still green, because the shared
 * jsdom stub never fires a change event. These tests fire one.
 */

const DARK_QUERY = '(prefers-color-scheme: dark)'

function stubMatchMedia(initiallyPrefersDark: boolean) {
  let prefersDark = initiallyPrefersDark
  const listeners = new Set<() => void>()

  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return prefersDark && query === DARK_QUERY
    },
    addEventListener: (_event: string, listener: () => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_event: string, listener: () => void) => {
      listeners.delete(listener)
    },
  }))

  return {
    flipTo(value: boolean) {
      prefersDark = value
      for (const listener of listeners) listener()
    },
  }
}

function Probe() {
  return <output>{useAppliedTheme()}</output>
}

const shown = () => screen.getByRole('status').textContent
const documentIsDark = () => document.documentElement.classList.contains('dark')

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.classList.remove('dark')
})

describe('useAppliedTheme', () => {
  it('reports and applies an explicit theme', () => {
    useSettingsStore.setState({ theme: 'dark' })
    stubMatchMedia(false)

    render(<Probe />)

    expect(shown()).toBe('dark')
    expect(documentIsDark()).toBe(true)
  })

  it('resolves the system theme against the OS', () => {
    useSettingsStore.setState({ theme: 'system' })
    stubMatchMedia(true)

    render(<Probe />)

    expect(shown()).toBe('dark')
    expect(documentIsDark()).toBe(true)
  })

  // The behaviour the hook exists for, and the one nothing else covers: the OS
  // flipping under a `system` preference, with no user interaction at all.
  it('follows the OS flipping while the preference is system', () => {
    useSettingsStore.setState({ theme: 'system' })
    const media = stubMatchMedia(false)

    render(<Probe />)
    expect(shown()).toBe('light')

    act(() => {
      media.flipTo(true)
    })

    expect(shown()).toBe('dark')
    expect(documentIsDark()).toBe(true)
  })

  it('ignores the OS flipping under an explicit theme', () => {
    useSettingsStore.setState({ theme: 'light' })
    const media = stubMatchMedia(false)

    render(<Probe />)

    act(() => {
      media.flipTo(true)
    })

    expect(shown()).toBe('light')
    expect(documentIsDark()).toBe(false)
  })

  it('applies the new theme when the user picks one', () => {
    useSettingsStore.setState({ theme: 'light' })
    stubMatchMedia(false)

    render(<Probe />)

    act(() => {
      useSettingsStore.getState().setTheme('dark')
    })

    expect(shown()).toBe('dark')
    expect(documentIsDark()).toBe(true)
  })
})
