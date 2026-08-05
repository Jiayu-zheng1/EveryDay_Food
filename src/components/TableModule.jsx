import { useMemo, useRef, useState } from 'react'
import Reveal from './Reveal'
import { buildShoppingList, formatAmount } from '../lib/shoppingList'
import { getCategoryMeta } from '../api/meals'

/**
 * 我的餐桌模块（全屏视图）
 * 汇总已选菜品：顶部汇总卡（道数 + 三大营养素合计）+ 双视图切换：
 *   - 「菜品」：已选菜列表（emoji + 菜名 + 分类标签 + kcal + 删除）
 *   - 「购物清单」：由 buildShoppingList(items) 实时推导的分组食材清单
 * 纯展示组件：数据与回调全部来自 props，不直接 import 数据文件。
 *
 * props: { items, kcalTotal, proteinTotal, carbsTotal, fatTotal, onRemove, onClear, onNavigate?, onOpen? }
 */

/** 分类展示元信息（标签 / 徽章配色），与菜谱库/年夜饭卡片共用同一份配置 */
const CATEGORY_META = getCategoryMeta()

/** 视图切换标签 */
const VIEW_TABS = [
  { key: 'dishes', label: '🍽️ 菜品' },
  { key: 'shopping', label: '📋 购物清单' },
]

/**
 * 把购物清单拼成可复制的纯文本
 * 数量行：「五花肉 500 克」；调味品行只列名称
 */
function buildCopyText(list, dishCount) {
  const lines = [`🛒 每日食光 · 购物清单（${dishCount} 道菜）`]
  for (const group of list.groups) {
    lines.push(`—— ${group} ——`)
    for (const row of list.rows) {
      if (row.group !== group) continue
      lines.push(row.amount != null ? `${row.name} ${formatAmount(row.amount)} ${row.unit}` : row.name)
    }
  }
  return lines.join('\n')
}

