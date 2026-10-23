import { useEffect, useMemo, useRef, useState } from 'react'
import Reveal from './Reveal'
import { buildMarkdownShoppingList, buildShoppingList, formatAmount } from '../lib/shoppingList'
import type { ShoppingList } from '../lib/shoppingList'
import { getCategoryMeta } from '../api/meals'
import type { Category, CategoryMeta, Meal, ModuleKey } from '../types'

/** 我的餐桌模块的 props */
interface TableModuleProps {
  items: Meal[]
  kcalTotal: number
  proteinTotal: number
  carbsTotal: number
  fatTotal: number
  onRemove: (id: string) => void
  onClear: () => void
  onNavigate?: (module: ModuleKey) => void
  /** 可选：点击菜品行打开做法详情弹窗（不传则行不可点击，保持原行为） */
  onOpen?: (meal: Meal) => void
}

/**
 * 我的餐桌模块（全屏视图）
 * 汇总已选菜品：顶部汇总卡（道数 + 三大营养素合计）+ 双视图切换：
 *   - 「菜品」：已选菜列表（emoji + 菜名 + 分类标签 + kcal + 删除）
 *   - 「购物清单」：由 buildShoppingList(items) 实时推导的分组食材清单
 * 纯展示组件：数据与回调全部来自 props，不直接 import 数据文件。
 */

/** 分类展示元信息（标签 / 徽章配色），与菜谱库/年夜饭卡片共用同一份配置 */
const CATEGORY_META: Record<Category, CategoryMeta> = getCategoryMeta()

/** 视图切换标签 */
const VIEW_TABS: Array<{ key: 'dishes' | 'shopping'; label: string }> = [
  { key: 'dishes', label: '🍽️ 菜品' },
  { key: 'shopping', label: '📋 购物清单' },
]

const STORAGE_CHECKED_KEY = 'moments-food-shopping-checked-v1'

function loadCheckedKeys(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_CHECKED_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed) : new Set()
  } catch {
    return new Set()
  }
}

/**
 * 把购物清单拼成可复制的纯文本（按货架分类输出）
 */
