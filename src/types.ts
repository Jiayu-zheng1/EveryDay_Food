/**
 * 全局共享类型定义
 *
 * 数据 schema 与 src/data/meals.js 顶部注释、src/data/home-meals/*.js 实际数据
 * 一一对应（13 字段，字段名不可改动，否则全库 tsc 报错）。
 * 各模块（组件 / hooks / lib / api / data）统一从这里 import 类型。
 */

/** 餐次（支撑「今日三餐搭配」按餐次抽取） */
export type MealType = 'breakfast' | 'lunch' | 'dinner'

/** 食谱分类（新增食疗食补/烘焙/小吃） */
export type Category = 'fat-loss' | 'muscle-gain' | 'maintain' | 'nutrition' | 'home' | 'therapy' | 'bakery' | 'snack'

/** 地区菜系（8 大传统菜系 + 徽/闽/东北/滇/陕/新疆，其余为家常 generic） */
export type Cuisine =
  | 'chuan'
  | 'xiang'
  | 'yue'
  | 'e'
  | 'lu'
  | 'suzhe'
  | 'bei'
  | 'hui'
  | 'min'
  | 'dongbei'
  | 'dian'
  | 'shan'
  | 'xinjiang'
  | 'generic'

/** 每份 / 每 100g 三大营养素（克） */
export interface Nutrition {
  protein: number
  carbs: number
  fat: number
}

/** 每份的克数与单位（kcal 与 per100g × amount / 100 基本吻合 ±15%） */
export interface ServingSize {
  amount: number
  unit: string
}

/** 食谱（13 字段，与数据文件 schema 完全一致） */
export interface Meal {
  id: string
  name: string
  category: Category
  cuisine: Cuisine
  emoji: string
  kcal: number
  desc: string
  ingredients: string[]
  steps: string[]
  nutrition: Nutrition
  per100g: Nutrition
  servingSize: ServingSize
  mealType: MealType[]
}

/** 分类展示元信息：标签 / 图标 / 卡片渐变色 / 分类徽章配色 */
export interface CategoryMeta {
  label: string
  emoji: string
  gradient: string
  chip: string
}

/** 三餐搭配中的单餐：slot 为餐次中文名，meals 1-3 道（智能 2-3 道 / 随机 1 道） */
export interface PlanSlot {
  slot: '早餐' | '午餐' | '晚餐'
  meals: Meal[]
}

/** 三餐热量分配条目（结果卡展示用） */
export interface MealSplitItem {
  slot: '早餐' | '午餐' | '晚餐'
  kcal: number
}

/** 搭配模式：smart 智能搭配（热量计算器） / random 随机搭配（API） */
export type PlanMode = 'smart' | 'random'

/* ---------------- 热量计算器相关 ---------------- */

/** 健康目标 */
export type Goal = 'cutting' | 'bulking' | 'maintenance'

/** 性别 */
export type Gender = 'male' | 'female'

/** 活动水平（算法 key） */
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'veryHigh'

/**
 * 热量计算器表单
 * 注意：age / heightCm / weightKg 数值输入框存原始字符串（含空串编辑中间态），
 * 数字归一统一在 lib/nutrition.ts 的 toNumber 入口处理
 */
export interface NutritionForm {
  gender: Gender
  age: number | string
  heightCm: number | string
  weightKg: number | string
  activityLevel: ActivityLevel
  goal: Goal
}

/** BMI 计算结果（中国成人标准） */
export interface BmiResult {
  bmi: number
  category: 'underweight' | 'normal' | 'overweight' | 'obese'
  label: string
}

/** 每日热量与宏量目标（calculateDailyTargets 返回值） */
export interface DailyTargets {
  goal: Goal
  bmr: number
  tdee: number
  targetKcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

/** 智能搭配选项：goal 过滤候选池（缺省跟随 dailyTargets.goal），random 重新生成时随机选近优组合 */
export interface SmartPlanOptions {
  goal?: Goal
  random?: boolean
}

/* ---------------- 视图 / 筛选相关 ---------------- */

/** 全局模块视图（App 导航） */
export type ModuleKey = 'home' | 'library' | 'goals' | 'newyear' | 'table'

/** 分类筛选（含「全部」） */
export type CategoryFilter = 'all' | Category

/** 餐次筛选（含「全部」） */
export type MealTypeFilter = 'all' | MealType

/** 菜系筛选（含「全部」） */
export type CuisineFilter = 'all' | Cuisine

/** 菜谱库排序方式 */
export type SortKey = 'default' | 'kcal-asc' | 'kcal-desc' | 'protein-desc'
