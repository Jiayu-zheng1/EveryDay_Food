/**
 * v2 热量计算 + 智能搭配算法（纯函数模块，无 React 依赖）
 *
 * 依据：
 * - 4-4-9 法则：蛋白质/碳水每克 4 kcal，脂肪每克 9 kcal
 * - Mifflin-St Jeor 公式计算 BMR
 * - 活动水平系数 × 5 档
 * - 减脂/增肌/维持宏量配比 + 三餐热量分配
 */

import type {
  ActivityLevel,
  BmiResult,
  Category,
  DailyTargets,
  Gender,
  Goal,
  Meal,
  MealType,
  Nutrition,
  NutritionForm,
  PlanSlot,
  SmartPlanOptions,
} from '../types'

/** 每克宏量营养素的热量（kcal/g） */
export const KCAL_PER_GRAM: Record<keyof Nutrition, number> = { protein: 4, carbs: 4, fat: 9 }

/** 不同目标的宏量配比（占比合计 = 1） */
export const MACRO_SPLIT: Record<Goal, { p: number; c: number; f: number }> = {
  cutting: { p: 0.4, c: 0.3, f: 0.3 }, // 减脂：高蛋白
  bulking: { p: 0.3, c: 0.4, f: 0.3 }, // 增肌：高碳水
  maintenance: { p: 0.3, c: 0.35, f: 0.35 }, // 维持：均衡
}

/** 三餐热量分配比例（合计 = 1） */
export const MEAL_SPLIT: Record<MealType, number> = { breakfast: 0.3, lunch: 0.4, dinner: 0.3 }

/** 目标 → 食谱分类的映射（智能搭配/随机搭配按目标过滤候选池用） */
export const GOAL_CATEGORY: Record<Goal, Category> = {
  cutting: 'fat-loss',
  bulking: 'muscle-gain',
  maintenance: 'maintain',
}

/** 目标的中文标签（UI 展示用） */
export const GOAL_LABELS: Record<Goal, string> = { cutting: '减脂', bulking: '增肌', maintenance: '维持' }

/** Mifflin-St Jeor 性别修正：男 +5 / 女 −161 */
const GENDER_ADJUST: Record<Gender, number> = { male: 5, female: -161 }

/** 活动水平系数：久坐 / 轻度 / 中度 / 高强度 / 极高 */
export const ACTIVITY_LEVELS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  veryHigh: 1.9,
}

/** 减脂目标每日热量下限保护（kcal），避免热量过低伤身体 */
const CUTTING_FLOOR: Record<Gender, number> = { male: 1500, female: 1200 }

/**
 * 单餐候选池规模上限（防御性）：超过上限的池（仅异常输入可达，正常路径各池
 * 分类过滤后 ≤ 48 道）跳过组合枚举、直接取热量最接近该餐目标的 2 道。
 * 组合枚举的复杂度是 O(C(n,2)+C(n,3))，损坏的 goal 会让分类过滤失效、候选池
 * 膨胀到数百道，C(500,3)≈2000 万次枚举曾卡死主线程 27.5s。
 */
const MAX_POOL_SIZE = 60
/** 组合枚举总预算：超过则放弃枚举，直接退化取热量最高的 3 道（双保险） */
const MAX_COMBOS = 120_000

/**
 * 数值字段归一：输入框现在存的是原始字符串（可为空串的编辑中间态，见 CalorieCalculator），
 * 所有计算入口统一经此转数字——空串/null/undefined 按 0 处理，非法值也归 0，杜绝 NaN 崩溃与字符串拼接。
 */
