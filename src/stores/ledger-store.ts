import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { reassignExpensesCategory, reassignRecurrencesCategory } from '@/domain/categories'
import type { CategoryId, Expense, Income, Recurrence, SavingsEntry } from '@/domain/entities'
import type { Month } from '@/domain/month'
import { indexedDbAdapter } from '@/persistence/db'
import { migrate } from '@/persistence/migrate'
import { createAdapterStorage } from '@/persistence/storage-adapter'

export const LEDGER_STORAGE_KEY = 'nagi-ledger'

/** The persisted/exported shape — no actions. What `persistence/export.ts` and `import.ts` read and write. */
export type LedgerData = {
  incomes: Record<Month, Income[]>
  expenses: Record<Month, Expense[]>
  savingsEntries: Record<Month, SavingsEntry[]>
  recurrences: Recurrence[]
}

export type LedgerState = LedgerData & {
  /** Reassigns every expense and recurrence reference from `fromId` to `toId` — used when a category or card is deleted. */
  reassignCategory: (fromId: CategoryId, toId: CategoryId) => void
}

export const useLedgerStore = create<LedgerState>()(
  persist(
    immer<LedgerState>((set) => ({
      incomes: {},
      expenses: {},
      savingsEntries: {},
      recurrences: [],

      reassignCategory: (fromId, toId) => {
        set((state) => {
          state.expenses = reassignExpensesCategory(state.expenses, fromId, toId)
          state.recurrences = reassignRecurrencesCategory(state.recurrences, fromId, toId)
        })
      },
    })),
    {
      name: LEDGER_STORAGE_KEY,
      storage: createAdapterStorage(indexedDbAdapter),
      version: 1,
      migrate: (persistedState, version) =>
        migrate({
          key: LEDGER_STORAGE_KEY,
          storedVersion: version,
          targetVersion: 1,
          state: persistedState as LedgerState,
          now: Date.now,
          adapter: indexedDbAdapter,
        }),
    },
  ),
)
