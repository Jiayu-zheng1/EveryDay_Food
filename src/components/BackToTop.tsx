import { useEffect, useState } from 'react'

/**
 * 返回顶部按钮：滚动超过一屏后出现，点击平滑回顶
 * 纯展示组件，无数据依赖
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="返回顶部"
      className={`fixed bottom-6 right-6 z-40 grid size-11 place-items-center rounded-full border border-white/10 bg-ink-2/90 text-lg shadow-lg shadow-black/30 backdrop-blur transition-all duration-300 hover:border-grape/40 hover:shadow-grape/20 active:scale-90 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      ↑
    </button>
  )
}
