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

  it('takes its copy from the active locale', () => {
    render(<HomeRoute />)
    expect(screen.getByText('The calm after the wind stops.')).toBeInTheDocument()

    render(<HomeRoute />, { locale: 'pt-BR' })
    expect(screen.getByText('A calmaria depois que o vento para.')).toBeInTheDocument()
  })
})
