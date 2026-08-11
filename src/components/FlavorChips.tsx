import type { FlavorFilter } from '../types'
import { FLAVORS } from '../lib/tags'

/** 口味筛选 chips 的 props */
interface FlavorChipsProps {
  active: FlavorFilter
  onChange: (flavor: FlavorFilter) => void
}

/** 口味筛选选项：全部 + FLAVORS 枚举（值即中文标签） */
const FLAVOR_CHIPS: FlavorFilter[] = ['all', ...FLAVORS]

/**
 * 口味筛选 chips：与分类 / 餐次 / 菜系 / 做法筛选组合过滤
 * 圆角胶囊样式与 MealTypeChips 一致（无数量角标），超出换行
 */
export default function FlavorChips({ active, onChange }: FlavorChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {FLAVOR_CHIPS.map((flavor) => {
        const isActive = active === flavor
        return (
          <button
            key={flavor}
            onClick={() => onChange(flavor)}
            aria-pressed={isActive}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-300 active:scale-95 ${
              isActive
                ? 'scale-105 bg-gradient-brand text-white shadow-md shadow-grape/20'
                : 'border border-white/10 bg-white/5 text-mist hover:scale-[1.03] hover:border-grape/40 hover:text-snow'
            }`}
          >
            {flavor === 'all' ? '全部' : flavor}
          </button>
        )
      })}
    </div>
  )
}
