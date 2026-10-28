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
    /* role=region：底部浮动栏不在 main/footer 等 landmark 内，给它一个可命名的
       content region，满足 axe region 规则（内容都应落在 landmark 中） */
    <div
      role="region"
      aria-label="我的餐桌"
      className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 pointer-events-none"
    >
      <div className="liquid-card !rounded-full w-full max-w-2xl px-5 py-3 pointer-events-auto flex items-center justify-between gap-3 shadow-2xl border border-white/95 backdrop-blur-2xl">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* 状态徽章 */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
            <p className="text-xs font-black text-slate-900 hidden sm:inline">我的餐桌</p>
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-black text-white font-display">
              {items.length} 道
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          {/* 中间已选菜品横向滑动 */}
          <div className="flex flex-1 gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((meal) => (
              <span
                key={meal.id}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100/90 px-2.5 py-1 text-xs font-bold text-slate-800"
              >
                <span>{meal.name}</span>
                <button
                  type="button"
                  aria-label={`移除 ${meal.name}`}
                  onClick={() => onRemove(meal.id)}
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 右侧：热量 + 去清单 */}
        <div className="flex shrink-0 items-center gap-2.5">
          <span
            title={`蛋白质 ${proteinTotal}g · 碳水 ${carbsTotal}g · 脂肪 ${fatTotal}g`}
            className="text-xs font-bold text-slate-600 whitespace-nowrap font-display hidden md:inline"
          >
            🔥 <strong className="font-black text-slate-900">{kcalTotal}</strong> kcal
            <span className="ml-1 text-[10px] font-semibold text-slate-400">
              (P:{proteinTotal}g C:{carbsTotal}g F:{fatTotal}g)
            </span>
          </span>

          <button
            type="button"
            onClick={onClear}
            title="清空餐桌"
            className="text-xs font-semibold text-slate-400 hover:text-rose-500 transition"
          >
            清空
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('table')}
              className="jelly-btn px-4 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              去清单 →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
