import { validate } from '@/domain/invariants'
import type { CatalogData } from '@/stores/catalog-store'
import type { LedgerData } from '@/stores/ledger-store'
import type { PlanningData } from '@/stores/planning-store'
import type { Snapshot } from './export'

export type ImportResult = { ok: true } | { ok: false; errors: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseSnapshot(
  json: string,
): { ok: true; snapshot: Snapshot } | { ok: false; errors: string[] } {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, errors: ['Invalid JSON format'] }
  }

  if (!isRecord(parsed)) {
    return { ok: false, errors: ['Snapshot must be a JSON object'] }
  }

  const errors: string[] = []

  if (typeof parsed['version'] !== 'number') {
    errors.push('Snapshot missing or invalid "version" field')
  }
  if (typeof parsed['exportedAt'] !== 'string') {
    errors.push('Snapshot missing or invalid "exportedAt" field')
  }
  if (!Array.isArray(parsed['categories'])) {
    errors.push('Snapshot missing or invalid "categories" field')
  }
  if (!Array.isArray(parsed['creditCards'])) {
    errors.push('Snapshot missing or invalid "creditCards" field')
  }
  if (
    !isRecord(parsed['incomes']) ||
    !Object.values(parsed['incomes']).every((v) => Array.isArray(v))
  ) {
    errors.push('Snapshot missing or invalid "incomes" field')
  }
  if (
    !isRecord(parsed['expenses']) ||
    !Object.values(parsed['expenses']).every((v) => Array.isArray(v))
  ) {
    errors.push('Snapshot missing or invalid "expenses" field')
  }
  if (
    !isRecord(parsed['savingsEntries']) ||
    !Object.values(parsed['savingsEntries']).every((v) => Array.isArray(v))
  ) {
    errors.push('Snapshot missing or invalid "savingsEntries" field')
  }
  if (!Array.isArray(parsed['recurrences'])) {
    errors.push('Snapshot missing or invalid "recurrences" field')
  }
  if (!Array.isArray(parsed['installments'])) {
    errors.push('Snapshot missing or invalid "installments" field')
  }
  if (!Array.isArray(parsed['goals'])) {
    errors.push('Snapshot missing or invalid "goals" field')
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, snapshot: parsed as Snapshot }
}

export function commitSnapshot(
  snapshot: Snapshot,
  stores: {
    setLedger: (s: LedgerData) => void
    setCatalog: (s: CatalogData) => void
    setPlanning: (s: PlanningData) => void
  },
): ImportResult {
  const validationResult = validate(snapshot)
  if (!validationResult.ok) {
    return {
      ok: false,
      errors: validationResult.violations.map((v) => `${v.entity} ${v.id}: ${v.reason}`),
    }
  }

  stores.setCatalog({
    categories: snapshot.categories,
    creditCards: snapshot.creditCards,
  })

  stores.setLedger({
    incomes: snapshot.incomes,
    expenses: snapshot.expenses,
    savingsEntries: snapshot.savingsEntries,
    recurrences: snapshot.recurrences,
  })

  stores.setPlanning({
    installments: snapshot.installments,
    goals: snapshot.goals,
  })

  return { ok: true }
}
