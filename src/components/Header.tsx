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

const GITHUB_URL = 'https://github.com/Jiayu-zheng1/EveryDay_Food'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

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

        {/* 右侧：模块导航（移动端横向滚动）+ GitHub Star 按钮（右上角） */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
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

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub：Jiayu-zheng1/EveryDay_Food —— 创作不易，如果对你有帮助，可以帮忙 star 一下，谢谢！"
            aria-label="GitHub 仓库 Jiayu-zheng1/EveryDay_Food，创作不易，如果对你有帮助，可以帮忙 star 一下，谢谢！"
            className="group flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-snow transition-all duration-300 hover:border-tangerine/50 hover:bg-tangerine/10 hover:text-tangerine hover:shadow-[0_8px_24px_-8px_rgba(245,165,36,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grape"
          >
            <GithubIcon className="size-4 transition-transform duration-300 group-hover:scale-110" />
            <span className="hidden sm:inline">Star</span>
          </a>
        </div>
      </div>
    </header>
  )
}
