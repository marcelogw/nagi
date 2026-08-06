import type { StorageAdapter } from './storage-adapter'

export type Migration<From = unknown, To = unknown> = (state: From) => To

/** Application migration registry, empty by default for app version 1. */
export const MIGRATIONS: Record<number, Migration<unknown, unknown>> = {}

export class MissingMigrationError extends Error {
  readonly version: number

  constructor(version: number) {
    super(`Missing migration for version: ${version}`)
    this.name = 'MissingMigrationError'
    this.version = version
  }
}

export type MigrateParams<T> = {
  key: string
  storedVersion: number
  targetVersion: number
  state: T
  now: () => number
  adapter: StorageAdapter
  migrations?: Record<number, Migration<unknown, unknown>>
}

/**
 * Runs versioned state migrations for persisted Zustand stores.
 *
 * Backs up pre-migration state before applying migrations, keeps at most 3 backups,
 * and executes migrations sequentially without mutating input state.
 */
export async function migrate<T>(params: MigrateParams<T>): Promise<T> {
  const { key, storedVersion, targetVersion, state, now, adapter, migrations = MIGRATIONS } = params

  if (storedVersion === targetVersion) {
    return state
  }

  await adapter.writeBackup(key, state, now())
  await adapter.pruneBackups(key, 3)

  let currentState: unknown = state

  for (let version = storedVersion; version < targetVersion; version++) {
    const migrationFn = migrations[version]
    if (!migrationFn) {
      throw new MissingMigrationError(version)
    }

    currentState = migrationFn(currentState)
  }

  return currentState as T
}
