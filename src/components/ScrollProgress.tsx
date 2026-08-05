import { useEffect, useState } from 'react'

/**
 * 顶部滚动进度条：细渐变条显示阅读进度
 * 纯展示组件，无数据依赖
 */
export default function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - doc.clientHeight
      setProgress(max > 0 ? (doc.scrollTop / max) * 100 : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-0.5 bg-white/5">
      <div
        className="h-full bg-gradient-brand transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
