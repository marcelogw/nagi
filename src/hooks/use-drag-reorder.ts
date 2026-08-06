import type { DragEvent, KeyboardEvent } from 'react'
import { useState } from 'react'
import { reorderIds } from '@/lib/reorder'

/**
 * Drag-and-drop reorder for a flat, ordered list, plus an Alt+Arrow keyboard
 * equivalent on the same handle — a mouse-only interaction is not "done" per
 * the design system's accessibility rules (§9).
 *
 * `ids` is the list's current order; `onReorder` receives the full new order
 * on every change, matching the shape `reorderCategories`/`reorderCards`
 * already take.
 */
export function useDragReorder<T extends string>(ids: readonly T[], onReorder: (ids: T[]) => void) {
  const [draggingId, setDraggingId] = useState<T | null>(null)

  function move(id: T, overId: T) {
    if (id === overId) return
    const next = reorderIds(ids, id, overId)
    if (next.some((value, index) => value !== ids[index])) onReorder(next)
  }

  /**
   * A step swaps two adjacent entries rather than routing through `move`:
   * "insert before the neighbour" is a no-op when the neighbour is already
   * right there, which is exactly the case a single step always starts from.
   */
  function moveByStep(id: T, delta: 1 | -1) {
    const from = ids.indexOf(id)
    const to = from + delta
    if (to < 0 || to >= ids.length) return

    const next = [...ids]
    ;[next[from], next[to]] = [next[to] as T, next[from] as T]
    onReorder(next)
  }

  return {
    draggingId,
    handleDragStart: (id: T) => setDraggingId(id),
    handleDragEnd: () => setDraggingId(null),
    handleDragOver: (event: DragEvent, overId: T) => {
      event.preventDefault()
      if (draggingId !== null) move(draggingId, overId)
    },
    handleDrop: (event: DragEvent) => event.preventDefault(),
    /** Alt+Arrow moves the item; a bare arrow leaves normal tab/click focus alone. */
    handleKeyDown: (event: KeyboardEvent, id: T) => {
      if (!event.altKey) return
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault()
        moveByStep(id, -1)
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault()
        moveByStep(id, 1)
      }
    },
  }
}
