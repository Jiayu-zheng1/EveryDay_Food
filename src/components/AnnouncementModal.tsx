import { useEffect, useRef, useState } from 'react'

const GITHUB_URL = 'https://github.com/Jiayu-zheng1/EveryDay_Food'
/** 公告弹窗会话标记：同一浏览器会话只弹出一次（刷新 / 切换模块不重复打扰） */
const SESSION_KEY = 'meiri-announcement-shown'

/**
 * 首次进入公告弹窗：进入网页时弹出站点公告
 * 行为：遮罩点击 / ESC / 「我知道了」关闭；本会话仅展示一次；带开/关动画与焦点圈闭
 */
export default function AnnouncementModal() {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  // 首次进入（本会话未展示过）时弹出，并记录标记
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return
    setVisible(true)
    sessionStorage.setItem(SESSION_KEY, '1')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 弹出期间锁定背景滚动、弹窗接管键盘焦点，支持 ESC 与 Tab 焦点圈闭
  useEffect(() => {
    if (!visible) return
    document.body.style.overflow = 'hidden'
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
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
      previouslyFocused?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  // 先播退出动画（260ms），再真正卸载
  const close = () => {
    setClosing(true)
    setTimeout(() => {
      setVisible(false)
      setClosing(false)
    }, 260)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩：点击关闭 */}
      <div
        onClick={close}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          closing ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* 公告主体 */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="站点公告"
        tabIndex={-1}
        className={`glass-card relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-ink-2/80 shadow-2xl shadow-black/60 transition-all duration-300 focus:outline-none ${
          closing
            ? 'scale-95 translate-y-4 opacity-0'
            : 'scale-100 translate-y-0 opacity-100 animate-modal-in'
        }`}
      >
        {/* 顶部渐变横幅 */}
        <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-grape via-berry to-tangerine">
          <span aria-hidden="true" className="absolute inset-0 bg-ink/30" />
          <span aria-hidden="true" className="relative text-5xl drop-shadow-xl">📢</span>
          <button
            onClick={close}
            aria-label="关闭公告"
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/30 text-lg text-snow/80 transition-colors hover:bg-grape/30 hover:text-snow"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 p-6">
          <h2 className="text-xl font-black">欢迎来到每日食光 🍱</h2>
          <div className="space-y-2 text-sm leading-relaxed text-mist">
            <p>
              本站收录 <span className="font-semibold text-snow">1077 道</span>
              家常菜与健康食谱，减脂 / 增肌 / 维持 / 营养四大分类，每道菜的热量、营养与做法都替你算好了。
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>🎯 健康目标：一键生成智能三餐搭配</li>
              <li>🧧 年夜饭生成器：随机配出一桌年夜饭</li>
              <li>🛒 家庭餐桌：多菜汇总 + 一键购物清单</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-tangerine/25 bg-tangerine/10 px-4 py-3 text-xs leading-relaxed text-tangerine">
            创作不易，如果对你有帮助，可以帮忙 <span className="font-bold">star</span> 一下，谢谢！⭐
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-sm font-bold text-white shadow-lg shadow-grape/25 transition-all hover:scale-[1.03] hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grape"
            >
              ⭐ 去 GitHub 点个 Star
            </a>
            <button
              onClick={close}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-snow transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grape"
            >
              我知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
