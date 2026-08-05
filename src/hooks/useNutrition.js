import { useEffect, useMemo, useState } from 'react'
import {
  calculateBMI,
  calculateDailyTargets,
  generateSmartPlan,
  MEAL_SPLIT,
  suggestGoal,
} from '../lib/nutrition'

// 表单默认值：30 岁男性 175cm 70kg 中度活动（目标由 BMI 建议自动决定）
const DEFAULT_FORM = {
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

/**
 * 从 localStorage 读取并校验持久化状态。
 * 任何异常（JSON 解析失败 / 版本不符 / 结构不合法）都回退返回 null（即使用默认值）；
 * localStorage 不可用（隐私模式/被禁用）时同样静默降级为纯内存模式，不抛错。
 */
function loadPersistedState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object' || data.version !== STORAGE_VERSION) return null

    // 表单按字段合并：缺失字段回退默认值，避免旧数据缺字段导致计算崩溃
    const form =
      data.form && typeof data.form === 'object'
        ? { ...DEFAULT_FORM, ...data.form }
        : DEFAULT_FORM

    // smartPlan 必须为合法搭配结构（每餐含 slot 与非空 meals 数组），否则丢弃，
    // 防止旧/损坏数据在 DailyPlan 渲染时崩溃
    const planIsValid =
      Array.isArray(data.smartPlan) &&
      data.smartPlan.length > 0 &&
      data.smartPlan.every(
        (p) =>
          p &&
          typeof p === 'object' &&
          typeof p.slot === 'string' &&
          Array.isArray(p.meals) &&
          p.meals.length > 0
      )

    return {
      form,
      submitted: data.submitted === true,
      smartPlan: planIsValid ? data.smartPlan : null,
      goalTouched: data.goalTouched === true,
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
export default function useNutrition() {
  // 首次渲染时一次性解析持久化数据（lazy initializer），供各状态初始化共用
  const [saved] = useState(loadPersistedState)
  const [form, setForm] = useState(() => (saved ? saved.form : DEFAULT_FORM))
  const [submitted, setSubmitted] = useState(() => (saved ? saved.submitted : false))
  const [smartPlan, setSmartPlan] = useState(() => (saved ? saved.smartPlan : null)) // null = 未生成，DailyPlan 保持随机模式
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
  const update = (patch) => {
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
    () => [
      { slot: '早餐', kcal: Math.round(results.targetKcal * MEAL_SPLIT.breakfast) },
      { slot: '午餐', kcal: Math.round(results.targetKcal * MEAL_SPLIT.lunch) },
      { slot: '晚餐', kcal: Math.round(results.targetKcal * MEAL_SPLIT.dinner) },
    ],
    [results]
  )

  // 生成智能三餐搭配（传入当前食谱数据，数量无关；按目标过滤候选池）
  // 首次生成：确定性贪心，便于与手算核对；已有搭配时点「重新生成」：在接近最优候选中随机，保证能换组
  const generatePlan = (meals) => {
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
