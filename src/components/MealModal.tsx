import { useEffect, useRef, useState } from 'react'
import { scaleIngredient } from '../lib/shoppingList'
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
  /** 全量食谱，供同名变体直接对比切换 */
  allMeals?: Meal[]
  /** 切换选中的菜品 */
  onSelectMeal?: (meal: Meal) => void
}

interface WakeLockSentinelLike {
  release: () => Promise<void>
}

/** 解析做法步骤中的倒计时时间（秒） */
function parseStepDuration(stepText: string): number | null {
  const match = stepText.match(/(\d+)\s*(分钟|分|秒|小时)/)
  if (!match) return null
  const num = Number(match[1])
  const unit = match[2]
  if (unit.startsWith('分')) return num * 60
  if (unit === '秒') return num
  if (unit === '小时') return num * 3600
  return null
}

/** 格式化秒数为 mm:ss */
function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
export default function MealModal({
  meal,
  categoryMeta,
  onClose,
  onAdd,
  variants,
  allMeals = [],
  onSelectMeal,
}: MealModalProps) {
  const [closing, setClosing] = useState(false)
  // 份量切换：1人份 / 2人份 / 4人份，食材用量与营养素动态换算
  const [servings, setServings] = useState<number>(1)
  // 「加入餐桌」反馈态：点击后切换为「已加入」（table.add 本身按 id 去重）
  const [added, setAdded] = useState(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const meta = categoryMeta[meal.category]

  // 专注烹饪模式状态
  // 专注烹饪模式状态：当前步骤、计时器、已打勾完成的步骤集合
  const [cookingMode, setCookingMode] = useState(false)
  const [cookingStep, setCookingStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null)
  const [timerRunning, setTimerRunning] = useState(false)

  // 注入 Google / 百度 SEO 结构化数据（Recipe Schema JSON-LD）
  useEffect(() => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: meal.name,
      description: meal.desc,
      recipeCategory: meal.category,
      recipeCuisine: meal.cuisine,
      recipeYield: `${servings}人份`,
      nutrition: {
        '@type': 'NutritionInformation',
        calories: `${meal.kcal * servings} kcal`,
        proteinContent: `${meal.nutrition.protein * servings}g`,
        carbohydrateContent: `${meal.nutrition.carbs * servings}g`,
        fatContent: `${meal.nutrition.fat * servings}g`,
      },
      recipeIngredient: meal.ingredients.map((item) => scaleIngredient(item, servings)),
      recipeInstructions: meal.steps.map((step, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        text: step,
      })),
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'recipe-schema-jsonld'
    script.text = JSON.stringify(jsonLd)
    document.head.appendChild(script)

    return () => {
      const el = document.getElementById('recipe-schema-jsonld')
      el?.remove()
    }
  }, [meal, servings])
  // 烹饪模式防息屏（Screen Wake Lock API，无 any 声明）
  useEffect(() => {
    if (!cookingMode) return
    let wakeLock: WakeLockSentinelLike | null = null
    if ('wakeLock' in navigator) {
      const nav = navigator as unknown as { wakeLock: { request: (type: string) => Promise<WakeLockSentinelLike> } }
      nav.wakeLock.request('screen').then((lock) => {
        wakeLock = lock
      }).catch(() => {})
    }
    return () => {
      wakeLock?.release().catch(() => {})
    }
  }, [cookingMode])

  // 切换步骤时根据当前步骤文字自动提取计时器时间
  useEffect(() => {
    if (!cookingMode) return
    const currentStepText = meal.steps[cookingStep] ?? ''
    const duration = parseStepDuration(currentStepText)
    setTimerSeconds(duration)
    setTimerRunning(false)
  }, [cookingMode, cookingStep, meal.steps])

  // 倒计时计时器时钟
  useEffect(() => {
    if (!timerRunning || timerSeconds === null || timerSeconds <= 0) return
    const interval = window.setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev === null || prev <= 1) {
          setTimerRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [timerRunning, timerSeconds])

  // 匹配同名变体
  const otherVariants = allMeals.filter((m) => m.name === meal.name && m.id !== meal.id)
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
              <span className="rounded-full border border-slate-200/80 bg-slate-100/90 px-3 py-1 text-xs font-black text-slate-800 font-display">
                {meal.kcal * servings} kcal / {servings}人份（约 {meal.servingSize.amount * servings}
                {meal.servingSize.unit}）
              </span>
              {onAdd && (
                <button
                  type="button"
                  onClick={() => {
                    onAdd(meal)
                    setAdded(true)
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer ${
                    added
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {added ? '✓ 已加入' : '＋ 加入餐桌'}
                </button>
              )}
            </div>
          </div>

          {/* 同名变体切换对比栏 */}
          {otherVariants.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-grape/25 bg-grape/10 p-3 text-xs text-snow">
              <span className="font-semibold text-grape">🔁 发现同款变体：</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-snow/90">
                当前：{meta?.label} · {meal.kcal} kcal
              </span>
              {otherVariants.map((variant) => {
                const vMeta = categoryMeta[variant.category]
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      setAdded(false)
                      onSelectMeal?.(variant)
                    }}
                    className="flex items-center gap-1 rounded-full border border-grape/40 bg-grape/20 px-2.5 py-1 font-semibold text-snow transition-all hover:scale-105 hover:bg-grape/30 active:scale-95"
                  >
                    <span>切为{vMeta?.label ?? variant.category}（{variant.kcal} kcal）</span>
                    <span>➔</span>
                  </button>
                )
              })}
            </div>
          )}
          {otherVariants.length === 0 && variants && variants > 1 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs font-bold leading-relaxed text-amber-900">
              <span aria-hidden="true" className="text-sm">🔁</span>
              <span>同款变体 {variants} 个：做法与热量略有不同，可在菜谱库中对比</span>
            </div>
          )}
          <p className="mt-2 text-sm leading-relaxed text-mist">{meal.desc}</p>

          {/* 食材清单与份量切换 */}
          <section className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-snow">
                <span className="text-gradient">🛒</span> 食材清单
              </h3>
              {/* 份量切换胶囊 */}
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-0.5 text-xs">
                {[1, 2, 3, 4].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setServings(s)}
                    className={`rounded-full px-2.5 py-1 font-semibold transition-all ${
                      servings === s
                        ? 'bg-grape text-white shadow-sm'
                        : 'text-mist hover:text-snow'
                    }`}
                  >
                    {s}人份
                  </button>
                ))}
              </div>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {meal.ingredients.map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-snow/90"
                >
                  {scaleIngredient(item, servings)}
                </li>
              ))}
            </ul>
          </section>
          {/* 做法步骤 */}
          <section className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-snow">
                <span className="text-gradient">👨‍🍳</span> 做法步骤
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCookingStep(0)
                  setCookingMode(true)
                }}
                className="flex items-center gap-1.5 rounded-full border border-grape/40 bg-grape/15 px-3 py-1 text-xs font-bold text-snow transition-all hover:bg-grape/25 active:scale-95"
              >
                <span>👨‍🍳 专注下厨模式</span>
                <span className="text-[10px] text-grape">防息屏</span>
              </button>
            </div>
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
                const grams = meal.nutrition[item.key] * servings
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
                <span className="font-semibold text-snow">{nutriTotalKcal * servings} kcal</span>
                {servings > 1 ? `（已按 ${servings} 人份换算）` : '，与每份总热量基本一致（含纤维等未计入部分）'}
              </p>
            </div>
          </section>
        </div>

        {/* ============ 专注下厨模式（全屏大字 / 防息屏 / 步骤计时器） ============ */}
        {cookingMode && (
          <div className="absolute inset-0 z-30 flex flex-col bg-ink-2 p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            {/* 顶栏：菜名 + 进度 + 归零重置 + 退出按钮 */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{meal.emoji}</span>
                  <h3 className="text-lg font-black text-snow">{meal.name} · 烹饪进行中</h3>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                    <span>💡 屏幕常亮中</span>
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-mist">
                  <span>步骤 {cookingStep + 1} / {meal.steps.length}</span>
                  <span>·</span>
                  <span>已打勾完成 <strong className="text-emerald-400">{completedSteps.size}</strong> 步</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCompletedSteps(new Set())
                    setCookingStep(0)
                  }}
                  title="重置所有打勾进度并回到第一步"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-tangerine hover:bg-tangerine/10"
                >
                  🔄 步骤归零
                </button>
                <button
                  type="button"
                  onClick={() => setCookingMode(false)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-mist hover:text-snow"
                >
                  ✕ 退出
                </button>
              </div>
            </div>

            {/* 进度条 */}
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-brand transition-all duration-300"
                style={{ width: `${((cookingStep + 1) / meal.steps.length) * 100}%` }}
              />
            </div>

            {/* 当前步骤大字卡片 */}
            <div className="my-auto flex flex-col items-center justify-center py-8 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-gradient-brand text-2xl font-black text-white shadow-xl shadow-grape/25">
                {cookingStep + 1}
              </span>
              <p className="mt-6 max-w-xl text-xl font-medium leading-relaxed text-snow sm:text-2xl">
                {meal.steps[cookingStep]}
              </p>
              {/* 步骤打勾快捷按钮 */}
              <div className="mt-6 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const isDone = completedSteps.has(cookingStep)
                    setCompletedSteps((prev) => {
                      const next = new Set(prev)
                      if (isDone) next.delete(cookingStep)
                      else next.add(cookingStep)
                      return next
                    })
                    if (!isDone && cookingStep < meal.steps.length - 1) {
                      setCookingStep((s) => s + 1)
                    }
                  }}
                  className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-base font-bold transition-all hover:scale-105 active:scale-95 ${
                    completedSteps.has(cookingStep)
                      ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shadow-lg shadow-emerald-500/20'
                      : 'border border-white/15 bg-white/10 text-snow hover:border-emerald-500/50 hover:bg-emerald-500/10'
                  }`}
                >
                  <span>{completedSteps.has(cookingStep) ? '✓ 本步骤已完成' : '○ 打勾完成并进行下一步'}</span>
                </button>
              </div>
              {timerSeconds !== null && (
                <div className="mt-8 flex flex-col items-center rounded-2xl border border-grape/30 bg-grape/10 p-4">
                  <div className="text-xs font-bold text-grape">⏱️ 智能步骤计时器</div>
                  <div className="my-2 font-mono text-4xl font-black text-tangerine">
                    {formatTimer(timerSeconds)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTimerRunning((r) => !r)}
                      className="rounded-full bg-gradient-brand px-5 py-1.5 text-xs font-bold text-white shadow-md shadow-grape/25"
                    >
                      {timerRunning ? '⏸ 暂停' : timerSeconds === 0 ? '🔄 重新计时' : '▶ 开始计时'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTimerRunning(false)
                        const currentText = meal.steps[cookingStep] ?? ''
                        setTimerSeconds(parseStepDuration(currentText))
                      }}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-mist hover:text-snow"
                    >
                      重置
                    </button>
                  </div>
                  {timerSeconds === 0 && (
                    <div className="mt-2 text-xs font-bold text-emerald-400 animate-bounce">
                      🔔 时间到！可进行下一步
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 底部导航步进按钮 */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setCookingStep((s) => Math.max(0, s - 1))}
                disabled={cookingStep === 0}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-snow transition-all hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
              >
                ← 上一步
              </button>
              <span className="text-xs text-mist">
                {cookingStep + 1} / {meal.steps.length}
              </span>
              {cookingStep < meal.steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCookingStep((s) => Math.min(meal.steps.length - 1, s + 1))}
                  className="rounded-full bg-gradient-brand px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-grape/25 transition-all hover:scale-105 active:scale-95"
                >
                  下一步 →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCookingMode(false)}
                  className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95"
                >
                  🎉 烹饪完成！
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
