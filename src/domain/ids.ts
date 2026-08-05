import type { Branded } from './brand'

/**
 * A universally unique identifier (UUID v4).
 *
 * Used as the canonical identifier format for entity keys throughout Nagi.
 */
export type Uuid = Branded<string, 'Uuid'>

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Generates a new random Uuid v4.
 *
 * This is the ONLY function in the codebase authorized to call `crypto.randomUUID()`
 * directly. All domain entities and stores must generate IDs through this function.
 */
export function newId(): Uuid {
  return crypto.randomUUID() as Uuid
}

/**
 * Whether a value is a valid Uuid v4 string.
 */
export function isUuid(value: unknown): value is Uuid {
  return typeof value === 'string' && UUID_V4_PATTERN.test(value)
}