export default function TableModule({
  items,
  kcalTotal,
  proteinTotal,
  carbsTotal,
  fatTotal,
  onRemove,
  onClear,
  onNavigate,
  onOpen,
}) {
  // 当前视图：'dishes' 菜品清单 | 'shopping' 购物清单
  const [view, setView] = useState('dishes')
  // 轻量 toast（复制/生成/清空反馈），2.2s 自动消失
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  // 购物清单由菜品食材实时推导（纯函数，无副作用；items 变化自动重算）
  const list = useMemo(() => buildShoppingList(items), [items])

  const showToast = (msg) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  // 清空餐桌：回到菜品视图并提示
  const handleClear = () => {
    onClear?.()
    setView('dishes')
    showToast('餐桌已清空 🧹')
  }

  // 复制购物清单：优先 Clipboard API，失败降级为隐藏 textarea 选中复制
  const handleCopy = async () => {
    const text = buildCopyText(list, items.length)
    try {
      await navigator.clipboard.writeText(text)
      showToast('已复制到剪贴板')
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.top = '0'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      ta.setSelectionRange(0, text.length)
      try {
        document.execCommand('copy')
        showToast('已复制到剪贴板')
      } catch {
        showToast('复制失败，请手动复制')
      }
      document.body.removeChild(ta)
    }
  }

  // 空态：两视图共用（items 为空时没有可展示的菜品/食材）
  if (items.length === 0) {
    return (
      <section id="table" className="scroll-mt-24 px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="text-2xl font-black sm:text-3xl">🛒 我的餐桌</h2>
            <p className="mt-2 text-sm text-mist">一家人这顿吃什么，都在这儿</p>
          </Reveal>
          <Reveal delay={60}>
            <div className="glass-card mt-12 rounded-3xl py-16 text-center">
              <p className="text-5xl">🍽️</p>
              <p className="mt-4 text-mist">餐桌上还空着，去菜谱库或年夜饭加点菜吧</p>
              <button
                type="button"
                onClick={() => (onNavigate ? onNavigate('library') : (window.location.hash = '#library'))}
                className="mt-6 rounded-full bg-gradient-brand px-8 py-3 font-bold text-white transition-all hover:scale-105 active:scale-95"
              >
                去菜谱库
              </button>
            </div>
          </Reveal>
        </div>
      </section>
    )
  }

  return (
    <section id="table" className="scroll-mt-24 px-5 py-16">
      <div className="mx-auto max-w-6xl">
        {/* 标题区 */}
        <Reveal>
          <h2 className="text-2xl font-black sm:text-3xl">🛒 我的餐桌</h2>
          <p className="mt-2 text-sm text-mist">一家人这顿吃什么，都在这儿</p>
        </Reveal>

        {/* 顶部汇总卡：道数 + 热量 + 三大营养素 + 双视图切换胶囊 */}
        <Reveal delay={60}>
          <div className="glass-card mt-12 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm leading-relaxed text-snow">
                <span className="text-2xl font-black text-tangerine">{items.length}</span> 道 · 🔥{' '}
                <span className="font-bold">{kcalTotal}</span> kcal · 蛋白{' '}
                <span className="font-bold text-grape">{proteinTotal}</span>g · 碳水{' '}
                <span className="font-bold">{carbsTotal}</span>g · 脂肪{' '}
                <span className="font-bold text-tangerine">{fatTotal}</span>g
              </p>
              <div className="flex items-center gap-2">
                {VIEW_TABS.map((tab) => {
                  const isActive = view === tab.key
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setView(tab.key)}
                      aria-pressed={isActive}
                      className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 active:scale-95 ${
                        isActive
                          ? 'scale-105 bg-gradient-brand text-white shadow-lg shadow-grape/25'
                          : 'border border-white/10 bg-white/5 text-mist hover:scale-[1.03] hover:border-grape/40 hover:text-snow'
                      }`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </Reveal>

        {/* ============ 视图 1：菜品清单 ============ */}
        {view === 'dishes' ? (
          <div className="mt-8 space-y-3">
            {items.map((meal) => {
              const meta = CATEGORY_META[meal.category]
              return (
                <div
                  key={meal.id}
                  className={`glass-card flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 ${
                    onOpen
                      ? 'cursor-pointer hover:-translate-y-0.5 hover:border-grape/40 hover:shadow-[0_10px_28px_-12px_rgba(139,124,246,0.3)]'
                      : 'transition-colors hover:border-white/15'
                  }`}
                >
                  {/* 行主体（emoji + 菜名 + 分类 + kcal）：点击打开做法详情；
                      结构上与「✕ 删除」分离，互不触发 */}
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
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grape"
                  >
                    <span className="shrink-0 text-2xl">{meal.emoji}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-snow">{meal.name}</span>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
                        meta?.chip ?? 'border-white/15 bg-white/10 text-mist'
                      }`}
                    >
                      {meta?.label ?? meal.category}
                    </span>
                    <span className="shrink-0 text-sm text-mist">{meal.kcal} kcal</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`移除 ${meal.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(meal.id)
                    }}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-mist transition-colors hover:bg-white/10 hover:text-tangerine"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          /* ============ 视图 2：购物清单 ============ */
          <div className="mt-8">
            {/* 工具行：生成 / 复制 / 清空 + 合并统计 */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setView('shopping')
                  showToast('购物清单已生成 📋')
                }}
                className="rounded-full bg-gradient-brand px-5 py-2 text-sm font-bold text-white shadow-lg shadow-grape/25 transition-all hover:scale-105 active:scale-95"
              >
                📋 生成购物清单
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-snow transition-all hover:scale-[1.03] hover:border-grape/40"
              >
                复制清单
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-tangerine transition-all hover:scale-[1.03] hover:border-tangerine/40"
              >
                清空餐桌
              </button>
              <span className="text-sm text-mist">
                按食材合并去重 · 共 <span className="font-bold text-tangerine">{list.rows.length}</span> 项
              </span>
            </div>

            {/* 分组列表：每组小标题 + 食材行 */}
            {list.groups.map((group) => (
              <div key={group} className="mb-8">
                <h3 className="mb-3 text-sm font-bold tracking-wide text-mist">
                  {group === '调味品' ? '🧂 调味品' : '🥬 食材'}
                </h3>
                <div className="space-y-2">
                  {list.rows
                    .filter((row) => row.group === group)
                    .map((row) => (
                      <div
                        key={`${row.group}-${row.name}-${row.unit ?? 'n'}`}
                        className="glass-card flex items-center justify-between gap-3 rounded-xl px-4 py-2.5"
                      >
                        <span className="min-w-0 flex-1 truncate font-medium text-snow">{row.name}</span>
                        {row.amount != null ? (
                          <span className="shrink-0 text-sm text-mist">
                            × {formatAmount(row.amount)} {row.unit}
                          </span>
                        ) : null}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 轻量 toast：复制/生成/清空反馈，不拦截点击 */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
          <div className="glass-card rounded-full px-5 py-2.5 text-sm font-semibold text-snow shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </section>
  )
}
