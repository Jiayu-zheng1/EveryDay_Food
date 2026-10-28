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
      className="group liquid-card relative flex w-full flex-col overflow-hidden text-left hover:shadow-xl hover:[--ty:-4px]"
    >
      {/* 拉伸链接：透明按钮覆盖全卡 */}
      <button
        type="button"
        onClick={() => onOpen(meal)}
        aria-label={`查看食谱：${meal.name}`}
        className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      />

      {/* 顶部高光微反光条 */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden">
        <span className="light-sweep block h-full w-1/3 bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
      </span>

      {/* emoji 渐变马卡龙色块 */}
      <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${meta.gradient}`}>
        <span className="relative text-6xl drop-shadow-sm transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
          {meal.emoji}
        </span>
        <span
          className={`absolute right-3 top-3 rounded-full border px-2.5 py-0.5 text-xs font-bold shadow-2xs ${meta.chip}`}
        >
          {meta.label}
        </span>
        {/* 加入餐桌按钮 */}
        {onAdd && (
          <button
            type="button"
            aria-label={added ? `已加入餐桌：${meal.name}` : `加入餐桌：${meal.name}`}
            onClick={() => onAdd(meal)}
            className={`absolute right-3 top-12 z-20 flex size-8 cursor-pointer items-center justify-center rounded-full text-base font-bold shadow-md transition-all duration-200 hover:scale-110 active:scale-90 focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 ${
              added ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {added ? '✓' : '+'}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-extrabold leading-snug text-slate-900 group-hover:text-blue-600 transition">
              {meal.name}
            </h2>
            <span className="shrink-0 rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-0.5 text-xs font-black text-slate-800 shadow-2xs font-display">
              {meal.kcal} kcal
            </span>
          </div>
          <p className="line-clamp-2 mt-1 text-xs leading-relaxed text-slate-500">{meal.desc}</p>
        </div>

        {/* 营养素紧凑小标 */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-bold text-slate-400 font-display">
          <span>P: <strong className="text-slate-600">{meal.nutrition.protein}g</strong></span>
          <span>C: <strong className="text-slate-600">{meal.nutrition.carbs}g</strong></span>
          <span>F: <strong className="text-slate-600">{meal.nutrition.fat}g</strong></span>
        </div>
      </div>
    </div>
  )
}
