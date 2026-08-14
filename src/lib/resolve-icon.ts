import { icons } from 'lucide-react'

function toPascalCase(kebab: string): string {
  return kebab
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/**
 * Resolves a curated kebab-case lucide icon name (`'shopping-cart'`) to its
 * component, or `undefined` if lucide-react has no icon by that name — a
 * stale rename in a curated list (`IconPicker`'s own contract) should never
 * throw at render time.
 */
export function resolveIcon(name: string) {
  return icons[toPascalCase(name) as keyof typeof icons]
}
