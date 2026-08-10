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
  /** 展示模式：custom 自定义 / random 随机（不传则按随机文案展示） */
  mode?: PlannerMode
  /** 全天合计热量（单份），展示时按 people 换算 */
  totalKcal: number
  categoryMeta: Record<Category, CategoryMeta>
  onGenerate: () => void
  onShuffle: () => void
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
 * + 「✨ 生成今日搭配」主按钮 + 搭配结果（DailyPlan）
 * 纯展示组件：全部状态与回调来自 props（逻辑在 useDailyPlanner hook）
 * 今日搭配只做随机生成，与健康目标 / 智能搭配完全解耦；
 * 「🎲 换一批」与「✨ 生成今日搭配」恒可用（加载中禁用）
 */
export default function DailyPlanner({
  people,
  onPeopleChange,
  mealCounts,
  onMealCountChange,
  plan,
  loading,
  mode,
  totalKcal,
  categoryMeta,
  onGenerate,
  onShuffle,
  onOpen,
  onAdd,
  addedIds,
}: DailyPlannerProps) {
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
                {isCustom
                  ? '按人口数与每餐菜数自定义搭配，也可以随机换一批'
                  : '每天换一组均衡搭配，也可以随机换一批'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* 「🎲 换一批」：随机 / 自定义模式恒可用（加载中禁用） */}
              <button
                onClick={onShuffle}
                disabled={loading}
                className="rounded-full border border-berry/40 bg-berry/10 px-5 py-2 text-sm font-semibold text-berry transition-all hover:bg-berry/20 hover:shadow-lg hover:shadow-berry/20 active:scale-95 disabled:opacity-50"
              >
                🎲 换一批
              </button>
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

            {/* 生成按钮：点后切换为自定义模式并换新种子（结果必然变化） */}
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
