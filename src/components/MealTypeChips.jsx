// 餐次筛选选项：全部 + 三餐
const MEAL_TYPE_CHIPS = [
  { key: 'all', label: '全部' },
  { key: 'breakfast', label: '🌅 早餐' },
  { key: 'lunch', label: '☀️ 午餐' },
  { key: 'dinner', label: '🌙 晚餐' },
]

/**
 * 餐次筛选 chips：与分类 tab 组合过滤（两者都满足才显示）
 * 纯展示组件：当前筛选与回调来自 props
 */
export default function MealTypeChips({ active, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {MEAL_TYPE_CHIPS.map((chip) => {
        const isActive = active === chip.key
        return (
          <button
            key={chip.key}
            onClick={() => onChange(chip.key)}
            aria-pressed={isActive}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-300 active:scale-95 ${
              isActive
                ? 'scale-105 bg-gradient-brand text-white shadow-md shadow-grape/20'
                : 'border border-white/10 bg-white/5 text-mist hover:scale-[1.03] hover:border-grape/40 hover:text-snow'
            }`}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}
