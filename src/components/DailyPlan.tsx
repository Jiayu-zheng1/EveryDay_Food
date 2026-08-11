import Reveal from './Reveal'
import type { Category, CategoryMeta, Meal, PlanSlot } from '../types'

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
  /** 已加入餐桌的菜 id 集合（按钮态展示） */
  addedIds?: Set<string>
}

// 三餐时段对应的图标
const SLOT_ICONS: Record<PlanSlot['slot'], string> = { 早餐: '🌅', 午餐: '☀️', 晚餐: '🌙' }

// 三餐卡左侧强调色：橙 / 紫 / 橙，呼应方案 B 双色体系
const SLOT_ACCENTS = ['border-l-tangerine/70', 'border-l-grape/70', 'border-l-tangerine/70']

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
}: DailyPlanProps) {
  // 份量换算文案：每多一人每道菜 +200g（线性增量，不按人数翻倍）；1 人时即原始单份量
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

                  {/* 该餐的多道菜：每道菜一行（份量换算 + 原始 kcal + 加入餐桌），点击打开做法详情 */}
                  {item.meals.length === 0 ? (
                    <p className="mt-3 text-xs text-mist">该餐暂无匹配菜谱，试试调整筛选或换一批</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-white/5">
                      {item.meals.map((meal) => {
                        const added = addedIds?.has(meal.id) ?? false
                        return (
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
                                className="absolute inset-0 z-[1] cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-grape"
                              />
                            )}
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 text-xl">
                              {meal.emoji}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-snow/90">
                                {meal.name}
                              </span>
                              <span className="block text-xs text-mist">{portionLabel(meal)}</span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold text-tangerine">
                              {meal.kcal} kcal
                            </span>
                            {/* 加入餐桌：z 高于拉伸按钮，点击不会触发详情弹窗 */}
                            {onAdd && (
                              <button
                                type="button"
                                aria-label={added ? `已加入餐桌：${meal.name}` : `加入餐桌：${meal.name}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onAdd(meal)
                                }}
                                className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full border text-sm font-bold transition-all active:scale-90 ${
                                  added
                                    ? 'border-tangerine/40 bg-tangerine/15 text-tangerine'
                                    : 'border-white/15 bg-white/5 text-mist hover:border-grape/50 hover:text-snow'
                                }`}
                              >
                                {added ? '✓' : '+'}
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {/* 该餐小计（按人份换算，保留单份标注） */}
                  <div className="mt-1 flex items-center justify-between border-t border-white/5 pt-2.5">
                    <span className="text-xs text-mist">小计</span>
                    <span className="text-sm font-bold text-snow">
                      {subtotal * people} kcal
                      {people > 1 && (
                        <span className="ml-1 text-xs font-normal text-mist">（单份 {subtotal} kcal）</span>
                      )}
                    </span>
                  </div>
                </div>
              )
            })}
      </div>

      {/* 全天合计热量（按人份换算） */}
      <Reveal delay={150}>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/4 px-6 py-4 backdrop-blur-xl">
          <p className="text-sm text-mist">
            全天合计热量（约）
            {people > 1 && <span className="ml-1 text-xs">· {people} 人份</span>}
          </p>
          <p className="text-2xl font-black">
            <span className="text-gradient">{loading ? '--' : totalKcal * people}</span>{' '}
            <span className="text-base font-semibold text-mist">kcal</span>
            {people > 1 && (
              <span className="ml-1 align-middle text-xs font-normal text-mist">
                （单份合计 {totalKcal} kcal）
              </span>
            )}
          </p>
        </div>
      </Reveal>
    </>
  )
}
