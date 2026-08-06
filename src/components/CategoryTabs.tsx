import type { Category, CategoryFilter, CategoryMeta } from '../types'

/** 分类筛选 tab 的 props */
interface CategoryTabsProps {
  active: CategoryFilter
  counts: Record<CategoryFilter, number>
  categoryMeta: Record<Category, CategoryMeta>
  onChange: (category: CategoryFilter) => void
}

/**
 * 分类筛选 tab：全部 + 四个分类
 * 纯展示组件：当前分类、各分类数量与切换回调均来自 props
 */
export default function CategoryTabs({ active, counts, categoryMeta, onChange }: CategoryTabsProps) {
  // tab 列表：全部 + 各分类（顺序来自 categoryMeta 的插入顺序）
  const tabs: Array<{ key: CategoryFilter; label: string }> = [
    { key: 'all', label: '全部' },
    ...Object.entries(categoryMeta).map(([key, meta]) => ({
      key: key as Category,
      label: meta.label,
    })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => {
        const isActive = active === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            aria-pressed={isActive}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 active:scale-95 ${
              isActive
                ? 'scale-105 bg-gradient-brand text-white shadow-lg shadow-grape/25'
                : 'border border-white/10 bg-white/5 text-mist hover:scale-[1.03] hover:border-grape/40 hover:text-snow'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs ${isActive ? 'text-white/70' : 'text-mist/85'}`}>
              {counts[tab.key]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
