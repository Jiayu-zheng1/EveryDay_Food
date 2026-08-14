/**
 * 页脚：版权信息 + GitHub 支持引导
 * 纯展示组件
 */
const GITHUB_URL = "https://github.com/Jiayu-zheng1/EveryDay_Food"

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="border-t border-white/5 px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span>🍱</span> 每日食光
        </div>
        <p className="text-sm text-mist">减脂 · 增肌 · 维持 · 营养 —— 每一道菜的热量都替你算好了</p>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-snow transition-all duration-300 hover:border-tangerine/50 hover:bg-tangerine/10 hover:text-tangerine hover:shadow-[0_8px_24px_-8px_rgba(245,165,36,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grape"
        >
          <GithubIcon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
          <span>
            GitHub：<span className="font-medium text-gradient">Jiayu-zheng1/EveryDay_Food</span>
          </span>
        </a>
        <p className="text-xs text-mist/90">
          创作不易，如果对你有帮助，可以帮忙 <span className="font-semibold text-tangerine">star</span> 一下，谢谢！⭐
        </p>
        <p className="text-xs text-mist/80">© 2026 每日食光 · 内容仅供参考，具体饮食请结合自身情况</p>
      </div>
    </footer>
  )
}
