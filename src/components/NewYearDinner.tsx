import { useEffect, useState } from 'react'
import Reveal from './Reveal'
import { CUISINE_META } from './CuisineChips'
import type { CuisineFilter, Meal } from '../types'

/** 年夜饭生成器的 props */
interface NewYearDinnerProps {
  meals: Meal[]
  cuisineFilter: CuisineFilter
  onAddAll: (dishes: Meal[]) => void
  /** 可选：点击某道菜条目打开做法详情弹窗（不传则条目不可点击，保持原行为） */
  onOpen?: (meal: Meal) => void
}

/** 一桌中的一道菜：所属池 key + 菜品 */
interface TableDish {
  poolKey: string
  meal: Meal
}

// 菜品池配置：每池取 count 道，按菜名关键词从全库匹配候选
const POOLS: Array<{ key: string; label: string; count: number; keywords: string[] }> = [
  {
    key: 'cold',
    label: '🥢 凉菜',
    count: 2,
    keywords: ['凉拌', '皮蛋豆腐', '口水鸡', '白切鸡', '卤牛肉', '卤鸡腿', '卤鸡爪', '盐水鸭', '酱牛肉', '酸辣木耳', '凉菜'],
  },
  {
    key: 'main',
    label: '🍖 硬菜',
    count: 3,
    keywords: ['红烧肉', '梅菜扣肉', '红烧排骨', '糖醋里脊', '锅包肉', '狮子头', '红烧鱼', '清蒸', '白灼虾', '油焖大虾', '可乐鸡翅', '三杯鸡', '大盘鸡', '啤酒鸭', '粉蒸', '回锅肉', '剁椒鱼头', '烤鸭', '酱鸭', '红烧猪蹄'],
  },
  {
    key: 'hot',
    label: '🔥 热菜',
    count: 3,
    keywords: ['宫保鸡丁', '鱼香肉丝', '麻婆豆腐', '地三鲜', '干煸四季豆', '虎皮青椒', '红烧茄子', '鱼香茄子', '香菇油菜', '蒜蓉西兰花', '木须肉', '青椒肉丝', '蒜苔炒肉', '小炒肉'],
  },
  {
    key: 'soup',
    label: '🍲 汤',
    count: 1,
    keywords: ['排骨汤', '老鸭汤', '鸡汤', '鲫鱼豆腐汤', '银耳', '牛腩', '羊肉'],
  },
  {
    key: 'staple',
    label: '🍚 主食',
    count: 1,
    keywords: ['饺子', '八宝粥', '炒饭', '花卷', '馒头', '年糕', '春卷', '发糕'],
  },
  {
    key: 'dessert',
    label: '🍮 甜品',
    count: 1,
    // 与主食池部分重叠（年糕 / 发糕 / 八宝粥 等），但整桌 id 不重复
    keywords: ['红糖糍粑', '银耳', '南瓜饼', '发糕', '年糕', '汤圆', '冰糖雪梨', '八宝粥'],
  },
]

// 简易可播种伪随机数生成器（mulberry32）：换种子即得到新的一桌
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 从候选列表里随机取一道（不改变传入数组）
function pickOne<T>(candidates: T[], rand: () => number): T {
  return candidates[Math.floor(rand() * candidates.length)]
}

/**
 * 从指定池子里抽一道菜：
 * 1. 按菜名关键词过滤出候选；
 * 2. 排除整桌已用的 id；
 * 3. cuisineFilter 非 all 时优先抽该菜系，该菜系无候选则回退全库候选；
 * 4. 无可用候选返回 null（由调用方跳过该池）。
 */
function pickFromPool(
  poolKey: string,
  meals: Meal[],
  cuisineFilter: CuisineFilter,
  rand: () => number,
  usedIds: Set<string>
): Meal | null {
  // poolKey 恒来自 POOLS 配置，find 必然命中（断言消除 undefined）
  const spec = POOLS.find((p) => p.key === poolKey)!
  const candidates = meals.filter((m) => spec.keywords.some((kw) => (m.name ?? '').includes(kw)))
  const available = candidates.filter((m) => !usedIds.has(m.id))
  if (available.length === 0) return null
  if (cuisineFilter && cuisineFilter !== 'all') {
    const preferred = available.filter((m) => m.cuisine === cuisineFilter)
    if (preferred.length > 0) return pickOne(preferred, rand)
  }
  return pickOne(available, rand)
}

