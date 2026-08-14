import {
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Cat,
  Coffee,
  CreditCard,
  Dumbbell,
  Film,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Pill,
  PiggyBank,
  Plane,
  PlugZap,
  Shirt,
  ShoppingCart,
  Tag,
  Utensils,
  Wifi,
  type LucideIcon,
} from 'lucide-react'

/**
 * One named, statically-imported entry per curated icon a screen actually
 * offers — never lucide-react's own `icons` barrel export (every icon the
 * package ships, 1500+, in one object) and never `lucide-react/dynamic`'s
 * per-icon `import()` either.
 *
 * Both alternatives were tried and measured against `check:bundle`'s 200 KB
 * gzip budget before landing on this one. The barrel: nothing tree-shakes an
 * object member lookup, so the first screen to actually mount `IconPicker`
 * pulled the whole set into the single production chunk — 257 KB, well over
 * budget on its own. Per-icon dynamic `import()`: correctly keeps each icon
 * out of the *initial* chunk, but `scripts/check-bundle.mjs` sums every file
 * under `dist/assets/*.js` without regard for what's lazy-loaded, and 1500+
 * separate tiny chunks each carrying their own gzip framing overhead summed
 * to 577 KB — worse than the barrel. A static map of named imports is the
 * one shape that keeps the *file count* small: only the icons actually
 * imported anywhere in the app exist in `dist/` at all, each folded into the
 * normal main chunk like any other component.
 *
 * Add an icon here in the same change that adds it to a screen's curated
 * list (`CATEGORY_ICON_CHOICES` today) — never reach for the barrel or a
 * dynamic import to avoid the one extra line.
 */
const ICONS: Record<string, LucideIcon> = {
  'book-open': BookOpen,
  briefcase: Briefcase,
  bus: Bus,
  car: Car,
  cat: Cat,
  coffee: Coffee,
  'credit-card': CreditCard,
  dumbbell: Dumbbell,
  film: Film,
  fuel: Fuel,
  gift: Gift,
  'graduation-cap': GraduationCap,
  'heart-pulse': HeartPulse,
  house: House,
  landmark: Landmark,
  pill: Pill,
  'piggy-bank': PiggyBank,
  plane: Plane,
  'plug-zap': PlugZap,
  shirt: Shirt,
  'shopping-cart': ShoppingCart,
  tag: Tag,
  utensils: Utensils,
  wifi: Wifi,
}

/**
 * Resolves a curated kebab-case lucide icon name (`'shopping-cart'`) to its
 * component, or `undefined` if it is not in the static map above — a stale
 * rename in a curated list (`IconPicker`'s own contract) should never throw
 * at render time.
 */
export function resolveIcon(name: string): LucideIcon | undefined {
  return ICONS[name]
}
