import {
  SYSTEM_CATEGORY_ID,
  type Category,
  type CategoryId,
  type CardId,
  type CreditCard,
  type Expense,
  type Goal,
  type Income,
  type Installment,
  type Recurrence,
  type RecurrenceException,
  type SavingsEntry,
} from './entities'
import type { DomainState } from './invariants'
import { isUuid, newId } from './ids'
import type { Cents } from './money'
import { isMonth, range, type Month } from './month'
import { isIsoDate, isTimestamp, now, parseIsoDate } from './date'

export type OldIncome = {
  id?: string
  month?: string
  description?: string
  amount?: number
  value?: number
  recurringGroupId?: string
}

export type OldExpense = {
  id?: string
  month?: string
  description?: string
  amount?: number
  value?: number
  category?: string
  categoryId?: string
  date?: string
  recurringGroupId?: string
}

export type OldSavingsEntry = {
  id?: string
  month?: string
  amount?: number
  value?: number
  date?: string
  source?: string
  note?: string
  goalId?: string
  confirmed?: boolean
}

export type OldInstallment = {
  id?: string
  name?: string
  description?: string
  card?: string
  cardId?: string
  totalInstallments?: number
  amountPerInstallment?: number
  amount?: number
  startMonth?: string
}

export type OldCategory = {
  id?: string
  customLabel?: string
  color?: string
  icon?: string | null
  isSystem?: boolean
  order?: number
}

export type OldCreditCard = {
  id?: string
  name?: string
  color?: string
  limit?: number | null
  order?: number
}

export type OldGoal = {
  id?: string
  name?: string
  icon?: string
  color?: string
  targetAmount?: number
  deadline?: string
  status?: 'active' | 'completed'
  completedAt?: string
  createdAt?: string
}

export type TempestExportV3 = {
  version?: number
  state?: {
    monthlyData?: Record<
      string,
      {
        incomes?: OldIncome[]
        fixedExpenses?: OldExpense[]
        variableExpenses?: OldExpense[]
        savingsEntries?: OldSavingsEntry[]
      }
    >
    installments?: OldInstallment[]
    categories?: OldCategory[]
    creditCards?: OldCreditCard[]
    goals?: OldGoal[]
    notes?: unknown[]
  }
  monthlyData?: Record<
    string,
    {
      incomes?: OldIncome[]
      fixedExpenses?: OldExpense[]
      variableExpenses?: OldExpense[]
      savingsEntries?: OldSavingsEntry[]
    }
  >
  installments?: OldInstallment[]
  categories?: OldCategory[]
  creditCards?: OldCreditCard[]
  goals?: OldGoal[]
  notes?: unknown[]
}

export type TempestImportResult =
  { ok: true; snapshot: DomainState } | { ok: false; errors: string[] }

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toCents(amount: number): Cents {
  return Math.round(amount * 100) as Cents
}

/**
 * Pure transformation function that converts a Tempest (v3 schema) export
 * object into a Nagi DomainState snapshot without throwing exceptions.
 */
