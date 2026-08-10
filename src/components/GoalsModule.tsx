import { useMemo, useState } from 'react'
import CalorieCalculator from './CalorieCalculator'
import DailyPlan from './DailyPlan'
import MealCard from './MealCard'
import Reveal from './Reveal'
import type {
  BmiResult,
  Category,
  CategoryMeta,
  DailyTargets,
  Goal,
  Meal,
  MealSplitItem,
  NutritionForm,
  PlanSlot,
} from '../types'

/** 健康目标模块的 props */
interface GoalsModuleProps {
  /* —— 热量计算器（原样转发给 CalorieCalculator，数据来自 useNutrition） —— */
  meals: Meal[]
  form: NutritionForm
  update: (patch: Partial<NutritionForm>) => void
  results: DailyTargets
  submitted: boolean
  mealSplit: MealSplitItem[]
  bmi: BmiResult | null
  suggestedGoal: Goal
  onSubmit: () => void
  onGenerate: () => void
  /** 是否已生成过智能搭配（结果区展示开关） */
  hasSmartPlan: boolean
  /** 智能搭配三餐（来自热量计算器 useNutrition）；null = 未生成 */
  smartPlan: PlanSlot[] | null
  error: string | null
  onReset: () => void

  /* —— 目标菜谱浏览 —— */
  categoryMeta: Record<Category, CategoryMeta>
  onOpen: (meal: Meal) => void
  onAdd: (meal: Meal) => void
  /** 已加入餐桌的菜 id 集合（MealCard / DailyPlan 的 added 状态用） */
  addItemIds: Set<string>
}

/** 四张目标卡对应的分类（顺序即卡片展示顺序） */
const GOAL_CATEGORIES: Category[] = ['fat-loss', 'muscle-gain', 'maintain', 'nutrition']

/**
 * 健康目标模块：热量计算器（BMI / 每日目标 / 智能搭配）+ 智能搭配结果 + 目标菜谱浏览
 * - 热量计算器直接复用 CalorieCalculator 组件（props 原样转发，不复制组件代码）
 * - 智能搭配生成后直接展示在本页下方（DailyPlan 渲染三餐卡），不再跳回首页
 * - 目标菜谱用四张目标卡做分类选择器（轻量实现，不引 CategoryTabs 全量筛选逻辑），
 *   点卡切换下方分类菜谱网格，复用 MealCard 打开详情 / 加入餐桌
 * 纯展示组件：所有数据与交互回调均来自 props，本地只维护「选中的目标分类」一个状态
 */
