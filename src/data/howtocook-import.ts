import type { Meal } from '../types'
import raw from './howtocook-import.json'

/**
 * 从 HowToCook（Unlicense）解析并去重后的菜谱。
 *
 * 数据由 `npm run import:howtocook` 生成；营养为按食材与份量估算，
 * 已标记 nutritionQuality: 'estimated'，页面会显示估算提示。
 * JSON 里只存每份营养，per100g 在这里按份量推导，保持与现有数据口径一致。
 */
type RawMeal = Omit<Meal, 'per100g'>

export const howtocookMeals = (raw as unknown as RawMeal[]).map<Meal>((meal) => {
  const amount = meal.servingSize.amount
  const nutrition = {
    protein: Math.round(meal.nutrition.protein),
    carbs: Math.round(meal.nutrition.carbs),
    fat: Math.round(meal.nutrition.fat),
  }
  return {
    ...meal,
    nutrition,
    kcal: 4 * nutrition.protein + 4 * nutrition.carbs + 9 * nutrition.fat,
    per100g: {
      protein: Math.round((nutrition.protein / amount) * 1000) / 10,
      carbs: Math.round((nutrition.carbs / amount) * 1000) / 10,
      fat: Math.round((nutrition.fat / amount) * 1000) / 10,
    },
  }
})
