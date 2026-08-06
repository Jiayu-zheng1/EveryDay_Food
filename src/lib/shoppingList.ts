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
 *   - 单位表：克|g|G|公斤|斤|两|个|根|勺|小勺|瓣|块|片|颗|只|条|把|小把|束|碗|杯|枚|段|小段|份
 *     |盒|罐|包|毫升|张|朵|头|棵|枝|撮|滴（小勺/小把/小段 等小份量单位补入后可正常解析数量）
 *   - 名称归一：去掉括号注记，如「糙米饭 150 克（熟）」→「糙米饭 150 克」、
 *     「鲈鱼 1 条（取肉约 200 克）」→「鲈鱼 1 条」
 *   - 「半」并入数量 0.5：「黄瓜 半根」→ 0.5 根；分数「洋葱 1/4 个」→ 0.25 个
 *   - 合并（U1 单位归一）：
 *       a. 同一名称 + 同一单位 → 数量直接相加（如 鸡蛋 2 个 + 鸡蛋 1 个 → 3 个）
 *       b. 解析层把常见单位换算成克（质量单位直换；容器单位走「食材高频定量校准表」，
 *          未校准的按单位兜底近似）：勺≈15g、小勺≈5g、瓣≈5g、根/个/片/块/碗 等按食材校准
 *       c. 跨单位合并：同一名称的克数相差 ≤20% 视为同项（如「黄瓜 100 克」+「黄瓜 半根」
 *          ≈100g → 合并为 200 克），或双方都是 ≤60g 的小份量
 *          （勺/小勺/片/瓣 等烹饪单位误差大，如「生抽 1 勺」+「生抽 10 克」→ 合并）；
 *          同单位行永远相加
 *       d. 无法换算克数的包装单位（份/盒/罐/包 等）仍按「名称 + 单位」精确合并
 *   - 「适量」「少许」「几滴」等数量非数字的 → 归「调味品」组，只列名称不合并数量
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

/** 单位表：主表（规格约定）+ 数据集中出现的补充单位（小勺/小把/小段 为小份量单位） */
const UNIT_RE =
  '克|g|G|公斤|斤|两|个|根|勺|小勺|瓣|块|片|颗|只|条|把|小把|束|碗|杯|枚|段|小段|份|盒|罐|包|毫升|张|朵|头|棵|枝|撮|滴'

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

/* ================= U1 单位归一：常见单位 → 克 ================= */

/** 质量单位 → 克的换算系数（毫升按水的密度近似 1g/ml） */
const MASS_GRAM: Record<string, number> = {
  克: 1,
  g: 1,
  G: 1,
  公斤: 1000,
  斤: 500,
  两: 50,
  毫升: 1,
}

/**
 * 食材高频定量校准表：`${name}|${unit}` → 单个该单位的克数（重点 40 种高频果蔬/荤食）。
 * 数值取常见市售规格的中位近似（中等个头、带壳/带骨称重），用于跨单位合并，
 * 允许 ±20% 容差吸收个体差异。
 */
