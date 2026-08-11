import type { MealFlavor, MealMethod } from '../types'

/**
 * 做法枚举（与 src/types.ts 的 MealMethod 一致，值即中文标签）
 * 给数据文件标注 methods 时，取值必须来自本常量（如 '蒸' / '红烧' / '烘焙'）
 */
export const METHODS: readonly MealMethod[] = [
  '炒',
  '蒸',
  '煮',
  '炖',
  '红烧',
  '煎',
  '炸',
  '烤',
  '焖',
  '凉拌',
  '卤',
  '煲汤',
  '烩',
  '干锅',
  '火锅',
  '涮',
  '腌',
  '烘焙',
  '熬',
  '熬粥',
]

/**
 * 口味枚举（与 src/types.ts 的 MealFlavor 一致，值即中文标签）
 * 给数据文件标注 flavors 时，取值必须来自本常量（如 '辣' / '清淡' / '甜'）
 */
export const FLAVORS: readonly MealFlavor[] = [
  '辣',
  '麻辣',
  '酸辣',
  '酸甜',
  '糖醋',
  '咸鲜',
  '清淡',
  '酱香',
  '孜然',
  '鱼香',
  '蒜香',
  '五香',
  '奶香',
  '咖喱',
  '鲜香',
  '甜',
]
