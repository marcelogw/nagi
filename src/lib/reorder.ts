/**
 * Moves `draggedId` to sit beside `overId`, keeping every other id in its
 * relative order — the pure part of a drag-and-drop reorder, so the DOM event
 * wiring in `useDragReorder` has nothing left to get wrong.
 *
 * Which side of `overId` it lands on depends on the direction of the move,
 * not a fixed "always before": dropping forward (the target started later in
 * the list than the dragged id) inserts *after* the target, and dropping
 * backward inserts before it. A rule that always inserted before made the
 * last position unreachable by mouse — a drop onto the final item landed
 * just ahead of it, and a second drop onto that same target was then a
 * no-op, because the array already matched what the drop asked for.
 */
export function reorderIds<T>(ids: readonly T[], draggedId: T, overId: T): T[] {
  if (draggedId === overId) return [...ids]

  const draggedIndex = ids.indexOf(draggedId)
  const overIndex = ids.indexOf(overId)
  // Either id absent from the list leaves nothing well-defined to reorder.
  // Without this, an untracked draggedId gets spliced in as a new element
  // that was never part of `ids`, silently growing the array.
  if (draggedIndex === -1 || overIndex === -1) return [...ids]

  const without = ids.filter((id) => id !== draggedId)
  const target = without.indexOf(overId)
  return without.toSpliced(overIndex > draggedIndex ? target + 1 : target, 0, draggedId)
}
