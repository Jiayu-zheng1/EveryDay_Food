import { useEffect, useRef, useState } from 'react'

/** 赞助收款方式：微信 / 支付宝 */
type PayChannel = 'wechat' | 'alipay'

/** 各收款方式的二维码素材与文案（扫描提示已印在二维码图片上，不重复渲染） */
const CHANNEL_KEYS: PayChannel[] = ['wechat', 'alipay']

const CHANNELS: Record<PayChannel, { label: string; icon: string; src: string; alt: string }> = {
  wechat: {
    label: '微信支付',
    icon: '💚',
    src: '/sponsor.jpg',
    alt: '微信赞助二维码',
  },
  alipay: {
    label: '支付宝',
    icon: '💙',
    src: '/sponsor-alipay.jpg',
    alt: '支付宝赞助二维码',
  },
}

interface SponsorModalProps {
  /** 是否展示（父组件控制显隐） */
  open: boolean
  onClose: () => void
}

/**
 * 赞助弹窗：微信 / 支付宝双通道二维码
 * 页脚与首次进入的公告弹窗共用，保证收款入口只有一处实现
 */
export default function SponsorModal({ open, onClose }: SponsorModalProps) {
  const [channel, setChannel] = useState<PayChannel>('wechat')
  const dialogRef = useRef<HTMLDivElement | null>(null)
  // 父组件传入的 onClose 每次渲染都是新函数，用 ref 固定，避免副作用反复重建
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // 弹窗期间锁定背景滚动，支持 ESC 关闭，并把焦点收进弹窗
  useEffect(() => {
    if (!open) return
    // 记录进入前的值：公告弹窗可能已锁定滚动，关闭后需还原而非一律放开
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      // 焦点圈闭在弹窗内（下层公告的陷阱此时已让位）
      if (e.key === 'Tab') {
        const dialog = dialogRef.current
        if (!dialog) return
        const focusables = dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
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
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      previouslyFocused?.focus()
    }
  }, [open])

  if (!open) return null

  const current = CHANNELS[channel]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* 遮罩：点击关闭 */}
      <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="支持作者"
        tabIndex={-1}
        className="glass-card relative z-10 max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-white/10 bg-ink-2/95 p-5 sm:p-6 text-center shadow-2xl focus:outline-none animate-modal-in"
      >
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-white/5 text-mist transition-colors hover:bg-white/10 hover:text-snow"
        >
          ×
        </button>

        <div className="text-3xl">🧋</div>
        <h3 className="mt-2 text-lg font-black text-snow">请作者喝杯奶茶</h3>
        <p className="mt-2 text-xs leading-relaxed text-mist">
          每一道菜的做法整理、热量核算和无广告纯净体验都离不开长期的维护。如果本项目帮到了你，欢迎请作者喝杯奶茶支持一下！❤️
        </p>

        {/* 收款方式切换：左右方向键在两者间切换 */}
        <div
          role="tablist"
          aria-label="选择支付方式"
          className="mt-4 flex gap-2 rounded-full bg-white/5 p-1"
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            e.preventDefault()
            const next = CHANNEL_KEYS[(CHANNEL_KEYS.indexOf(channel) + (e.key === 'ArrowRight' ? 1 : -1) + 2) % 2]
            setChannel(next)
            document.getElementById(`sponsor-tab-${next}`)?.focus()
          }}
        >
          {CHANNEL_KEYS.map((key) => (
            <button
              key={key}
              role="tab"
              id={`sponsor-tab-${key}`}
              aria-selected={channel === key}
              aria-controls="sponsor-qr-panel"
              tabIndex={channel === key ? 0 : -1}
              onClick={() => setChannel(key)}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                channel === key
                  ? 'bg-gradient-brand text-white shadow-lg shadow-grape/25'
                  : 'text-mist hover:text-snow'
              }`}
            >
              {CHANNELS[key].icon} {CHANNELS[key].label}
            </button>
          ))}
        </div>

        <div
          id="sponsor-qr-panel"
          role="tabpanel"
          aria-labelledby={`sponsor-tab-${channel}`}
          className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2"
        >
          <img
            src={current.src}
            alt={current.alt}
            className="mx-auto block max-h-[min(48dvh,420px)] w-auto rounded-xl object-contain"
          />
        </div>
      </div>
    </div>
  )
}
