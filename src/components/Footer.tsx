/**
 * 页脚：版权信息 + star 支持引导（GitHub 链接已置于右上角 Header）
 * 纯展示组件
 */
export default function Footer() {
  return (
    <footer className="border-t border-white/5 px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span>🍱</span> 每日食光
        </div>
        <p className="text-sm text-mist">减脂 · 增肌 · 维持 · 营养 —— 每一道菜的热量都替你算好了</p>
        <p className="text-xs text-mist/90">
          创作不易，如果对你有帮助，可以帮忙 <span className="font-semibold text-tangerine">star</span> 一下，谢谢！⭐
        </p>
        <p className="text-xs text-mist/80">© 2026 每日食光 · 内容仅供参考，具体饮食请结合自身情况</p>
      </div>
    </footer>
  )
}
