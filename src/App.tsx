import { useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import CalorieCalculator from './components/CalorieCalculator'
import DailyPlan from './components/DailyPlan'
import CategoryTabs from './components/CategoryTabs'
import MealTypeChips from './components/MealTypeChips'
import CuisineChips, { CUISINE_META } from './components/CuisineChips'
import MealCard from './components/MealCard'
import MealModal from './components/MealModal'
import Footer from './components/Footer'
import Reveal from './components/Reveal'
import ScrollProgress from './components/ScrollProgress'
import BackToTop from './components/BackToTop'
import TableBar from './components/TableBar'
import NewYearDinner from './components/NewYearDinner'
import TableModule from './components/TableModule'
import useMeals from './hooks/useMeals'
import useDailyPlan from './hooks/useDailyPlan'
import useNutrition from './hooks/useNutrition'
import useFamilyTable from './hooks/useFamilyTable'
import { getCategoryMeta } from './api/meals'
import { GOAL_CATEGORY, GOAL_LABELS } from './lib/nutrition'
import type {
  Category,
  CategoryFilter,
  CategoryMeta,
  Cuisine,
  CuisineFilter,
  Meal,
  MealTypeFilter,
  ModuleKey,
  PlanSlot,
  SortKey,
} from './types'

/**
 * 页面容器：负责数据获取与状态管理，展示组件一律通过 props 接收数据
 * 数据全部来自 src/api/meals.js（v1 返回本地数据，将来可直接换真实接口）
 * 热量计算 / BMI / 智能搭配来自 src/lib/nutrition.js（纯算法，可换服务端实现）
 */
export default function App() {
  const { meals, loading } = useMeals()
  const nutrition = useNutrition()
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [mealTypeFilter, setMealTypeFilter] = useState<MealTypeFilter>('all') // 菜谱库餐次筛选
  const [cuisineFilter, setCuisineFilter] = useState<CuisineFilter>('all') // 菜谱库地区筛选（年夜饭生成也按此优先）
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const table = useFamilyTable() // 家庭餐桌：加入 / 移除 / 清空 + 营养汇总
  // 已加入餐桌的菜 id 集合（MealCard 的 added 状态用）
  const tableItemIds = useMemo(() => new Set(table.items.map((m) => m.id)), [table.items])
  // 菜谱库浏览增强：关键词搜索 / 排序 / 分批渲染
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('default')
  const [visibleCount, setVisibleCount] = useState(24) // 首屏渲染数量，滚动到底步进 +24
  const sentinelRef = useRef<HTMLDivElement | null>(null) // 网格末尾哨兵：进入视口时加载更多
  const cursorLightRef = useRef<HTMLDivElement | null>(null) // 全屏鼠标跟随光源层
  // 模块化视图：home 首页 / library 菜谱库 / newyear 年夜饭 / table 我的餐桌
  const [activeModule, setActiveModule] = useState<ModuleKey>('home')

  // 全局鼠标跟随光源：把鼠标坐标写入 --mx/--my（相对 viewport 的 px），驱动 .cursor-light
  useEffect(() => {
    const el = cursorLightRef.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      el.style.setProperty('--mx', `${e.clientX}px`)
      el.style.setProperty('--my', `${e.clientY}px`)
    }
    document.addEventListener('mousemove', onMove, { passive: true })
    return () => document.removeEventListener('mousemove', onMove)
  }, [])

  // 已提交目标后：随机搭配也按目标分类过滤（如减脂 → 只出减脂餐）；未提交则全库
  const goalCategory = nutrition.submitted
    ? GOAL_CATEGORY[nutrition.form.goal]
    : undefined
  const goalLabel = nutrition.submitted ? GOAL_LABELS[nutrition.form.goal] : null

  const { plan, loading: planLoading, refresh: refreshPlan } = useDailyPlan(goalCategory)

  // 分类展示元信息（来自 API 模块，不直接 import 数据文件）
  const categoryMeta: Record<Category, CategoryMeta> = getCategoryMeta()

  // 今日搭配：优先展示智能搭配（smartPlan），否则回退随机搭配
  const effectivePlan: PlanSlot[] = nutrition.smartPlan ?? plan
  const planMode = nutrition.smartPlan ? 'smart' : 'random'
  // 全天合计热量：遍历每餐的每道菜求和（结构统一为 { slot, meals: [] }）
  const totalKcal = useMemo(
    () =>
      effectivePlan.reduce(
        (sum, item) => sum + item.meals.reduce((s, m) => s + m.kcal, 0),
        0
      ),
    [effectivePlan]
  )

  // 菜谱库：分类 tab 与餐次 chips 组合过滤 → 关键词搜索 → 排序（默认保持原序）
  const visibleMeals = useMemo(() => {
    const q = search.trim()
    const filtered = meals.filter((meal) => {
      const categoryOk = activeCategory === 'all' || meal.category === activeCategory
      const typeOk =
        mealTypeFilter === 'all' || (meal.mealType ?? []).includes(mealTypeFilter)
      const cuisineOk =
        !cuisineFilter || cuisineFilter === 'all' || meal.cuisine === cuisineFilter
      if (!categoryOk || !typeOk || !cuisineOk) return false
      // 中文直接 includes 匹配菜名或简介
      if (!q) return true
      return (meal.name ?? '').includes(q) || (meal.desc ?? '').includes(q)
    })
    if (sortKey === 'default') return filtered
    const sorted = [...filtered] // 复制后再排序，避免原地修改数据源
    if (sortKey === 'kcal-asc') sorted.sort((a, b) => a.kcal - b.kcal)
    else if (sortKey === 'kcal-desc') sorted.sort((a, b) => b.kcal - a.kcal)
    else if (sortKey === 'protein-desc')
      sorted.sort((a, b) => (b.nutrition?.protein ?? 0) - (a.nutrition?.protein ?? 0))
    return sorted
  }, [meals, activeCategory, mealTypeFilter, cuisineFilter, search, sortKey])

  // 分批渲染：哨兵进入视口时追加 24 道；数据到底后停止观察
  // 依赖包含筛选/搜索/排序：网格 key 变化会整体重建（哨兵换成新元素），
  // 若只依赖 visibleCount/length，旧 observer 会一直盯着已脱离 DOM 的旧哨兵
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    if (visibleCount >= visibleMeals.length) return // 已全部渲染，无需再观察
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((c) => c + 24)
      },
      { rootMargin: '300px' } // 提前 300px 触发，滚动体验更顺滑
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visibleCount, visibleMeals.length, activeCategory, mealTypeFilter, cuisineFilter, search, sortKey])

  // 筛选 / 搜索 / 排序变化时，从第一页重新分批渲染
  useEffect(() => {
    setVisibleCount(24)
  }, [activeCategory, mealTypeFilter, cuisineFilter, search, sortKey])

  // 各分类的食物数量（tab 角标用）
  const counts = useMemo(() => {
    const result = { all: meals.length } as Record<CategoryFilter, number>
    for (const key of Object.keys(categoryMeta)) {
      result[key as Category] = meals.filter((meal) => meal.category === key).length
    }
    return result
  }, [meals, categoryMeta])

  // 各菜系的食物数量（地区筛选 chips 角标用）
  const cuisineCounts = useMemo(() => {
    const result = { all: meals.length } as Record<CuisineFilter, number>
    for (const key of Object.keys(CUISINE_META)) {
      if (key !== 'all') result[key as Cuisine] = meals.filter((m) => m.cuisine === key).length
    }
    return result
  }, [meals])

  // 模块导航：切换视图并回到页面顶部（'instant' 立即回顶，不触发平滑滚动动画）
  const navigate = (module: ModuleKey) => {
    setActiveModule(module)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  return (
    <div id="top" className="min-h-screen bg-ink font-sans text-snow">
      <ScrollProgress />
      {/* 全屏鼠标跟随光源：纯视觉层（pointer-events:none），不拦截任何交互 */}
      <div ref={cursorLightRef} className="cursor-light" aria-hidden="true" />
      <Header
        activeModule={activeModule}
        tableCount={table.items.length}
        onNavigate={navigate}
      />

      <main>
        {/* 首页模块：Hero（精简）+ 热量计算器 + 今日三餐搭配 */}
        {activeModule === 'home' && (
          <>
            <Hero mealCount={meals.length} onNavigate={navigate} />

            {/* 热量计算器（BMI + 每日目标 + 生成智能搭配） */}
            <CalorieCalculator
              meals={meals}
              form={nutrition.form}
              update={nutrition.update}
              results={nutrition.results}
              submitted={nutrition.submitted}
              mealSplit={nutrition.mealSplit}
              bmi={nutrition.bmi}
              suggestedGoal={nutrition.suggestedGoal}
              onSubmit={nutrition.submit}
              onGenerate={() => nutrition.generatePlan(meals)}
              hasSmartPlan={nutrition.smartPlan !== null}
            />

            <DailyPlan
              plan={effectivePlan}
              loading={planLoading}
              mode={planMode}
              totalKcal={totalKcal}
              categoryMeta={categoryMeta}
              goalLabel={goalLabel}
              onShuffle={refreshPlan}
              onRegenerate={() => nutrition.generatePlan(meals)}
              onOpen={setSelectedMeal}
            />
          </>
        )}

        {/* 菜谱库模块：分类 tab + 餐次 chips + 卡片网格（筛选/搜索/排序/分批渲染逻辑全部保留） */}
        {activeModule === 'library' && (
        <section id="library" className="scroll-mt-24 px-5 py-16">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black sm:text-3xl">菜谱库</h2>
                  <p className="mt-2 text-sm text-mist">独立浏览全部做法，不限于搭配推荐</p>
                </div>
                {/* 过滤后的总道数（实时更新） */}
                <span className="shrink-0 pb-0.5 text-sm text-mist">
                  共 <strong className="font-bold text-snow">{visibleMeals.length}</strong> 道
                </span>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="mt-6">
                {/* 搜索 + 排序：400 道里快速定位 */}
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="glass-card flex flex-1 items-center gap-2 px-4 py-2.5 sm:max-w-sm">
                    <span aria-hidden="true" className="text-sm text-mist">🔍</span>
                    <input
                      name="meal-search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="搜索菜名或简介…"
                      className="w-full bg-transparent text-sm text-snow placeholder:text-mist/60 focus:outline-none"
                    />
                  </label>
                  <select
                    name="meal-sort"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    aria-label="排序方式"
                    className="shrink-0 rounded-full border border-white/10 bg-ink-2 px-4 py-2.5 text-sm text-snow focus:outline-none"
                  >
                    <option value="default">默认排序</option>
                    <option value="kcal-asc">热量从低到高</option>
                    <option value="kcal-desc">热量从高到低</option>
                    <option value="protein-desc">蛋白质从高到低</option>
                  </select>
                </div>
                <CategoryTabs
                  active={activeCategory}
                  counts={counts}
                  categoryMeta={categoryMeta}
                  onChange={setActiveCategory}
                />
                {/* 地区筛选：与分类 / 餐次 tab 组合过滤；年夜饭生成也按此优先 */}
                <div className="mt-3">
                  <CuisineChips active={cuisineFilter} counts={cuisineCounts} onChange={setCuisineFilter} />
                </div>
                {/* 餐次筛选：与分类 tab 组合过滤 */}
                <div className="mt-3">
                  <MealTypeChips active={mealTypeFilter} onChange={setMealTypeFilter} />
                </div>
              </div>
            </Reveal>

            {/* 卡片网格：手机单列 / 平板两列 / 桌面三列；key 随筛选+排序变化，切换时重播错峰渐入 */}
            {loading ? (
              <div
                key={`${activeCategory}-${mealTypeFilter}-${sortKey}`}
                className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-2xl border border-white/5 bg-ink-2"
                  />
                ))}
              </div>
            ) : visibleMeals.length === 0 ? (
              /* 空态：搜索 / 筛选无匹配结果 */
              <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-white/5 bg-ink-2 px-6 py-16 text-center">
                <span aria-hidden="true" className="text-4xl">🍽️</span>
                <p className="text-mist">没有找到匹配的食谱</p>
                <button
                  onClick={() => {
                    setSearch('')
                    setActiveCategory('all')
                    setMealTypeFilter('all')
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-snow transition-colors hover:bg-white/10"
                >
                  清空搜索
                </button>
              </div>
            ) : (
              <div
                key={`${activeCategory}-${mealTypeFilter}-${cuisineFilter}-${sortKey}`}
                className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {visibleMeals.slice(0, visibleCount).map((meal, i) => (
                  <Reveal key={meal.id} delay={(i % 6) * 60}>
                    <MealCard
                      meal={meal}
                      categoryMeta={categoryMeta}
                      onOpen={setSelectedMeal}
                      onAdd={table.add}
                      added={tableItemIds.has(meal.id)}
                    />
                  </Reveal>
                ))}
                {/* 分批加载哨兵：进入视口时追加 24 道 */}
                <div ref={sentinelRef} aria-hidden="true" />
              </div>
            )}
          </div>
        </section>
        )}

        {/* 年夜饭模块：按地区优先配一桌，一键加入家庭餐桌 */}
        {activeModule === 'newyear' && (
          <NewYearDinner
            meals={meals}
            cuisineFilter={cuisineFilter}
            onAddAll={(dishes) => dishes.forEach(table.add)}
            onOpen={setSelectedMeal}
          />
        )}

        {/* 我的餐桌模块：完整列表（并行 worker 实现） */}
        {activeModule === 'table' && (
          <TableModule
            items={table.items}
            kcalTotal={table.kcalTotal}
            proteinTotal={table.proteinTotal}
            carbsTotal={table.carbsTotal}
            fatTotal={table.fatTotal}
            onRemove={table.remove}
            onClear={table.clear}
            onNavigate={navigate}
            onOpen={setSelectedMeal}
          />
        )}
      </main>

      {/* 家庭餐桌：底部汇总条，可移除 / 清空（table 模块内已有完整列表，避免重复显示） */}
      {activeModule !== 'table' && (
        <TableBar
          items={table.items}
          kcalTotal={table.kcalTotal}
          proteinTotal={table.proteinTotal}
          carbsTotal={table.carbsTotal}
          fatTotal={table.fatTotal}
          onRemove={table.remove}
          onClear={table.clear}
        />
      )}

      <Footer />
      <BackToTop />

      {/* 详情弹窗 */}
      {selectedMeal && (
        <MealModal meal={selectedMeal} categoryMeta={categoryMeta} onClose={() => setSelectedMeal(null)} />
      )}
    </div>
  )
}
