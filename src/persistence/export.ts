import type { DomainState } from '@/domain/invariants'
import type { CatalogData } from '@/stores/catalog-store'
import type { LedgerData } from '@/stores/ledger-store'
import type { PlanningData } from '@/stores/planning-store'

export type Snapshot = {
  version: number
  exportedAt: string
} & DomainState

export function buildSnapshot(params: {
  ledger: LedgerData
  catalog: CatalogData
  planning: PlanningData
  now: () => number
}): Snapshot {
  return {
    version: 1,
    exportedAt: new Date(params.now()).toISOString(),
    categories: params.catalog.categories,
    creditCards: params.catalog.creditCards,
    incomes: params.ledger.incomes,
    expenses: params.ledger.expenses,
    savingsEntries: params.ledger.savingsEntries,
    recurrences: params.ledger.recurrences,
    installments: params.planning.installments,
    goals: params.planning.goals,
  }
}

export function toJson(snapshot: Snapshot): string {
  return JSON.stringify(snapshot, null, 2)
}
