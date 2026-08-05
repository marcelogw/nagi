/**
 * Generic branded type helper for nominal typing in TypeScript.
 *
 * Prevents structural type compatibility where distinct primitive domain types
 * (e.g. Uuid, IsoDate, Cents) could otherwise be assigned or passed
 * interchangeably as raw strings or numbers.
 */
export type Branded<T, B extends string> = T & { readonly __brand: B }
