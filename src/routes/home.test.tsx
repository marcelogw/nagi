import { describe, expect, it } from 'vitest'
import { render, screen } from '@/test/render'
import { HomeRoute } from './home'

// The reference example for a component test: rendered through the shared
// wrapper, queried by role, and asserted in both locales rather than against a
// hardcoded string. Never query by class name.

describe('HomeRoute', () => {
  it('renders the heading from the catalogue', () => {
    render(<HomeRoute />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nagi')
  })

  // One render per test. Two in the same `it` both stay mounted until the
  // afterEach cleanup, so the second query searches a DOM still holding the
  // first — which passes here and stops passing the moment two locales share a
  // string. Parameterise instead.
  it.each([
    ['en', 'The calm after the wind stops.'],
    ['pt-BR', 'A calmaria depois que o vento para.'],
  ] as const)('takes its copy from the %s catalogue', (locale, tagline) => {
    render(<HomeRoute />, { locale })

    expect(screen.getByText(tagline)).toBeInTheDocument()
  })
})
