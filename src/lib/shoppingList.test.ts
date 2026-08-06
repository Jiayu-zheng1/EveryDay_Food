import { describe, expect, it } from 'vitest'
import { buildShoppingList, formatAmount, toGrams, UNIT_GRAM_TABLES } from './shoppingList'

/** 便捷构造：一行食材 = 一道菜 */
const dish = (...ingredients: string[]) => ({ ingredients })

describe('buildShoppingList 同单位合并', () => {
  it('鸡蛋 2 个 + 1 个 → 3 个（同名称同单位直接相加）', () => {
    const { rows } = buildShoppingList([dish('鸡蛋 2 个'), dish('鸡蛋 1 个')])
    expect(rows).toContainEqual({ name: '鸡蛋', amount: 3, unit: '个', raw: '鸡蛋 2 个', group: '食材' })
  })

  it('黄瓜 100 克 + 半根（≈100 克）→ 200 克（跨单位按归一克数合并）', () => {
    const { rows } = buildShoppingList([dish('黄瓜 100 克'), dish('黄瓜 半根')])
    expect(rows).toContainEqual({ name: '黄瓜', amount: 200, unit: '克', raw: '黄瓜 100 克', group: '食材' })
  })

  it('勺/小勺/瓣 换算后与克合并', () => {
    // 2 勺 ≈ 30 克 + 10 克 → 40 克（双方 ≤60g 小份量合并）
    let { rows } = buildShoppingList([dish('生抽 2 勺'), dish('生抽 10 克')])
    expect(rows).toContainEqual(expect.objectContaining({ name: '生抽', amount: 40, unit: '克' }))
    // 1 小勺 ≈ 5 克 + 5 克 → 10 克
    ;({ rows } = buildShoppingList([dish('盐 1 小勺'), dish('盐 5 克')]))
    expect(rows).toContainEqual(expect.objectContaining({ name: '盐', amount: 10, unit: '克' }))
    // 3 瓣 ≈ 15 克 + 15 克 → 30 克
    ;({ rows } = buildShoppingList([dish('蒜 3 瓣'), dish('蒜 15 克')]))
    expect(rows).toContainEqual(expect.objectContaining({ name: '蒜', amount: 30, unit: '克' }))
  })

  it('不可换算的包装单位（盒/份）按原单位精确合并', () => {
    const { rows } = buildShoppingList([dish('午餐肉 1 盒'), dish('午餐肉 1 盒')])
    expect(rows).toContainEqual(expect.objectContaining({ name: '午餐肉', amount: 2, unit: '盒' }))
  })
})

describe('buildShoppingList 多食材行解析', () => {
  it('共享数量「青豆、胡萝卜丁 50 克」→ 两行各 50 克', () => {
    const { rows } = buildShoppingList([dish('青豆、胡萝卜丁 50 克')])
    expect(rows).toContainEqual(expect.objectContaining({ name: '青豆', amount: 50, unit: '克', group: '食材' }))
    expect(rows).toContainEqual(expect.objectContaining({ name: '胡萝卜丁', amount: 50, unit: '克', group: '食材' }))
  })

  it('「各」句式：生抽、蚝油 各 1 勺 → 两行各 1 勺；红黄彩椒 各半个 → 1 个', () => {
    const { rows } = buildShoppingList([dish('生抽、蚝油 各 1 勺')])
    expect(rows).toContainEqual(expect.objectContaining({ name: '生抽', amount: 1, unit: '勺' }))
    expect(rows).toContainEqual(expect.objectContaining({ name: '蚝油', amount: 1, unit: '勺' }))

    const { rows: rows2 } = buildShoppingList([dish('红黄彩椒 各半个')])
    expect(rows2).toContainEqual(expect.objectContaining({ name: '红黄彩椒', amount: 1, unit: '个' }))
  })

  it('分数与半量：洋葱 1/4 个 → 0.25 个；三黄鸡 半只 → 0.5 只', () => {
    const { rows } = buildShoppingList([dish('洋葱 1/4 个'), dish('三黄鸡 半只')])
    expect(rows).toContainEqual(expect.objectContaining({ name: '洋葱', amount: 0.25, unit: '个' }))
    expect(rows).toContainEqual(expect.objectContaining({ name: '三黄鸡', amount: 0.5, unit: '只' }))
  })

  it('括号注记剥离：鲈鱼 1 条（取肉约 200 克）→ 鲈鱼 1 条', () => {
    const { rows } = buildShoppingList([dish('鲈鱼 1 条（取肉约 200 克）')])
    expect(rows).toContainEqual(expect.objectContaining({ name: '鲈鱼', amount: 1, unit: '条' }))
  })
})