export function importTempestExport(raw: unknown): TempestImportResult {
  try {
    if (!isObject(raw)) {
      return {
        ok: false,
        errors: ['Invalid export payload: raw must be a non-null object'],
      }
    }

    const stateObj = isObject(raw.state) ? raw.state : raw
    const errors: string[] = []

    const rawMonthlyData = stateObj.monthlyData
    if (rawMonthlyData !== undefined && !isObject(rawMonthlyData)) {
      errors.push('monthlyData must be an object')
    } else if (isObject(rawMonthlyData)) {
      for (const [monthKey, monthVal] of Object.entries(rawMonthlyData)) {
        if (!isMonth(monthKey)) {
          errors.push(`monthlyData key "${monthKey}" is not a valid month (YYYY-MM)`)
        }
        if (!isObject(monthVal)) {
          errors.push(`monthlyData["${monthKey}"] must be an object`)
          continue
        }

        const incomes = monthVal.incomes
        if (incomes !== undefined && !Array.isArray(incomes)) {
          errors.push(`monthlyData["${monthKey}"].incomes must be an array`)
        } else if (Array.isArray(incomes)) {
          incomes.forEach((inc, idx) => {
            const m = isObject(inc) && typeof inc.month === 'string' ? inc.month : monthKey
            const amt = isObject(inc)
              ? typeof inc.amount === 'number'
                ? inc.amount
                : typeof inc.value === 'number'
                  ? inc.value
                  : undefined
              : undefined
            const desc = isObject(inc) ? inc.description : undefined

            if (
              !isMonth(m) ||
              typeof amt !== 'number' ||
              !Number.isFinite(amt) ||
              typeof desc !== 'string'
            ) {
              errors.push(
                `monthlyData["${monthKey}"].incomes[${idx}]: missing or invalid required fields (month, amount, description)`,
              )
            }
          })
        }

        const fixedExpenses = monthVal.fixedExpenses
        if (fixedExpenses !== undefined && !Array.isArray(fixedExpenses)) {
          errors.push(`monthlyData["${monthKey}"].fixedExpenses must be an array`)
        } else if (Array.isArray(fixedExpenses)) {
          fixedExpenses.forEach((exp, idx) => {
            const m = isObject(exp) && typeof exp.month === 'string' ? exp.month : monthKey
            const amt = isObject(exp)
              ? typeof exp.amount === 'number'
                ? exp.amount
                : typeof exp.value === 'number'
                  ? exp.value
                  : undefined
              : undefined
            const desc = isObject(exp) ? exp.description : undefined

            if (
              !isMonth(m) ||
              typeof amt !== 'number' ||
              !Number.isFinite(amt) ||
              typeof desc !== 'string'
            ) {
              errors.push(
                `monthlyData["${monthKey}"].fixedExpenses[${idx}]: missing or invalid required fields (month, amount, description)`,
              )
            }
          })
        }

        const variableExpenses = monthVal.variableExpenses
        if (variableExpenses !== undefined && !Array.isArray(variableExpenses)) {
          errors.push(`monthlyData["${monthKey}"].variableExpenses must be an array`)
        } else if (Array.isArray(variableExpenses)) {
          variableExpenses.forEach((exp, idx) => {
            const m = isObject(exp) && typeof exp.month === 'string' ? exp.month : monthKey
            const amt = isObject(exp)
              ? typeof exp.amount === 'number'
                ? exp.amount
                : typeof exp.value === 'number'
                  ? exp.value
                  : undefined
              : undefined
            const desc = isObject(exp) ? exp.description : undefined

            if (
              !isMonth(m) ||
              typeof amt !== 'number' ||
              !Number.isFinite(amt) ||
              typeof desc !== 'string'
            ) {
              errors.push(
                `monthlyData["${monthKey}"].variableExpenses[${idx}]: missing or invalid required fields (month, amount, description)`,
              )
            }
          })
        }

        const savingsEntries = monthVal.savingsEntries
        if (savingsEntries !== undefined && !Array.isArray(savingsEntries)) {
          errors.push(`monthlyData["${monthKey}"].savingsEntries must be an array`)
        } else if (Array.isArray(savingsEntries)) {
          savingsEntries.forEach((sav, idx) => {
            const m = isObject(sav) && typeof sav.month === 'string' ? sav.month : monthKey
            const amt = isObject(sav)
              ? typeof sav.amount === 'number'
                ? sav.amount
                : typeof sav.value === 'number'
                  ? sav.value
                  : undefined
              : undefined

            if (!isMonth(m) || typeof amt !== 'number' || !Number.isFinite(amt)) {
              errors.push(
                `monthlyData["${monthKey}"].savingsEntries[${idx}]: missing or invalid required fields (month, amount)`,
              )
            }
          })
        }
      }
    }

    const rawInstallments = stateObj.installments
    if (rawInstallments !== undefined && !Array.isArray(rawInstallments)) {
      errors.push('installments must be an array')
    } else if (Array.isArray(rawInstallments)) {
      rawInstallments.forEach((inst, idx) => {
        if (!isObject(inst)) {
          errors.push(`installments[${idx}]: must be an object`)
          return
        }
        const name = inst.name ?? inst.description
        const cardId = inst.card ?? inst.cardId
        const totalInst = inst.totalInstallments
        const amt =
          typeof inst.amountPerInstallment === 'number'
            ? inst.amountPerInstallment
            : typeof inst.amount === 'number'
              ? inst.amount
              : undefined
        const startM = inst.startMonth

        if (
          typeof name !== 'string' ||
          typeof cardId !== 'string' ||
          typeof totalInst !== 'number' ||
          !Number.isInteger(totalInst) ||
          typeof amt !== 'number' ||
          !Number.isFinite(amt) ||
          !isMonth(startM)
        ) {
          errors.push(
            `installments[${idx}]: missing or invalid required fields (name, card, totalInstallments, amountPerInstallment, startMonth)`,
          )
        }
      })
    }

    const rawCategories = stateObj.categories
    if (rawCategories !== undefined && !Array.isArray(rawCategories)) {
      errors.push('categories must be an array')
    } else if (Array.isArray(rawCategories)) {
      rawCategories.forEach((cat, idx) => {
        if (!isObject(cat) || typeof cat.id !== 'string') {
          errors.push(`categories[${idx}]: missing or invalid required fields (id)`)
        }
      })
    }

    const rawCards = stateObj.creditCards
    if (rawCards !== undefined && !Array.isArray(rawCards)) {
      errors.push('creditCards must be an array')
    } else if (Array.isArray(rawCards)) {
      rawCards.forEach((card, idx) => {
        if (!isObject(card) || typeof card.id !== 'string' || typeof card.name !== 'string') {
          errors.push(`creditCards[${idx}]: missing or invalid required fields (id, name)`)
        }
      })
    }

    const rawGoals = stateObj.goals
    if (rawGoals !== undefined && !Array.isArray(rawGoals)) {
      errors.push('goals must be an array')
    } else if (Array.isArray(rawGoals)) {
      rawGoals.forEach((goal, idx) => {
        if (!isObject(goal)) {
          errors.push(`goals[${idx}]: must be an object`)
          return
        }
        const name = goal.name
        const targetAmt = goal.targetAmount

        if (
          typeof name !== 'string' ||
          typeof targetAmt !== 'number' ||
          !Number.isFinite(targetAmt)
        ) {
          errors.push(`goals[${idx}]: missing or invalid required fields (name, targetAmount)`)
        }
      })
    }

    if (errors.length > 0) {
      return { ok: false, errors }
    }

    // --- Data Transformation & Snapshot Construction ---

    // 1. Categories
    const categories: Category[] = []
    if (Array.isArray(rawCategories)) {
      rawCategories.forEach((cat) => {
        if (isObject(cat) && typeof cat.id === 'string') {
          const id = cat.id as CategoryId
          categories.push({
            id,
            customLabel: typeof cat.customLabel === 'string' ? cat.customLabel : undefined,
            // check-patterns-ignore-next-line: fallback hex color for legacy domain import
            color: typeof cat.color === 'string' ? cat.color : '#808080',
            icon: typeof cat.icon === 'string' ? cat.icon : null,
            isSystem: id === SYSTEM_CATEGORY_ID,
            order: 0,
          })
        }
      })
    }

    if (!categories.some((c) => c.id === SYSTEM_CATEGORY_ID)) {
      categories.push({
        id: SYSTEM_CATEGORY_ID,
        // check-patterns-ignore-next-line: fallback hex color for legacy domain import
        color: '#808080',
        icon: null,
        isSystem: true,
        order: 0,
      })
    }

    categories.forEach((cat, idx) => {
      cat.isSystem = cat.id === SYSTEM_CATEGORY_ID
      cat.order = idx
    })

    const validCategoryIds = new Set(categories.map((c) => c.id))

    // 2. Credit Cards
    const creditCards: CreditCard[] = []
    if (Array.isArray(rawCards)) {
      rawCards.forEach((card) => {
        if (isObject(card) && typeof card.id === 'string' && typeof card.name === 'string') {
          const limit =
            typeof card.limit === 'number' && Number.isFinite(card.limit)
              ? toCents(card.limit)
              : null
          creditCards.push({
            id: card.id as CardId,
            name: card.name,
            // check-patterns-ignore-next-line: fallback hex color for legacy domain import
            color: typeof card.color === 'string' ? card.color : '#000000',
            limit,
            order: 0,
          })
        }
      })
    }
    creditCards.forEach((card, idx) => {
      card.order = idx
    })

    // 3. Monthly Data (Incomes, Expenses, Savings) & Recurrence Groups
    const incomes: Record<string, Income[]> = {}
    const expenses: Record<string, Expense[]> = {}
    const savingsEntries: Record<string, SavingsEntry[]> = {}

    type GroupedIncome = OldIncome & { month: Month }
    type GroupedExpense = OldExpense & {
      month: Month
      kind: 'fixed' | 'variable'
      categoryId: CategoryId
    }

    const groupedIncomes = new Map<string, GroupedIncome[]>()
    const groupedExpenses = new Map<string, GroupedExpense[]>()

    if (isObject(rawMonthlyData)) {
      for (const [monthKey, monthVal] of Object.entries(rawMonthlyData)) {
        if (!isMonth(monthKey) || !isObject(monthVal)) continue

        const mKey = monthKey as Month
        const currentIncomes: Income[] = []
        const currentExpenses: Expense[] = []
        const currentSavings: SavingsEntry[] = []

        // Incomes
        if (Array.isArray(monthVal.incomes)) {
          monthVal.incomes.forEach((inc) => {
            if (!isObject(inc)) return
            const m = (
              typeof inc.month === 'string' && isMonth(inc.month) ? inc.month : mKey
            ) as Month
            const amt =
              typeof inc.amount === 'number'
                ? inc.amount
                : typeof inc.value === 'number'
                  ? inc.value
                  : 0
            const groupId =
              typeof inc.recurringGroupId === 'string' ? inc.recurringGroupId.trim() : ''

            if (groupId) {
              const group = groupedIncomes.get(groupId) ?? []
              group.push({ ...inc, month: m })
              groupedIncomes.set(groupId, group)
            } else {
              currentIncomes.push({
                id: typeof inc.id === 'string' && isUuid(inc.id) ? inc.id : newId(),
                month: m,
                description: typeof inc.description === 'string' ? inc.description : '',
                amount: toCents(amt),
              })
            }
          })
        }

        // Fixed & Variable Expenses
        const processExpense = (exp: unknown, kind: 'fixed' | 'variable') => {
          if (!isObject(exp)) return
          const m = (
            typeof exp.month === 'string' && isMonth(exp.month) ? exp.month : mKey
          ) as Month
          const amt =
            typeof exp.amount === 'number'
              ? exp.amount
              : typeof exp.value === 'number'
                ? exp.value
                : 0
          const rawCat =
            (typeof exp.category === 'string' ? exp.category : exp.categoryId) ?? SYSTEM_CATEGORY_ID
          const catId = validCategoryIds.has(rawCat as CategoryId)
            ? (rawCat as CategoryId)
            : SYSTEM_CATEGORY_ID
          const dateVal =
            typeof exp.date === 'string' && isIsoDate(exp.date) ? exp.date : parseIsoDate(`${m}-01`)
          const groupId =
            typeof exp.recurringGroupId === 'string' ? exp.recurringGroupId.trim() : ''

          if (groupId) {
            const group = groupedExpenses.get(groupId) ?? []
            group.push({ ...exp, month: m, kind, categoryId: catId })
            groupedExpenses.set(groupId, group)
          } else {
            currentExpenses.push({
              id: typeof exp.id === 'string' && isUuid(exp.id) ? exp.id : newId(),
              month: m,
              description: typeof exp.description === 'string' ? exp.description : '',
              amount: toCents(amt),
              categoryId: catId,
              kind,
              date: dateVal,
            })
          }
        }

        if (Array.isArray(monthVal.fixedExpenses)) {
          monthVal.fixedExpenses.forEach((exp) => processExpense(exp, 'fixed'))
        }
        if (Array.isArray(monthVal.variableExpenses)) {
          monthVal.variableExpenses.forEach((exp) => processExpense(exp, 'variable'))
        }

        // Savings Entries
        if (Array.isArray(monthVal.savingsEntries)) {
          monthVal.savingsEntries.forEach((sav) => {
            if (!isObject(sav)) return
            const m = (
              typeof sav.month === 'string' && isMonth(sav.month) ? sav.month : mKey
            ) as Month
            const amt =
              typeof sav.amount === 'number'
                ? sav.amount
                : typeof sav.value === 'number'
                  ? sav.value
                  : 0
            const dateVal =
              typeof sav.date === 'string' && isIsoDate(sav.date)
                ? sav.date
                : parseIsoDate(`${m}-01`)
            const goalIdVal =
              typeof sav.goalId === 'string' && isUuid(sav.goalId) ? sav.goalId : undefined
            const confirmedVal = sav.confirmed !== undefined ? Boolean(sav.confirmed) : true

            currentSavings.push({
              id: typeof sav.id === 'string' && isUuid(sav.id) ? sav.id : newId(),
              month: m,
              amount: toCents(amt),
              date: dateVal,
              source: typeof sav.source === 'string' ? sav.source : undefined,
              note: typeof sav.note === 'string' ? sav.note : undefined,
              goalId: goalIdVal,
              confirmed: confirmedVal,
            })
          })
        }

        incomes[mKey] = currentIncomes
        expenses[mKey] = currentExpenses
        savingsEntries[mKey] = currentSavings
      }
    }

    // 4. Recurrences reconstruction
    const recurrences: Recurrence[] = []

    // Income Recurrences
    groupedIncomes.forEach((groupRows) => {
      if (groupRows.length === 0) return
      const rows = groupRows.toSorted((a, b) => a.month.localeCompare(b.month))
      const firstRow = rows[0]
      const lastRow = rows[rows.length - 1]
      if (!firstRow || !lastRow) return

      const startMonth = firstRow.month
      const endMonth = lastRow.month
      const template = {
        description: typeof firstRow.description === 'string' ? firstRow.description : '',
        amount: toCents(firstRow.amount ?? firstRow.value ?? 0),
      }

      const exceptions: Record<Month, RecurrenceException> = {}
      const monthsExpected = range(startMonth, endMonth)

      monthsExpected.forEach((mes) => {
        const rowThisMonth = rows.find((r) => r.month === mes)
        if (!rowThisMonth) {
          exceptions[mes] = { skip: true }
        } else {
          const rowAmt = toCents(rowThisMonth.amount ?? rowThisMonth.value ?? 0)
          const rowDesc =
            typeof rowThisMonth.description === 'string' ? rowThisMonth.description : ''
          if (rowDesc !== template.description || rowAmt !== template.amount) {
            exceptions[mes] = {
              override: {
                description: rowDesc,
                amount: rowAmt,
              },
            }
          }
        }
      })

      recurrences.push({
        id: newId(),
        kind: 'income',
        startMonth,
        endMonth,
        template,
        exceptions,
      })
    })

    // Expense Recurrences
    groupedExpenses.forEach((groupRows) => {
      if (groupRows.length === 0) return
      const rows = groupRows.toSorted((a, b) => a.month.localeCompare(b.month))
      const firstRow = rows[0]
      const lastRow = rows[rows.length - 1]
      if (!firstRow || !lastRow) return

      const startMonth = firstRow.month
      const endMonth = lastRow.month
      const template = {
        description: typeof firstRow.description === 'string' ? firstRow.description : '',
        amount: toCents(firstRow.amount ?? firstRow.value ?? 0),
        categoryId: firstRow.categoryId,
      }

      const exceptions: Record<Month, RecurrenceException> = {}
      const monthsExpected = range(startMonth, endMonth)

      monthsExpected.forEach((mes) => {
        const rowThisMonth = rows.find((r) => r.month === mes)
        if (!rowThisMonth) {
          exceptions[mes] = { skip: true }
        } else {
          const rowAmt = toCents(rowThisMonth.amount ?? rowThisMonth.value ?? 0)
          const rowDesc =
            typeof rowThisMonth.description === 'string' ? rowThisMonth.description : ''
          if (
            rowDesc !== template.description ||
            rowAmt !== template.amount ||
            rowThisMonth.categoryId !== template.categoryId
          ) {
            exceptions[mes] = {
              override: {
                description: rowDesc,
                amount: rowAmt,
                categoryId: rowThisMonth.categoryId,
              },
            }
          }
        }
      })

      recurrences.push({
        id: newId(),
        kind: 'expense',
        startMonth,
        endMonth,
        template,
        exceptions,
      })
    })

    // 5. Installments
    const installments: Installment[] = []
    if (Array.isArray(rawInstallments)) {
      rawInstallments.forEach((inst) => {
        if (!isObject(inst)) return
        const name = (inst.name ?? inst.description ?? '') as string
        const cardId = (inst.card ?? inst.cardId ?? '') as CardId
        const totalInstallments =
          typeof inst.totalInstallments === 'number' ? inst.totalInstallments : 2
        const amt =
          typeof inst.amountPerInstallment === 'number'
            ? inst.amountPerInstallment
            : typeof inst.amount === 'number'
              ? inst.amount
              : 0
        const startMonth = inst.startMonth as Month

        installments.push({
          id: typeof inst.id === 'string' && isUuid(inst.id) ? inst.id : newId(),
          name,
          cardId,
          totalInstallments,
          amountPerInstallment: toCents(amt),
          startMonth,
        })
      })
    }

    // 6. Goals
    const goals: Goal[] = []
    if (Array.isArray(rawGoals)) {
      rawGoals.forEach((goal) => {
        if (!isObject(goal)) return
        const name = typeof goal.name === 'string' ? goal.name : ''
        const icon = typeof goal.icon === 'string' ? goal.icon : 'target'
        // check-patterns-ignore-next-line: fallback hex color for legacy domain import
        const color = typeof goal.color === 'string' ? goal.color : '#000000'
        const targetAmount =
          typeof goal.targetAmount === 'number' ? toCents(goal.targetAmount) : (0 as Cents)
        const deadline =
          typeof goal.deadline === 'string' && isMonth(goal.deadline) ? goal.deadline : undefined
        const status = goal.status === 'completed' ? 'completed' : 'active'
        const completedAt =
          status === 'completed'
            ? typeof goal.completedAt === 'string' && isTimestamp(goal.completedAt)
              ? goal.completedAt
              : now()
            : undefined
        const createdAt =
          typeof goal.createdAt === 'string' && isTimestamp(goal.createdAt) ? goal.createdAt : now()

        goals.push({
          id: typeof goal.id === 'string' && isUuid(goal.id) ? goal.id : newId(),
          name,
          icon,
          color,
          targetAmount,
          deadline,
          status,
          completedAt,
          createdAt,
        })
      })
    }

    const snapshot: DomainState = {
      categories,
      creditCards,
      incomes,
      expenses,
      savingsEntries,
      recurrences,
      installments,
      goals,
    }

    return { ok: true, snapshot }
  } catch (err) {
    return {
      ok: false,
      errors: [err instanceof Error ? err.message : String(err)],
    }
  }
}