// 按六个池子顺序抽满一桌：池内不重复、整桌 id 不重复
function generateTable(meals: Meal[], cuisineFilter: CuisineFilter, seed: number): TableDish[] {
  const rand = mulberry32(seed)
  const usedIds = new Set<string>()
  const table: TableDish[] = []
  for (const pool of POOLS) {
    for (let i = 0; i < pool.count; i += 1) {
      const dish = pickFromPool(pool.key, meals, cuisineFilter, rand, usedIds)
      if (!dish) break // 该池候选用尽，跳过剩余名额
      usedIds.add(dish.id)
      table.push({ poolKey: pool.key, meal: dish })
    }
  }
  return table
}

// 单道换菜：排除整桌已用 id（含当前这道），从该池重新抽一道，只替换被点击的那道
function replaceDish(
  table: TableDish[],
  dishId: string,
  poolKey: string,
  meals: Meal[],
  cuisineFilter: CuisineFilter
): TableDish[] {
  const usedIds = new Set(table.map((item) => item.meal.id))
  const dish = pickFromPool(poolKey, meals, cuisineFilter, mulberry32(Date.now()), usedIds)
  if (!dish) return table // 无可用替代（理论上不会发生），保持原桌
  return table.map((item) => (item.meal.id === dishId ? { poolKey, meal: dish } : item))
}

/**
 * 年夜饭生成器：从全库按「凉菜 / 硬菜 / 热菜 / 汤 / 主食 / 甜品」六个池子
 * 随机配出一桌 11 道菜（2+3+3+1+1+1），支持整桌重抽与单道换菜，
 * 配好后一键加入家庭餐桌。
 * 纯展示 + 内部状态组件：菜品数据、地区筛选与加入回调来自 props。
 */
