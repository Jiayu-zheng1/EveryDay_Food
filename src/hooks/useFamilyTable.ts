import { useEffect, useMemo, useState } from 'react'
import {
  calculateTableTotals,
  clearTableState,
  loadTableState,
  saveTableState,
} from '../lib/familyTable'
import type { Meal } from '../types'

/** 家庭餐桌状态 Hook 返回结构 */
interface FamilyTableState {
  items: Meal[]
  add: (meal: Meal) => void
  remove: (id: string) => void
  clear: () => void
  kcalTotal: number
  proteinTotal: number
  carbsTotal: number
  fatTotal: number
}

/**
 * 家庭餐桌状态 hook：管理已加入「我的餐桌」的菜品
 * - items 按加入顺序排列，以菜品 id 去重（重复 add 同一道菜被忽略）
 * - 持久化至 localStorage，刷新或重访页面保持已选菜品
 * - 四个营养合计：kcal / 蛋白 / 碳水 / 脂肪
 */
export default function useFamilyTable(): FamilyTableState {
  const [items, setItems] = useState<Meal[]>(loadTableState)

  // 变动时自动持久化到 localStorage
  useEffect(() => {
    saveTableState(items)
  }, [items])

  // 加入菜品：已存在同 id 则忽略，否则追加到末尾
  const add = (meal: Meal) => {
    setItems((prev) => (prev.some((m) => m.id === meal.id) ? prev : [...prev, meal]))
  }

  // 按 id 移除菜品
  const remove = (id: string) => {
    setItems((prev) => prev.filter((m) => m.id !== id))
  }

  // 清空餐桌并同步清理持久化
  const clear = () => {
    setItems([])
    clearTableState()
  }

  const { kcalTotal, proteinTotal, carbsTotal, fatTotal } = useMemo(
    () => calculateTableTotals(items),
    [items]
  )

  return { items, add, remove, clear, kcalTotal, proteinTotal, carbsTotal, fatTotal }
}