const CALIBRATE: Record<string, number> = {
  // —— 个 ——
  '鸡蛋|个': 55, '洋葱|个': 200, '青椒|个': 150, '干辣椒|个': 3, '小米辣|个': 5,
  '番茄|个': 150, '西红柿|个': 150, '土豆|个': 200, '柠檬|个': 80, '泡椒|个': 8,
  '牛油果|个': 150, '鸡腿|个': 200, '八角|个': 2, '娃娃菜|个': 200, '苹果|个': 180,
  '雪梨|个': 250, '芒果|个': 300, '西柚|个': 250, '蜜薯|个': 200, '红薯|个': 200,
  '彩椒|个': 150, '红椒|个': 150, '螺丝椒|个': 50, '皮蛋|个': 60, '咸蛋黄|个': 15,
  '熟蛋黄|个': 15, '蛋黄|个': 15, '鸡蛋清|个': 30, '蛋清|个': 30, '鸡蛋液|个': 50,
  '蛋黄液|个': 15, '卤蛋|个': 55, '鹌鹑蛋|个': 10, '马蹄|个': 20, '猕猴桃|个': 100,
  '椰子|个': 500, '白吉馍|个': 100, '蛋挞皮|个': 20, '柠檬皮屑|个': 2, '红茶包|个': 2,
  '鸡翅中|个': 30, '鸡翅尖|个': 10, '鸭翅|个': 25, '虾仁|个': 3, '鸡肉洋葱圈|个': 20,
  '炸鸡腿|个': 200, '油豆腐|个': 10, '胖头鱼鱼头|个': 600, '小米椒|个': 5, '干红椒|个': 3,
  '青红椒 各|个': 150, '红黄彩椒 各|个': 150,
  // —— 根 ——
  '小葱|根': 10, '葱|根': 10, '香葱|根': 10, '黄瓜|根': 200, '胡萝卜|根': 150,
  '大葱|根': 80, '小米辣|根': 5, '线椒|根': 8, '螺丝椒|根': 50, '莴笋|根': 500,
  '香蕉|根': 120, '甜玉米|根': 250, '香菜|根': 15, '丝瓜|根': 250, '苦瓜|根': 250,
  '青蒜|根': 30, '青蒜苗|根': 30, '西葫芦|根': 250, '芦笋|根': 8, '秋葵|根': 10,
  '西芹|根': 300, '芹菜|根': 300, '茄子|根': 200, '杏鲍菇|根': 80, '火腿肠|根': 60,
  '腊肠|根': 100, '香肠|根': 80, '猪肉烤肠|根': 70, '竹荪|根': 2, '手指饼干|根': 5,
  '竹签|根': 3,
  // —— 片 ——
  '姜|片': 2, '姜片|片': 3, '生菜|片': 15, '香叶|片': 0.5, '柠檬|片': 15,
  '娃娃菜|片': 25, '番茄|片': 40, '全麦面包|片': 40, '海苔|片': 1, '陈皮|片': 3,
  '山楂干|片': 3, '红椒片|片': 10, '薄脆|片': 5,
  // —— 块 ——
  '姜|块': 20, '豆干|块': 50, '鸡胸肉|块': 150, '咖喱块|块': 20, '红腐乳|块': 20,
  '熟玉米|块': 60, '熟南瓜|块': 80, '臭豆腐坯|块': 50, '薯饼|块': 30,
  // —— 颗 ——
  '红枣|颗': 5, '八角|颗': 1, '小番茄|颗': 12, '冰糖|颗': 5, '圣女果|颗': 12,
  '蜜枣|颗': 10, '马蹄|颗': 20, '巴旦木|颗': 1.5, '草莓|颗': 15, '小青菜|颗': 40,
  '娃娃菜|颗': 200, '西兰花|颗': 400,
  // —— 只 ——
  '三黄鸡|只': 1200, '土鸡|只': 1500, '老母鸡|只': 1800, '小母鸡|只': 1200,
  '老鸭|只': 1500, '鸭|只': 1500, '乌鸡|只': 1500, '文昌鸡|只': 1200, '烤鸭|只': 1000,
  '梭子蟹|只': 250, '大闸蟹|只': 150, '扇贝|只': 15, '大虾|只': 15, '开背虾|只': 15,
  '琵琶鸡腿|只': 150, '手枪鸡腿|只': 150, '整只鸡腿|只': 200, '猪蹄|只': 500,
  '荠菜鲜肉馄饨|只': 15,
  // —— 条 ——
  '鲫鱼|条': 400, '鲈鱼|条': 600, '鲤鱼|条': 800, '草鱼|条': 800, '草鱼/黑鱼|条': 800,
  '鲳鱼|条': 400, '石斑鱼|条': 600, '黄鱼|条': 400, '多宝鱼|条': 600, '鳜鱼|条': 600,
  '鲈鱼/鲤鱼|条': 700,
  // —— 朵 ——
  '香菇|朵': 25, '鲜香菇|朵': 25, '干香菇|朵': 5, '银耳|朵': 15, '干银耳|朵': 15,
  '西兰花|朵': 300,
  // —— 瓣 ——
  '蒜|瓣': 5, '大蒜|瓣': 5, '蒜末|瓣': 5, '蒜瓣|瓣': 5,
  // —— 头 ——
  '蒜|头': 60, '大蒜|头': 60,
  // —— 棵 ——
  '青菜|棵': 50, '娃娃菜|棵': 200, '菜苔|棵': 80, '青菜心|棵': 50,
  // —— 把 / 小把 ——
  '粉丝|把': 80, '九层塔|把': 50, '葱花|把': 30,
  '枸杞|小把': 10, '花椒|小把': 5, '虾皮|小把': 15,
  // —— 段 / 小段 ——
  '大葱|段': 15, '葱白|段': 10, '葱段|段': 10, '桂皮|小段': 5,
  // —— 碗 / 杯 / 张 / 枚 / 枝 / 滴 ——
  '米饭|碗': 200, '米酒|杯': 200, '生抽|杯': 200, '麻油|杯': 200,
  '饺子皮|张': 8, '鸡蛋皮|张': 30, '春卷皮|张': 10, '馄饨皮|张': 3,
  '手抓饼胚|张': 60, '千层酥皮|张': 40, '豆腐皮|张': 30, '冷面片|张': 40,
  '全麦卷饼|张': 60, '蛋皮|张': 30,
  '活珠子|枚': 50, '迷迭香|枝': 2, '食用油|滴': 0.1,
}

