/**
 * 数据访问层（API 模块）
 *
 * v2：数据移出 JS bundle。构建期由 scripts/export-data.mjs 把 src/data/meals.ts
 * 导出为 public/data/meals.json，本模块运行时 fetch('/data/meals.json')，
 * 一次拉取后内存缓存。调用方式与真实后端一致，将来接后端只改 DATA_URL。
 *
 * 约定：本文件是唯一允许访问食谱数据的模块，组件与 hooks 一律经它取数。
 */

import { isRiceDish } from '../lib/nutrition'
import type { Category, CategoryMeta, Meal, MealType, PlanSlot } from '../types'

/** 数据文件地址（public/data/meals.json，静态托管，SW 网络优先缓存） */
const DATA_URL = '/data/meals.json'

/** 内存缓存：一次 fetch 后复用，多个组件共享同一份数据 */
let cache: Meal[] | null = null

/** 模拟网络延迟（100–300ms），让加载态真实可见 */
const delay = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 100 + Math.random() * 200))

/** 深拷贝，防止调用方意外修改缓存数据 */
const clone = <T>(value: T): T => structuredClone(value)

/** 拉取并校验全量食谱（幂等，带内存缓存） */
async function loadMeals(): Promise<Meal[]> {
  if (cache) return cache
  const res = await fetch(DATA_URL)
  if (!res.ok) {
    throw new Error(`食谱数据加载失败：HTTP ${res.status} ${res.statusText}`)
  }
  cache = assertMeals(await res.json())
  return cache
}

/** 把 JSON（unknown）收窄为 Meal[]：结构断言，数据损坏时快速失败而非静默 any */
function assertMeals(data: unknown): Meal[] {
  if (!Array.isArray(data)) {
    throw new Error('食谱数据格式错误：期望顶层数组')
  }
  for (const item of data) {
    if (typeof item !== 'object' || item === null) {
      throw new Error('食谱数据格式错误：存在非对象条目')
    }
    const m = item as Record<string, unknown>
    if (
      typeof m.id !== 'string' ||
      typeof m.name !== 'string' ||
      typeof m.category !== 'string' ||
      typeof m.emoji !== 'string' ||
      typeof m.desc !== 'string' ||
      typeof m.kcal !== 'number' ||
      !Array.isArray(m.ingredients) ||
      !Array.isArray(m.steps) ||
      typeof m.nutrition !== 'object' ||
      m.nutrition === null ||
      typeof m.per100g !== 'object' ||
      m.per100g === null ||
      typeof m.servingSize !== 'object' ||
      m.servingSize === null ||
      !Array.isArray(m.mealType)
    ) {
      throw new Error(`食谱数据格式错误：条目 ${String(m.id)} 字段缺失或类型不符`)
    }
  }
  return data as Meal[]
}

/* ---------------- 可播种随机数（今日搭配同日稳定） ---------------- */

/** mulberry32：与年夜饭 generateTable 同款实现，换种子即得到新序列 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** YYYYMMDD 数字种子：同一天内多次加载「今日推荐」结果一致 */
function dateSeed(): number {
  const now = new Date()
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
}

/** 用指定随机源从数组中取 count 个不重复元素 */
function pickRandom<T>(list: T[], count: number, rand: () => number): T[] {
  const pool = [...list]
  const picked: T[] = []
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(rand() * pool.length)
    picked.push(pool.splice(index, 1)[0])
  }
  return picked
}

/**
 * 获取全部食谱（首次 fetch JSON 后内存缓存，后续调用即时返回）
 */
export async function fetchMeals(): Promise<Meal[]> {
  await delay()
  return clone(await loadMeals())
}

/**
 * 获取今日三餐搭配（早餐 / 午餐 / 晚餐各一道，按 mealType 匹配对应餐次）
 * 返回结构与智能搭配统一：PlanSlot[]（随机模式每餐 1 道菜）
 * @param category 可选：传入时候选池先按分类过滤（如 'fat-loss'），不传则全库抽取
 * @param seed 可选：随机种子。缺省用 YYYYMMDD（同日刷新页面结果稳定）；
 *             调用方传 Date.now()（如「换一批」）即可得到新的一组
 */