function toNumber(value: string | number | null | undefined): number {
  if (value === '' || value === null || value === undefined) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * 基础代谢率 BMR（Mifflin-St Jeor）
 * @param input 表单中的性别与年龄/身高/体重（数值字段允许字符串，入口归一）
 * @returns kcal
 */
export function calculateBMR(
  input: Pick<NutritionForm, 'gender' | 'age' | 'heightCm' | 'weightKg'>
): number {
  const { gender, age, heightCm, weightKg } = input
  const s = GENDER_ADJUST[gender] ?? 5 // 未知性别按男性处理
  // 先归一为数字再运算：表单里这三个字段可能是字符串（含空串），
  // 直接 `weightKg + …` 会拼字符串，`undefined` 相乘还会出 NaN
  const w = toNumber(weightKg)
  const h = toNumber(heightCm)
  const a = toNumber(age)
  return 10 * w + 6.25 * h - 5 * a + s
}

/**
 * 每日总消耗 TDEE = BMR × 活动系数
 * @returns kcal
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const factor = ACTIVITY_LEVELS[activityLevel] ?? 1.2
  return bmr * factor
}

/**
 * BMI 计算（中国成人标准）
 * BMI = 体重(kg) / 身高(m)²
 * 分类：<18.5 偏瘦、18.5-24 正常、24-28 超重、≥28 肥胖
 * @param weightKg 体重（kg）
 * @param heightCm 身高（cm）
 * @returns 体重/身高为 0 或负数时返回 null（身高清空等编辑中间态会经 toNumber 归 0，
 *   此时除零会得 NaN，UI 需按「未填写」处理而非展示 NaN）
 */
export function calculateBMI(weightKg: number | string, heightCm: number | string): BmiResult | null {
  // 与 calculateBMR 同理：入口先归一，空串按 0，避免 NaN 或字符串参与运算
  const w = toNumber(weightKg)
  const h = toNumber(heightCm)
  // 除零保护：身高或体重无效时不计算，返回 null 由 UI 提示「请填写完整的身高体重」
  if (w <= 0 || h <= 0) return null
  const heightM = h / 100
  const bmi = Math.round((w / (heightM * heightM)) * 10) / 10 // 保留 1 位小数
  let category: BmiResult['category']
  let label: string
  if (bmi < 18.5) {
    category = 'underweight'
    label = '偏瘦'
  } else if (bmi < 24) {
    category = 'normal'
    label = '正常'
  } else if (bmi < 28) {
    category = 'overweight'
    label = '超重'
  } else {
    category = 'obese'
    label = '肥胖'
  }
  return { bmi, category, label }
}

/**
 * 根据 BMI 建议目标：≥24 减脂 / <18.5 增肌 / 其余维持
 */
export function suggestGoal(bmi: number): Goal {
  if (bmi >= 24) return 'cutting'
  if (bmi < 18.5) return 'bulking'
  return 'maintenance'
}

/**
 * 每日热量与宏量目标
 * - 目标热量：cutting = TDEE − 500（下限保护男 1500 / 女 1200），bulking = TDEE + 350，maintenance = TDEE
 * - 再按 MACRO_SPLIT 换算每日蛋白质 / 碳水 / 脂肪克数（4-4-9 法则）
 */
export function calculateDailyTargets(input: NutritionForm): DailyTargets {
  const { gender, age, heightCm, weightKg, activityLevel, goal } = input
  const bmr = calculateBMR({ gender, age, heightCm, weightKg })
  const tdee = calculateTDEE(bmr, activityLevel)

  let targetKcal = tdee
  if (goal === 'cutting') {
    targetKcal = tdee - 500
    targetKcal = Math.max(targetKcal, CUTTING_FLOOR[gender] ?? 1500)
  } else if (goal === 'bulking') {
    targetKcal = tdee + 350
  }
  // 未知目标按维持处理
  const split = MACRO_SPLIT[goal] ?? MACRO_SPLIT.maintenance

  return {
    goal,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetKcal: Math.round(targetKcal),
    proteinG: Math.round((targetKcal * split.p) / KCAL_PER_GRAM.protein),
    carbsG: Math.round((targetKcal * split.c) / KCAL_PER_GRAM.carbs),
    fatG: Math.round((targetKcal * split.f) / KCAL_PER_GRAM.fat),
  }
}

/** 数值字段的合理范围（U3 提交前校验） */
const RANGES: Record<'age' | 'heightCm' | 'weightKg', { min: number; max: number; unit: string; label: string }> = {
  age: { min: 1, max: 120, unit: '岁', label: '年龄' },
  heightCm: { min: 80, max: 250, unit: 'cm', label: '身高' },
  weightKg: { min: 20, max: 300, unit: 'kg', label: '体重' },
}

/**
 * 表单提交前校验：年龄 1-120 岁、身高 80-250cm、体重 20-300kg。
 * 空串（未填写）给出对应提示；超范围给出范围提示。
 * @returns 校验通过返回 null，否则返回中文错误提示
 */
export function validateNutritionForm(input: Pick<NutritionForm, 'age' | 'heightCm' | 'weightKg'>): string | null {
  const keys = ['age', 'heightCm', 'weightKg'] as const
  for (const key of keys) {
    const { min, max, unit, label } = RANGES[key]
    const raw = input[key]
    if (raw === '' || raw === null || raw === undefined) return `请填写${label}`
    const value = Number(raw)
    if (!Number.isFinite(value)) return `${label}需为数字`
    if (value < min || value > max) return `${label}需在 ${min}-${max} ${unit}之间`
  }
  return null
}

/** 从数组中取 k 个元素的所有组合（k ≤ n） */
function combinations<T>(list: T[], k: number): T[][] {
  const result: T[][] = []
  const picked: number[] = []
  const rec = (start: number) => {
    if (picked.length === k) {
      result.push(picked.map((i) => list[i]))
      return
    }
    for (let i = start; i < list.length; i++) {
      picked.push(i)
      rec(i + 1)
      picked.pop()
    }
  }
  rec(0)
  return result
}

/**
 * 智能三餐搭配（方案 A：每餐 2-3 道菜凑近目标热量）
 * 每个餐次槽位从候选池（该餐次 mealType + 目标分类匹配 + 未使用）中暴力枚举 2 道与 3 道的组合，
 * 优先选「合计 ≥ 目标 70% 且 |合计 − 目标| 最小」的组合；无满足组合时退化为合计最大的 3 道（池不足全取）；
 * 池 < 2 道时退化出 1 道（取 kcal 最接近目标的）；跨餐全局去重。
 * 传入 goal 时按目标过滤候选池（cutting→减脂餐 / bulking→增肌餐 / maintenance→维持餐）。
 *
 * goalOrOptions 兼容两种调用：
 *   generateSmartPlan(meals, targets, 'cutting') 或 generateSmartPlan(meals, targets, { goal, random })
 *   random=true 时在「最优距离 ±5% 目标」内的组合中随机选一个，保证「重新生成」有变化
 * @returns 每餐 meals 长度 1-3
 */
export function generateSmartPlan(
  meals: Meal[],
  dailyTargets: DailyTargets,
  goalOrOptions: Goal | SmartPlanOptions = {}
): PlanSlot[] {
  const options = typeof goalOrOptions === 'string' ? { goal: goalOrOptions } : goalOrOptions ?? {}
  const { random = false } = options
  // 目标优先级：显式参数 > dailyTargets.goal；未知/缺省时不按分类过滤
  const goal = options.goal ?? dailyTargets.goal
  const category = GOAL_CATEGORY[goal]
  const { targetKcal } = dailyTargets
  const slots: Array<{ slot: PlanSlot['slot']; type: MealType; share: number }> = [
    { slot: '早餐', type: 'breakfast', share: MEAL_SPLIT.breakfast },
    { slot: '午餐', type: 'lunch', share: MEAL_SPLIT.lunch },
    { slot: '晚餐', type: 'dinner', share: MEAL_SPLIT.dinner },
  ]

  const sum = (arr: Meal[]) => arr.reduce((total, m) => total + m.kcal, 0)
  const used = new Set<string>()
  const plan: PlanSlot[] = []

  for (const { slot, type, share } of slots) {
    const slotGoal = targetKcal * share
    // 候选池：该餐次 mealType 匹配 + 目标分类匹配（可选）+ 跨餐未使用
    const pool = meals.filter(
      (m) =>
        (m.mealType ?? []).includes(type) &&
        !used.has(m.id) &&
        (!category || m.category === category)
    )
    if (pool.length === 0) continue // 池空跳过该槽位

    // 防御：异常输入（如损坏的 goal 使 category 失效）会让候选池膨胀到数百道，
    // 组合枚举 C(n,3) 随 n 立方增长，曾导致主线程卡死 27.5s。
    // 池超上限（正常路径各池 ≤ 48 道，不会触发）时跳过组合枚举，
    // 直接取热量最接近该餐目标的 2 道，O(n log n) 毫秒级返回，确定性不依赖随机。
    let chosen: Meal[]
    if (pool.length > MAX_POOL_SIZE) {
      chosen = [...pool]
        .sort((a, b) => Math.abs(a.kcal - slotGoal) - Math.abs(b.kcal - slotGoal))
        .slice(0, Math.min(2, pool.length))
    } else if (pool.length < 2) {
      // 池不足 2 道：退化出 1 道（kcal 最接近目标的）
      chosen = [
        pool.reduce((best, m) =>
          Math.abs(m.kcal - slotGoal) < Math.abs(best.kcal - slotGoal) ? m : best
        ),
      ]
    } else {
      // 枚举 2 道与 3 道的所有组合（规模被 MAX_POOL_SIZE 约束，MAX_COMBOS 兜底）
      const combos = [...combinations(pool, 2), ...combinations(pool, 3)]
      if (combos.length > MAX_COMBOS) {
        // 双保险：超出枚举预算（正常路径不可能）直接退化为热量最高的 3 道
        chosen = [...pool].sort((a, b) => b.kcal - a.kcal).slice(0, Math.min(3, pool.length))
      } else {
        // 合计 ≥ 目标 70% 的组合（不低于下限）
        const eligible = combos.filter((c) => sum(c) >= slotGoal * 0.7)

        if (eligible.length > 0) {
          // 最优距离：与目标差最小
          let bestDiff = Infinity
          for (const c of eligible) {
            bestDiff = Math.min(bestDiff, Math.abs(sum(c) - slotGoal))
          }
          if (random) {
            // 重新生成：在「最优距离 ±5% 目标」内的组合中随机选一个
            const nearBest = eligible.filter(
              (c) => Math.abs(sum(c) - slotGoal) <= bestDiff + slotGoal * 0.05
            )
            chosen = nearBest[Math.floor(Math.random() * nearBest.length)]
          } else {
            chosen = eligible.reduce((best, c) =>
              Math.abs(sum(c) - slotGoal) < Math.abs(sum(best) - slotGoal) ? c : best
            )
          }
        } else {
          // 退化：合计最大的 3 道（池不足 3 道就全取）
          chosen = [...pool].sort((a, b) => b.kcal - a.kcal).slice(0, Math.min(3, pool.length))
        }
      }
    }

    chosen.forEach((m) => used.add(m.id))
    plan.push({ slot, meals: chosen })
  }

  return plan
}

/* ---------------- 今日搭配自定义生成（主页 DailyPlanner） ---------------- */

/** mulberry32 可播种随机数：与 api/meals.ts 同款算法，换种子即得到新序列 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** YYYYMMDD 数字种子：同一天内多次生成「今日搭配」结果稳定 */
export function dateSeed(): number {
  const now = new Date()
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
}

/** 今日搭配生成选项 */
export interface DailyPlanOptions {
  /** 随机种子：缺省用 YYYYMMDD（同日刷新稳定）；调用方传 Date.now() 即换出新组合 */
  seed?: number
  /** 可选：按分类过滤候选池（如 'fat-loss'，已提交健康目标时随机搭配按目标筛选） */
  category?: Category
}

/**
 * 自定义今日三餐搭配：按 mealType 匹配餐次从全库（或目标分类池）抽取，
 * 每餐取 mealCounts 指定的道数；同餐不重复、三餐跨餐不重复。
 * 纯函数、可播种：同 seed + 同参数结果完全一致（同日刷新稳定，测试可复现）。
 * 候选池不足时该餐按实际可抽到的道数返回（不做填充）。
 */
export function generateDailyPlan(
  meals: Meal[],
  mealCounts: Record<MealType, number>,
  options: DailyPlanOptions = {}
): PlanSlot[] {
  const rand = mulberry32(options.seed ?? dateSeed())
  const { category } = options
  const used = new Set<string>()
  const slots: Array<{ slot: PlanSlot['slot']; type: MealType }> = [
    { slot: '早餐', type: 'breakfast' },
    { slot: '午餐', type: 'lunch' },
    { slot: '晚餐', type: 'dinner' },
  ]
  const result: PlanSlot[] = []
  for (const { slot, type } of slots) {
    const pool = meals.filter(
      (m) =>
        (m.mealType ?? []).includes(type) &&
        !used.has(m.id) &&
        (!category || m.category === category)
    )
    const mealsForSlot: Meal[] = []
    const count = Math.max(0, Math.floor(mealCounts[type] ?? 0))
    while (mealsForSlot.length < count && pool.length > 0) {
      const index = Math.floor(rand() * pool.length)
      const picked = pool.splice(index, 1)[0]
      used.add(picked.id)
      mealsForSlot.push(picked)
    }
    result.push({ slot, meals: mealsForSlot })
  }
  return result
}
