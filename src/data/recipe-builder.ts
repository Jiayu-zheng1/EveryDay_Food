import type { Meal } from '../types'

/**
 * 新菜谱的构造辅助：只写每份营养与份量，per100g 和 kcal 由公式推导。
 *
 * 这样避免手算 per100g 时出现「nutrition 与 per100g×份量对不上」，
 * 也让 kcal 始终满足 4P + 4C + 9F，数据自检测试不会因为录入笔误失败。
 *
 * 注意：servingSize.amount 统一按克计（即使 unit 是「个」「块」），
 * 与现有数据文件的口径保持一致。
 */

/** 去掉可推导字段后的菜谱草稿 */
export type MealDraft = Omit<Meal, 'kcal' | 'per100g'>

/** 由每份营养与份量推导 kcal / per100g，并补齐 category */
export function buildMeal(draft: MealDraft): Meal {
  const amount = draft.servingSize.amount
  if (!(amount > 0)) {
    throw new Error(`菜谱 ${draft.id} 的 servingSize.amount 必须大于 0`)
  }
  const per100g = {
    protein: Math.round((draft.nutrition.protein / amount) * 1000) / 10,
    carbs: Math.round((draft.nutrition.carbs / amount) * 1000) / 10,
    fat: Math.round((draft.nutrition.fat / amount) * 1000) / 10,
  }
  const kcal = Math.round(
    4 * draft.nutrition.protein + 4 * draft.nutrition.carbs + 9 * draft.nutrition.fat
  )
  return { ...draft, kcal, per100g }
}

/** 小吃类草稿：category 固定为 snack */
export function snackMeal(draft: Omit<MealDraft, 'category'>): Meal {
  return buildMeal({ ...draft, category: 'snack' })
}

/** 烘焙类草稿：category 固定为 bakery */
export function bakeryMeal(draft: Omit<MealDraft, 'category'>): Meal {
  return buildMeal({ ...draft, category: 'bakery' })
}