function buildCopyText(list: ShoppingList, dishCount: number): string {
  const lines = [`🛒 每日食光 · 购物清单（${dishCount} 道菜）`]
  const sections = list.aisles && list.aisles.length > 0 ? list.aisles : list.groups
  for (const section of sections) {
    const sectionRows = list.rows.filter((row) => (row.aisle ?? row.group) === section)
    if (sectionRows.length === 0) continue
    lines.push(`\n—— ${section} ——`)
    for (const row of sectionRows) {
      lines.push(
        row.amount != null ? `${row.name} ${formatAmount(row.amount)} ${row.unit}` : row.name
      )
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
}: TableModuleProps) {
  // 当前视图：'dishes' 菜品清单 | 'shopping' 购物清单
  const [view, setView] = useState<'dishes' | 'shopping'>('dishes')
  // 购物清单分类筛选：全部 | 🛒 生鲜主料 | 🧂 调味辅料
  const [listFilter, setListFilter] = useState<'all' | 'ingredients' | 'seasonings'>('all')
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(loadCheckedKeys)
  // 轻量 toast（复制/生成/清空反馈），2.2s 自动消失
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  // 购物清单由菜品食材实时推导（纯函数，无副作用；items 变化自动重算）
  const list = useMemo(() => buildShoppingList(items), [items])

  // 统计生鲜主料与调味品数量
  const ingredientsCount = useMemo(
    () => list.rows.filter((r) => r.group === '食材').length,
    [list.rows]
  )
  const seasoningsCount = useMemo(
    () => list.rows.filter((r) => r.group === '调味品').length,
    [list.rows]
  )

  // 勾选状态持久化到 localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_CHECKED_KEY,
        JSON.stringify(Array.from(checkedKeys))
      )
    } catch {
      // 静默处理
    }
  }, [checkedKeys])

  const toggleCheck = (key: string) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleResetChecked = () => {
    setCheckedKeys(new Set())
    showToast('已重置勾选状态')
  }

  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current ?? undefined)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  // 清空餐桌：回到菜品视图并清理勾选记录
  const handleClear = () => {
    onClear?.()
    setCheckedKeys(new Set())
    try {
      window.localStorage.removeItem(STORAGE_CHECKED_KEY)
    } catch {
      // 忽略
    }
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

  // 复制 Markdown 待办清单
  const handleCopyMarkdown = async () => {
    const md = buildMarkdownShoppingList(list, items.length)
    try {
      await navigator.clipboard.writeText(md)
      showToast('已复制 Markdown 待办清单')
    } catch {
      showToast('复制失败，请重试')
    }
  }

  // 导出/下载 .md 文件
  const handleDownloadMarkdown = () => {
    const md = buildMarkdownShoppingList(list, items.length)
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStr = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `每日食光-购物清单-${dateStr}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('已下载 Markdown 文件 📄')
  }

  // 空态：两视图共用（items 为空时没有可展示的菜品/食材）
  if (items.length === 0) {
    return (
      <section id="table" className="scroll-mt-24 px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h1 className="text-2xl font-black sm:text-3xl">🛒 我的餐桌</h1>
            <p className="mt-2 text-sm text-mist">一家人这顿吃什么，都在这儿</p>
          </Reveal>
          <Reveal delay={60}>
            <div className="glass-card mt-12 rounded-3xl py-16 text-center">
              <p className="text-5xl">🍽️</p>
              <p className="mt-4 text-mist">餐桌上还空着，去菜谱库或家宴聚餐加点菜吧</p>
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
          <h1 className="text-2xl font-black sm:text-3xl">🛒 我的餐桌</h1>
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
            {/* 工具行：生成 / 复制 / 清空 / 重置勾选 + 进度统计 */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-full bg-gradient-brand px-4 py-2 text-sm font-bold text-white shadow-lg shadow-grape/25 transition-all hover:scale-105 active:scale-95"
                >
                  复制纯文本
                </button>
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="rounded-full border border-grape/30 bg-grape/15 px-4 py-2 text-sm font-semibold text-snow transition-all hover:scale-[1.03] hover:bg-grape/25"
                >
                  复制 Markdown
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-mist transition-all hover:scale-[1.03] hover:text-snow"
                >
                  导出 .md
                </button>
                {checkedKeys.size > 0 && (
                  <button
                    type="button"
                    onClick={handleResetChecked}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-mist transition-all hover:scale-[1.03] hover:text-snow"
                  >
                    重置打卡
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-tangerine transition-all hover:scale-[1.03] hover:border-tangerine/40"
                >
                  清空餐桌
                </button>
              </div>
              <div className="flex items-center gap-3 text-sm text-mist">
                <span>
                  已购 <strong className="text-grape">{checkedKeys.size}</strong> / {list.rows.length} 项
                </span>
                <span className="text-white/20">|</span>
                <span>按货架自动分类</span>
              </div>
            </div>

            {/* 分类快捷标签：全部 / 生鲜食材 / 调料辅料 */}
            <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-white/5 pb-4">
              <span className="text-xs font-medium text-mist">分类查看：</span>
              <button
                type="button"
                onClick={() => setListFilter('all')}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
                  listFilter === 'all'
                    ? 'bg-gradient-brand text-white shadow-sm'
                    : 'border border-white/10 bg-white/5 text-mist hover:text-snow'
                }`}
              >
                全部 ({list.rows.length})
              </button>
              <button
                type="button"
                onClick={() => setListFilter('ingredients')}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
                  listFilter === 'ingredients'
                    ? 'bg-gradient-brand text-white shadow-sm'
                    : 'border border-white/10 bg-white/5 text-mist hover:text-snow'
                }`}
              >
                🛒 生鲜食材 ({ingredientsCount})
              </button>
              <button
                type="button"
                onClick={() => setListFilter('seasonings')}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
                  listFilter === 'seasonings'
                    ? 'bg-gradient-brand text-white shadow-sm'
                    : 'border border-white/10 bg-white/5 text-mist hover:text-snow'
                }`}
              >
                🧂 调料辅料 ({seasoningsCount})
              </button>
            </div>

            {/* 货架分区列表：每组小标题 + 带勾选打卡的食材行 */}
            {(list.aisles && list.aisles.length > 0 ? list.aisles : list.groups)
              .filter((section) => {
                if (listFilter === 'ingredients') return section !== '🧂 调味香料'
                if (listFilter === 'seasonings') return section === '🧂 调味香料'
                return true
              })
              .map((section) => {
              const sectionRows = list.rows.filter((row) => (row.aisle ?? row.group) === section)
              if (sectionRows.length === 0) return null
              return (
                <div key={section} className="mb-8">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold tracking-wide text-snow/90">
                      {section}
                    </h3>
                    <span className="text-xs text-mist">{sectionRows.length} 项</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {sectionRows.map((row) => {
                      const itemKey = `${row.name}-${row.unit ?? 'n'}`
                      const isChecked = checkedKeys.has(itemKey)
                      return (
                        <div
                          key={itemKey}
                          onClick={() => toggleCheck(itemKey)}
                          className={`glass-card flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                            isChecked
                              ? 'border-white/5 bg-white/[0.02] opacity-50'
                              : 'hover:border-grape/40 hover:bg-white/8 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <span
                              className={`grid size-5 shrink-0 place-items-center rounded-md border text-xs font-bold transition-colors ${
                                isChecked
                                  ? 'border-grape bg-grape text-white'
                                  : 'border-white/25 bg-ink-2 text-transparent hover:border-grape'
                              }`}
                            >
                              ✓
                            </span>
                            <span
                              className={`min-w-0 truncate font-medium transition-colors ${
                                isChecked ? 'text-mist line-through' : 'text-snow'
                              }`}
                            >
                              {row.name}
                            </span>
                          </div>
                          {row.amount != null ? (
                            <span
                              className={`shrink-0 text-sm ${
                                isChecked ? 'text-mist/50' : 'text-mist'
                              }`}
                            >
                              × {formatAmount(row.amount)} {row.unit}
                            </span>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
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
