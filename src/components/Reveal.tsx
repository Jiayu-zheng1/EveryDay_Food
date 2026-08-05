import { useEffect, useRef, useState } from 'react'
import type { ElementType, ReactNode } from 'react'

/** 滚动渐入容器的 props */
interface RevealProps {
  children: ReactNode
  delay?: number
  className?: string
  /** 渲染的标签（默认 div），如 NewYearDinner 传入 'div' 保持默认 */
  as?: ElementType
}

/**
 * 滚动渐入容器：元素进入视口后淡入上浮（IntersectionObserver 触发一次）
 * 纯展示组件，delay 用于卡片错峰入场
 */
export default function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal ${visible ? 'reveal-visible' : ''} ${className}`}
    >
      {children}
    </Tag>
  )
}
