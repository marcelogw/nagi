import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Search, icons } from 'lucide-react'

const GRID_COLUMNS = 8

type IconPickerProps = {
  /** Curated, screen-owned list of kebab-case lucide icon names (e.g. 'shopping-cart'). */
  iconNames: string[]
  value: string
  onChange: (icon: string) => void
  label: string
  searchPlaceholder: string
  emptyMessage: string
}

function toPascalCase(kebab: string): string {
  return kebab
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function resolveIcon(name: string) {
  return icons[toPascalCase(name) as keyof typeof icons]
}

/**
 * ponytail: roving tabindex covers the four arrow keys, not the full APG grid
 * pattern (Home/End, wraparound) — add those when a real user asks for them.
 */
export function IconPicker({
  iconNames,
  value,
  onChange,
  label,
  searchPlaceholder,
  emptyMessage,
}: IconPickerProps) {
  const [query, setQuery] = useState('')
  const gridRef = useRef<HTMLDivElement>(null)

  // Resolved up front, not just filtered by query: a name lucide-react cannot
  // map to a component (renamed or removed icon) must never count as a match
  // — it renders nothing, so counting it left the grid open with no buttons
  // in it, and made the empty state impossible to reach when it was the only
  // "hit".
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return iconNames
      .filter((name) => name.includes(needle))
      .map((name) => [name, resolveIcon(name)] as const)
      .filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => {
        if (entry[1]) return true
        if (import.meta.env.DEV) {
          console.warn(`[IconPicker] "${entry[0]}" is not a lucide-react icon name.`)
        }
        return false
      })
  }, [iconNames, query])

  const rovingTarget = filtered.some(([name]) => name === value) ? value : filtered[0]?.[0]

  function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const delta = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: GRID_COLUMNS,
      ArrowUp: -GRID_COLUMNS,
    }[event.key]
    if (delta === undefined) return

    const buttons = Array.from(gridRef.current?.querySelectorAll('button') ?? [])
    const next = buttons[buttons.indexOf(document.activeElement as HTMLButtonElement) + delta]
    if (next) {
      event.preventDefault()
      next.focus()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-2 top-1/2 size-icon-xs -translate-y-1/2 text-foreground-subtle"
        />
        <input
          type="text"
          className="w-full rounded-md border border-border-strong bg-surface py-2 pr-3 pl-8 text-body text-foreground transition-colors duration-fast ease-settle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring motion-reduce:transition-none"
          aria-label={label}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {filtered.length > 0 ? (
        <div
          ref={gridRef}
          className="grid max-h-30 grid-cols-8 gap-1 overflow-y-auto p-1"
          role="group"
          aria-label={label}
          onKeyDown={handleGridKeyDown}
        >
          {filtered.map(([name, Icon]) => {
            return (
              <button
                key={name}
                type="button"
                className="flex aspect-square cursor-pointer items-center justify-center rounded-sm border border-border bg-surface text-foreground-muted transition-colors duration-fast ease-settle hover:border-border-strong hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring motion-reduce:transition-none data-selected:border-primary data-selected:bg-primary-tint data-selected:text-primary-text"
                data-selected={name === value || undefined}
                aria-label={name}
                aria-pressed={name === value}
                tabIndex={name === rovingTarget ? 0 : -1}
                onClick={() => onChange(name)}
              >
                <Icon aria-hidden className="size-icon-sm" />
              </button>
            )
          })}
        </div>
      ) : (
        <p className="m-0 p-1 text-caption text-foreground-subtle">{emptyMessage}</p>
      )}
    </div>
  )
}
