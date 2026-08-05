import { useRef } from 'react'

/**
 * 3D 倾斜 hook：跟随鼠标让元素产生轻微立体倾斜
 *
 * 返回 { tiltRef, tiltHandlers }
 * - mousemove 时把 --rx（绕 X 轴，约 ±6deg）、--ry（绕 Y 轴，约 ±8deg）、
 *   --ty（上浮 -6px）写入元素 style
 * - mouseleave 时清空这三个变量，靠元素的 transition 平滑回正
 *
 * 使用方需在目标元素上加（可放组件内 className 或 inline style）：
 *   transform: perspective(700px) rotateX(var(--rx,0)) rotateY(var(--ry,0)) translateY(var(--ty,0));
 *   transition: transform 0.25s ease, ...;
 */
export default function useTilt() {
  const tiltRef = useRef(null)

  const tiltHandlers = {
    // 鼠标在元素内移动：按相对位置计算倾角并写入 CSS 变量
    onMouseMove(e) {
      const el = tiltRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      // 归一化到 [-0.5, 0.5]：正值表示鼠标在元素右/下方
      const nx = (e.clientX - rect.left) / rect.width - 0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5
      // 绕 X 轴倾角与纵向位置成反比（鼠标在下 → 卡片上缘后仰），范围约 ±6deg
      el.style.setProperty('--rx', `${(-ny * 12).toFixed(2)}deg`)
      // 绕 Y 轴倾角与横向位置成正比（鼠标在右 → 卡片右缘后仰），范围约 ±8deg
      el.style.setProperty('--ry', `${(nx * 16).toFixed(2)}deg`)
      // 轻微上浮，与 hover 上浮共用同一个变量
      el.style.setProperty('--ty', '-6px')
    },
    // 移出：清空变量，transition 让卡片平滑回正
    onMouseLeave() {
      const el = tiltRef.current
      if (!el) return
      el.style.removeProperty('--rx')
      el.style.removeProperty('--ry')
      el.style.removeProperty('--ty')
    },
  }

  return { tiltRef, tiltHandlers }
}