export async function fetchDailyPlan(
  category?: Meal['category'],
  seed?: number
): Promise<PlanSlot[]> {
  await delay()
  const all = await loadMeals()
  const rand = mulberry32(seed ?? dateSeed())
  // 按 mealType 抽餐：早餐抽早餐菜、午餐抽午餐菜，避免早餐抽到照烧鸡腿饭
  // used 记录已抽中的菜，后续餐次的候选池将其排除，保证三餐互不重复
  const used = new Set<string>()
  let hasRiceDish = false
  const pickForSlot = (type: MealType): Meal | undefined => {
    const pool = all.filter(
      (item: Meal) =>
        item.mealType.includes(type) &&
        !used.has(item.id) &&
        (!category || item.category === category) &&
        (!hasRiceDish || !isRiceDish(item))
    )
    const [picked] = pickRandom(pool, 1, rand)
    if (picked) {
      used.add(picked.id)
      if (isRiceDish(picked)) {
        hasRiceDish = true
      }
    }
    return picked
  }

  const breakfast = pickForSlot('breakfast')
  const lunch = pickForSlot('lunch')
  const dinner = pickForSlot('dinner')
  return [
    { slot: '早餐', meals: breakfast ? [clone(breakfast)] : [] },
    { slot: '午餐', meals: lunch ? [clone(lunch)] : [] },
    { slot: '晚餐', meals: dinner ? [clone(dinner)] : [] },
  ]
}

/* ---------------- 分类展示元信息 ---------------- */

/** 分类展示元信息：标签 / 图标 / 卡片渐变色 / 分类徽章配色（纯展示配置，不参与业务逻辑） */
const CATEGORY_META: Record<Category, CategoryMeta> = {
  'fat-loss': {
    label: '减脂餐',
    emoji: '🥗',
    gradient: 'from-emerald-100/90 via-teal-50 to-white',
    chip: 'border-emerald-500/25 bg-emerald-50 text-emerald-700 font-semibold',
  },
  'muscle-gain': {
    label: '增肌餐',
    emoji: '💪',
    gradient: 'from-rose-100/90 via-orange-50 to-white',
    chip: 'border-rose-500/25 bg-rose-50 text-rose-700 font-semibold',
  },
  maintain: {
    label: '维持餐',
    emoji: '⚖️',
    gradient: 'from-sky-100/90 via-blue-50 to-white',
    chip: 'border-sky-500/25 bg-sky-50 text-sky-700 font-semibold',
  },
  nutrition: {
    label: '营养餐',
    emoji: '🥦',
    gradient: 'from-violet-100/90 via-purple-50 to-white',
    chip: 'border-violet-500/25 bg-violet-50 text-violet-700 font-semibold',
  },
  home: {
    label: '家常菜',
    emoji: '🍳',
    gradient: 'from-amber-100/90 via-orange-50 to-white',
    chip: 'border-amber-500/25 bg-amber-50 text-amber-800 font-semibold',
  },
  therapy: {
    label: '食疗食补',
    emoji: '🍵',
    gradient: 'from-red-100/90 via-rose-50 to-white',
    chip: 'border-red-500/25 bg-red-50 text-red-700 font-semibold',
  },
  bakery: {
    label: '烘焙',
    emoji: '🧁',
    gradient: 'from-yellow-100/90 via-amber-50 to-white',
    chip: 'border-yellow-500/25 bg-yellow-50 text-yellow-800 font-semibold',
  },
  snack: {
    label: '小吃',
    emoji: '🍡',
    gradient: 'from-fuchsia-100/90 via-pink-50 to-white',
    chip: 'border-fuchsia-500/25 bg-fuchsia-50 text-fuchsia-700 font-semibold',
  },
}

/**
 * 分类展示元信息（标签 / 图标 / 渐变色），静态配置，同步返回
 */
export function getCategoryMeta(): Record<Category, CategoryMeta> {
  return CATEGORY_META
}
