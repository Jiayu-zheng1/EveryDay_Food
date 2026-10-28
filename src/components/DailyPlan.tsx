import Reveal from './Reveal'
import type { Category, CategoryMeta, Meal, MealType, PlanSlot } from '../types'
/** 今日三餐搭配（结果区）的 props */
interface DailyPlanProps {
  plan: PlanSlot[]
  /** 数据加载中（全量食谱未就绪） */
  loading: boolean
  /** 人口数：分量按每多一人每道菜 +200g 线性换算；kcal 仍按 × people 换算 */
  people: number
  /** 全天合计热量（单份，1 人份原始值） */
  totalKcal: number
  categoryMeta: Record<Category, CategoryMeta>
  /** 可选：点击某道菜打开做法详情弹窗（不传则行不可点击，保持原行为） */
  onOpen?: (meal: Meal) => void
  /** 可选：每道菜旁的「加入餐桌」按钮（不传则不渲染） */
  onAdd?: (meal: Meal) => void
  addedIds?: Set<string>
  /** 可选：单道菜独立置换回调 */
  onReplaceDish?: (slot: MealType, mealId: string) => void
}

const SLOT_ICONS: Record<PlanSlot['slot'], string> = { 早餐: '🌅', 午餐: '☀️', 晚餐: '🌙' }
const SLOT_BADGES: Record<PlanSlot['slot'], string> = {
  早餐: 'bg-blue-50 text-blue-600 border border-blue-200/60',
  午餐: 'bg-indigo-50 text-indigo-600 border border-indigo-200/60',
  晚餐: 'bg-rose-50 text-rose-600 border border-rose-200/60',
}
/**
 * 今日三餐搭配（结果区）：早餐 / 午餐 / 晚餐三餐卡 + 全天合计热量
 * 纯展示组件：搭配数据与回调全部来自 props（生成逻辑在 useDailyPlanner hook）
 * 人口数换算：每道菜分量 = servingSize.amount + (people - 1) × 200g（每多一人 +200g，线性增量）；
 * 餐卡小计与全天合计 = 单份 kcal × people，
 * 保留单份原始 kcal 标注（people > 1 时以「（单份 N kcal）」小字展示）
 * 每道菜可点开做法详情（onOpen），可一键加入餐桌（onAdd，已加入显示 ✓）
 */
export default function DailyPlan({
  plan,
  loading,
  people,
  totalKcal,
  categoryMeta,
  onOpen,
  onAdd,
  addedIds,
  onReplaceDish,
}: DailyPlanProps) {
  const portionLabel = (meal: Meal): string => {
    // 每多一人每道菜 +200g（线性增量，不按人数翻倍）；1 人时即原始单份量
    const amount = meal.servingSize.amount + (people - 1) * 200
    const unit = meal.servingSize.unit
    return people > 1 ? `${people} 人份 · 每份 ${amount}${unit}` : `每份 ${amount}${unit}`
  }

  return (
    <>
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
              // 该餐小计（单份，所有菜原始 kcal 求和）
              const subtotal = item.meals.reduce((s, m) => s + m.kcal, 0)
              const first = item.meals[0]
              const meta = first ? categoryMeta[first.category] : null
              return (
                <div
                  key={item.slot}
                  style={{ animationDelay: `${i * 90}ms` }}
                  className="liquid-card p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1"
                >
                  {/* 顶部：餐次 + 分类徽章 */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span>{SLOT_ICONS[item.slot]}</span>
                      <span>{item.slot}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${SLOT_BADGES[item.slot]}`}>
                        {subtotal * people} kcal
                      </span>
                      {meta && (
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${meta.chip}`}>
                          {meta.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 该餐的多道菜：每道菜一行（份量换算 + 原始 kcal + 加入餐桌），点击打开做法详情 */}
                  {item.meals.length === 0 ? (
                    <p className="mt-3 text-xs text-mist">该餐暂无匹配菜谱，试试调整筛选或换一批</p>
                  ) : (
                    <ul className="mt-3 space-y-2.5">
                      {item.meals.map((meal) => {
                        const added = addedIds?.has(meal.id) ?? false
                        return (
                          <li
                            key={meal.id}
                            className={`relative flex items-center gap-3 rounded-2xl p-2.5 bg-white/70 border border-white/90 shadow-xs transition-colors duration-200 hover:bg-white ${
                              onOpen ? 'cursor-pointer' : ''
                            }`}
                          >
                            {/* 拉伸按钮：覆盖整行 */}
                            {onOpen && (
                              <button
                                type="button"
                                aria-label={`查看做法：${meal.name}`}
                                onClick={() => onOpen(meal)}
                                className="absolute inset-0 z-[1] cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                              />
                            )}
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100/90 text-2xl shadow-inner">
                              {meal.emoji}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs sm:text-sm font-bold text-slate-900">
                                {meal.name}
                              </span>
                              <span className="block text-[11px] text-slate-400 mt-0.5">{portionLabel(meal)}</span>
                            </span>
                            <span className="shrink-0 text-xs font-black text-slate-800 font-display">
                              {meal.kcal} kcal
                            </span>
                            <div className="relative z-10 flex items-center gap-1.5 ml-1">
                              {/* 单道换菜 */}
                              {onReplaceDish && (
                                <button
                                  type="button"
                                  aria-label={`换一道：${meal.name}`}
                                  title="单道换菜"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const mealType: MealType =
                                      item.slot === '早餐' ? 'breakfast' : item.slot === '午餐' ? 'lunch' : 'dinner'
                                    onReplaceDish(mealType, meal.id)
                                  }}
                                  className="grid size-7 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-xs text-slate-500 transition-all hover:border-blue-400 hover:text-blue-600 active:scale-90 shadow-xs cursor-pointer"
                                >
                                  🔄
                                </button>
                              )}
                              {/* 加入餐桌 */}
                              {onAdd && (
                                <button
                                  type="button"
                                  aria-label={added ? `已加入餐桌：${meal.name}` : `加入餐桌：${meal.name}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onAdd(meal)
                                  }}
                                  className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-black transition-all active:scale-90 shadow-xs cursor-pointer ${
                                    added
                                      ? 'bg-emerald-500 text-white'
                                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-900 hover:text-white'
                                  }`}
                                >
                                  {added ? '✓' : '+'}
                                </button>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {/* 该餐小计（按人份换算，保留单份标注） */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-400">
                    <span>小计</span>
                    <span className="font-extrabold text-slate-800">
                      {subtotal * people} kcal
                      {people > 1 && (
                        <span className="ml-1 text-[11px] font-normal text-slate-400">（单份 {subtotal} kcal）</span>
                      )}
                    </span>
                  </div>
                </div>
              )
            })}
      </div>

      {/* 全天合计热量 */}
      <Reveal delay={150}>
        <div className="liquid-card !rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 mt-6">
          <div className="flex items-center gap-3 text-xs text-slate-600 font-bold">
            <span>今日三餐全天合计（{people} 人份）：</span>
            <strong className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              {loading ? '--' : totalKcal * people} <span className="text-xs text-slate-400 font-normal">kcal</span>
            </strong>
            {people > 1 && (
              <span className="text-[11px] font-normal text-slate-400">
                （单份 {totalKcal} kcal）
              </span>
            )}
          </div>
          {onAdd && (
            <button
              type="button"
              onClick={() => {
                plan.forEach((item) => item.meals.forEach((m) => onAdd(m)))
              }}
              className="jelly-pill px-4 py-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 transition active:scale-95 cursor-pointer"
            >
              一键将三餐全部打包加入餐桌 →
            </button>
          )}
        </div>
      </Reveal>
    </>
  )
}
