import type { CuisineFilter } from '../types'

/** 地区菜系筛选 chips 的 props */
interface CuisineChipsProps {
  active: CuisineFilter
  counts: Record<CuisineFilter, number>
  onChange: (cuisine: CuisineFilter) => void
}

/** 菜系元信息 */
interface CuisineMeta {
  label: string
  emoji: string
}

// 地区菜系元信息：key -> 展示文案 + emoji（App 会 import 此常量计算各菜系数量）
export const CUISINE_META: Record<CuisineFilter, CuisineMeta> = {
  all: { label: '全部', emoji: '🌐' },
  chuan: { label: '川菜', emoji: '🌶️' },
  xiang: { label: '湘菜', emoji: '🔥' },
  yue: { label: '粤菜', emoji: '🦐' },
  e: { label: '鄂菜', emoji: '🪷' },
  lu: { label: '鲁菜', emoji: '🥘' },
  suzhe: { label: '苏浙', emoji: '🍃' },
  bei: { label: '北方', emoji: '🥟' },
  hui: { label: '徽菜', emoji: '🏮' },
  min: { label: '闽菜', emoji: '🦪' },
  dongbei: { label: '东北', emoji: '🧊' },
  dian: { label: '滇菜', emoji: '🍄' },
  shan: { label: '陕菜', emoji: '🥙' },
  xinjiang: { label: '新疆', emoji: '🍢' },
  generic: { label: '家常', emoji: '🍳' },
}

/**
 * 地区菜系筛选 chips：圆角胶囊 + 数量小字，横向可滚动
 * 样式与 MealTypeChips 一致：激活态渐变底，非激活态玻璃描边
 */
export default function CuisineChips({ active, counts, onChange }: CuisineChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {(Object.entries(CUISINE_META) as Array<[CuisineFilter, CuisineMeta]>).map(([key, meta]) => {
        const isActive = active === key
        const count = counts?.[key] ?? 0
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            aria-pressed={isActive}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-all duration-300 active:scale-95 ${
              isActive
                ? 'bg-gradient-brand text-white shadow-lg shadow-grape/25'
                : 'border border-white/10 bg-white/5 text-mist hover:scale-[1.03] hover:border-grape/40 hover:text-snow'
            }`}
          >
            <span>
              {meta.emoji} {meta.label}
            </span>
            <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-mist/90'}`}>{count}</span>
          </button>
        )
      })}
    </div>
  )
}