/** 容器单位兜底克数：未进校准表的食材按此近似（份/盒/罐/包 等包装单位不换算，返回 null） */
const FALLBACK_GRAM: Record<string, number> = {
  个: 100, 根: 80, 勺: 15, 小勺: 5, 瓣: 5, 块: 50, 片: 15, 颗: 10, 只: 200,
  条: 400, 把: 80, 小把: 20, 束: 100, 碗: 200, 杯: 200, 枚: 50, 段: 30,
  小段: 5, 朵: 20, 头: 50, 棵: 50, 张: 10, 枝: 5, 撮: 2, 滴: 0.1,
}

/** 跨单位合并容差：同一名称的归一克数相差 ≤20% 视为同项 */
const MERGE_TOLERANCE = 0.2

/**
 * 小份量合并阈值（克）：勺/小勺/片/瓣/块/颗（香料）/撮/滴 等烹饪单位本身误差很大
 * （一个菜谱写「1 勺」、另一个写「10 克」，实际是同一把调料），
 * 双方归一克数都不超过该阈值时直接视为同项合并，避免调料/香料行被拆散
 */
const SMALL_AMOUNT_GRAM = 60

/**
 * 把「名称 + 数量 + 单位」换算成归一克数（U1 单位归一）
 * 质量单位直换；容器单位查校准表（未校准走兜底）；份/盒/罐/包 等返回 null（不参与跨单位合并）
 */
export function toGrams(name: string, unit: string, amount: number): number | null {
  const mass = MASS_GRAM[unit]
  if (mass !== undefined) return roundAmount(amount * mass)
  const perUnit = CALIBRATE[`${name}|${unit}`] ?? FALLBACK_GRAM[unit]
  if (perUnit === undefined) return null
  return roundAmount(amount * perUnit)
}

