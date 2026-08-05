import useTilt from '../hooks/useTilt'

// 分类渐变的暗化映射：把 /50 /40 /30 透明度整体降一档，让色块与玻璃深底融合
const DIM_OPACITY = { '/50': '/40', '/40': '/30', '/30': '/20' }

/**
 * 食物卡片：emoji 渐变底 + 名称 / 分类标签 / 每份大卡 / 一句话简介
 * 玻璃拟态卡片 + 鼠标 3D 倾斜，hover 上浮发光，点击打开详情弹窗
 * 纯展示组件：食物数据与分类元信息来自 props
 */
export default function MealCard({ meal, categoryMeta, onOpen, onAdd, added = false }) {
  const meta = categoryMeta[meal.category]
  const { tiltRef, tiltHandlers } = useTilt()
  // 降低分类渐变饱和度（透明度降一档），下方再叠玻璃蒙层压暗
  const dimGradient = meta.gradient.replace(/\/(50|40|30)\b/g, (m) => DIM_OPACITY[m])

  return (
    <button
      ref={tiltRef}
      {...tiltHandlers}
      onClick={() => onOpen(meal)}
      style={{
        // 3D 倾斜：--rx/--ry/--ty 由 useTilt 写入；hover 上浮复用 --ty（替代原 translate-y）
        transform:
          'perspective(700px) rotateX(var(--rx,0)) rotateY(var(--ry,0)) translateY(var(--ty,0))',
        transition: 'transform 0.25s ease, border-color 0.3s ease, box-shadow 0.3s ease',
      }}
      className="group glass-card relative flex w-full flex-col overflow-hidden rounded-2xl text-left hover:border-grape/40 hover:shadow-[0_16px_48px_-12px_rgba(139,124,246,0.35)] hover:[--ty:-6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grape"
    >
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
        {/* 加入餐桌按钮：hover 时出现在分类 chip 下方，不遮挡 chip；
            点击 stopPropagation，只加入餐桌、不打开详情弹窗；无 onAdd 时不渲染 */}
        {onAdd && (
          <span
            role="button"
            tabIndex={0}
            aria-label={added ? `已加入餐桌：${meal.name}` : `加入餐桌：${meal.name}`}
            onClick={(e) => {
              e.stopPropagation()
              onAdd(meal)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
                onAdd(meal)
              }
            }}
            className={`absolute right-3 top-14 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full text-base font-bold opacity-0 shadow-lg transition-all duration-200 hover:scale-110 focus-visible:opacity-100 group-hover:opacity-100 ${
              added ? 'bg-grape text-white shadow-grape/40' : 'bg-tangerine text-ink shadow-tangerine/40'
            }`}
          >
            {added ? '✓' : '+'}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold leading-snug">{meal.name}</h3>
          <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-tangerine">
            {meal.kcal} kcal
          </span>
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-mist">{meal.desc}</p>
      </div>
    </button>
  )
}
