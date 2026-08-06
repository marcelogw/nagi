import { describe, expect, it } from 'vitest'
import { reorderIds } from './reorder'

describe('reorderIds', () => {
  it('moves an id earlier in the list', () => {
    expect(reorderIds(['a', 'b', 'c', 'd'], 'c', 'a')).toEqual(['c', 'a', 'b', 'd'])
  })

  it('moves an id later in the list', () => {
    expect(reorderIds(['a', 'b', 'c', 'd'], 'a', 'c')).toEqual(['b', 'a', 'c', 'd'])
  })

  it('is a no-op when dragged onto itself', () => {
    expect(reorderIds(['a', 'b', 'c'], 'b', 'b')).toEqual(['a', 'b', 'c'])
  })

  it('returns a copy unchanged when the target id is unknown', () => {
    expect(reorderIds(['a', 'b', 'c'], 'a', 'z')).toEqual(['a', 'b', 'c'])
  })

  it('never mutates the input', () => {
    const ids = ['a', 'b', 'c']
    reorderIds(ids, 'c', 'a')
    expect(ids).toEqual(['a', 'b', 'c'])
  })
})
