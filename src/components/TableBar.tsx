import type { Meal, ModuleKey } from '../types'

/** 底部「我的餐桌」栏的 props */
interface TableBarProps {
  items: Meal[]
  kcalTotal: number
  proteinTotal: number
  carbsTotal: number
  fatTotal: number
  onRemove: (id: string) => void
  onClear: () => void
  /** 可选：传入时渲染「去我的餐桌」入口（向后兼容） */
  onNavigate?: (module: ModuleKey) => void
}

/**
 * 底部浮动「我的餐桌」栏：已选菜品 chips + 营养合计 + 清空按钮
 * 固定底部居中；items 为空时不渲染。
 * 为避免与右下角 BackToTop 按钮重叠，整体抬高到底部 20（bottom-20），
 * 并让内容条宽度收缩、靠左对齐（不占满），两者互不遮挡。
 */
export default function TableBar({
  items,
  kcalTotal,
  proteinTotal,
  carbsTotal,
  fatTotal,
  onRemove,
  onClear,
  onNavigate,
}: TableBarProps) {
  // 餐桌为空时不渲染
  if (items.length === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
      <div className="glass-card w-full max-w-xl rounded-2xl border-white/10 bg-ink-2/85 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {/* 左侧：标题 + 数量 */}
          <div className="shrink-0">
            <p className="text-sm font-bold text-snow">我的餐桌</p>
            <p className="text-xs text-mist">{items.length} 道</p>
          </div>

          {/* 中间：已选菜名 chips（横向滚动） */}
          <div className="flex flex-1 gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((meal) => (
              <span
                key={meal.id}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-xs text-snow"
              >
                {meal.name}
                <button
                  type="button"
                  aria-label={`移除 ${meal.name}`}
                  onClick={() => onRemove(meal.id)}
                  className="text-mist transition-colors hover:text-tangerine"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          {/* 右侧：合计 + 清空 */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            <p className="whitespace-nowrap text-xs text-mist">
              🔥 {kcalTotal} kcal · 蛋白 {proteinTotal}g · 碳水 {carbsTotal}g · 脂肪 {fatTotal}g
            </p>
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-tangerine transition-all hover:scale-105 hover:text-tangerine/80"
            >
              清空
            </button>
          </div>

          {/* 最右侧：「去我的餐桌」入口（App 传入 onNavigate 时才渲染，向后兼容） */}
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('table')}
              className="shrink-0 rounded-full bg-tangerine px-4 py-2 text-sm font-bold text-ink shadow-lg shadow-tangerine/25 transition-all hover:scale-105 hover:brightness-110 active:scale-95"
            >
              去我的餐桌 →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
