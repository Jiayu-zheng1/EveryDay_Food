import { useMemo, useState } from 'react'
import CalorieCalculator from './CalorieCalculator'
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
  ModuleKey,
  NutritionForm,
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
  /** 是否已生成过智能搭配（驱动「去今日搭配查看」提示） */
  hasSmartPlan: boolean
  error: string | null
  onReset: () => void

  /* —— 目标菜谱浏览 —— */
  categoryMeta: Record<Category, CategoryMeta>
  onOpen: (meal: Meal) => void
  onAdd: (meal: Meal) => void
  /** 已加入餐桌的菜 id 集合（MealCard 的 added 状态用） */
  addItemIds: ReadonlySet<string>

  /** 模块导航（智能搭配生成后跳回首页「今日搭配」查看） */
  onNavigate: (module: ModuleKey) => void
}

/** 四张目标卡对应的分类（顺序即卡片展示顺序） */
const GOAL_CATEGORIES: Category[] = ['fat-loss', 'muscle-gain', 'maintain', 'nutrition']

/**
 * 健康目标模块：热量计算器（BMI / 每日目标 / 智能搭配）+ 目标菜谱浏览
 * - 热量计算器直接复用 CalorieCalculator 组件（props 原样转发，不复制组件代码）
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
  error,
  onReset,
  categoryMeta,
  onOpen,
  onAdd,
  addItemIds,
  onNavigate,
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

        {/* 智能搭配生成提示：生成后引导回首页「今日搭配」查看（首页优先展示智能搭配） */}
        {hasSmartPlan && (
          <Reveal>
            <div className="mt-2 flex flex-wrap items-center gap-3 rounded-2xl border border-grape/25 bg-grape/10 px-5 py-4 backdrop-blur-xl">
              <span aria-hidden="true" className="text-2xl">🎉</span>
              <p className="text-sm font-semibold text-snow">已生成智能搭配，去「今日搭配」查看</p>
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="ml-auto rounded-full bg-gradient-brand px-5 py-2 text-sm font-bold text-white shadow-lg shadow-grape/25 transition-all duration-300 hover:scale-[1.03] active:scale-95"
              >
                🍱 去「今日搭配」查看
              </button>
            </div>
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
