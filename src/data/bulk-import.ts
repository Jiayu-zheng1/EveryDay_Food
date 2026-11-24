import type { Category, Cuisine, Meal } from '../types'
import { buildMeal } from './recipe-builder'

/**
 * 批量菜谱的紧凑录入格式。
 *
 * 一行 = 一道菜，字段顺序固定：
 * [菜名, 分类, 菜系, emoji, 简介, 食材, 步骤, 蛋白, 碳水, 脂肪, 每份克数, 餐次, 做法, 口味, 古籍来源?]
 *
 * 食材、步骤、餐次、做法、口味用 `|` 分隔；营养按每份估算。
 * 古籍来源只写书名（如「随园食单」），数据按公共领域处理；做法为新写现代家庭版。
 */
export type RecipeRow = [
  name: string,
  category: Category,
  cuisine: Cuisine,
  emoji: string,
  desc: string,
  ingredients: string,
  steps: string,
  protein: number,
  carbs: number,
  fat: number,
  serving: number,
  mealType: string,
  methods: string,
  flavors: string,
  source?: string,
]

export function createMeals(rows: RecipeRow[]): Meal[] {
  return rows.map((row) => {
    const [name, category, cuisine, emoji, desc, ingredients, steps, protein, carbs, fat, serving, mealType, methods, flavors, source] = row
    return buildMeal({
      id: `bulk-${name}`,
      name,
      category,
      cuisine,
      emoji,
      desc,
      ingredients: ingredients.split('|'),
      steps: steps.split('|'),
      nutrition: { protein, carbs, fat },
      servingSize: { amount: serving, unit: 'g' },
      mealType: mealType.split('|') as Meal['mealType'],
      methods: methods.split('|') as Meal['methods'],
      flavors: flavors.split('|') as Meal['flavors'],
      nutritionQuality: 'estimated',
      ...(source
        ? { source: { name: source, license: 'Public Domain' } }
        : {}),
    })
  })
}
