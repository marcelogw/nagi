import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDragReorder } from './use-drag-reorder'

function dragEvent() {
  return {
    preventDefault: vi.fn(),
    dataTransfer: { setData: vi.fn() },
  } as unknown as React.DragEvent
}

function keyEvent(key: string, altKey = true) {
  return { key, altKey, preventDefault: vi.fn() } as unknown as React.KeyboardEvent
}

describe('useDragReorder', () => {
  it('reorders on drag start + drag over', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(['a', 'b', 'c'], onReorder))

    act(() => result.current.handleDragStart(dragEvent(), 'c'))
    act(() => result.current.handleDragOver(dragEvent(), 'a'))

    expect(onReorder).toHaveBeenCalledWith(['c', 'a', 'b'])
  })

  it('sets drag data on start, for browsers that require it before dragover fires', () => {
    const { result } = renderHook(() => useDragReorder(['a', 'b', 'c'], vi.fn()))
    const event = dragEvent()

    act(() => result.current.handleDragStart(event, 'c'))

    expect(event.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'c')
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

    act(() => result.current.handleDragStart(dragEvent(), 'c'))
    act(() => result.current.handleDragOver(dragEvent(), 'a'))
    expect(onReorder).toHaveBeenCalledOnce()

    // The parent re-renders with the reordered list, the way the store would.
    rerender({ ids: ['c', 'a', 'b'] })
    act(() => result.current.handleDragOver(dragEvent(), 'a'))

    expect(onReorder).toHaveBeenCalledOnce()
  })

  // Regression for the bug where the last position was unreachable by mouse:
  // a drop onto the final item always landed just ahead of it, so a second
  // drop onto that same target was a no-op forever. Two different targets —
  // the way the pointer actually moves across a reflowing list — now reach it.
  it('reaches the last position across a drag over two different targets', () => {
    const onReorder = vi.fn()
    const { result, rerender } = renderHook(({ ids }) => useDragReorder(ids, onReorder), {
      initialProps: { ids: ['a', 'b', 'c'] },
    })

    act(() => result.current.handleDragStart(dragEvent(), 'a'))
    act(() => result.current.handleDragOver(dragEvent(), 'b'))
    expect(onReorder).toHaveBeenLastCalledWith(['b', 'a', 'c'])

    rerender({ ids: ['b', 'a', 'c'] })
    act(() => result.current.handleDragOver(dragEvent(), 'c'))
    expect(onReorder).toHaveBeenLastCalledWith(['b', 'c', 'a'])
  })

  it('ignores a dragover for an id no longer in the list', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(['a', 'b', 'c'], onReorder))

    act(() => result.current.handleDragStart(dragEvent(), 'a'))
    act(() => result.current.handleDragOver(dragEvent(), 'ghost' as 'a'))

    expect(onReorder).not.toHaveBeenCalled()
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

  // Regression: an id no longer in the list drove `next[-1]` (a stray
  // property, not an array slot) and clobbered index 0 with `undefined`.
  it('ignores Alt+Arrow for an id no longer in the list', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(['a', 'b', 'c'], onReorder))

    act(() => result.current.handleKeyDown(keyEvent('ArrowDown'), 'ghost' as 'a'))

    expect(onReorder).not.toHaveBeenCalled()
  })
})
