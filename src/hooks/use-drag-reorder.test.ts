import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDragReorder } from './use-drag-reorder'

function dragEvent() {
  return { preventDefault: vi.fn() } as unknown as React.DragEvent
}

function keyEvent(key: string, altKey = true) {
  return { key, altKey, preventDefault: vi.fn() } as unknown as React.KeyboardEvent
}

describe('useDragReorder', () => {
  it('reorders on drag start + drag over', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(['a', 'b', 'c'], onReorder))

    act(() => result.current.handleDragStart('c'))
    act(() => result.current.handleDragOver(dragEvent(), 'a'))

    expect(onReorder).toHaveBeenCalledWith(['c', 'a', 'b'])
  })

  it('does nothing when nothing is being dragged', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(['a', 'b', 'c'], onReorder))

    act(() => result.current.handleDragOver(dragEvent(), 'a'))

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('does not fire again once the order already reflects the hover target', () => {
    const onReorder = vi.fn()
    const { result, rerender } = renderHook(({ ids }) => useDragReorder(ids, onReorder), {
      initialProps: { ids: ['a', 'b', 'c'] },
    })

    act(() => result.current.handleDragStart('c'))
    act(() => result.current.handleDragOver(dragEvent(), 'a'))
    expect(onReorder).toHaveBeenCalledOnce()

    // The parent re-renders with the reordered list, the way the store would.
    rerender({ ids: ['c', 'a', 'b'] })
    act(() => result.current.handleDragOver(dragEvent(), 'a'))

    expect(onReorder).toHaveBeenCalledOnce()
  })

  it('moves with Alt+ArrowUp and Alt+ArrowDown', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(['a', 'b', 'c'], onReorder))

    act(() => result.current.handleKeyDown(keyEvent('ArrowDown'), 'a'))
    expect(onReorder).toHaveBeenLastCalledWith(['b', 'a', 'c'])

    act(() => result.current.handleKeyDown(keyEvent('ArrowUp'), 'c'))
    expect(onReorder).toHaveBeenLastCalledWith(['a', 'c', 'b'])
  })

  it('ignores arrow keys without Alt, and Alt+Arrow at an edge', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(['a', 'b', 'c'], onReorder))

    act(() => result.current.handleKeyDown(keyEvent('ArrowDown', false), 'a'))
    act(() => result.current.handleKeyDown(keyEvent('ArrowUp'), 'a'))

    expect(onReorder).not.toHaveBeenCalled()
  })
})
