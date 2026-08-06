import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_LEVELS,
  calculateBMI,
  calculateBMR,
  calculateDailyTargets,
  calculateTDEE,
  generateSmartPlan,
  suggestGoal,
  validateNutritionForm,
} from './nutrition'
import type { DailyTargets, Goal, Meal } from '../types'
// ?raw 由 Vite 内联文件内容（node 环境可用，无需 @types/node / fs），与生产 fetch('/data/meals.json') 同源
import mealsJsonRaw from '../../public/data/meals.json?raw'

/** 构造最小 Meal（仅测试所需字段） */
function makeMeal(overrides: Partial<Meal> & { id: string; kcal: number; mealType: Meal['mealType'] }): Meal {
  return {
    name: overrides.id,
    category: 'maintain',
    cuisine: 'generic',
    emoji: '🍽️',
    desc: '',
    ingredients: [],
    steps: [],
    nutrition: { protein: 0, carbs: 0, fat: 0 },
    per100g: { protein: 0, carbs: 0, fat: 0 },
    servingSize: { amount: 100, unit: 'g' },
    ...overrides,
  }
}

/** 目标 2000 kcal 的三餐候选：每餐都有可凑近餐次热量（600/800/600）的 2 道组合 */
function makePlanMeals(): Meal[] {
  const kcalByType = {
    breakfast: [300, 310, 290, 295, 305, 600],
    lunch: [400, 410, 390, 395, 405, 800],
    dinner: [300, 310, 290, 295, 305, 600],
  } as const
  const meals: Meal[] = []
  let n = 0
  for (const [type, kcals] of Object.entries(kcalByType)) {
    for (const kcal of kcals) {
      meals.push(makeMeal({ id: `m${n++}`, kcal, mealType: [type as Meal['mealType'][number]] }))
    }
  }
  return meals
}

const VALID_TARGETS: DailyTargets = {
  goal: 'maintenance',
  bmr: 1500,
  tdee: 1800,
  targetKcal: 2000,
  proteinG: 150,
  carbsG: 175,
  fatG: 78,
}

// 从 public/data/meals.json 读取全量数据（与生产 fetch 同源，测试直接解析内联 JSON）
const MEALS: Meal[] = JSON.parse(mealsJsonRaw) as Meal[]

