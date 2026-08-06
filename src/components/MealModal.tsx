import { useEffect, useRef, useState } from 'react'
import type { Category, CategoryMeta, Meal, Nutrition } from '../types'

/** 食物详情弹窗的 props */
interface MealModalProps {
  meal: Meal
  categoryMeta: Record<Category, CategoryMeta>
  onClose: () => void
  /** 可选：传入时渲染「加入餐桌」按钮（App 传入 table.add，移动端也能从弹窗加菜） */
  onAdd?: (meal: Meal) => void
  /** 可选：同名变体数量（如 红烧排骨 减脂/家常 两种做法）；>1 时渲染提示条，不传不显示 */
  variants?: number
}

// 三大营养素每克的热量（kcal/g），用于营养明细换算
const KCAL_PER_GRAM: Record<keyof Nutrition, number> = { protein: 4, carbs: 4, fat: 9 }

// 营养条配置：标签 + 渐变色
const NUTRI_ITEMS: Array<{ key: keyof Nutrition; label: string; bar: string }> = [
  { key: 'protein', label: '蛋白质', bar: 'bg-gradient-to-r from-grape to-berry' },
  { key: 'carbs', label: '碳水化合物', bar: 'bg-gradient-to-r from-tangerine to-berry' },
  { key: 'fat', label: '脂肪', bar: 'bg-gradient-to-r from-berry to-tangerine' },
]

/**
 * 食物详情弹窗：做法步骤 / 食材清单 / 营养构成
 * 纯展示组件：数据全部来自 props，支持遮罩点击与 ESC 关闭（带开/关动画）
 */
export default function MealModal({ meal, categoryMeta, onClose, onAdd, variants }: MealModalProps) {
  const [closing, setClosing] = useState(false)
  // 「加入餐桌」反馈态：点击后切换为「已加入」（table.add 本身按 id 去重）
  const [added, setAdded] = useState(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const meta = categoryMeta[meal.category]

  // 打开期间锁定背景滚动、弹窗接管键盘焦点，并注册 ESC 关闭
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    // 记住打开前的焦点元素（通常是触发卡片），关闭后还原
    const previouslyFocused = document.activeElement as HTMLElement | null
    // 初始焦点移到弹窗主体（aria-modal 对话框应有焦点落点）
    dialogRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      // 简单焦点圈闭：Tab / Shift+Tab 在弹窗内循环，不落入背景页面
      if (e.key === 'Tab') {
        const dialog = dialogRef.current
        if (!dialog) return
        const focusables = dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
      // 关闭后还原焦点到打开前的元素
      previouslyFocused?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 先播退出动画（260ms），再真正卸载
  const close = () => {
    setClosing(true)
    setTimeout(onClose, 260)
  }

  // 营养条宽度：以三者最大值为基准
  const maxNutri = Math.max(meal.nutrition.protein, meal.nutrition.carbs, meal.nutrition.fat)
  // 三大营养素明细合计热量
  const nutriTotalKcal = NUTRI_ITEMS.reduce(
    (sum, item) => sum + meal.nutrition[item.key] * KCAL_PER_GRAM[item.key],
    0
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩：点击关闭 */}
      <div
        onClick={close}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          closing ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* 弹窗主体 */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={meal.name}
        tabIndex={-1}
        className={`glass-card relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-ink-2/80 shadow-2xl shadow-black/60 transition-all duration-300 focus:outline-none ${
          closing
            ? 'scale-95 translate-y-4 opacity-0'
            : 'scale-100 translate-y-0 opacity-100 animate-modal-in'
        }`}
      >
        {/* 顶部渐变 emoji 区：叠玻璃蒙层压暗，与弹窗玻璃底融合 */}
        <div className={`relative flex h-36 shrink-0 items-center justify-center bg-gradient-to-br ${meta.gradient}`}>
          <span aria-hidden="true" className="absolute inset-0 bg-ink/30" />
          <span className="relative text-7xl drop-shadow-xl">{meal.emoji}</span>
          <span className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-medium ${meta.chip}`}>
            {meta.emoji} {meta.label}
          </span>
          <button
            onClick={close}
            aria-label="关闭弹窗"
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-black/30 text-lg text-snow/80 transition-colors hover:bg-grape/30 hover:text-snow"
          >
            ×
          </button>
        </div>

        {/* 滚动内容区 */}
        <div className="overflow-y-auto p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black">{meal.name}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/5 px-3.5 py-1.5 text-sm font-bold text-tangerine">
                {meal.kcal} kcal / 份（约 {meal.servingSize.amount}
                {meal.servingSize.unit}）
              </span>
              {/* 加入餐桌：App 传入 onAdd 时才渲染（向后兼容）；点击后切换「已加入」态 */}
              {onAdd && (
                <button
                  type="button"
                  onClick={() => {
                    onAdd(meal)
                    setAdded(true)
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold transition-all hover:scale-105 active:scale-95 ${
                    added
                      ? 'bg-grape/20 text-grape'
                      : 'bg-tangerine text-ink shadow-lg shadow-tangerine/25 hover:brightness-110'
                  }`}
                >
                  {added ? '✓ 已加入' : '＋ 加入餐桌'}
                </button>
              )}
            </div>
          </div>

          {/* 同名变体提示条：variants > 1 时提示可对比不同做法（U8，向后兼容） */}
          {variants && variants > 1 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-tangerine/25 bg-tangerine/10 px-3 py-2 text-xs font-medium leading-relaxed text-tangerine">
              <span aria-hidden="true" className="text-sm">🔁</span>
              <span>
                同款变体 {variants} 个：做法与热量略有不同，可在菜谱库中对比后分别加入餐桌
              </span>
            </div>
          )}
          <p className="mt-2 text-sm leading-relaxed text-mist">{meal.desc}</p>

          {/* 食材清单 */}
          <section className="mt-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-snow">
              <span className="text-gradient">🛒</span> 食材清单
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {meal.ingredients.map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-snow/90"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* 做法步骤 */}
          <section className="mt-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-snow">
              <span className="text-gradient">👨‍🍳</span> 做法步骤
            </h3>
            <ol className="mt-3 space-y-3">
              {meal.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-snow/85">{step}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* 营养构成 */}
          <section className="mt-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-snow">
              <span className="text-gradient">🧪</span> 营养构成
            </h3>
            <div className="mt-3 space-y-3 rounded-2xl border border-white/8 bg-ink p-4">
              {NUTRI_ITEMS.map((item) => {
                const grams = meal.nutrition[item.key]
                const kcal = grams * KCAL_PER_GRAM[item.key]
                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-mist">{item.label}</span>
                      <span className="font-semibold text-snow">
                        {grams} g <span className="text-mist">≈ {kcal} kcal</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
                      <div
                        className={`h-full rounded-full ${item.bar}`}
                        style={{ width: `${(grams / maxNutri) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              <p className="border-t border-white/8 pt-3 text-xs text-mist">
                三大营养素明细合计约{' '}
                <span className="font-semibold text-snow">{nutriTotalKcal} kcal</span>
                ，与每份总热量基本一致（含纤维等未计入部分）
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
