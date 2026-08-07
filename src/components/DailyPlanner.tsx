import DailyPlan from './DailyPlan'
import Reveal from './Reveal'
import {
  DEFAULT_MEAL_COUNTS,
  MEAL_COUNT_RANGE,
  PEOPLE_RANGE,
  type MealCounts,
  type PlannerMode,
} from '../hooks/useDailyPlanner'
import type { Category, CategoryMeta, Meal, MealType, PlanSlot } from '../types'

/** 「生成今日搭配」功能区 props */
interface DailyPlannerProps {
  people: number
  onPeopleChange: (people: number) => void
  mealCounts: MealCounts
  onMealCountChange: (type: MealType, count: number) => void
  plan: PlanSlot[]
  loading: boolean
  mode: PlannerMode
  goalLabel: string | null
  hasSmartPlan: boolean
  /** 全天合计热量（单份），展示时按 people 换算 */
  totalKcal: number
  categoryMeta: Record<Category, CategoryMeta>
  onGenerate: () => void
  onShuffle: () => void
  onBackToSmart: () => void
  onOpen: (meal: Meal) => void
  onAdd: (meal: Meal) => void
  addedIds: Set<string>
}

// 每餐菜数步进器配置（范围与 useDailyPlanner.MEAL_COUNT_RANGE 一致）
const MEAL_STEPPERS: Array<{ type: MealType; label: string; icon: string }> = [
  { type: 'breakfast', label: '早餐', icon: '🌅' },
  { type: 'lunch', label: '午餐', icon: '☀️' },
  { type: 'dinner', label: '晚餐', icon: '🌙' },
]

// 步进器按钮基础样式
const STEP_BTN =
  'grid size-8 place-items-center rounded-full border border-white/10 bg-white/5 text-lg font-bold text-snow transition-all hover:border-grape/40 hover:bg-white/10 active:scale-90 disabled:pointer-events-none disabled:opacity-30'

/**
 * 「生成今日搭配」功能区（主页核心区，id=daily 供「今日搭配」入口滚动定位）：
 * 人口数步进器（1-6，默认 1）+ 每餐菜数步进器（早 1-3 / 午 1-4 / 晚 1-4，默认 2/3/3）
 * + 「✨ 生成今日搭配」主按钮 + 模式徽章/提示 + 搭配结果（DailyPlan）
 * 纯展示组件：全部状态与回调来自 props（逻辑在 useDailyPlanner hook）
 * 模式联动：smartPlan 存在时显示「智能搭配模式」徽章；点生成后切换为自定义模式（覆盖显示），
 * 可「恢复智能搭配」；随机/自定义模式保留「🎲 换一批」
 */
