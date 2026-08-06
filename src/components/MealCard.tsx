import useTilt from '../hooks/useTilt'
import type { Category, CategoryMeta, Meal } from '../types'

/** 食物卡片的 props */
interface MealCardProps {
  meal: Meal
  categoryMeta: Record<Category, CategoryMeta>
  onOpen: (meal: Meal) => void
  /** 不传则不渲染「加入餐桌」按钮 */
  onAdd?: (meal: Meal) => void
  added?: boolean
}

// 分类渐变的暗化映射：把 /50 /40 /30 透明度整体降一档，让色块与玻璃深底融合
const DIM_OPACITY: Record<string, string> = { '/50': '/40', '/40': '/30', '/30': '/20' }

/**
 * 食物卡片：emoji 渐变底 + 名称 / 分类标签 / 每份大卡 / 一句话简介
 * 玻璃拟态卡片 + 鼠标 3D 倾斜，hover 上浮发光，点击打开详情弹窗
 * 纯展示组件：食物数据与分类元信息来自 props
 */
export default function MealCard({
  meal,
  categoryMeta,
  onOpen,
  onAdd,
  added = false,
}: MealCardProps) {
  const meta = categoryMeta[meal.category]
  const { tiltRef, tiltHandlers } = useTilt<HTMLDivElement>()
  // 降低分类渐变饱和度（透明度降一档），下方再叠玻璃蒙层压暗
  const dimGradient = meta.gradient.replace(/\/(50|40|30)\b/g, (m) => DIM_OPACITY[m])

  return (
    /* 外层用 div 承载 3D 倾斜与 hover 效果；打开详情的按钮是覆盖全卡的拉伸链接
       （absolute inset-0，与「加入餐桌」按钮互为兄弟节点），
       避免 button 内嵌 button / role=button 的嵌套交互违规（axe nested-interactive） */
    <div
      ref={tiltRef}
      {...tiltHandlers}
      style={{
        // 3D 倾斜：--rx/--ry/--ty 由 useTilt 写入；hover 上浮复用 --ty（替代原 translate-y）
        transform:
          'perspective(700px) rotateX(var(--rx,0)) rotateY(var(--ry,0)) translateY(var(--ty,0))',
        transition: 'transform 0.25s ease, border-color 0.3s ease, box-shadow 0.3s ease',
      }}
      className="group glass-card relative flex w-full flex-col overflow-hidden rounded-2xl text-left hover:border-grape/40 hover:shadow-[0_16px_48px_-12px_rgba(139,124,246,0.35)] hover:[--ty:-6px]"
    >
      {/* 拉伸链接：透明按钮覆盖全卡，点击打开详情弹窗（键盘可聚焦，z-10） */}
      <button
        type="button"
        onClick={() => onOpen(meal)}
        aria-label={`查看食谱：${meal.name}`}
        className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-grape"
      />

      {/* 顶部渐变光条：hover 时从左到右扫过 */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden">
        <span className="light-sweep block h-full w-1/3 bg-gradient-to-r from-transparent via-grape to-transparent" />
      </span>

      {/* emoji 渐变色块（代替真实图片，规避版权）：降饱和 + 玻璃蒙层压暗 */}
      <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${dimGradient}`}>
        {/* 玻璃蒙层：压暗渐变，使色块与玻璃深底自然融合 */}
        <span aria-hidden="true" className="absolute inset-0 bg-ink/30" />
        <span className="relative text-6xl drop-shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
          {meal.emoji}
        </span>
        <span
          className={`absolute right-3 top-3 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.chip}`}
        >
          {meta.label}
        </span>
        {/* 加入餐桌按钮：位于拉伸链接之上（z-20），点击只加餐桌不打开详情；
            桌面端 hover 时才浮现（[@media(hover:hover)] 下隐藏），
            触摸设备（hover:none）常显，保证移动端可用；无 onAdd 时不渲染 */}
        {onAdd && (
          <button
            type="button"
            aria-label={added ? `已加入餐桌：${meal.name}` : `加入餐桌：${meal.name}`}
            onClick={() => onAdd(meal)}
            className={`absolute right-3 top-14 z-20 flex size-8 cursor-pointer items-center justify-center rounded-full text-base font-bold opacity-100 shadow-lg transition-all duration-200 hover:scale-110 focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 ${
              added ? 'bg-grape text-white shadow-grape/40' : 'bg-tangerine text-ink shadow-tangerine/40'
            }`}
          >
            {added ? '✓' : '+'}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          {/* 菜谱库页标题为 h1，卡片标题用 h2，避免 h1→h3 跳级（axe heading-order） */}
          <h2 className="text-lg font-bold leading-snug">{meal.name}</h2>
          <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-tangerine">
            {meal.kcal} kcal
          </span>
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-mist">{meal.desc}</p>
      </div>
    </div>
  )
}
