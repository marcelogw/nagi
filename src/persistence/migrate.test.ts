import { describe, expect, it } from 'vitest'
import { listBackups } from './db'
import { MIGRATIONS, migrate, MissingMigrationError, type Migration } from './migrate'

describe('persistence/migrate', () => {
  it('MIGRATIONS registry is exported and empty by default', () => {
    expect(MIGRATIONS).toEqual({})
  })

  it('MissingMigrationError has correct name and version properties', () => {
    const error = new MissingMigrationError(2)
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('MissingMigrationError')
    expect(error.version).toBe(2)
    expect(error.message).toContain('2')
  })

  it('returns state unchanged without writing backup when storedVersion === targetVersion', async () => {
    const initialState = { version: 1, theme: 'dark' }
    const clock = () => 1000

    const result = await migrate({
      key: 'test-store',
      storedVersion: 1,
      targetVersion: 1,
      state: initialState,
      now: clock,
    })

    expect(result).toBe(initialState)
    expect(await listBackups('test-store')).toEqual([])
  })

  it('throws MissingMigrationError if a migration step in the chain is missing', async () => {
    const initialState = { val: 'a' }
    const clock = () => 1000

    await expect(
      migrate({
        key: 'test-missing',
        storedVersion: 1,
        targetVersion: 3,
        state: initialState,
        now: clock,
      }),
    ).rejects.toThrow(MissingMigrationError)

    try {
      await migrate({
        key: 'test-missing',
        storedVersion: 1,
        targetVersion: 3,
        state: initialState,
        now: clock,
      })
    } catch (err) {
      expect(err).toBeInstanceOf(MissingMigrationError)
      expect((err as MissingMigrationError).version).toBe(1)
    }
  })

  it('executes migration chain, backs up pre-migration state, prunes backups, and does not mutate input state', async () => {
    const inputState = Object.freeze({ count: 10, items: ['a', 'b'] })
    const snapshotBefore = structuredClone(inputState)

    let nowCallCount = 0
    const clock = () => 1000 + ++nowCallCount * 100

    const v1ToV2: Migration<
      { count: number; items: string[] },
      { count: number; items: string[]; version: number }
    > = (state) => {
      // Pure migration returning a new object
      return {
        ...state,
        version: 2,
        count: state.count * 2,
      }
    }

    const v2ToV3: Migration<
      { count: number; items: string[]; version: number },
      { count: number; items: string[]; version: number; extra: boolean }
    > = (state) => {
      return {
        ...state,
        version: 3,
        extra: true,
      }
    }

    const syntheticMigrations: Record<number, Migration<unknown, unknown>> = {
      1: v1ToV2 as Migration<unknown, unknown>,
      2: v2ToV3 as Migration<unknown, unknown>,
    }

    const result = await migrate({
      key: 'test-chain',
      storedVersion: 1,
      targetVersion: 3,
      state: inputState,
      now: clock,
      migrations: syntheticMigrations,
    })

    // Input state purity check
    expect(inputState).toEqual(snapshotBefore)

    // Result correctness check
    expect(result).toEqual({
      count: 20,
      items: ['a', 'b'],
      version: 3,
      extra: true,
    })

    // Pre-migration backup check
    const backups = await listBackups('test-chain')
    expect(backups.length).toBe(1)
    expect(backups[0]).toBe('test-chain__backup__1100')
  })

  it('prunes backups keeping only the 3 most recent backups across multiple migrations', async () => {
    const syntheticMigrations: Record<number, Migration<unknown, unknown>> = {
      1: (s) => s,
    }

    for (let i = 0; i < 5; i++) {
      await migrate({
        key: 'test-prune-chain',
        storedVersion: 1,
        targetVersion: 2,
        state: { run: i },
        now: () => 1000 + i * 10,
        migrations: syntheticMigrations,
      })
    }

    const backups = await listBackups('test-prune-chain')
    expect(backups.length).toBe(3)
    expect(backups).toEqual([
      'test-prune-chain__backup__1040',
      'test-prune-chain__backup__1030',
      'test-prune-chain__backup__1020',
    ])
  })
})
