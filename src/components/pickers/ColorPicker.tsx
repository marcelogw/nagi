import './pickers.css'

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
          className="color-picker__swatch"
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
