/**
 * 购物清单纯函数模块（无副作用，可被 node 直接测试）
 *
 * buildShoppingList(items)：把一组菜品（meal[]）的 ingredients 字符串
 * 解析、合并成可供 UI 分组展示的购物清单。
 *
 * 返回结构：
 *   {
 *     rows: Array<{                       // 清单行（按首次出现顺序）
 *       name: string,                     // 归一化后的食材名
 *       amount: number | null,            // 数量（调味品为 null）
 *       unit: string | null,              // 单位（调味品为 null）
 *       raw: string,                      // 原始 ingredients 字符串（溯源用）
 *       group: '食材' | '调味品',          // 分组：能解析出数量单位的归「食材」，其余归「调味品」
 *     }>,
 *     groups: string[],                   // 非空分组列表（UI 按此顺序渲染小标题）
 *   }
 *
 * 解析规则（逐条 ingredients 字符串）：
 *   - 基本格式「名称 + 空格 + 数量 + 单位」，如「鸡蛋 3 个」「五花肉 500 克」「生抽 2 勺」
 *   - 单位表：克|g|G|公斤|斤|两|个|根|勺|瓣|块|片|颗|只|条|把|束|碗|杯|枚|段|份|盒|罐|包
 *     另补充数据集里实际出现的常用单位：毫升|张|朵|头|棵|枝|撮|滴（同样按数量单位解析）
 *   - 名称归一：去掉括号注记，如「糙米饭 150 克（熟）」→「糙米饭 150 克」、
 *     「鲈鱼 1 条（取肉约 200 克）」→「鲈鱼 1 条」
 *   - 「半」并入数量 0.5：「黄瓜 半根」→ 0.5 根；分数「洋葱 1/4 个」→ 0.25 个
 *   - 合并：同名称 + 同单位 → 数量相加；单位不同（如 500 克 vs 2 个）不合并，分行显示
 *   - 「适量」「少许」「1 小把」「1 小勺」等数量非数字的 → 归「调味品」组，
 *     只列名称不合并数量（同名调味品去重）
 *   - 「黑胡椒、海盐 适量」：按顿号/逗号拆分成多个调味品；
 *     「生抽 2 勺、老抽 半勺」：逐段解析各自的数量单位；
 *     「生抽、蚝油 各 1 勺」：各段名称共享同一数量；单一名称的「红黄彩椒 各半个」
 *     隐含两种（红/黄），数量 ×2
 */

/** 清单行 */
export interface ShoppingRow {
  name: string
  amount: number | null
  unit: string | null
  raw: string
  group: '食材' | '调味品'
}

/** 购物清单：行 + 非空分组（UI 按 groups 顺序渲染小标题） */
export interface ShoppingList {
  rows: ShoppingRow[]
  groups: string[]
}

/** 单段解析结果：调味品（无数量）或 名称 + 数量 + 单位 */
type ParsedQty =
  | { seasoning: true; name: string }
  | { seasoning?: false; name: string; amount: number; unit: string }

/** 单位表：主表（规格约定）+ 数据集中出现的补充单位 */
const UNIT_RE =
  '克|g|G|公斤|斤|两|个|根|勺|瓣|块|片|颗|只|条|把|束|碗|杯|枚|段|份|盒|罐|包|毫升|张|朵|头|棵|枝|撮|滴'

/** 常规数量：名称 + 空格 + 数字 + 单位 */
const QTY_RE = new RegExp(`^(.+?)\\s*([\\d.]+)\\s*(${UNIT_RE})$`)

/** 分数数量：如「洋葱 1/4 个」 */
const FRAC_RE = new RegExp(`^(.+?)\\s*([\\d.]+)\\s*/\\s*(\\d+)\\s*(${UNIT_RE})$`)

/** 半数量：如「黄瓜 半根」「三黄鸡 半只」 */
const HALF_RE = new RegExp(`^(.+?)\\s*半\\s*(${UNIT_RE})$`)

/* —— 无名称前缀的裸数量（用于「各」句式与共享数量，如「各 1 勺」「各半个」） —— */
const BARE_FRAC_RE = new RegExp(`^([\\d.]+)\\s*/\\s*(\\d+)\\s*(${UNIT_RE})$`)
const BARE_QTY_RE = new RegExp(`^([\\d.]+)\\s*(${UNIT_RE})$`)
const BARE_HALF_RE = new RegExp(`^半\\s*(${UNIT_RE})$`)

/** 括号注记（尾部或中部杂物）：「（熟）」「（约 200 克）」「（干）」等 */
const PAREN_RE = /（[^（）]*）|\([^()]*\)/g

/** 名称/食材列表分隔符：顿号 / 中文逗号 / 英文逗号 / 加号（「生抽 1 勺 + 香醋 1 勺」） */
const NAME_SPLIT_RE = /[、，,＋+]/g

/** 数量四舍五入到千分位，避免浮点误差（0.5+0.5、1/4 求和等） */
function roundAmount(n: number): number {
  return Math.round(n * 1000) / 1000
}

/**
 * 解析单个「名称 + 数量 + 单位」片段
 */
