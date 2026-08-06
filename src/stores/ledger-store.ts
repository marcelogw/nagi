import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Expense, Income, Recurrence, SavingsEntry } from '@/domain/entities'
import type { Month } from '@/domain/month'
import { indexedDbAdapter } from '@/persistence/db'
import { migrate } from '@/persistence/migrate'
import { createAdapterStorage } from '@/persistence/storage-adapter'

export const LEDGER_STORAGE_KEY = 'nagi-ledger'

export type LedgerState = {
  incomes: Record<Month, Income[]>
  expenses: Record<Month, Expense[]>
  savingsEntries: Record<Month, SavingsEntry[]>
  recurrences: Recurrence[]
}

export const useLedgerStore = create<LedgerState>()(
  persist(
    immer<LedgerState>(() => ({
      incomes: {},
      expenses: {},
      savingsEntries: {},
      recurrences: [],
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
