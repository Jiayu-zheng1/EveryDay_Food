import { useEffect, useMemo, useState } from 'react'
import {
  calculateBMI,
  calculateDailyTargets,
  generateSmartPlan,
  MEAL_SPLIT,
  suggestGoal,
} from '../lib/nutrition'
import type {
  BmiResult,
  DailyTargets,
  Goal,
  Meal,
  MealSplitItem,
  NutritionForm,
  PlanSlot,
} from '../types'

/** 热量计算器状态 Hook 返回结构 */
interface UseNutritionResult {
  form: NutritionForm
  update: (patch: Partial<NutritionForm>) => void
  submit: () => void
  submitted: boolean
  results: DailyTargets
  mealSplit: MealSplitItem[]
  smartPlan: PlanSlot[] | null
  generatePlan: (meals: Meal[]) => PlanSlot[] | null
  bmi: BmiResult
  suggestedGoal: Goal
}

/** localStorage 持久化结构（与 useNutrition 的状态一一对应） */
interface PersistedState {
  form: NutritionForm
  submitted: boolean
  smartPlan: PlanSlot[] | null
  goalTouched: boolean
}

/** 表单默认值：30 岁男性 175cm 70kg 中度活动（目标由 BMI 建议自动决定） */
const DEFAULT_FORM: NutritionForm = {
  gender: 'male',
  age: 30,
  heightCm: 175,
  weightKg: 70,
  activityLevel: 'moderate',
  goal: 'cutting',
}

// —— localStorage 持久化 ——
// 同一 key 存整份状态对象（版本字段用于将来迁移/失效旧数据）
const STORAGE_KEY = 'moments-food-nutrition-v1'
const STORAGE_VERSION = 1

/** 宽松校验：结构上像一餐（含 slot 与非空 meals 数组）即可，字段类型不强校验 */
function isPlanSlot(value: unknown): value is PlanSlot {
  if (!value || typeof value !== 'object') return false
  const v = value as { slot?: unknown; meals?: unknown }
  return typeof v.slot === 'string' && Array.isArray(v.meals) && v.meals.length > 0
}

/**
 * 从 localStorage 读取并校验持久化状态。
 * 任何异常（JSON 解析失败 / 版本不符 / 结构不合法）都回退返回 null（即使用默认值）；
 * localStorage 不可用（隐私模式/被禁用）时同样静默降级为纯内存模式，不抛错。
 */
function loadPersistedState(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as unknown
    if (!data || typeof data !== 'object') return null
    const record = data as Record<string, unknown>
    if (record.version !== STORAGE_VERSION) return null

    // 表单按字段合并：缺失字段回退默认值，避免旧数据缺字段导致计算崩溃
    const form =
      record.form && typeof record.form === 'object'
        ? { ...DEFAULT_FORM, ...(record.form as Partial<NutritionForm>) }
        : DEFAULT_FORM

    // smartPlan 必须为合法搭配结构（每餐含 slot 与非空 meals 数组），否则丢弃，
    // 防止旧/损坏数据在 DailyPlan 渲染时崩溃
    const planIsValid =
      Array.isArray(record.smartPlan) &&
      record.smartPlan.length > 0 &&
      record.smartPlan.every(isPlanSlot)

    return {
      form,
      submitted: record.submitted === true,
      smartPlan: planIsValid ? (record.smartPlan as PlanSlot[]) : null,
      goalTouched: record.goalTouched === true,
    }
  } catch {
    return null // 解析失败或存储不可用：静默回退默认值
  }
}

/**
 * 热量计算器状态 Hook：管理表单 + 计算结果 + BMI + 智能搭配
 * BMI 异常（偏瘦/超重/肥胖）时自动跟随 suggestGoal 的建议目标，用户手动改过目标则不覆盖
 * 状态持久化到 localStorage：刷新后恢复上次的表单、提交结果与智能搭配；
 * 任何状态变化（含未提交的表单草稿）都会写回，写入失败静默忽略
 */
export default function useNutrition(): UseNutritionResult {
  // 首次渲染时一次性解析持久化数据（lazy initializer），供各状态初始化共用
  const [saved] = useState(loadPersistedState)
  const [form, setForm] = useState<NutritionForm>(() => (saved ? saved.form : DEFAULT_FORM))
  const [submitted, setSubmitted] = useState(() => (saved ? saved.submitted : false))
  const [smartPlan, setSmartPlan] = useState<PlanSlot[] | null>(() =>
    saved ? saved.smartPlan : null
  ) // null = 未生成，DailyPlan 保持随机模式
  const [goalTouched, setGoalTouched] = useState(() => (saved ? saved.goalTouched : false)) // 用户是否手动改过目标

  // 状态变化即持久化：提交结果（submitted=true）、智能搭配与表单草稿都会保存；
  // 每次写入的都是最新完整状态，重新计算后旧 smartPlan 已在上一步被清空，不会残留
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: STORAGE_VERSION,
          form,
          submitted,
          smartPlan,
          goalTouched,
        })
      )
    } catch {
      // localStorage 不可用（隐私模式/配额满）：静默降级为纯内存模式
    }
  }, [form, submitted, smartPlan, goalTouched])

  // BMI 与建议目标（随身高体重实时计算）
  const bmi = useMemo(
    () => calculateBMI(form.weightKg, form.heightCm),
    [form.weightKg, form.heightCm]
  )
  const suggestedGoal = useMemo(() => suggestGoal(bmi.bmi), [bmi])

  // 更新单个字段；表单变化后旧的智能搭配作废（热量目标已变）
  const update = (patch: Partial<NutritionForm>) => {
    if ('goal' in patch) setGoalTouched(true) // 手动点过目标分段按钮
    setForm((prev) => ({ ...prev, ...patch }))
    setSmartPlan(null)
  }

  // BMI 异常时自动跟随建议目标；用户手动改过目标则不覆盖
  useEffect(() => {
    if (!goalTouched && suggestedGoal !== form.goal) {
      setForm((prev) => ({ ...prev, goal: suggestedGoal }))
    }
  }, [suggestedGoal, goalTouched, form.goal])

  // 提交：显示结果卡片（结果随表单实时计算）
  const submit = () => setSubmitted(true)

  // 每日热量目标（始终按当前表单实时计算，展示与否由 submitted 控制）
  const results = useMemo(() => calculateDailyTargets(form), [form])

  // 三餐热量分配（结果卡展示用）
  const mealSplit = useMemo(
    (): MealSplitItem[] => [
      { slot: '早餐', kcal: Math.round(results.targetKcal * MEAL_SPLIT.breakfast) },
      { slot: '午餐', kcal: Math.round(results.targetKcal * MEAL_SPLIT.lunch) },
      { slot: '晚餐', kcal: Math.round(results.targetKcal * MEAL_SPLIT.dinner) },
    ],
    [results]
  )

  // 生成智能三餐搭配（传入当前食谱数据，数量无关；按目标过滤候选池）
  // 首次生成：确定性贪心，便于与手算核对；已有搭配时点「重新生成」：在接近最优候选中随机，保证能换组
  const generatePlan = (meals: Meal[]): PlanSlot[] | null => {
    if (!meals || meals.length === 0) return null
    const plan = generateSmartPlan(meals, results, {
      goal: results.goal,
      random: smartPlan !== null,
    })
    setSmartPlan(plan)
    setSubmitted(true)
    return plan
  }

  return {
    form,
    update,
    submit,
    submitted,
    results,
    mealSplit,
    smartPlan,
    generatePlan,
    bmi,
    suggestedGoal,
  }
}
