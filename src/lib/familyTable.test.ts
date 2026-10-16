import { describe, expect, it } from 'vitest'
import type { Meal } from '../types'
import {
  calculateTableTotals,
  clearTableState,
  loadTableState,
  saveTableState,
} from './familyTable'

function createTestMeal(overrides: Partial<Meal> & { id: string }): Meal {
  return {
    name: `菜品-${overrides.id}`,
    category: 'home',
    cuisine: 'generic',
    emoji: '🍲',
    kcal: 300,
    desc: '',
    ingredients: ['食材 100 克'],
    steps: ['下锅炒熟'],
    nutrition: { protein: 20, carbs: 30, fat: 10 },
    per100g: { protein: 10, carbs: 15, fat: 5 },
    servingSize: { amount: 200, unit: 'g' },
    mealType: ['lunch', 'dinner'],
    ...overrides,
    id: overrides.id,
  }
}

// 模拟 Storage
function createMockStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.get(key) ?? null
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }
}

describe('familyTable 持久化逻辑', () => {
  it('Storage 为空时返回空数组', () => {
    const storage = createMockStorage()
    expect(loadTableState(storage)).toEqual([])
  })

  it('能正确保存并在下次加载时还原菜品列表', () => {
    const storage = createMockStorage()
    const mealA = createTestMeal({ id: 'm1', name: '青椒炒肉' })
    const mealB = createTestMeal({ id: 'm2', name: '番茄炒蛋' })

    saveTableState([mealA, mealB], storage)
    const loaded = loadTableState(storage)

    expect(loaded).toHaveLength(2)
    expect(loaded[0].id).toBe('m1')
    expect(loaded[1].name).toBe('番茄炒蛋')
  })

  it('损坏的 JSON 或非合法数据安全降级为空数组，不抛异常', () => {
    const storage = createMockStorage({
      'moments-food-table-v1': '{ broken json ...',
    })
    expect(loadTableState(storage)).toEqual([])

    const storageWrongVersion = createMockStorage({
      'moments-food-table-v1': JSON.stringify({ version: 999, items: 'not an array' }),
    })
    expect(loadTableState(storageWrongVersion)).toEqual([])
  })

  it('clearTableState 能正常清空存储', () => {
    const storage = createMockStorage()
    saveTableState([createTestMeal({ id: 'm1' })], storage)
    expect(loadTableState(storage)).toHaveLength(1)

    clearTableState(storage)
    expect(loadTableState(storage)).toEqual([])
  })

  it('storage 写入受限（如 QuotaExceeded）时静默处理不抛崩溃', () => {
    const brokenStorage: Storage = {
      length: 0,
      clear() {},
      getItem: () => null,
      key: () => null,
      removeItem() {},
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(() => saveTableState([createTestMeal({ id: 'm1' })], brokenStorage)).not.toThrow()
  })
})

describe('calculateTableTotals 汇总计算', () => {
  it('正确累计多个菜品的卡路里与三大营养素', () => {
    const meals = [
      createTestMeal({ id: '1', kcal: 250, nutrition: { protein: 15, carbs: 20, fat: 10 } }),
      createTestMeal({ id: '2', kcal: 400, nutrition: { protein: 30, carbs: 10, fat: 25 } }),
    ]
    const totals = calculateTableTotals(meals)
    expect(totals).toEqual({
      kcalTotal: 650,
      proteinTotal: 45,
      carbsTotal: 30,
      fatTotal: 35,
    })
  })

  it('遇到缺失 nutrition 字段或属性不全的菜品安全兜底为 0', () => {
    const meals = [
      createTestMeal({ id: '1', kcal: 200, nutrition: undefined as unknown as Meal['nutrition'] }),
      createTestMeal({ id: '2', kcal: 300, nutrition: { protein: 10, carbs: 0, fat: 5 } }),
    ]
    const totals = calculateTableTotals(meals)
    expect(totals.kcalTotal).toBe(500)
    expect(totals.proteinTotal).toBe(10)
  })
})
