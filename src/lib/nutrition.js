/**
 * v2 热量计算 + 智能搭配算法（纯函数模块，无 React 依赖）
 *
 * 依据：
 * - 4-4-9 法则：蛋白质/碳水每克 4 kcal，脂肪每克 9 kcal
 * - Mifflin-St Jeor 公式计算 BMR
 * - 活动水平系数 × 5 档
 * - 减脂/增肌/维持宏量配比 + 三餐热量分配
 */

/** 每克宏量营养素的热量（kcal/g） */
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 }

/** 不同目标的宏量配比（占比合计 = 1） */
export const MACRO_SPLIT = {
  cutting: { p: 0.4, c: 0.3, f: 0.3 }, // 减脂：高蛋白
  bulking: { p: 0.3, c: 0.4, f: 0.3 }, // 增肌：高碳水
  maintenance: { p: 0.3, c: 0.35, f: 0.35 }, // 维持：均衡
}

/** 三餐热量分配比例（合计 = 1） */
export const MEAL_SPLIT = { breakfast: 0.3, lunch: 0.4, dinner: 0.3 }

/** 目标 → 食谱分类的映射（智能搭配/随机搭配按目标过滤候选池用） */
export const GOAL_CATEGORY = {
  cutting: 'fat-loss',
  bulking: 'muscle-gain',
  maintenance: 'maintain',
}

/** 目标的中文标签（UI 展示用） */
export const GOAL_LABELS = { cutting: '减脂', bulking: '增肌', maintenance: '维持' }

/** Mifflin-St Jeor 性别修正：男 +5 / 女 −161 */
const GENDER_ADJUST = { male: 5, female: -161 }

/** 活动水平系数：久坐 / 轻度 / 中度 / 高强度 / 极高 */
export const ACTIVITY_LEVELS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  veryHigh: 1.9,
}

/** 减脂目标每日热量下限保护（kcal），避免热量过低伤身体 */
const CUTTING_FLOOR = { male: 1500, female: 1200 }

/**
 * 数值字段归一：输入框现在存的是原始字符串（可为空串的编辑中间态，见 CalorieCalculator），
 * 所有计算入口统一经此转数字——空串/null/undefined 按 0 处理，非法值也归 0，杜绝 NaN 崩溃与字符串拼接。
 */
function toNumber(value) {
  if (value === '' || value === null || value === undefined) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * 基础代谢率 BMR（Mifflin-St Jeor）
 * @param {{ gender: 'male'|'female', age: number, heightCm: number, weightKg: number }} input
 * @returns {number} kcal
 */
export function calculateBMR({ gender, age, heightCm, weightKg }) {
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
 * @param {number} bmr
 * @param {keyof typeof ACTIVITY_LEVELS} activityLevel
 * @returns {number} kcal
 */
export function calculateTDEE(bmr, activityLevel) {
  const factor = ACTIVITY_LEVELS[activityLevel] ?? 1.2
  return bmr * factor
}

/**
 * BMI 计算（中国成人标准）
 * BMI = 体重(kg) / 身高(m)²
 * 分类：<18.5 偏瘦、18.5-24 正常、24-28 超重、≥28 肥胖
 * @param {number} weightKg 体重（kg）
 * @param {number} heightCm 身高（cm）
 * @returns {{ bmi: number, category: 'underweight'|'normal'|'overweight'|'obese', label: string }}
 */
export function calculateBMI(weightKg, heightCm) {
  // 与 calculateBMR 同理：入口先归一，空串按 0，避免 NaN 或字符串参与运算
  const w = toNumber(weightKg)
  const h = toNumber(heightCm)
  const heightM = h / 100
  const bmi = Math.round((w / (heightM * heightM)) * 10) / 10 // 保留 1 位小数
  let category
  let label
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
 * @param {number} bmi
 * @returns {'cutting'|'bulking'|'maintenance'}
 */
export function suggestGoal(bmi) {
  if (bmi >= 24) return 'cutting'
  if (bmi < 18.5) return 'bulking'
  return 'maintenance'
}

/**
 * 每日热量与宏量目标
 * - 目标热量：cutting = TDEE − 500（下限保护男 1500 / 女 1200），bulking = TDEE + 350，maintenance = TDEE
 * - 再按 MACRO_SPLIT 换算每日蛋白质 / 碳水 / 脂肪克数（4-4-9 法则）
 * @param {{ gender: 'male'|'female', age: number, heightCm: number, weightKg: number,
 *           activityLevel: keyof typeof ACTIVITY_LEVELS, goal: 'cutting'|'bulking'|'maintenance' }} input
 * @returns {{ bmr: number, tdee: number, targetKcal: number, proteinG: number, carbsG: number, fatG: number }}
 */
export function calculateDailyTargets({ gender, age, heightCm, weightKg, activityLevel, goal }) {
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

/** 从数组中取 k 个元素的所有组合（k ≤ n） */
function combinations(list, k) {
  const result = []
  const picked = []
  const rec = (start) => {
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
 * @param {Array<{ id: string, kcal: number, category: string, mealType: string[] }>} meals 食谱数据（数量无关）
 * @param {{ targetKcal: number, goal?: string }} dailyTargets calculateDailyTargets 的返回值
 * @param {string|{ goal?: string, random?: boolean }} [goalOrOptions] 兼容两种调用：
 *   generateSmartPlan(meals, targets, 'cutting') 或 generateSmartPlan(meals, targets, { goal, random })
 *   random=true 时在「最优距离 ±5% 目标」内的组合中随机选一个，保证「重新生成」有变化
 * @returns {Array<{ slot: '早餐'|'午餐'|'晚餐', meals: object[] }>} meals 长度 1-3
 */
export function generateSmartPlan(meals, dailyTargets, goalOrOptions = {}) {
  const options = typeof goalOrOptions === 'string' ? { goal: goalOrOptions } : goalOrOptions ?? {}
  const { random = false } = options
  // 目标优先级：显式参数 > dailyTargets.goal；未知/缺省时不按分类过滤
  const goal = options.goal ?? dailyTargets.goal
  const category = GOAL_CATEGORY[goal]
  const { targetKcal } = dailyTargets
  const slots = [
    { slot: '早餐', type: 'breakfast', share: MEAL_SPLIT.breakfast },
    { slot: '午餐', type: 'lunch', share: MEAL_SPLIT.lunch },
    { slot: '晚餐', type: 'dinner', share: MEAL_SPLIT.dinner },
  ]

  const sum = (arr) => arr.reduce((total, m) => total + m.kcal, 0)
  const used = new Set()
  const plan = []

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

    let chosen
    if (pool.length < 2) {
      // 池不足 2 道：退化出 1 道（kcal 最接近目标的）
      chosen = [
        pool.reduce((best, m) =>
          Math.abs(m.kcal - slotGoal) < Math.abs(best.kcal - slotGoal) ? m : best
        ),
      ]
    } else {
      // 枚举 2 道与 3 道的所有组合
      const combos = [...combinations(pool, 2), ...combinations(pool, 3)]
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

    chosen.forEach((m) => used.add(m.id))
    plan.push({ slot, meals: chosen })
  }

  return plan
}
