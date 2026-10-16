import type { Meal } from '../types'

export const TABLE_STORAGE_KEY = 'moments-food-table-v1'
export const TABLE_STORAGE_VERSION = 1

interface PersistedTablePayload {
  version: number
  items: Meal[]
}

/** 检验是否为合法 Meal 对象（具备必要基础属性） */
function isValidMeal(value: unknown): value is Meal {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Meal>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.kcal === 'number'
  )
}

/**
 * 从 localStorage 读取餐桌持久化菜品列表。
 * 若环境无 Storage、解析失败或数据格式不合规，安全降级为空数组。
 */
export function loadTableState(
  storage: Storage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined
): Meal[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(TABLE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<PersistedTablePayload>
    if (parsed.version !== TABLE_STORAGE_VERSION || !Array.isArray(parsed.items)) {
      return []
    }
    return parsed.items.filter(isValidMeal)
  } catch {
    return []
  }
}

/**
 * 将餐桌菜品列表保存至 localStorage。
 * 静默拦截写入异常（如私密模式或存储配额溢出），避免打断交互。
 */
export function saveTableState(
  items: Meal[],
  storage: Storage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined
): void {
  if (!storage) return
  try {
    const payload: PersistedTablePayload = {
      version: TABLE_STORAGE_VERSION,
      items,
    }
    storage.setItem(TABLE_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // 降级为纯内存，不抛错
  }
}

/** 清空餐桌持久化状态 */
export function clearTableState(
  storage: Storage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined
): void {
  if (!storage) return
  try {
    storage.removeItem(TABLE_STORAGE_KEY)
  } catch {
    // 忽略异常
  }
}

/**
 * 汇总餐桌上所有菜品的热量与三大营养素
 */
export function calculateTableTotals(items: Meal[]): {
  kcalTotal: number
  proteinTotal: number
  carbsTotal: number
  fatTotal: number
} {
  return items.reduce(
    (acc, meal) => {
      const n = meal.nutrition
      acc.kcalTotal += meal.kcal ?? 0
      acc.proteinTotal += n?.protein ?? 0
      acc.carbsTotal += n?.carbs ?? 0
      acc.fatTotal += n?.fat ?? 0
      return acc
    },
    { kcalTotal: 0, proteinTotal: 0, carbsTotal: 0, fatTotal: 0 }
  )
}