describe('generateSmartPlan（E1 回归：快速返回 + 结果合理）', () => {
  it('正常 goal：3 餐各 2-3 道，合计热量接近目标，跨餐不重复', () => {
    const plan = generateSmartPlan(makePlanMeals(), VALID_TARGETS, 'maintenance')
    expect(plan).toHaveLength(3)
    expect(plan.map((p) => p.slot)).toEqual(['早餐', '午餐', '晚餐'])

    const seen = new Set<string>()
    let total = 0
    for (const slot of plan) {
      expect(slot.meals.length).toBeGreaterThanOrEqual(2)
      expect(slot.meals.length).toBeLessThanOrEqual(3)
      for (const m of slot.meals) {
        expect(seen.has(m.id)).toBe(false) // 跨餐全局去重
        seen.add(m.id)
        total += m.kcal
      }
    }
    // 热量接近目标（每餐选最优组合，总差应在 ±10% 内）
    expect(Math.abs(total - VALID_TARGETS.targetKcal)).toBeLessThanOrEqual(
      VALID_TARGETS.targetKcal * 0.1
    )
  })

  it('goals 三个目标均能快速生成且每餐不超过 3 道', () => {
    for (const goal of ['cutting', 'bulking', 'maintenance'] as Goal[]) {
      const plan = generateSmartPlan(makePlanMeals(), VALID_TARGETS, goal)
      for (const slot of plan) expect(slot.meals.length).toBeLessThanOrEqual(3)
    }
  })

  it('损坏 goal（garbage / 空串 / NaN targets）在 2s 内返回，不卡死（候选池走防御路径）', () => {
    // 全量 797 道真实数据：损坏 goal 会让分类过滤失效、池膨胀到数百道，
    // 旧实现枚举 C(500,3) 曾卡死主线程 27.5s；现在必须走 MAX_POOL_SIZE 防御路径
    const garbage = 'garbage' as unknown as Goal
    const results = [
      generateSmartPlan(MEALS, VALID_TARGETS, garbage),
      generateSmartPlan(MEALS, VALID_TARGETS, ('' as unknown) as Goal),
      generateSmartPlan(MEALS, { ...VALID_TARGETS, targetKcal: Number.NaN }, garbage),
      generateSmartPlan(MEALS, { ...VALID_TARGETS, targetKcal: Number.NaN }, 'cutting'),
    ]
    for (const plan of results) {
      for (const slot of plan) {
        expect(slot.meals.length).toBeLessThanOrEqual(3)
      }
    }
  }, 2000)

  it('损坏 goal 仍产出三餐（各池充足时每餐 2 道）', () => {
    const plan = generateSmartPlan(MEALS, VALID_TARGETS, ('garbage' as unknown) as Goal)
    expect(plan.map((p) => p.slot)).toEqual(['早餐', '午餐', '晚餐'])
    for (const slot of plan) {
      expect(slot.meals.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('空 meals / 空候选池返回空', () => {
    expect(generateSmartPlan([], VALID_TARGETS)).toEqual([])
    // 全 breakfast 的池子：lunch/dinner 槽位池空被跳过
    const onlyBreakfast = makePlanMeals().filter((m) => m.mealType.includes('breakfast'))
    const plan = generateSmartPlan(onlyBreakfast, VALID_TARGETS, 'maintenance')
    expect(plan).toHaveLength(1)
    expect(plan[0].slot).toBe('早餐')
    // 目标分类与候选分类全不匹配 → 全部槽位池空
    const fatLoss = makePlanMeals().map((m) => ({ ...m, category: 'fat-loss' as const }))
    expect(generateSmartPlan(fatLoss, VALID_TARGETS, 'bulking')).toEqual([])
  })

  it('不传 goal 参数时跟随 dailyTargets.goal 过滤候选池', () => {
    // 候选全是 maintain 分类：dailyTargets.goal='cutting' → 池空 → 空计划（证明 goal 生效）
    expect(generateSmartPlan(makePlanMeals(), { ...VALID_TARGETS, goal: 'cutting' })).toEqual([])
    // dailyTargets.goal='maintenance' → 匹配 maintain 分类 → 3 餐
    expect(generateSmartPlan(makePlanMeals(), { ...VALID_TARGETS, goal: 'maintenance' })).toHaveLength(3)
  })
})

describe('calculateBMR / calculateTDEE / suggestGoal', () => {
  it('Mifflin-St Jeor：男 30 岁 170cm 70kg', () => {
    expect(calculateBMR({ gender: 'male', age: 30, heightCm: 170, weightKg: 70 })).toBe(
      10 * 70 + 6.25 * 170 - 5 * 30 + 5
    )
  })

  it('字符串输入 / 空串输入归一为数字，不产生 NaN', () => {
    expect(calculateBMR({ gender: 'female', age: '', heightCm: '170', weightKg: '60' })).toBe(
      10 * 60 + 6.25 * 170 - 5 * 0 - 161
    )
    expect(
      Number.isNaN(
        calculateBMR(
          ({ gender: 'male', age: undefined, heightCm: undefined, weightKg: undefined } as unknown) as Parameters<
            typeof calculateBMR
          >[0]
        )
      )
    ).toBe(false)
  })

  it('calculateTDEE 按活动系数换算', () => {
    const bmr = calculateBMR({ gender: 'female', age: 25, heightCm: 165, weightKg: 55 })
    expect(calculateTDEE(bmr, 'sedentary')).toBeCloseTo(bmr * ACTIVITY_LEVELS.sedentary)
    expect(calculateTDEE(bmr, 'veryHigh')).toBeCloseTo(bmr * ACTIVITY_LEVELS.veryHigh)
  })

  it('suggestGoal 边界：≥24 减脂 / <18.5 增肌 / 其余维持', () => {
    expect(suggestGoal(24)).toBe('cutting')
    expect(suggestGoal(18.4)).toBe('bulking')
    expect(suggestGoal(21)).toBe('maintenance')
  })

  it('calculateDailyTargets：cutting 减 500 有下限保护，bulking 加 350', () => {
    const base = { gender: 'male', age: 30, heightCm: 170, weightKg: 70, activityLevel: 'moderate' } as const
    const cut = calculateDailyTargets({ ...base, goal: 'cutting' })
    expect(cut.targetKcal).toBe(Math.max(cut.tdee - 500, 1500))
    const bulk = calculateDailyTargets({ ...base, goal: 'bulking' })
    expect(bulk.targetKcal).toBe(bulk.tdee + 350)
    expect(bulk.proteinG + bulk.carbsG + bulk.fatG).toBeGreaterThan(0)
  })
})

describe('validateNutritionForm（U3 边界）', () => {
  // 空串 / null / undefined 是表单编辑中间态，类型层面不允许但运行时会遇到，按运行时行为断言
  const asForm = (v: Record<string, unknown>) => v as Parameters<typeof validateNutritionForm>[0]

  it('空值（空串 / null / undefined）给出对应提示', () => {
    expect(validateNutritionForm(asForm({ age: '', heightCm: '170', weightKg: '60' }))).toBe('请填写年龄')
    expect(validateNutritionForm(asForm({ age: null, heightCm: '170', weightKg: '60' }))).toBe('请填写年龄')
    expect(validateNutritionForm(asForm({ age: 30, heightCm: undefined, weightKg: '60' }))).toBe('请填写身高')
    expect(validateNutritionForm(asForm({ age: 30, heightCm: '170', weightKg: null }))).toBe('请填写体重')
  })

  it('超范围给出范围提示（含边界）', () => {
    expect(validateNutritionForm({ age: 0, heightCm: '170', weightKg: '60' })).toBe('年龄需在 1-120 岁之间')
    expect(validateNutritionForm({ age: 121, heightCm: '170', weightKg: '60' })).toBe('年龄需在 1-120 岁之间')
    expect(validateNutritionForm({ age: 1, heightCm: '170', weightKg: '60' })).toBeNull() // 下限边界合法
    expect(validateNutritionForm({ age: 120, heightCm: '170', weightKg: '60' })).toBeNull() // 上限边界合法
    expect(validateNutritionForm({ age: 30, heightCm: '79', weightKg: '60' })).toBe('身高需在 80-250 cm之间')
    expect(validateNutritionForm({ age: 30, heightCm: '251', weightKg: '60' })).toBe('身高需在 80-250 cm之间')
    expect(validateNutritionForm({ age: 30, heightCm: '250', weightKg: '60' })).toBeNull()
    expect(validateNutritionForm({ age: 30, heightCm: '170', weightKg: '19' })).toBe('体重需在 20-300 kg之间')
    expect(validateNutritionForm({ age: 30, heightCm: '170', weightKg: '301' })).toBe('体重需在 20-300 kg之间')
    expect(validateNutritionForm({ age: 30, heightCm: '170', weightKg: '20' })).toBeNull()
  })

  it('非数字输入提示需为数字；合法值返回 null', () => {
    expect(validateNutritionForm({ age: 'abc', heightCm: '170', weightKg: '60' })).toBe('年龄需为数字')
    expect(validateNutritionForm({ age: 30, heightCm: '170', weightKg: 'NaN' })).toBe('体重需为数字')
    expect(validateNutritionForm({ age: 30, heightCm: 170, weightKg: 60 })).toBeNull()
  })
})

describe('calculateBMI（除零保护 + 分类边界）', () => {
  it('身高或体重为 0 / 负数 / 空串 → null', () => {
    expect(calculateBMI(60, 0)).toBeNull()
    expect(calculateBMI(0, 170)).toBeNull()
    expect(calculateBMI(60, -170)).toBeNull()
    expect(calculateBMI(-60, 170)).toBeNull()
    expect(calculateBMI('', '')).toBeNull()
  })

  it('正常输入返回保留 1 位小数的 BMI 与分类', () => {
    expect(calculateBMI(60, 170)).toEqual({ bmi: 20.8, category: 'normal', label: '正常' })
    expect(calculateBMI('60', '170')).toEqual({ bmi: 20.8, category: 'normal', label: '正常' })
  })

  it('分类边界：<18.5 偏瘦 / 18.5-24 正常 / 24-28 超重 / ≥28 肥胖', () => {
    expect(calculateBMI(50, 170)?.category).toBe('underweight') // 17.3
    expect(calculateBMI(53.5, 170)?.category).toBe('normal') // 18.5
    expect(calculateBMI(75, 170)?.category).toBe('overweight') // 26.0
    expect(calculateBMI(90, 170)?.category).toBe('obese') // 31.1
  })
})

describe('营养数据自洽（public/data/meals.json）', () => {
  const SAMPLE_INDEX = Array.from({ length: 20 }, (_, i) => Math.min(i * 40, MEALS.length - 1))
  const roundTarget = (m: Meal, k: 'protein' | 'carbs' | 'fat') =>
    Math.round((m.per100g[k] * m.servingSize.amount) / 100)

  it('抽样 20 道：nutrition ≈ round(per100g × amount / 100)，容差 20%', () => {
    for (const i of SAMPLE_INDEX) {
      const m = MEALS[i]
      for (const k of ['protein', 'carbs', 'fat'] as const) {
        const target = roundTarget(m, k)
        const rel = Math.abs(m.nutrition[k] - target) / Math.max(target, 1)
        expect(rel, `${m.id} ${k}: nutrition=${m.nutrition[k]} target=${target}`).toBeLessThanOrEqual(0.2)
      }
    }
  })

  it('抽样 20 道：kcal ≈ 4×protein + 4×carbs + 9×fat，容差 10%', () => {
    for (const i of SAMPLE_INDEX) {
      const m = MEALS[i]
      const calc = 4 * m.nutrition.protein + 4 * m.nutrition.carbs + 9 * m.nutrition.fat
      expect(Math.abs(calc - m.kcal) / m.kcal, `${m.id}: kcal=${m.kcal} calc=${calc}`).toBeLessThanOrEqual(0.1)
    }
  })

  it('全量 797 道：≥90% 宏量单元精确等于 round(per100g×amount/100)；≥95% 菜品 kcal 与 4-4-9 法则差 ≤10%', () => {
    let exact = 0
    const cells = MEALS.length * 3
    let kcalOk = 0
    for (const m of MEALS) {
      for (const k of ['protein', 'carbs', 'fat'] as const) {
        if (m.nutrition[k] === roundTarget(m, k)) exact += 1
      }
      const calc = 4 * m.nutrition.protein + 4 * m.nutrition.carbs + 9 * m.nutrition.fat
      if (m.kcal > 0 && Math.abs(calc - m.kcal) / m.kcal <= 0.1) kcalOk += 1
    }
    expect(exact / cells).toBeGreaterThanOrEqual(0.9)
    expect(kcalOk / MEALS.length).toBeGreaterThanOrEqual(0.95)
  })
})
