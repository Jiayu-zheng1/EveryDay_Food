import { useEffect, useState } from 'react'
import type { ModuleKey } from '../types'

/** 顶部导航的 props */
interface HeaderProps {
  activeModule: ModuleKey
  tableCount: number
  onNavigate: (module: ModuleKey) => void
}

/**
 * 顶部导航：吸顶，滚动后叠加毛玻璃背景；含 logo 与 5 个模块 tab
 * 模块导航（今日搭配 / 健康目标 / 菜谱库 / 年夜饭 / 我的餐桌）由 App 统一管理：
 * 点击 tab 调用 onNavigate 切换 activeModule 并回到页面顶部，纯展示组件
 * 视觉参考 public/redesign/modular.html 的 .mod-tab：胶囊 tab + 激活态渐变高亮
 */

// 模块 tab 配置：key 与 App.activeModule 一一对应
const TABS: Array<{ key: ModuleKey; label: string }> = [
  { key: 'home', label: '🏠 今日搭配' },
  { key: 'goals', label: '🎯 健康目标' },
  { key: 'library', label: '📚 菜谱库' },
  { key: 'newyear', label: '🧧 年夜饭' },
  { key: 'table', label: '🛒 我的餐桌' },
]

export default function Header({ activeModule, tableCount, onNavigate }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)

  // 滚动监听：仅驱动吸顶毛玻璃样式（scroll spy 已随锚点导航一起移除）
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/5 bg-ink/70 py-3 shadow-lg shadow-black/20 backdrop-blur-xl'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5">
        {/* logo：点击回首页 */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault()
            onNavigate('home')
          }}
          className="flex shrink-0 items-center gap-2.5"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-grape via-berry to-tangerine text-xl shadow-lg shadow-berry/30">
            🍱
          </span>
          <span className="text-lg font-bold tracking-wide">每日食光</span>
        </a>

        {/* 5 个模块 tab：移动端横向滚动，激活态品牌渐变高亮，非激活态弱化 */}
        <nav
          role="tablist"
          aria-label="模块导航"
          className="flex items-center gap-1 overflow-x-auto"
        >
          {TABS.map((tab) => {
            const active = activeModule === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onNavigate(tab.key)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-all duration-300 sm:px-4 ${
                  active
                    ? 'bg-gradient-brand font-bold text-white shadow-lg shadow-grape/25'
                    : 'text-mist hover:bg-white/5 hover:text-snow'
                }`}
              >
                {tab.label}
                {/* 我的餐桌数量角标：餐桌非空时显示已选道数 */}
                {tab.key === 'table' && tableCount > 0 && (
                  <span className="ml-1 rounded-full bg-tangerine px-1.5 text-xs font-bold text-ink">
                    {tableCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
