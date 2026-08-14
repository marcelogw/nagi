import type { DragEvent, KeyboardEvent } from 'react'
import { useRef, useState } from 'react'
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

  // `reorderIds` decides which side of the target to land on from the two
  // ids' *current* relative order (see its own doc comment), which is what
  // lets a drag reach the very last slot. That same choice flips the
  // relative order it was computed from, so recomputing again for the exact
  // same (dragged, target) pair — which `dragover` does many times a second
  // while the pointer sits still — would immediately undo it, then redo it,
  // forever. One committed reorder per pair is enough; a pointer that has
  // moved onto a genuinely different target still recomputes.
  const lastMove = useRef<{ id: T; overId: T } | null>(null)

  function move(id: T, overId: T) {
    if (id === overId) return
    if (lastMove.current?.id === id && lastMove.current.overId === overId) return
    lastMove.current = { id, overId }

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
    // Absent from the list, same guard as `reorderIds`: without it, `from`
    // is -1 and `delta=1` passes the range check below (`to` becomes 0),
    // then the destructuring swap writes `next[-1]` — a stray property, not
    // a real array slot — and clobbers index 0 with `undefined`.
    if (from === -1) return
    const to = from + delta
    if (to < 0 || to >= ids.length) return

    const next = [...ids]
    ;[next[from], next[to]] = [next[to] as T, next[from] as T]
    onReorder(next)
  }

  return {
    draggingId,
    // Some browsers require data on the event before `dragover`/`drop` fire
    // at all during a real drag — never observable from the hook's own unit
    // tests, which fake the event object rather than driving a real drag.
    handleDragStart: (event: DragEvent, id: T) => {
      event.dataTransfer?.setData('text/plain', id)
      lastMove.current = null
      setDraggingId(id)
    },
    handleDragEnd: () => {
      lastMove.current = null
      setDraggingId(null)
    },
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