export default function GoalsModule({
  meals,
  form,
  update,
  results,
  submitted,
  mealSplit,
  bmi,
  suggestedGoal,
  onSubmit,
  onGenerate,
  hasSmartPlan,
  smartPlan,
  error,
  onReset,
  categoryMeta,
  onOpen,
  onAdd,
  addItemIds,
}: GoalsModuleProps) {
  // 选中的目标分类：点目标卡切换，下方网格展示该分类菜谱（默认减脂，保证首屏有内容）
  const [goalCategory, setGoalCategory] = useState<Category>('fat-loss')

  // 各分类的菜谱数量（目标卡角标，单次遍历统计）
  const categoryCounts = useMemo(() => {
    const result: Partial<Record<Category, number>> = {}
    for (const meal of meals) {
      result[meal.category] = (result[meal.category] ?? 0) + 1
    }
    return result
  }, [meals])

  // 当前选中分类的菜谱（目标卡即分类选择器，只过滤不排序，保持数据原序）
  const goalMeals = useMemo(
    () => meals.filter((meal) => meal.category === goalCategory),
    [meals, goalCategory]
  )

  // 智能搭配全天合计热量（单份）：遍历每餐每道菜求和（与 useDailyPlanner 中逻辑一致）
  const smartTotalKcal = useMemo(
    () =>
      smartPlan
        ? smartPlan.reduce(
            (sum, item) => sum + item.meals.reduce((s, m) => s + m.kcal, 0),
            0
          )
        : 0,
    [smartPlan]
  )

  return (
    <section id="goals" className="scroll-mt-24 px-5 py-16">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h1 className="text-2xl font-black sm:text-3xl">🎯 健康目标</h1>
          <p className="mt-2 text-sm text-mist">
            算清每日热量与三大营养素，再按目标挑选专属菜谱——让每一餐都朝着目标前进
          </p>
        </Reveal>

        {/* 热量计算器：BMI / 每日目标 / 三餐分配 / 智能搭配（直接复用现有组件） */}
        <CalorieCalculator
          meals={meals}
          form={form}
          update={update}
          results={results}
          submitted={submitted}
          mealSplit={mealSplit}
          bmi={bmi}
          suggestedGoal={suggestedGoal}
          onSubmit={onSubmit}
          onGenerate={onGenerate}
          hasSmartPlan={hasSmartPlan}
          error={error}
          onReset={onReset}
        />

        {/* 智能搭配结果区：生成后直接展示在本页下方（三餐卡 + 全天合计） */}
        {hasSmartPlan && smartPlan && (
          <Reveal delay={100}>
            <h2 className="mt-4 flex items-center gap-2.5 text-2xl font-black sm:text-3xl">
              <span
                aria-hidden="true"
                className="inline-block h-5 w-1.5 rounded-full bg-gradient-to-b from-tangerine to-grape"
              />
              🥗 智能搭配三餐
            </h2>
            <p className="mt-2 text-sm text-mist">根据你的热量目标生成，每餐 2-3 道菜凑近目标热量</p>
            <DailyPlan
              plan={smartPlan}
              loading={false}
              people={1}
              totalKcal={smartTotalKcal}
              categoryMeta={categoryMeta}
              onOpen={onOpen}
              onAdd={onAdd}
              addedIds={addItemIds}
            />
          </Reveal>
        )}

        {/* 目标菜谱浏览：四张目标卡即分类选择器，点卡切换下方网格 */}
        <Reveal delay={100}>
          <h2 className="mt-4 flex items-center gap-2.5 text-2xl font-black sm:text-3xl">
            <span
              aria-hidden="true"
              className="inline-block h-5 w-1.5 rounded-full bg-gradient-to-b from-tangerine to-grape"
            />
            目标菜谱
          </h2>
          <p className="mt-2 text-sm text-mist">选择你的健康目标，浏览对应分类的专属菜谱</p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {GOAL_CATEGORIES.map((key) => {
              const meta = categoryMeta[key]
              const count = categoryCounts[key] ?? 0
              const isActive = goalCategory === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGoalCategory(key)}
                  aria-pressed={isActive}
                  className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${meta.gradient} p-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-95 ${
                    isActive
                      ? 'border-grape/60 shadow-lg shadow-grape/25'
                      : 'border-white/10 hover:border-grape/40'
                  }`}
                >
                  {/* 玻璃蒙层：压暗渐变，与卡片网格同一观感 */}
                  <span aria-hidden="true" className="absolute inset-0 bg-ink/30" />
                  <span className="relative block text-3xl drop-shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    {meta.emoji}
                  </span>
                  <span className="relative mt-2 block text-sm font-bold text-snow">{meta.label}</span>
                  <span
                    className={`relative mt-1.5 inline-block rounded-full border px-2 py-0.5 text-xs ${meta.chip}`}
                  >
                    {count} 道
                  </span>
                </button>
              )
            })}
          </div>
        </Reveal>

        {/* 目标分类菜谱网格：复用 MealCard（点击打开详情弹窗 / 加入餐桌），样式与菜谱库一致 */}
        {meals.length === 0 ? (
          /* 数据加载中：占位骨架（useMeals 异步拉取，与菜谱库一致的加载态） */
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl border border-white/5 bg-ink-2" />
            ))}
          </div>
        ) : (
          <div
            key={goalCategory}
            className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {goalMeals.map((meal, i) => (
              <Reveal key={meal.id} delay={(i % 6) * 60}>
                <MealCard
                  meal={meal}
                  categoryMeta={categoryMeta}
                  onOpen={onOpen}
                  onAdd={onAdd}
                  added={addItemIds.has(meal.id)}
                />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
