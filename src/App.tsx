import { useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import DailyPlanner from './components/DailyPlanner'
import CategoryTabs from './components/CategoryTabs'
import MealTypeChips from './components/MealTypeChips'
import CuisineChips, { CUISINE_META } from './components/CuisineChips'
import MethodChips from './components/MethodChips'
import FlavorChips from './components/FlavorChips'
import MealCard from './components/MealCard'
import MealModal from './components/MealModal'
import AnnouncementModal from './components/AnnouncementModal'
import Footer from './components/Footer'
import GoalsModule from './components/GoalsModule'
import Reveal from './components/Reveal'
import ScrollProgress from './components/ScrollProgress'
import BackToTop from './components/BackToTop'
import TableBar from './components/TableBar'
import NewYearDinner from './components/NewYearDinner'
import TableModule from './components/TableModule'
import useMeals from './hooks/useMeals'
import useDailyPlanner from './hooks/useDailyPlanner'
import useNutrition from './hooks/useNutrition'
import useFamilyTable from './hooks/useFamilyTable'
import { getCategoryMeta } from './api/meals'
import type {
  Category,
  CategoryFilter,
  CategoryMeta,
  Cuisine,
  CuisineFilter,
  FlavorFilter,
  Meal,
  MealTypeFilter,
  MethodFilter,
  ModuleKey,
  SortKey,
} from './types'

/**
 * 页面容器：负责数据获取与状态管理，展示组件一律通过 props 接收数据
 * 数据全部来自 src/api/meals.js（v1 返回本地数据，将来可直接换真实接口）
 * 热量计算 / BMI / 智能搭配来自 src/lib/nutrition.js（纯算法，可换服务端实现）
 */

/** 合法模块 hash 值 → 模块 key（U11：手写 hash 路由，不引 react-router） */
const MODULE_HASHES: Record<string, ModuleKey> = {
  home: 'home',
  library: 'library',
  goals: 'goals',
  newyear: 'newyear',
  table: 'table',
}

/** 从 location.hash 解析模块；空值 / 非法值（如 #top、#daily 等页面锚点）回退首页 */
function moduleFromHash(hash: string): ModuleKey {
  return MODULE_HASHES[hash.replace(/^#/, '')] ?? 'home'
}

export default function App() {
  const { meals, loading } = useMeals()
  const nutrition = useNutrition()
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [mealTypeFilter, setMealTypeFilter] = useState<MealTypeFilter>('all') // 菜谱库餐次筛选
  const [cuisineFilter, setCuisineFilter] = useState<CuisineFilter>('all') // 菜谱库地区筛选（年夜饭生成也按此优先）
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all') // 菜谱库做法筛选
  const [flavorFilter, setFlavorFilter] = useState<FlavorFilter>('all') // 菜谱库口味筛选
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
  // 与 URL hash 同步（#home/#library/#newyear/#table，U11 手写路由）：
  // 初始读 hash 定模块 → 刷新保持；导航写 hash → 链接可分享；监听 hashchange → 前进/后退同步
  const [activeModule, setActiveModule] = useState<ModuleKey>(() =>
    moduleFromHash(window.location.hash)
  )

  // hash 变化（浏览器前进/后退、手改地址、外部链接）时同步模块状态；
  // 非模块 hash（#top / #calculator 等页面锚点）忽略，避免锚点滚动打断当前模块
  useEffect(() => {
    const onHashChange = () => setActiveModule(moduleFromHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

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

  // 今日搭配只做随机生成，与健康目标 / 智能搭配完全解耦（智能搭配只在健康目标页展示）
  const planner = useDailyPlanner({ meals })

  // 分类展示元信息（来自 API 模块，不直接 import 数据文件）
  const categoryMeta: Record<Category, CategoryMeta> = getCategoryMeta()

  // 菜谱库：分类 tab 与餐次 chips 组合过滤 → 关键词搜索 → 排序（默认保持原序）
  const visibleMeals = useMemo(() => {
    const q = search.trim()
    const filtered = meals.filter((meal) => {
      const categoryOk = activeCategory === 'all' || meal.category === activeCategory
      const typeOk =
        mealTypeFilter === 'all' || (meal.mealType ?? []).includes(mealTypeFilter)
      const cuisineOk =
        !cuisineFilter || cuisineFilter === 'all' || meal.cuisine === cuisineFilter
      const methodOk =
        methodFilter === 'all' || (meal.methods ?? []).includes(methodFilter)
      const flavorOk =
        flavorFilter === 'all' || (meal.flavors ?? []).includes(flavorFilter)
      if (!categoryOk || !typeOk || !cuisineOk || !methodOk || !flavorOk) return false
      // 中文直接 includes 匹配菜名、简介或食材（食材匹配支持「冰箱搜菜」）
      if (!q) return true
      return (
        (meal.name ?? '').includes(q) ||
        (meal.desc ?? '').includes(q) ||
        (meal.ingredients ?? []).some((ing) => ing.includes(q))
      )
    })
    if (sortKey === 'default') return filtered
    const sorted = [...filtered] // 复制后再排序，避免原地修改数据源
    if (sortKey === 'kcal-asc') sorted.sort((a, b) => a.kcal - b.kcal)
    else if (sortKey === 'kcal-desc') sorted.sort((a, b) => b.kcal - a.kcal)
    else if (sortKey === 'protein-desc')
      sorted.sort((a, b) => (b.nutrition?.protein ?? 0) - (a.nutrition?.protein ?? 0))
    return sorted
  }, [meals, activeCategory, mealTypeFilter, cuisineFilter, methodFilter, flavorFilter, search, sortKey])

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
  }, [visibleCount, visibleMeals.length, activeCategory, mealTypeFilter, cuisineFilter, methodFilter, flavorFilter, search, sortKey])

  // 筛选 / 搜索 / 排序变化时，从第一页重新分批渲染
  useEffect(() => {
    setVisibleCount(24)
  }, [activeCategory, mealTypeFilter, cuisineFilter, methodFilter, flavorFilter, search, sortKey])

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

  // 跨分类同名变体数（U8）：全库按菜名统计，MealModal 展示「同款变体 N 个」供对比做法
  const nameVariantCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const meal of meals) {
      counts.set(meal.name, (counts.get(meal.name) ?? 0) + 1)
    }
    return counts
  }, [meals])

  // 模块导航：切换视图、写入 URL hash（可分享 / 刷新保持）
  // scrollToId 传入时（如「今日搭配」入口 → #daily 搭配区）：等 React 提交新模块后平滑滚动到目标区，
  // 否则回到页面顶部（'instant' 立即回顶，不触发平滑滚动动画）
  const navigate = (module: ModuleKey, scrollToId?: string) => {
    setActiveModule(module)
    // 直接赋值 location.hash 触发 hashchange 事件，由监听器同步 state；
    // 已是当前 hash 则跳过赋值，避免无谓事件与历史记录
    if (window.location.hash !== `#${module}`) {
      window.location.hash = `#${module}`
    }
    if (scrollToId) {
      // 双 rAF：等新模块 DOM 挂载且布局稳定后再滚动（切换模块瞬间目标元素尚不存在）
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById(scrollToId)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        })
      })
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }

  return (
    <div id="top" className="min-h-screen bg-ink font-sans text-snow">
      <ScrollProgress />
      {/* 全屏鼠标跟随光源：纯视觉层（pointer-events:none），不拦截任何交互 */}
      <div ref={cursorLightRef} className="cursor-light" aria-hidden="true" />
      <Header
        activeModule={activeModule}
        tableCount={table.items.length}
        // 「今日搭配」tab 与 logo 都回 home；tab 需滚动到搭配区（#daily），logo 回页面顶部
        onNavigate={(module) => navigate(module, module === 'home' ? 'daily' : undefined)}
      />

      <main>
        {/* 首页模块：Hero（精简）+ 「生成今日搭配」功能区（热量计算器已移至健康目标模块） */}
        {activeModule === 'home' && (
          <>
            <Hero mealCount={meals.length} onNavigate={navigate} />

            <DailyPlanner
              people={planner.people}
              onPeopleChange={planner.setPeople}
              mealCounts={planner.mealCounts}
              onMealCountChange={planner.setMealCount}
              plan={planner.plan}
              loading={planner.loading}
              totalKcal={planner.totalKcal}
              categoryMeta={categoryMeta}
              onGenerate={planner.generate}
              onShuffle={planner.shuffle}
              onOpen={setSelectedMeal}
              onAdd={table.add}
              addedIds={tableItemIds}
            />
          </>
        )}

        {/* 健康目标模块：热量计算器（BMI / 每日目标 / 智能搭配）+ 智能搭配结果（本页下方）+ 目标菜谱浏览 */}
        {activeModule === 'goals' && (
          <GoalsModule
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
            smartPlan={nutrition.smartPlan}
            error={nutrition.error}
            onReset={nutrition.reset}
            categoryMeta={categoryMeta}
            onOpen={setSelectedMeal}
            onAdd={table.add}
            addItemIds={tableItemIds}
          />
        )}

        {/* 菜谱库模块：分类 tab + 餐次 chips + 卡片网格（筛选/搜索/排序/分批渲染逻辑全部保留） */}
        {activeModule === 'library' && (
        <section id="library" className="scroll-mt-24 px-5 py-16">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black sm:text-3xl">菜谱库</h1>
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
                {/* 做法筛选：与分类 / 餐次 / 地区 / 口味组合过滤 */}
                <div className="mt-3">
                  <MethodChips active={methodFilter} onChange={setMethodFilter} />
                </div>
                {/* 口味筛选：与分类 / 餐次 / 地区 / 做法组合过滤 */}
                <div className="mt-3">
                  <FlavorChips active={flavorFilter} onChange={setFlavorFilter} />
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
                    setCuisineFilter('all')
                    setMethodFilter('all')
                    setFlavorFilter('all')
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-snow transition-colors hover:bg-white/10"
                >
                  清空搜索
                </button>
              </div>
            ) : (
              <div
                key={`${activeCategory}-${mealTypeFilter}-${cuisineFilter}-${methodFilter}-${flavorFilter}-${sortKey}`}
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

      {/* 详情弹窗：onAdd 支持从弹窗加入餐桌（移动端），variants 显示跨分类同名变体数 */}
      {selectedMeal && (
        <MealModal
          meal={selectedMeal}
          categoryMeta={categoryMeta}
          onClose={() => setSelectedMeal(null)}
          onAdd={table.add}
          variants={nameVariantCounts.get(selectedMeal.name) ?? 1}
        />
      )}

      {/* 首次进入公告弹窗：同一浏览器会话只弹出一次 */}
      <AnnouncementModal />
    </div>
  )
}
