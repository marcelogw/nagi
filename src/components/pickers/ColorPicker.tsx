type ColorPickerProps = {
  colors: string[]
  value: string
  onChange: (color: string) => void
  label: string
}

/**
 * A curated palette, never a free colour input — the approved swatch set
 * comes from the screen consuming this (categories and cards each ship their
 * own list in their own mockup), not from this component.
 */
export function ColorPicker({ colors, value, onChange, label }: ColorPickerProps) {
  return (
    <div className="color-picker" role="group" aria-label={label}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className="size-swatch cursor-pointer rounded-sm transition-transform duration-fast ease-settle hover:scale-112 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none data-selected:ring-2 data-selected:ring-foreground data-selected:ring-offset-2 data-selected:ring-offset-surface"
          data-selected={color === value || undefined}
          style={{ background: color }}
          aria-label={color}
          aria-pressed={color === value}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  )
}