export default function NewYearDinner({ meals, cuisineFilter, onAddAll, onOpen }: NewYearDinnerProps) {
  // 当前一桌（{ poolKey, meal }[]），重新配一桌时通过 rollVersion 触发 effect 重抽
  const [table, setTable] = useState<TableDish[]>([])
  const [rollVersion, setRollVersion] = useState(0)

  // meals 加载完成 / 地区筛选变化 / 点击「重新配一桌」时整桌重抽
  // 用 Date.now() 作随机种子：每次重抽都是新的一桌，不追求可复现
  useEffect(() => {
    setTable(generateTable(meals, cuisineFilter, Date.now()))
  }, [meals, cuisineFilter, rollVersion])

  // 汇总一行：对当前一桌的 kcal 与三大营养素求和（缺字段按 0 处理）
  const totals = table.reduce(
    (acc, item) => {
      const n = item.meal.nutrition ?? {}
      acc.kcal += item.meal.kcal ?? 0
      acc.protein += n.protein ?? 0
      acc.carbs += n.carbs ?? 0
      acc.fat += n.fat ?? 0
      return acc
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )

  // 无候选菜（数据未加载或全库为空）时显示空态
  if (meals.length === 0) {
    return (
      <section id="newyear" className="scroll-mt-24 px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="text-2xl font-black sm:text-3xl">🧧 年夜饭</h2>
            <p className="mt-2 text-sm text-mist">一桌团圆饭，从选菜到上桌都替你配好</p>
          </Reveal>
          <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-white/5 bg-ink-2 px-6 py-16 text-center">
            <span aria-hidden="true" className="text-4xl">🧧</span>
            <p className="text-mist">菜谱加载中，稍等片刻就能配一桌年夜饭…</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="newyear" className="scroll-mt-24 px-5 py-16">
      <div className="mx-auto max-w-6xl">
        {/* 标题区：标题 + 副标题 + 整桌重抽按钮（玻璃风） */}
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">🧧 年夜饭</h2>
              <p className="mt-2 text-sm text-mist">一桌团圆饭，从选菜到上桌都替你配好</p>
            </div>
            <button
              onClick={() => setRollVersion((v) => v + 1)}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-mist backdrop-blur transition-all duration-300 hover:border-grape/40 hover:text-snow active:scale-95"
            >
              🎲 重新配一桌
            </button>
          </div>
        </Reveal>

        {/* 一桌展示：整桌玻璃底 + 六组并排玻璃卡，更有「一桌菜」的仪式感 */}
        <div className="glass-card relative mt-10 overflow-hidden rounded-3xl p-6 sm:p-8">
          {/* 低饱和紫橙光晕：整桌氛围底 */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-grape/10 via-transparent to-tangerine/10"
          />
          <p className="relative mb-6 text-sm text-mist">
            凉菜 · 硬菜 · 热菜 · 汤 · 主食 · 甜品，六池{' '}
            <span className="font-semibold text-tangerine">{table.length} 道</span>，每道都能单独「换一道」
          </p>
          <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {POOLS.map((pool, poolIndex) => {
              const dishes = table.filter((item) => item.poolKey === pool.key)
              if (dishes.length === 0) return null // 该池无候选时不显示分组
              return (
                <Reveal key={pool.key} delay={poolIndex * 60} className="h-full">
                  {/* 每组一张玻璃卡：组标题 + 该池菜品条目 */}
                  <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-base font-bold text-snow/90">{pool.label}</h3>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-mist">
                        {dishes.length} 道
                      </span>
                    </div>
                    <ul className="flex-1 space-y-2">
                      {dishes.map((item) => {
                        const { meal } = item
                        const cuisineLabel = CUISINE_META[meal.cuisine]?.label ?? meal.cuisine
                        return (
                          <li
                            key={meal.id}
                            className={`flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 transition-all duration-300 hover:border-tangerine/25 hover:bg-tangerine/5 ${
                              onOpen
                                ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-12px_rgba(139,124,246,0.35)]'
                                : ''
                            }`}
                          >
                            {/* 条目主体（emoji + 菜名 + 菜系 + kcal）：点击打开做法详情；
                                结构上与「换一道」按钮分离，互不触发 */}
                            <span
                              role={onOpen ? 'button' : undefined}
                              tabIndex={onOpen ? 0 : undefined}
                              aria-label={onOpen ? `查看做法：${meal.name}` : undefined}
                              onClick={onOpen ? () => onOpen(meal) : undefined}
                              onKeyDown={
                                onOpen
                                  ? (e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        onOpen(meal)
                                      }
                                    }
                                  : undefined
                              }
                              className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grape ${
                                onOpen ? 'cursor-pointer' : ''
                              }`}
                            >
                              {/* 菜品 emoji */}
                              <span aria-hidden="true" className="shrink-0 text-xl drop-shadow">{meal.emoji}</span>
                              {/* 菜名 + 菜系小标签 + 每份热量 */}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-snow">{meal.name}</p>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-mist">
                                    {cuisineLabel}
                                  </span>
                                  <span className="shrink-0 text-[11px] font-semibold text-tangerine">
                                    {meal.kcal} kcal
                                  </span>
                                </div>
                              </div>
                            </span>
                            {/* 单道换菜：仅重抽被点击的这一道；stopPropagation 兜底，避免冒泡 */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setTable((t) => replaceDish(t, meal.id, pool.key, meals, cuisineFilter))
                              }}
                              aria-label={`换一道：${meal.name}`}
                              className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-mist transition-all duration-300 hover:border-grape/40 hover:text-snow active:scale-95"
                            >
                              换一道
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>

        {/* 底部汇总：热量 / 蛋白 / 碳水 / 脂肪 分列 + 加入我的餐桌 */}
        <Reveal delay={120}>
          <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur sm:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
              <div className="text-center sm:text-left">
                <p className="text-[11px] text-mist">合计热量</p>
                <p className="text-2xl font-bold text-tangerine">
                  {totals.kcal} <small className="text-sm font-medium text-mist">kcal</small>
                </p>
              </div>
              <span aria-hidden="true" className="hidden h-9 w-px bg-white/10 sm:block" />
              <div className="text-center sm:text-left">
                <p className="text-[11px] text-mist">蛋白质</p>
                <p className="text-xl font-bold text-grape">{totals.protein}g</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[11px] text-mist">碳水</p>
                <p className="text-xl font-bold text-snow">{totals.carbs}g</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[11px] text-mist">脂肪</p>
                <p className="text-xl font-bold text-tangerine">{totals.fat}g</p>
              </div>
            </div>
            <button
              onClick={() => onAddAll(table.map((item) => item.meal))}
              disabled={table.length === 0}
              className="shrink-0 rounded-full bg-gradient-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-grape/25 transition-all duration-300 hover:shadow-grape/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              🍽️ 加入我的餐桌（{table.length} 道）
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
