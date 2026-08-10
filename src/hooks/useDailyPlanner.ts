import { useCallback, useEffect, useMemo, useState } from 'react'
import { dateSeed, generateDailyPlan } from '../lib/nutrition'
import type { Meal, MealType, PlanSlot } from '../types'

/** 搭配展示模式：custom 用户自定义（点过「生成」） / random 随机（未点生成） */
export type PlannerMode = 'custom' | 'random'

/** 每餐菜数配置（key 与 MealType 一致） */
export type MealCounts = Record<MealType, number>

/** 每餐菜数默认值：早餐 2 / 午餐 3 / 晚餐 3 */
export const DEFAULT_MEAL_COUNTS: MealCounts = { breakfast: 2, lunch: 3, dinner: 3 }

/** 人口数范围（步进器） */
export const PEOPLE_RANGE = { min: 1, max: 6 } as const

/** 每餐菜数范围（步进器） */
export const MEAL_COUNT_RANGE: Record<MealType, { min: number; max: number }> = {
  breakfast: { min: 1, max: 3 },
  lunch: { min: 1, max: 4 },
  dinner: { min: 1, max: 4 },
}

/** useDailyPlanner 入参 */
interface UseDailyPlannerOptions {
  /** 全量食谱（来自 useMeals） */
  meals: Meal[]
}

/** useDailyPlanner 返回结构 */
export interface UseDailyPlannerResult {
  /** 人口数（1-6，默认 1）；份量与 kcal 按此换算展示，不触发重新生成 */
  people: number
  setPeople: (people: number) => void
  /** 每餐菜数（默认 2/3/3） */
  mealCounts: MealCounts
  /** 修改某餐菜数（步进器调用，自动在范围内截断） */
  setMealCount: (type: MealType, count: number) => void
  /** 当前展示的搭配：自定义模式为用户点「生成」的结果，否则为随机生成 */
  plan: PlanSlot[]
  /** 搭配是否加载中（全量食谱尚未就绪） */
  loading: boolean
  /** 展示模式 */
  mode: PlannerMode
  /** 单份合计 kcal（1 人份），展示时按 people 换算 */
  totalKcal: number
  /** 点「✨ 生成今日搭配」：切到自定义模式并换新种子（结果必然变化） */
  generate: () => void
  /** 「🎲 换一批」：换新种子重新生成 */
  shuffle: () => void
}

/**
 * 今日搭配生成 Hook：人口数 / 每餐菜数 / 种子（同日稳定 + 换一批）
 * 生成逻辑（generateDailyPlan）为 lib 纯函数，本 hook 只负责状态编排：
 * - 首次挂载（或菜数变化）用日期种子生成，同一天内结果稳定
 * - 「生成 / 换一批」换 Date.now() 种子，结果必然变化
 * - 人口数只影响展示换算（份量 × people），不触发重新生成
 * 今日搭配只做随机生成，与健康目标 / 智能搭配完全解耦
 */
export default function useDailyPlanner({ meals }: UseDailyPlannerOptions): UseDailyPlannerResult {
  const [people, setPeople] = useState(1)
  const [mealCounts, setMealCounts] = useState<MealCounts>(DEFAULT_MEAL_COUNTS)
  const [customPlan, setCustomPlan] = useState<PlanSlot[]>([])
  // 种子：初始为 YYYYMMDD（同日稳定）；generate/shuffle 换 Date.now()（结果变化）
  const [seed, setSeed] = useState<number>(() => dateSeed())
  // 用户是否点过「生成今日搭配」：true 时展示自定义搭配，否则展示随机搭配
  const [customActive, setCustomActive] = useState(false)

  // 菜数 / 种子变化（含首次挂载、换一批）时重新生成自定义搭配
  useEffect(() => {
    if (meals.length === 0) return // 数据未就绪，等 useMeals 返回后再生成
    setCustomPlan(generateDailyPlan(meals, mealCounts, { seed }))
  }, [meals, mealCounts, seed])

  /** 点「✨ 生成今日搭配」：切到自定义模式并换新种子（结果必然变化） */
  const generate = useCallback(() => {
    setCustomActive(true)
    setSeed(Date.now())
  }, [])

  /** 「🎲 换一批」：换新种子重新生成（随机 / 自定义模式） */
  const shuffle = useCallback(() => setSeed(Date.now()), [])

  /** 修改某餐菜数：在范围 [min, max] 内截断 */
  const setMealCount = useCallback((type: MealType, count: number) => {
    setMealCounts((prev) => {
      const range = MEAL_COUNT_RANGE[type]
      const clamped = Math.min(range.max, Math.max(range.min, Math.floor(count)))
      return prev[type] === clamped ? prev : { ...prev, [type]: clamped }
    })
  }, [])

  // 模式：自定义（点过生成）> 随机（默认自动生成）
  const mode: PlannerMode = customActive ? 'custom' : 'random'
  const plan = customPlan

  // 全天合计热量（单份）：遍历每餐每道菜求和
  const totalKcal = useMemo(
    () => plan.reduce((sum, item) => sum + item.meals.reduce((s, m) => s + m.kcal, 0), 0),
    [plan]
  )

  return {
    people,
    setPeople: (n: number) =>
      setPeople(Math.min(PEOPLE_RANGE.max, Math.max(PEOPLE_RANGE.min, Math.floor(n)))),
    mealCounts,
    setMealCount,
    plan,
    loading: meals.length === 0,
    mode,
    totalKcal,
    generate,
    shuffle,
  }
}
