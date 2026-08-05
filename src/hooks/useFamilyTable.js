import { useMemo, useState } from 'react'

/**
 * 家庭餐桌状态 hook：管理已加入「我的餐桌」的菜品
 * - items 按加入顺序排列，以菜品 id 去重（重复 add 同一道菜被忽略）
 * - 四个营养合计：kcal / 蛋白 / 碳水 / 脂肪，缺失 nutrition 字段按 0 处理
 */
export default function useFamilyTable() {
  const [items, setItems] = useState([])

  // 加入菜品：已存在同 id 则忽略，否则追加到末尾
  const add = (meal) => {
    setItems((prev) => (prev.some((m) => m.id === meal.id) ? prev : [...prev, meal]))
  }

  // 按 id 移除菜品
  const remove = (id) => {
    setItems((prev) => prev.filter((m) => m.id !== id))
  }

  // 清空餐桌
  const clear = () => setItems([])

  // 营养合计：对每道菜的 nutrition 字段求和，字段缺失按 0 处理
  const { kcalTotal, proteinTotal, carbsTotal, fatTotal } = useMemo(() => {
    return items.reduce(
      (acc, meal) => {
        const n = meal.nutrition ?? {}
        // kcal 在菜品顶层（schema: kcal 与 nutrition 平级），nutrition 只有蛋白/碳水/脂肪
        acc.kcalTotal += meal.kcal ?? 0
        acc.proteinTotal += n.protein ?? 0
        acc.carbsTotal += n.carbs ?? 0
        acc.fatTotal += n.fat ?? 0
        return acc
      },
      { kcalTotal: 0, proteinTotal: 0, carbsTotal: 0, fatTotal: 0 },
    )
  }, [items])

  return { items, add, remove, clear, kcalTotal, proteinTotal, carbsTotal, fatTotal }
}
