import { useEffect, useRef } from 'react'
import type { Meal, ModuleKey } from '../types'

/** Hero 区的 props */
interface HeroProps {
  mealCount: number
  onNavigate: (module: ModuleKey) => void
  featuredMeal?: Meal
  onAddMeal?: (meal: Meal) => void
  onOpenMeal?: (meal: Meal) => void
  isAdded?: boolean
}

// 快捷入口卡配置：key 传给 onNavigate 切换全局模块
const QUICK_LINKS: Array<{ key: ModuleKey; emoji: string; title: string; desc: string; action: string }> = [
  { key: 'library', emoji: '📖', title: '1093 道食谱库', desc: '八大菜系、早中晚餐次多维检索', action: '逛菜谱 →' },
  { key: 'goals', emoji: '🎯', title: '健康目标规划', desc: '测算 BMR / TDEE，按黄金比例配餐', action: '定目标 →' },
  { key: 'newyear', emoji: '🏮', title: '家宴聚餐生成', desc: '四菜一汤、阖家欢聚、硬菜凉菜配齐', action: '去配宴 →' },
  { key: 'table', emoji: '🛒', title: '智能购物清单', desc: '多菜食材调料自动归并，超市打卡', action: '看餐桌 →' },
]

export default function Hero({
  mealCount,
  onNavigate,
  featuredMeal,
  onAddMeal,
  onOpenMeal,
  isAdded = false,
}: HeroProps) {
  const titleRef = useRef<HTMLHeadingElement | null>(null)

  // 滚动视差：kinetic 标题词块交错位移
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const y = window.scrollY
        const words = titleRef.current
          ? Array.from(titleRef.current.querySelectorAll<HTMLElement>('.kinetic-word'))
          : []
        words.forEach((word, i) => {
          const tx = Math.min(y * (0.015 + i * 0.01), 16 + i * 6)
          const ty = Math.min(y * (0.04 + i * 0.018), 56 + i * 12)
          word.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
        })
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // 默认特选菜兜底数据
  const displayMeal: {
    name: string
    desc: string
    emoji: string
    kcal: number
    protein: number
    carbs: number
    fat: number
  } = featuredMeal
    ? {
        name: featuredMeal.name,
        desc: featuredMeal.desc,
        emoji: featuredMeal.emoji,
        kcal: featuredMeal.kcal,
        protein: featuredMeal.nutrition.protein,
        carbs: featuredMeal.nutrition.carbs,
        fat: featuredMeal.nutrition.fat,
      }
    : {
        name: '牛油果低温浸慢煎三文鱼',
        desc: '富含天然优质 Omega-3 不饱和脂肪酸，搭配丝滑牛油果泥，焦香酥脆与浓郁滑润的双重奏。',
        emoji: '🥑',
        kcal: 340,
        protein: 36.5,
        carbs: 8.2,
        fat: 14.0,
      }

  return (
    <section className="relative px-4 pb-8 pt-24 sm:px-6 sm:pt-28">
      {/* 1. 顶部标语 */}
      <div className="relative mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/80 px-3.5 py-1 text-xs font-bold text-slate-700 shadow-xs backdrop-blur-md">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          减脂 · 增肌 · 营养 · 治愈 · 告别做饭焦虑
        </div>

        <h1 ref={titleRef} className="mt-4 text-3xl font-black leading-tight sm:text-5xl text-slate-900 tracking-tight">
          <span className="block">
            <span className="kinetic-word">今天</span>
            <span className="kinetic-word">吃什么？</span>
          </span>
          <span className="block mt-1">
            <span className="kinetic-word text-gradient">热量、营养与做法</span>
            <span className="kinetic-word text-gradient">全替你算好了</span>
          </span>
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm leading-relaxed text-slate-500">
          八大菜系 <strong className="font-extrabold text-slate-800">{mealCount}</strong> 道健康食谱 · 每一份蛋白质、脂肪、碳水精准透明，照着做就好
        </p>

        {/* 快速指标药丸 */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs">
          <span className="jelly-pill px-3 py-1 font-bold text-slate-700">
            🥘 <strong className="text-slate-900">{mealCount}</strong> 道食谱
          </span>
          <span className="jelly-pill px-3 py-1 font-bold text-slate-700">
            🥗 8 大分类
          </span>
          <span className="jelly-pill px-3 py-1 font-bold text-slate-700">
            ✨ 0 热量焦虑
          </span>
        </div>
      </div>

      {/* 2. Bento 全景看板 (Featured + Target Calc) */}
      <div className="relative mx-auto mt-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* 左侧：今日灵感主推大卡 (7列) */}
          <div className="liquid-card md:col-span-7 p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-white/90 via-white/70 to-blue-50/40">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="jelly-pill px-3 py-1 text-xs font-extrabold text-blue-700 flex items-center gap-1.5">
                  <span>✨</span> 今日灵感主推
                </span>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                    {displayMeal.kcal}
                  </span>
                  <span className="text-xs font-bold text-slate-400 ml-0.5">kcal</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                <button
                  type="button"
                  onClick={() => featuredMeal && onOpenMeal?.(featuredMeal)}
                  className="sm:col-span-5 h-40 sm:h-44 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-white flex items-center justify-center text-6xl sm:text-7xl shadow-inner transition hover:scale-105 active:scale-95 cursor-pointer"
                >
                  {displayMeal.emoji}
                </button>
                <div className="sm:col-span-7">
                  <h3
                    onClick={() => featuredMeal && onOpenMeal?.(featuredMeal)}
                    className="text-lg sm:text-xl font-extrabold text-slate-900 hover:text-blue-600 transition cursor-pointer"
                  >
                    {displayMeal.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                    {displayMeal.desc}
                  </p>

                  {/* 三大营养素水滴微指标 */}
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="jelly-pill p-2">
                      <div className="text-[10px] text-slate-400 font-bold">高蛋白</div>
                      <div className="text-xs font-black text-slate-800 mt-0.5 font-display">{displayMeal.protein}g</div>
                    </div>
                    <div className="jelly-pill p-2">
                      <div className="text-[10px] text-slate-400 font-bold">优质碳水</div>
                      <div className="text-xs font-black text-slate-800 mt-0.5 font-display">{displayMeal.carbs}g</div>
                    </div>
                    <div className="jelly-pill p-2">
                      <div className="text-[10px] text-slate-400 font-bold">健康脂肪</div>
                      <div className="text-xs font-black text-slate-800 mt-0.5 font-display">{displayMeal.fat}g</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">⏱️ 耗时 15 分钟 · 步骤清爽</span>
              {featuredMeal && onAddMeal && (
                <button
                  type="button"
                  onClick={() => onAddMeal(featuredMeal)}
                  className={`px-4 py-2 text-xs font-bold rounded-full transition shadow-xs flex items-center gap-1.5 ${
                    isAdded
                      ? 'bg-emerald-500 text-white'
                      : 'jelly-btn hover:bg-slate-800'
                  }`}
                >
                  <span>{isAdded ? '✓ 已在餐桌' : '+ 放入我的餐桌'}</span>
                </button>
              )}
            </div>
          </div>

          {/* 右侧：专属热量缺口测算 (5列) */}
          <div className="liquid-card md:col-span-5 p-6 sm:p-7 flex flex-col justify-between bg-gradient-to-br from-white/90 via-white/70 to-indigo-50/40">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="jelly-pill px-3 py-1 text-xs font-extrabold text-indigo-700">
                  🎯 智能目标规划
                </span>
                <span className="text-xs text-slate-400 font-bold">BMR / TDEE</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">专属热量缺口测算</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                输入身高体重与自律目标，算法自动按黄金配比生成全天三餐热量分配。
              </p>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-white">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🥑</span> 科学减脂推荐
                  </span>
                  <span className="text-xs font-black text-emerald-600 font-display">1420 kcal / 天</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-white">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🥩</span> 高蛋白增肌
                  </span>
                  <span className="text-xs font-black text-rose-600 font-display">2250 kcal / 天</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('goals')}
              className="w-full mt-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold py-2.5 rounded-2xl text-xs shadow-md hover:shadow-lg transition active:scale-95"
            >
              1 分钟配置我的健康目标 →
            </button>
          </div>
        </div>
      </div>

      {/* 3. 核心功能 4 卡矩阵 */}
      <div className="relative mx-auto mt-6 max-w-6xl">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.key}
              type="button"
              onClick={() => onNavigate(link.key)}
              className="liquid-card group flex flex-col items-start rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
            >
              <span className="text-3xl transition-transform duration-300 group-hover:scale-110">
                {link.emoji}
              </span>
              <span className="mt-2 text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition">
                {link.title}
              </span>
              <span className="mt-1 text-xs leading-relaxed text-slate-500">
                {link.desc}
              </span>
              <span
                aria-hidden="true"
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 transition-transform duration-300 group-hover:translate-x-1"
              >
                {link.action}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. 跑马灯标语 */}
      <div
        aria-hidden="true"
        className="marquee -mx-4 sm:-mx-6 mt-10 border-y border-slate-200/60 bg-white/40 py-2.5 backdrop-blur-md"
      >
        <div className="marquee-track">
          {[0, 1].map((dup) => (
            <div key={dup} aria-hidden={dup === 1} className="flex items-center font-bold text-xs text-slate-500">
              <span className="mx-6 text-slate-900 font-extrabold">今晚吃什么</span>
              <span className="mx-4 text-amber-500">✦</span>
              <span className="mx-6 text-slate-700">{mealCount} 道健康家常菜</span>
              <span className="mx-4 text-amber-500">✦</span>
              <span className="mx-6 text-slate-900 font-extrabold">一荤一素一汤</span>
              <span className="mx-4 text-amber-500">✦</span>
              <span className="mx-6 text-slate-700">每道菜热量清清楚楚</span>
              <span className="mx-4 text-amber-500">✦</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
