import { useState } from 'react'

/**
 * 页脚：版权信息 + star 支持引导 + 请作者喝咖啡赞助弹窗
 */
export default function Footer() {
  const [showSponsor, setShowSponsor] = useState(false)

  return (
    <footer className="border-t border-white/5 px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span>🍱</span> 每日食光
        </div>
        <p className="text-sm text-mist">减脂 · 增肌 · 维持 · 营养 —— 每一道菜的热量都替你算好了</p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-mist/90">
          <span>开源不易，整理 1090+ 道菜谱与热量倾注了大量心血。</span>
          <button
            type="button"
            onClick={() => setShowSponsor(true)}
            className="inline-flex items-center gap-1 rounded-full border border-tangerine/30 bg-tangerine/10 px-3 py-1 font-semibold text-tangerine transition-all hover:scale-105 hover:bg-tangerine/20"
          >
            ☕️ 请作者喝杯咖啡
          </button>
        </div>
        <p className="text-xs text-mist/80">© 2026 每日食光 · 内容仅供参考，具体饮食请结合自身情况</p>
      </div>

      {/* 赞助二维码弹窗 */}
      {showSponsor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowSponsor(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />
          <div className="glass-card relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-ink-2/95 p-6 text-center shadow-2xl animate-modal-in">
            <button
              onClick={() => setShowSponsor(false)}
              aria-label="关闭"
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-white/5 text-mist hover:bg-white/10 hover:text-snow"
            >
              ×
            </button>
            <div className="text-3xl">☕️</div>
            <h3 className="mt-2 text-lg font-black text-snow">支持作者 · 每日食光</h3>
            <p className="mt-2 text-xs leading-relaxed text-mist">
              每一道菜的做法整理、热量核算和无广告纯净体验都离不开长期的维护。如果本项目帮到了你，欢迎请作者喝杯咖啡支持一下！❤️
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2">
              <img
                src="/sponsor.jpg"
                alt="微信赞助二维码"
                className="mx-auto block max-h-72 w-auto rounded-xl object-contain"
              />
            </div>
            <p className="mt-3 text-[11px] text-mist/70">推荐使用微信扫一扫</p>
          </div>
        </div>
      )}
    </footer>
  )
}
