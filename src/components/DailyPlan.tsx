import Reveal from './Reveal'
import type { Category, CategoryMeta, Meal, PlanMode, PlanSlot } from '../types'

/** 今日三餐搭配的 props */
interface DailyPlanProps {
  plan: PlanSlot[]
  loading: boolean
  mode?: PlanMode
  totalKcal: number
  categoryMeta: Record<Category, CategoryMeta>
  goalLabel: string | null
  onShuffle: () => void
  onRegenerate: () => void
  /** 可选：点击某道菜打开做法详情弹窗（不传则不可点击，保持原行为） */
  onOpen?: (meal: Meal) => void
}

// 三餐时段对应的图标
const SLOT_ICONS: Record<PlanSlot['slot'], string> = { 早餐: '🌅', 午餐: '☀️', 晚餐: '🌙' }

// 三餐卡左侧强调色：橙 / 紫 / 橙，呼应方案 B 双色体系
const SLOT_ACCENTS = ['border-l-tangerine/70', 'border-l-grape/70', 'border-l-tangerine/70']

/**
 * 今日三餐搭配：展示早餐 / 午餐 / 晚餐三餐与全天合计热量
 * 数据结构统一为 { slot, meals: object[] }：智能搭配每餐 2-3 道菜，随机模式每餐 1 道
 * 支持两种模式：random（随机，来自 useDailyPlan）与 smart（智能搭配，来自热量计算器）
 * 已选目标时：随机模式按目标分类筛选（提示「当前按 X 筛选」），智能徽章显示目标名
 * 纯展示组件：搭配数据、模式与回调全部来自 props
 */
export default function DailyPlan({
  plan,
  loading,
  mode = 'random',
  totalKcal,
  categoryMeta,
  goalLabel,
  onShuffle,
  onRegenerate,
  onOpen,
}: DailyPlanProps) {
  const isSmart = mode === 'smart'
  return (
    <section id="daily" className="relative scroll-mt-24 px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2.5 text-2xl font-black sm:text-3xl">
                <span aria-hidden="true" className="inline-block h-5 w-1.5 rounded-full bg-gradient-to-b from-tangerine to-grape" />
                今日三餐搭配
              </h2>
              <p className="mt-2 text-sm text-mist">
                {isSmart
                  ? '根据你的热量目标智能生成，每餐 2-3 道菜凑近目标热量'
                  : '每天换一组均衡搭配，也可以随机换一批'}
                {!isSmart && goalLabel && (
                  <span className="ml-2 inline-block rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-grape">
                    当前按 {goalLabel} 筛选
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isSmart && goalLabel && (
                <span className="rounded-full border border-grape/30 bg-grape/10 px-3 py-1.5 text-xs font-semibold text-grape">
                  ⚡ {goalLabel}搭配
                </span>
              )}
              <button
                onClick={isSmart ? onRegenerate : onShuffle}
                disabled={loading}
                className="rounded-full border border-berry/40 bg-berry/10 px-5 py-2 text-sm font-semibold text-berry transition-all hover:bg-berry/20 hover:shadow-lg hover:shadow-berry/20 active:scale-95 disabled:opacity-50"
              >
                {isSmart ? '🔄 重新生成' : '🎲 换一批'}
              </button>
            </div>
          </div>
        </Reveal>

        {/* 三顿饭：key 随搭配变化，换一批时重播错峰入场动画 */}
        <div
          key={plan.map((item) => item.meals.map((m) => m.id).join('-')).join('|') || 'loading'}
          className="mt-6 grid gap-4 md:grid-cols-3"
        >
          {loading
            ? [0, 1, 2].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl border border-white/8 bg-white/5" />
              ))
            : plan.map((item, i) => {
                // 该餐小计（所有菜求和）
                const subtotal = item.meals.reduce((s, m) => s + m.kcal, 0)
                const first = item.meals[0]
                const meta = first ? categoryMeta[first.category] : null
                return (
                  <div
                    key={item.slot}
                    style={{ animationDelay: `${i * 90}ms` }}
                    className={`animate-fade-up rounded-2xl border border-l-2 border-white/8 bg-white/4 p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-grape/40 hover:shadow-[0_12px_36px_-12px_rgba(139,124,246,0.3)] ${SLOT_ACCENTS[i % 3]}`}
                  >
                    {/* 顶部：餐次 + 分类徽章 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-snow">
                        {SLOT_ICONS[item.slot]} {item.slot}
                      </span>
                      {meta && (
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${meta.chip}`}>
                          {meta.label}
                        </span>
                      )}
                    </div>

                    {/* 该餐的 1-3 道菜：每道菜一行，点击打开做法详情（不传 onOpen 时保持原展示） */}
                    <ul className="mt-2 divide-y divide-white/5">
                      {item.meals.map((meal) => (
                        <li
                          key={meal.id}
                          className={`relative flex items-center gap-3 rounded-lg py-2.5 transition-colors duration-200 ${
                            onOpen ? 'cursor-pointer hover:bg-white/5' : ''
                          }`}
                        >
                          {/* 拉伸按钮：覆盖整行，li 保持 listitem 语义（axe aria-allowed-role / list） */}
                          {onOpen && (
                            <button
                              type="button"
                              aria-label={`查看做法：${meal.name}`}
                              onClick={() => onOpen(meal)}
                              className="absolute inset-0 z-10 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-grape"
                            />
                          )}
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 text-xl">
                            {meal.emoji}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-snow/90">
                            {meal.name}
                          </span>
                          <span className="shrink-0 text-sm font-semibold text-tangerine">
                            {meal.kcal} kcal
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* 该餐小计 */}
                    <div className="mt-1 flex items-center justify-between border-t border-white/5 pt-2.5">
                      <span className="text-xs text-mist">小计</span>
                      <span className="text-sm font-bold text-snow">{subtotal} kcal</span>
                    </div>
                  </div>
                )
              })}
        </div>

        {/* 合计热量 */}
        <Reveal delay={150}>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/4 px-6 py-4 backdrop-blur-xl">
            <p className="text-sm text-mist">本日合计热量（约）</p>
            <p className="text-2xl font-black">
              <span className="text-gradient">{loading ? '--' : totalKcal}</span>{' '}
              <span className="text-base font-semibold text-mist">kcal</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
