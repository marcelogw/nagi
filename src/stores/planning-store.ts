import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { reassignInstallmentsCard } from '@/domain/creditCards'
import type { CardId, Goal, Installment } from '@/domain/entities'
import { indexedDbAdapter } from '@/persistence/db'
import { migrate } from '@/persistence/migrate'
import { createAdapterStorage } from '@/persistence/storage-adapter'

export const PLANNING_STORAGE_KEY = 'nagi-planning'

/** The persisted/exported shape — no actions. What `persistence/export.ts` and `import.ts` read and write. */
export type PlanningData = {
  installments: Installment[]
  goals: Goal[]
}

export type PlanningState = PlanningData & {
  /** Reassigns every installment on `fromId` to `toId` — used when a credit card is deleted. */
  reassignCard: (fromId: CardId, toId: CardId) => void
}

export const usePlanningStore = create<PlanningState>()(
  persist(
    immer<PlanningState>((set) => ({
      installments: [],
      goals: [],

      reassignCard: (fromId, toId) => {
        set((state) => {
          state.installments = reassignInstallmentsCard(state.installments, fromId, toId)
        })
      },
    })),
    {
      name: PLANNING_STORAGE_KEY,
      storage: createAdapterStorage(indexedDbAdapter),
      version: 1,
      migrate: (persistedState, version) =>
        migrate({
          key: PLANNING_STORAGE_KEY,
          storedVersion: version,
          targetVersion: 1,
          state: persistedState as PlanningState,
          now: Date.now,
          adapter: indexedDbAdapter,
        }),
    },
  ),
)
