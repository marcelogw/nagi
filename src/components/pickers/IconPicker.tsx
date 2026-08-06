import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Search, icons } from 'lucide-react'
import './pickers.css'

const GRID_COLUMNS = 8

type IconPickerProps = {
  /** Curated, screen-owned list of kebab-case lucide icon names (e.g. 'shopping-cart'). */
  icons: string[]
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

/**
 * ponytail: roving tabindex covers the four arrow keys, not the full APG grid
 * pattern (Home/End, wraparound) — add those when a real user asks for them.
 */
export function IconPicker({
  icons: iconNames,
  value,
  onChange,
  label,
  searchPlaceholder,
  emptyMessage,
}: IconPickerProps) {
  const [query, setQuery] = useState('')
  const gridRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return iconNames.filter((name) => name.includes(needle))
  }, [iconNames, query])

  const rovingTarget = filtered.includes(value) ? value : filtered[0]

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
    <div className="icon-picker">
      <div className="icon-picker__search">
        <Search aria-hidden className="icon-picker__search-icon" />
        <input
          type="text"
          className="icon-picker__search-input"
          aria-label={label}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {filtered.length > 0 ? (
        <div
          ref={gridRef}
          className="icon-picker__grid"
          role="group"
          aria-label={label}
          onKeyDown={handleGridKeyDown}
        >
          {filtered.map((name) => {
            const Icon = icons[toPascalCase(name) as keyof typeof icons]
            if (!Icon) return null

            return (
              <button
                key={name}
                type="button"
                className="icon-picker__item"
                data-selected={name === value || undefined}
                aria-label={name}
                aria-pressed={name === value}
                tabIndex={name === rovingTarget ? 0 : -1}
                onClick={() => onChange(name)}
              >
                <Icon aria-hidden />
              </button>
            )
          })}
        </div>
      ) : (
        <p className="icon-picker__empty">{emptyMessage}</p>
      )}
    </div>
  )
}
