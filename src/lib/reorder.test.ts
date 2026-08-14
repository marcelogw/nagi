import { describe, expect, it } from 'vitest'
import { reorderIds } from './reorder'

describe('reorderIds', () => {
  it('moves an id earlier in the list', () => {
    expect(reorderIds(['a', 'b', 'c', 'd'], 'c', 'a')).toEqual(['c', 'a', 'b', 'd'])
  })

  // Forward moves insert *after* the target — see the doc comment on
  // reorderIds for why "always before" made the last position unreachable.
  it('moves an id later in the list, inserting after the target', () => {
    expect(reorderIds(['a', 'b', 'c', 'd'], 'a', 'c')).toEqual(['b', 'c', 'a', 'd'])
  })

  it('reaches the last position across two successive forward drags', () => {
    const first = reorderIds(['a', 'b', 'c'], 'a', 'b')
    expect(first).toEqual(['b', 'a', 'c'])

    const second = reorderIds(first, 'a', 'c')
    expect(second).toEqual(['b', 'c', 'a'])
  })

  it('reaches the first position across two successive backward drags', () => {
    const first = reorderIds(['a', 'b', 'c'], 'c', 'b')
    expect(first).toEqual(['a', 'c', 'b'])

    const second = reorderIds(first, 'c', 'a')
    expect(second).toEqual(['c', 'a', 'b'])
  })

  it('is a no-op when dragged onto itself', () => {
    expect(reorderIds(['a', 'b', 'c'], 'b', 'b')).toEqual(['a', 'b', 'c'])
  })

  it('returns a copy unchanged when the target id is unknown', () => {
    expect(reorderIds(['a', 'b', 'c'], 'a', 'z')).toEqual(['a', 'b', 'c'])
  })

  it('returns a copy unchanged when the dragged id is unknown', () => {
    expect(reorderIds(['a', 'b', 'c'], 'z', 'a')).toEqual(['a', 'b', 'c'])
  })

  it('never mutates the input', () => {
    const ids = ['a', 'b', 'c']
    reorderIds(ids, 'c', 'a')
    expect(ids).toEqual(['a', 'b', 'c'])
  })
})