function parseQtyPart(part: string): ParsedQty | null {
  const s = part.trim()
  if (!s) return null

  // 调味品：以「适量 / 少许」结尾（如「黑胡椒、海盐 适量」拆分后的「海盐 适量」）
  const cond = s.match(/^(.*?)\s*(适量|少许)$/)
  if (cond) return { seasoning: true, name: cond[1].trim() || s }

  // 分数数量：名称 + 分子/分母 + 单位（必须先于常规数量，否则「1/4 个」会被
  // 常规正则把分母当数量、把「1/」并进名称）
  let m = s.match(FRAC_RE)
  if (m) return { name: m[1].trim(), amount: parseFloat(m[2]) / parseFloat(m[3]), unit: m[4] }

  // 常规数量：名称 + 数字 + 单位
  m = s.match(QTY_RE)
  if (m) return { name: m[1].trim(), amount: parseFloat(m[2]), unit: m[3] }

  // 半数量：名称 + 半 + 单位
  m = s.match(HALF_RE)
  if (m) return { name: m[1].trim(), amount: 0.5, unit: m[2] }

  /* —— 裸数量（无名称），供「各」句式与共享数量使用 —— */
  m = s.match(BARE_FRAC_RE)
  if (m) return { name: '', amount: parseFloat(m[1]) / parseFloat(m[2]), unit: m[3] }

  m = s.match(BARE_HALF_RE)
  if (m) return { name: '', amount: 0.5, unit: m[1] }

  m = s.match(BARE_QTY_RE)
  if (m) return { name: '', amount: parseFloat(m[1]), unit: m[2] }

  // 解析不出数量单位（如「1 小把」「几滴」「蘸料用」）→ 调用方归入调味品
  return null
}

/**
 * 解析「各」句式：多个名称共享同一数量，或单一名称隐含两种各一份
 * 「生抽、蚝油 各 1 勺」→ 生抽 1 勺 + 蚝油 1 勺
 * 「红黄彩椒 各半个」→ 红黄彩椒 0.5 × 2 = 1 个
 */
function parseEach(s: string): Array<{ name: string; amount: number; unit: string }> | null {
  const m = s.match(/^(.+?)各\s*(.+)$/)
  if (!m) return null
  const names = m[1]
    .trim()
    .split(NAME_SPLIT_RE)
    .map((n) => n.trim())
    .filter(Boolean)
  if (names.length === 0) return null

  const q = parseQtyPart(m[2].trim())
  if (!q || q.seasoning) return null

  // 单一名称（如「红黄彩椒」「青红椒」）隐含两种颜色/品种，各一份 → 数量 ×2
  const factor = names.length > 1 ? 1 : 2
  return names.map((n) => ({ name: n, amount: roundAmount(q.amount * factor), unit: q.unit }))
}

/**
 * 把一组菜品的食材清单合并成购物清单
 * @param items 已选菜品（仅使用 ingredients 字段）
 */
export function buildShoppingList(items: Array<{ ingredients?: string[] }>): ShoppingList {
  /** key: `${group}|${name}|${unit}` → 已合并的数量行 */
  const qtyRows = new Map<string, ShoppingRow>()
  /** 调味品按名称去重（只列名称不合并数量） */
  const seasoningSeen = new Set<string>()
  const rows: ShoppingRow[] = []

  // 数量行：同名称 + 同单位 → 数量相加
  const emitQty = (name: string, amount: number, unit: string, raw: string) => {
    const key = `食材|${name}|${unit}`
    const existing = qtyRows.get(key)
    if (existing) {
      // amount 在食材行中恒为 number（调味品行从不进 qtyRows），?? 0 仅为满足类型收窄
      existing.amount = roundAmount((existing.amount ?? 0) + amount)
      return
    }
    const row: ShoppingRow = { name, amount: roundAmount(amount), unit, raw, group: '食材' }
    qtyRows.set(key, row)
    rows.push(row)
  }

  // 调味品行：只列名称，同名去重
  const emitSeasoning = (name: string, raw: string) => {
    if (seasoningSeen.has(name)) return
    seasoningSeen.add(name)
    rows.push({ name, amount: null, unit: null, raw, group: '调味品' })
  }

  for (const meal of items ?? []) {
    for (const rawIng of meal.ingredients ?? []) {
      // 1. 去括号注记：「糙米饭 150 克（熟）」→「糙米饭 150 克」
      const cleaned = String(rawIng).replace(PAREN_RE, '').trim()
      if (!cleaned) continue

      // 2. 「各」句式：名称列表 + 各 + 数量
      const each = parseEach(cleaned)
      if (each) {
        for (const r of each) emitQty(r.name, r.amount, r.unit, rawIng)
        continue
      }

      // 3. 顿号/逗号/加号分隔的多食材行逐段解析
      //    （如「生抽 2 勺、老抽 半勺」「黑胡椒、海盐 适量」「生抽 1 勺 + 香醋 1 勺」）
      const parts = cleaned.split(NAME_SPLIT_RE).map((p) => p.trim()).filter(Boolean)
      const parsed: Array<ParsedQty | null> = parts.map(parseQtyPart)

      // 共享数量：形如「青豆、胡萝卜丁 50 克」——前面的段都是纯名称、末尾段带数量单位，
      // 此时各段共享末尾的数量（「各」句式之外的第二常见写法）
      if (parsed.length > 1) {
        const last = parsed[parsed.length - 1]
        if (last && !last.seasoning && parsed.slice(0, -1).every((q) => q === null)) {
          for (let i = 0; i < parsed.length - 1; i++) {
            parsed[i] = { name: parts[i], amount: last.amount, unit: last.unit }
          }
        }
      }

      for (const q of parsed) {
        if (q) {
          if (q.seasoning) emitSeasoning(q.name, rawIng)
          else emitQty(q.name, q.amount, q.unit, rawIng)
        } else {
          // 数量非数字（「1 小把」「几滴」「蘸料用」等）：归入调味品，名称保留原文
          emitSeasoning(parts[parsed.indexOf(q)] ?? '', rawIng)
        }
      }
    }
  }

  const groups = ['食材', '调味品'].filter((g) => rows.some((r) => r.group === g))
  return { rows, groups }
}

/**
 * 数量展示格式化：去掉多余的尾零（1 → '1'，0.5 → '0.5'，0.25 → '0.25'）
 */
export function formatAmount(n: number): string {
  return String(roundAmount(n))
}