/** 单位归一换算表（导出供测试与工具复用） */
export const UNIT_GRAM_TABLES = { MASS_GRAM, CALIBRATE, FALLBACK_GRAM }

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

  // 解析不出数量单位（如「1 小把」「几滴」「蘸料用」等）→ 调用方归入调味品
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
  /** 食材行按名称累积（Map 保持首次出现顺序）：
   *  entries 先同单位相加，再按归一克数 ±20% 跨单位合并 */
  const qtyByName = new Map<
    string,
    { entries: Array<{ amount: number; unit: string; grams: number | null }>; raw: string }
  >()
  /** 调味品按名称去重（只列名称不合并数量） */
  const seasoningSeen = new Set<string>()
  const rows: ShoppingRow[] = []

  // 数量行：先按名称累积（单位归一合并放在全部解析完成后统一做）
  const emitQty = (name: string, amount: number, unit: string, raw: string) => {
    let bucket = qtyByName.get(name)
    if (!bucket) {
      bucket = { entries: [], raw }
      qtyByName.set(name, bucket)
    }
    bucket.entries.push({ amount: roundAmount(amount), unit, grams: toGrams(name, unit, amount) })
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

      // 4. 逐段落地（按索引遍历：解析失败的段取 parts[i] 原名，
      //    修复 indexOf(null) 恒为 0 导致「沙姜、小米辣 蘸料用」第二段食材丢失的问题）
      for (let i = 0; i < parsed.length; i++) {
        const q = parsed[i]
        if (q) {
          if (q.seasoning) emitSeasoning(q.name, rawIng)
          else emitQty(q.name, q.amount, q.unit, rawIng)
        } else {
          // 数量非数字（「1 小把」「几滴」「蘸料用」等）：归入调味品，名称保留原文
          // （去掉「蘸料用」这类用途注记，如「小米辣 蘸料用」→「小米辣」）
          emitSeasoning(parts[i]?.replace(/蘸料用$/, '')?.trim() || '', rawIng)
        }
      }
    }
  }

  // 5. 食材行合并（U1 单位归一）：
  //    同单位无条件相加 → 可换算克数的行按「名称 + 归一克数 ±20%」跨单位合并；
  //    不可换算（份/盒/罐/包）保持原单位精确合并
  for (const [name, bucket] of qtyByName) {
    // a. 同单位相加
    const byUnit = new Map<string, { amount: number; grams: number | null }>()
    for (const e of bucket.entries) {
      const cur = byUnit.get(e.unit)
      if (cur) {
        cur.amount = roundAmount(cur.amount + e.amount)
        if (e.grams !== null) cur.grams = roundAmount((cur.grams ?? 0) + e.grams)
      } else {
        byUnit.set(e.unit, { amount: e.amount, grams: e.grams })
      }
    }

    // b. 可换算行按克数排序，贪心聚类：与聚类均值相差 ≤20% 视为同项
    const convertible: Array<[string, { amount: number; grams: number }]> = []
    const standalone: Array<[string, { amount: number; grams: number | null }]> = []
    for (const [unit, v] of byUnit) {
      if (v.grams !== null) convertible.push([unit, { amount: v.amount, grams: v.grams }])
      else standalone.push([unit, v])
    }
    convertible.sort((a, b) => a[1].grams - b[1].grams)

    const clusters: Array<Array<[string, { amount: number; grams: number }]>> = []
    for (const entry of convertible) {
      const last = clusters[clusters.length - 1]
      if (!last) {
        clusters.push([entry])
        continue
      }
      const avg =
        last.reduce((sum, [, v]) => sum + v.grams, 0) / last.length
      // ±20% 容差，或双方都是 ≤60g 的小份量（烹饪单位固有误差）→ 视为同项
      const bothSmall = Math.max(entry[1].grams, avg) <= SMALL_AMOUNT_GRAM
      if (
        Math.abs(entry[1].grams - avg) <= MERGE_TOLERANCE * Math.max(entry[1].grams, avg) ||
        bothSmall
      ) {
        last.push(entry)
      } else {
        clusters.push([entry])
      }
    }

    // c. 生成行：聚类内单位一致 → 保留原单位相加；跨单位 → 合并为总克数
    for (const cluster of clusters) {
      if (cluster.length === 1) {
        const [unit, v] = cluster[0]
        rows.push({ name, amount: v.amount, unit, raw: bucket.raw, group: '食材' })
      } else {
        const totalGrams = roundAmount(cluster.reduce((sum, [, v]) => sum + v.grams, 0))
        rows.push({ name, amount: totalGrams, unit: '克', raw: bucket.raw, group: '食材' })
      }
    }
    for (const [unit, v] of standalone) {
      rows.push({ name, amount: v.amount, unit, raw: bucket.raw, group: '食材' })
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