export default function DailyPlanner({
  people,
  onPeopleChange,
  mealCounts,
  onMealCountChange,
  plan,
  loading,
  mode,
  goalLabel,
  hasSmartPlan,
  totalKcal,
  categoryMeta,
  onGenerate,
  onShuffle,
  onBackToSmart,
  onOpen,
  onAdd,
  addedIds,
}: DailyPlannerProps) {
  const isSmart = mode === 'smart'
  const isCustom = mode === 'custom'

  return (
    <section id="daily" className="relative scroll-mt-24 px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2.5 text-2xl font-black sm:text-3xl">
                <span aria-hidden="true" className="inline-block h-5 w-1.5 rounded-full bg-gradient-to-b from-tangerine to-grape" />
                生成今日搭配
              </h2>
              <p className="mt-2 text-sm text-mist">
                {isSmart
                  ? '根据你的热量目标智能生成，每餐 2-3 道菜凑近目标热量'
                  : isCustom
                    ? '按人口数与每餐菜数自定义搭配，也可以随机换一批'
                    : '每天换一组均衡搭配，也可以随机换一批'}
                {!isSmart && goalLabel && (
                  <span className="ml-2 inline-block rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-grape">
                    当前按 {goalLabel} 筛选
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* 智能搭配徽章：存在 smartPlan 且未切换自定义时展示 */}
              {isSmart && goalLabel && (
                <span className="rounded-full border border-grape/30 bg-grape/10 px-3 py-1.5 text-xs font-semibold text-grape">
                  ⚡ {goalLabel}搭配 · 智能搭配模式
                </span>
              )}
              {isCustom && hasSmartPlan && (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-mist">
                  🎛️ 自定义搭配模式
                </span>
              )}
              {/* 自定义模式且存在智能搭配时：可切回 */}
              {isCustom && hasSmartPlan && (
                <button
                  onClick={onBackToSmart}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-mist transition-all hover:border-grape/40 hover:text-snow active:scale-95"
                >
                  ⚡ 恢复智能搭配
                </button>
              )}
              {/* 随机 / 自定义模式保留换一批（智能模式无换一批） */}
              {!isSmart && (
                <button
                  onClick={onShuffle}
                  disabled={loading}
                  className="rounded-full border border-berry/40 bg-berry/10 px-5 py-2 text-sm font-semibold text-berry transition-all hover:bg-berry/20 hover:shadow-lg hover:shadow-berry/20 active:scale-95 disabled:opacity-50"
                >
                  🎲 换一批
                </button>
              )}
            </div>
          </div>
        </Reveal>

        {/* 生成控制区：人口数 + 每餐菜数步进器 + 生成按钮 */}
        <Reveal delay={80}>
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/4 p-5 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {/* 人口数步进器：1-6 人 */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-mist">👥 人口数</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="减少人数"
                    onClick={() => onPeopleChange(people - 1)}
                    disabled={people <= PEOPLE_RANGE.min}
                    className={STEP_BTN}
                  >
                    −
                  </button>
                  <span aria-live="polite" className="w-6 text-center text-lg font-bold text-snow">
                    {people}
                  </span>
                  <button
                    type="button"
                    aria-label="增加人数"
                    onClick={() => onPeopleChange(people + 1)}
                    disabled={people >= PEOPLE_RANGE.max}
                    className={STEP_BTN}
                  >
                    ＋
                  </button>
                </div>
                <span className="text-xs text-mist">人</span>
              </div>

              {/* 每餐菜数步进器：早 1-3 / 午 1-4 / 晚 1-4 */}
              {MEAL_STEPPERS.map(({ type, label, icon }) => {
                const range = MEAL_COUNT_RANGE[type]
                const value = mealCounts[type] ?? DEFAULT_MEAL_COUNTS[type]
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-sm text-mist">
                      {icon} {label}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`减少${label}菜数`}
                        onClick={() => onMealCountChange(type, value - 1)}
                        disabled={value <= range.min}
                        className={STEP_BTN}
                      >
                        −
                      </button>
                      <span aria-live="polite" className="w-6 text-center text-lg font-bold text-snow">
                        {value}
                      </span>
                      <button
                        type="button"
                        aria-label={`增加${label}菜数`}
                        onClick={() => onMealCountChange(type, value + 1)}
                        disabled={value >= range.max}
                        className={STEP_BTN}
                      >
                        ＋
                      </button>
                    </div>
                    <span className="text-xs text-mist">道</span>
                  </div>
                )
              })}
            </div>

            {/* 生成按钮：智能模式点击后切换为自定义模式（覆盖显示） */}
            <button
              type="button"
              onClick={onGenerate}
              disabled={loading}
              className="shrink-0 rounded-full bg-gradient-brand px-7 py-3 font-semibold text-white shadow-xl shadow-berry/25 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-berry/30 active:scale-95 disabled:opacity-50"
            >
              ✨ 生成今日搭配
            </button>
          </div>
        </Reveal>

        {/* 搭配结果：三餐卡 + 全天合计（人口数换算在 DailyPlan 内展示） */}
        <DailyPlan
          plan={plan}
          loading={loading}
          people={people}
          totalKcal={totalKcal}
          categoryMeta={categoryMeta}
          onOpen={onOpen}
          onAdd={onAdd}
          addedIds={addedIds}
        />
      </div>
    </section>
  )
}
