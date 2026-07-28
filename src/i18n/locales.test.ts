import { describe, expect, it } from 'vitest'
import { LOCALES, detectLocale, messagesFor } from './locales'

describe('detectLocale', () => {
  it('takes an exact tag', () => {
    expect(detectLocale(['pt-BR'])).toBe('pt-BR')
  })

  it('takes a bare language to its registered region', () => {
    expect(detectLocale(['pt'])).toBe('pt-BR')
  })

  it('takes an unregistered region to the same language', () => {
    // A browser set to European Portuguese gets Brazilian Portuguese rather than
    // English: the wrong region is a much smaller miss than the wrong language.
    expect(detectLocale(['pt-PT'])).toBe('pt-BR')
  })

  it('falls back to the source locale for an unregistered language', () => {
    expect(detectLocale(['ja', 'de-AT'])).toBe('en')
  })

  it('falls back to the source locale for an empty list', () => {
    expect(detectLocale([])).toBe('en')
  })

  it('respects the order the browser ranked the tags in', () => {
    // The user's own preference order, not the registry's: a browser asking for
    // en-GB before pt-BR wants English, even though pt-BR is the exact match.
    expect(detectLocale(['en-GB', 'pt-BR'])).toBe('en')
    expect(detectLocale(['ja', 'pt-BR', 'en'])).toBe('pt-BR')
  })
})

describe('messagesFor', () => {
  it('returns the catalogue registered for the code', () => {
    expect(messagesFor('pt-BR')).toBe(LOCALES[1].messages)
  })
})
