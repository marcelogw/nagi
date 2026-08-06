/**
 * Moves `draggedId` to sit just before `overId`, keeping every other id in its
 * relative order — the pure part of a drag-and-drop reorder, so the DOM event
 * wiring in `useDragReorder` has nothing left to get wrong.
 */
export function reorderIds<T>(ids: readonly T[], draggedId: T, overId: T): T[] {
  if (draggedId === overId) return [...ids]

  const without = ids.filter((id) => id !== draggedId)
  const overIndex = without.indexOf(overId)
  return overIndex === -1 ? [...ids] : without.toSpliced(overIndex, 0, draggedId)
}
