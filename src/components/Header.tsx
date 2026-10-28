import { useEffect, useState } from 'react'
import type { ModuleKey } from '../types'

interface HeaderProps {
  activeModule: ModuleKey
  tableCount: number
  onNavigate: (module: ModuleKey) => void
  onOpenSponsor?: () => void
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
  { key: 'newyear', label: '🏮 家宴聚餐' },
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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function Header({ activeModule, tableCount, onNavigate, onOpenSponsor }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false))

  // 滚动与网络状态监听
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    const onOffline = () => setIsOffline(true)
    const onOnline = () => setIsOffline(false)
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
    }
  }, [])
  return (
    <header className={`fixed inset-x-0 top-3 z-40 px-3 sm:px-6 transition-all duration-300 ${scrolled ? 'shadow-xs' : ''}`}>
      <div className={`mx-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-full border border-white/90 bg-white/80 px-3 py-2 shadow-lg shadow-slate-200/50 backdrop-blur-2xl transition-all sm:px-5 ${scrolled ? 'bg-white/95 shadow-md shadow-slate-200/70' : ''}`}>
        {/* logo：点击回首页 */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault()
            onNavigate('home')
          }}
          className="flex shrink-0 items-center gap-2"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-amber-500 text-lg shadow-sm">
            🍱
          </span>
          <span className="font-extrabold tracking-tight text-slate-900">每日食光</span>
          <span className="hidden sm:inline-block rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-500/20 whitespace-nowrap">
            1093 道热量全算好
          </span>
        </a>

        {/* 模块导航 */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <nav
            role="tablist"
            aria-label="模块导航"
            className="flex items-center gap-1 overflow-x-auto rounded-full bg-slate-100/70 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-all duration-200 sm:px-4 ${
                    active
                      ? 'bg-slate-900 font-extrabold text-white shadow-xs'
                      : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {tab.label}
                  {/* 我的餐桌数量角标 */}
                  {tab.key === 'table' && tableCount > 0 && (
                    <span className="ml-1 rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] font-black text-slate-950">
                      {tableCount}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {onOpenSponsor && (
            <button
              type="button"
              onClick={onOpenSponsor}
              className="hidden md:inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:shadow-md transition active:scale-95"
            >
              <span>🧋</span>
              <span>请喝奶茶</span>
            </button>
          )}

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub：Jiayu-zheng1/EveryDay_Food —— 创作不易，如果对你有帮助，可以帮忙 star 一下，谢谢！"
            aria-label="GitHub 仓库 Jiayu-zheng1/EveryDay_Food，创作不易，如果对你有帮助，可以帮忙 star 一下，谢谢！"
            className="group flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition-all hover:border-amber-400 hover:text-amber-600 active:scale-95"
          >
            <GithubIcon className="size-3.5 transition-transform duration-300 group-hover:scale-110" />
            <span className="hidden sm:inline">Star</span>
          </a>

          {installPrompt && (
            <button
              type="button"
              onClick={async () => {
                await installPrompt.prompt()
                const choice = await installPrompt.userChoice
                if (choice.outcome === 'accepted') setInstallPrompt(null)
              }}
              className="flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 transition-all hover:scale-105"
            >
              <span>📲</span>
              <span className="hidden sm:inline">桌面版</span>
            </button>
          )}
        </div>
      </div>
      {isOffline && (
        <div className="border-t border-amber-500/20 bg-amber-500/20 px-4 py-1.5 text-center text-xs font-medium text-amber-300 backdrop-blur-md">
          📡 当前处于离线状态，已为您加载离线缓存食谱
        </div>
      )}
    </header>
  )
}
