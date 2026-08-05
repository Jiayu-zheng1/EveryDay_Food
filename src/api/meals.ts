/**
 * 数据访问层（API 模块）
 *
 * v1 内部实现直接返回本地 src/data/meals.ts 的数据，并带模拟网络延迟，
 * 让调用方式与真实接口一致。将来接入后端时，只需把函数体换成
 * `fetch('/api/meals')` 等真实请求，组件与 hooks 零改动。
 *
 * 约定：本文件是唯一允许直接 import src/data/meals.ts 的模块。
 */

import { meals, CATEGORY_META } from '../data/meals'
import type { Meal, MealType, PlanSlot } from '../types'

/** 模拟网络延迟（100–300ms），让加载态真实可见 */
const delay = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 100 + Math.random() * 200))

/** 深拷贝，防止调用方意外修改本地数据源 */
const clone = <T>(value: T): T => structuredClone(value)

/** 从数组中随机取 count 个不重复元素 */
function pickRandom<T>(list: T[], count: number): T[] {
  const pool = [...list]
  const picked = []
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(index, 1)[0])
  }
  return picked
}

/**
 * 获取全部食谱
 */
export async function fetchMeals(): Promise<Meal[]> {
  await delay()
  return clone(meals)
}

/**
 * 按 id 获取单道食谱
 */
export async function fetchMealById(id: string): Promise<Meal | null> {
  await delay()
  const meal = meals.find((item) => item.id === id)
  return meal ? clone(meal) : null
}

/**
 * 获取今日三餐搭配（早餐 / 午餐 / 晚餐各一道，按 mealType 匹配对应餐次）
 * 返回结构与智能搭配统一：PlanSlot[]（随机模式每餐 1 道菜）
 * @param category 可选：传入时候选池先按分类过滤（如 'fat-loss'），不传则全库抽取
 */
export async function fetchDailyPlan(
  category?: Meal['category']
): Promise<PlanSlot[]> {
  await delay()
  // 按 mealType 抽餐：早餐抽早餐菜、午餐抽午餐菜，避免早餐抽到照烧鸡腿饭
  // used 记录已抽中的菜，后续餐次的候选池将其排除，保证三餐互不重复
  const used = new Set<string>()
  const byType = (type: MealType) =>
    meals.filter(
      (item: Meal) =>
        item.mealType.includes(type) &&
        !used.has(item.id) &&
        (!category || item.category === category)
    )
  const [breakfast] = pickRandom(byType('breakfast'), 1)
  breakfast && used.add(breakfast.id)
  const [lunch] = pickRandom(byType('lunch'), 1)
  lunch && used.add(lunch.id)
  const [dinner] = pickRandom(byType('dinner'), 1)
  return [
    { slot: '早餐', meals: breakfast ? [clone(breakfast)] : [] },
    { slot: '午餐', meals: lunch ? [clone(lunch)] : [] },
    { slot: '晚餐', meals: dinner ? [clone(dinner)] : [] },
  ]
}

/**
 * 分类展示元信息（标签 / 图标 / 渐变色），静态配置，同步返回
 */
export function getCategoryMeta(): typeof CATEGORY_META {
  return CATEGORY_META
}
