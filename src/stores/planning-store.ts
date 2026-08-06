import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Goal, Installment } from '@/domain/entities'
import { indexedDbAdapter } from '@/persistence/db'
import { migrate } from '@/persistence/migrate'
import { createAdapterStorage } from '@/persistence/storage-adapter'

export const PLANNING_STORAGE_KEY = 'nagi-planning'

export type PlanningState = {
  installments: Installment[]
  goals: Goal[]
}

export const usePlanningStore = create<PlanningState>()(
  persist(
    immer<PlanningState>(() => ({
      installments: [],
      goals: [],
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
