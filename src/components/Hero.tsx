import { useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import type { ModuleKey } from '../types'

/** Hero 区的 props */
interface HeroProps {
  mealCount: number
  onNavigate: (module: ModuleKey) => void
}

// 快捷入口卡配置：key 传给 onNavigate 切换全局模块（今日搭配回首页）
const QUICK_LINKS: Array<{ key: ModuleKey; emoji: string; title: string; desc: string }> = [
  { key: 'library', emoji: '📚', title: '逛菜谱库', desc: '分类 / 餐次 / 地区多维筛选' },
  { key: 'newyear', emoji: '🧧', title: '配一桌年夜饭', desc: '凉菜硬菜热菜汤品，一键配齐' },
  { key: 'table', emoji: '🛒', title: '我的餐桌', desc: '已选菜汇总营养，生成购物清单' },
  { key: 'home', emoji: '🍽️', title: '今日搭配', desc: '今日三餐搭配，每道菜 kcal 一目了然' },
]

/**
 * Hero 区（精简版）：标题 + 副标题 + CTA 按钮 + 数据标签 + 快捷入口卡 + 跑马灯
 * CTA 按钮带「光晕跟随」效果（鼠标位置驱动亮点）
 * 快捷入口卡通过 onNavigate(moduleKey) 切换全局模块（App 提供，可选）
 * 纯展示组件：食谱数量来自 props，保证对数据数量无耦合
 */
export default function Hero({ mealCount, onNavigate }: HeroProps) {
  const primaryRef = useRef<HTMLAnchorElement | null>(null)
  const titleRef = useRef<HTMLHeadingElement | null>(null) // h1 标题，内含 kinetic 词块
  const spotRefs = useRef<Array<HTMLDivElement | null>>([]) // 视差光斑（外层包裹 div，动画在子元素上）

  // 鼠标在按钮上移动时更新 --gx/--gy，驱动光晕跟随
  const handlePrimaryMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = primaryRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--gx', `${e.clientX - rect.left}px`)
    el.style.setProperty('--gy', `${e.clientY - rect.top}px`)
  }

  // 滚动视差：kinetic 标题词块交错位移 + 光斑按不同速率上移；共用同一个 scroll 监听
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return // 同一帧内只处理一次，避免滚动高频触发
      raf = requestAnimationFrame(() => {
        raf = 0
        const y = window.scrollY
        // 标题词块：滚动越多错位越大，量小克制并封顶，避免挡住下方 CTA
        const words = titleRef.current
          ? Array.from(titleRef.current.querySelectorAll<HTMLElement>('.kinetic-word'))
          : []
        words.forEach((word, i) => {
          const tx = Math.min(y * (0.015 + i * 0.01), 16 + i * 6)
          const ty = Math.min(y * (0.04 + i * 0.018), 56 + i * 12)
          word.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
        })
        // 光斑视差：不同系数反向位移（光斑动画在子元素上，外层只做整体平移）
        const spots = spotRefs.current
        if (spots[0]) spots[0].style.transform = `translate3d(0, ${y * -0.08}px, 0)`
        if (spots[1]) spots[1].style.transform = `translate3d(0, ${y * -0.05}px, 0)`
        if (spots[2]) spots[2].style.transform = `translate3d(0, ${y * -0.03}px, 0)`
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="relative overflow-hidden px-5 pb-12 pt-28">
      {/* 背景光晕：网格纹理 + 噪点 + 三个渐变圆（漂浮 / 呼吸） */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* 细网格纹理，向边缘淡出 */}
        <div className="bg-grid absolute inset-0" />
        {/* 噪点颗粒 */}
        <div className="bg-noise absolute inset-0" />
        {/* 流动渐变光晕：外层 div 承接滚动视差，内层跑漂浮/呼吸动画 */}
        <div
          ref={(el) => { spotRefs.current[0] = el }}
          className="absolute -left-32 -top-24 will-change-transform"
        >
          <div className="size-[28rem] animate-float rounded-full bg-grape/30 blur-[110px]" />
        </div>
        <div
          ref={(el) => { spotRefs.current[1] = el }}
          className="absolute -right-24 top-10 will-change-transform"
        >
          <div className="size-[24rem] animate-float-delayed rounded-full bg-berry/25 blur-[100px]" />
        </div>
        <div
          ref={(el) => { spotRefs.current[2] = el }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 will-change-transform"
        >
          <div className="size-[26rem] animate-pulse-soft rounded-full bg-tangerine/20 blur-[120px]" />
        </div>
        <div className="absolute left-1/4 top-1/2 size-40 animate-pulse-soft rounded-full bg-grape/20 blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-grape/30 bg-grape/10 px-4 py-1.5 text-sm text-grape">
          🥗 减脂 · 💪 增肌 · ⚖️ 维持 · 🥦 营养
        </span>

        {/* kinetic 标题：词块交错位移由滚动监听写入 inline transform（字号降一档，压缩高度） */}
        <h1 ref={titleRef} className="mt-5 text-3xl font-black leading-tight sm:text-5xl">
          <span className="block">
            <span className="kinetic-word">今天</span>
            <span className="kinetic-word">吃什么，</span>
          </span>
          <span className="block">
            <span className="kinetic-word text-gradient title-glow">替你</span>
            <span className="kinetic-word text-gradient title-glow">算好了</span>
            <span className="kinetic-word text-gradient title-glow">卡路里</span>
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-mist sm:text-base">
          八大分类 {mealCount} 道健康食谱，每份热量与三大营养素清清楚楚。
          不用再纠结热量计算，照着做就好。
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          {/* 主 CTA：光晕跟随鼠标 */}
          <a
            ref={primaryRef}
            href="#calculator"
            onMouseMove={handlePrimaryMove}
            className="glow-follow rounded-full bg-gradient-brand px-7 py-3 font-semibold text-white shadow-xl shadow-berry/25 transition-transform duration-300 hover:scale-105 active:scale-95"
          >
            计算我的热量
          </a>
          {/* 次 CTA：切到菜谱库模块（原 #meals 锚点已随模块化改造移除） */}
          <button
            type="button"
            onClick={() => onNavigate?.('library')}
            className="rounded-full border border-white/10 bg-white/5 px-7 py-3 font-semibold text-snow backdrop-blur transition-colors hover:border-grape/40 hover:bg-white/10"
          >
            浏览全部食谱
          </button>
        </div>

        {/* 数据小标签（数量动态，不写死）：药丸样式精简展示 */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-mist">
            <strong className="text-base font-black text-snow">{mealCount}</strong> 道食谱
          </span>
          <span className="size-1 rounded-full bg-white/20" />
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-mist">
            <strong className="text-base font-black text-snow">8</strong> 大分类
          </span>
          <span className="size-1 rounded-full bg-white/20" />
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-mist">
            <strong className="text-base font-black text-snow">0</strong> 热量焦虑
          </span>
        </div>
      </div>

      {/* 快捷入口卡：一行四卡（移动端两列），点击切换全局模块 */}
      <div className="relative mx-auto mt-10 max-w-5xl">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.key}
              type="button"
              onClick={() => onNavigate?.(link.key)}
              className="glass-card group flex flex-col items-start rounded-2xl p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-grape/40 hover:shadow-[0_12px_36px_-12px_rgba(139,124,246,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grape"
            >
              <span className="text-3xl transition-transform duration-300 group-hover:scale-110">
                {link.emoji}
              </span>
              <span className="mt-2 font-bold text-snow">{link.title}</span>
              <span className="mt-1 text-xs leading-relaxed text-mist">{link.desc}</span>
              <span
                aria-hidden="true"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-grape transition-transform duration-300 group-hover:translate-x-1"
              >
                去看看 <span className="text-sm leading-none">→</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 跑马灯标语条：两段相同内容实现无缝循环（track 整体平移 -50%），字号随精简 Hero 收小；
          纯装饰（内容与上方副标题重复），整条 aria-hidden 不进无障碍树，避免低对比文本告警 */}
      <div
        aria-hidden="true"
        className="marquee -mx-5 mt-12 border-y border-white/5 py-3"
      >
        <div className="marquee-track">
          {[0, 1].map((dup) => (
            <div key={dup} aria-hidden={dup === 1} className="flex items-center">
              <span className="mx-6 text-xl font-black text-white/8 sm:text-2xl">今晚吃什么</span>
              <span aria-hidden="true" className="mx-6 text-lg font-black text-tangerine/20">✦</span>
              <span className="mx-6 text-xl font-black text-white/8 sm:text-2xl">
                {mealCount} 道家常菜
              </span>
              <span aria-hidden="true" className="mx-6 text-lg font-black text-tangerine/20">✦</span>
              <span className="mx-6 text-xl font-black text-white/8 sm:text-2xl">一荤一素一汤</span>
              <span aria-hidden="true" className="mx-6 text-lg font-black text-tangerine/20">✦</span>
              <span className="mx-6 text-xl font-black text-white/8 sm:text-2xl">
                每道菜热量清清楚楚
              </span>
              <span aria-hidden="true" className="mx-6 text-lg font-black text-tangerine/20">✦</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
