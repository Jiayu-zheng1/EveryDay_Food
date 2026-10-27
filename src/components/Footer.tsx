import { useState } from 'react'
import SponsorModal from './SponsorModal'

/**
 * 页脚：版权信息 + star 支持引导 + 请作者喝杯奶茶赞助弹窗
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
            🧋 请作者喝杯奶茶
          </button>
        </div>
        <p className="text-xs text-mist/80">© 2026 每日食光 · 内容仅供参考，具体饮食请结合自身情况</p>
      </div>

      {/* 赞助二维码弹窗：微信 / 支付宝双通道 */}
      <SponsorModal open={showSponsor} onClose={() => setShowSponsor(false)} />
    </footer>
  )
}