describe('buildShoppingList 调味品与数量行分离', () => {
  it('「黑胡椒、海盐 适量」归调味品（数量为 null），鸡蛋 3 个归食材', () => {
    const { rows, groups } = buildShoppingList([dish('鸡蛋 3 个', '黑胡椒、海盐 适量')])
    expect(groups).toEqual(['食材', '调味品'])
    expect(rows).toContainEqual({ name: '黑胡椒', amount: null, unit: null, raw: '黑胡椒、海盐 适量', group: '调味品' })
    expect(rows).toContainEqual({ name: '海盐', amount: null, unit: null, raw: '黑胡椒、海盐 适量', group: '调味品' })
    expect(rows).toContainEqual(expect.objectContaining({ name: '鸡蛋', amount: 3, unit: '个', group: '食材' }))
  })

  it('同名调味品去重，只列一次', () => {
    const { rows } = buildShoppingList([dish('黑胡椒、海盐 适量'), dish('盐 适量', '黑胡椒 少许')])
    expect(rows.filter((r) => r.name === '黑胡椒')).toHaveLength(1)
    expect(rows.filter((r) => r.name === '盐')).toHaveLength(1)
  })

  it('仅调味品时 groups 只有调味品', () => {
    const { rows, groups } = buildShoppingList([dish('盐 适量')])
    expect(groups).toEqual(['调味品'])
    expect(rows).toContainEqual(expect.objectContaining({ name: '盐', amount: null, group: '调味品' }))
  })

  it('椰子鸡：沙姜、小米辣 蘸料用 不丢食材（去掉用途注记保留名称）', () => {
    const { rows } = buildShoppingList([
      dish(
        '文昌鸡 半只（约 500 克）',
        '椰子 1 个（取椰汁椰肉）',
        '马蹄 6 个',
        '红枣 4 颗',
        '姜 1 块',
        '枸杞 1 小把',
        '沙姜、小米辣 蘸料用',
        '盐 适量'
      ),
    ])
    // 蘸料用 食材不丢失：沙姜 / 小米辣 均在列（调味品组）
    expect(rows).toContainEqual(expect.objectContaining({ name: '沙姜', amount: null, group: '调味品' }))
    expect(rows).toContainEqual(expect.objectContaining({ name: '小米辣', amount: null, group: '调味品' }))
    expect(rows).toContainEqual(expect.objectContaining({ name: '盐', amount: null, group: '调味品' }))
    // 数量行正常解析
    expect(rows).toContainEqual(expect.objectContaining({ name: '文昌鸡', amount: 0.5, unit: '只', group: '食材' }))
    expect(rows).toContainEqual(expect.objectContaining({ name: '枸杞', amount: 1, unit: '小把', group: '食材' }))
    expect(rows).toContainEqual(expect.objectContaining({ name: '姜', amount: 1, unit: '块', group: '食材' }))
    expect(rows).toContainEqual(expect.objectContaining({ name: '红枣', amount: 4, unit: '颗', group: '食材' }))
    expect(rows).toContainEqual(expect.objectContaining({ name: '马蹄', amount: 6, unit: '个', group: '食材' }))
    expect(rows).toContainEqual(expect.objectContaining({ name: '椰子', amount: 1, unit: '个', group: '食材' }))
  })
})

describe('toGrams / formatAmount / 单位表', () => {
  it('toGrams：质量单位直换、容器单位查校准表/兜底、包装单位返回 null', () => {
    expect(toGrams('黄瓜', '根', 0.5)).toBe(100) // 校准表：黄瓜 1 根 ≈ 200 克
    expect(toGrams('鸡蛋', '个', 3)).toBe(165) // 校准表：鸡蛋 1 个 ≈ 55 克
    expect(toGrams('文昌鸡', '只', 0.5)).toBe(600) // 校准表：文昌鸡 ≈ 1200 克
    expect(toGrams('蒜', '瓣', 3)).toBe(15) // 校准表：蒜 1 瓣 ≈ 5 克
    expect(toGrams('生抽', '勺', 2)).toBe(30) // 兜底：1 勺 ≈ 15 克
    expect(toGrams('盐', '小勺', 1)).toBe(5) // 兜底：1 小勺 ≈ 5 克
    expect(toGrams('午餐肉', '盒', 1)).toBeNull() // 包装单位不换算
    expect(toGrams('五花肉', '克', 300)).toBe(300)
    expect(toGrams('水', '毫升', 200)).toBe(200)
  })

  it('formatAmount 去掉多余尾零', () => {
    expect(formatAmount(1)).toBe('1')
    expect(formatAmount(2)).toBe('2')
    expect(formatAmount(0.5)).toBe('0.5')
    expect(formatAmount(0.25)).toBe('0.25')
    expect(formatAmount(2.5)).toBe('2.5')
  })

  it('单位换算表已导出且覆盖常用单位', () => {
    expect(UNIT_GRAM_TABLES.MASS_GRAM['克']).toBe(1)
    expect(UNIT_GRAM_TABLES.MASS_GRAM['斤']).toBe(500)
    expect(UNIT_GRAM_TABLES.FALLBACK_GRAM['勺']).toBe(15)
    expect(UNIT_GRAM_TABLES.CALIBRATE['鸡蛋|个']).toBe(55)
  })

  it('空输入不崩溃', () => {
    expect(buildShoppingList([]).rows).toEqual([])
    expect(buildShoppingList([dish()]).rows).toEqual([])
    expect(buildShoppingList([{} as { ingredients?: string[] }]).rows).toEqual([])
  })
})
