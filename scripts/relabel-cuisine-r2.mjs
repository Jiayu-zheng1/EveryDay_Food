#!/usr/bin/env node
/**
 * 菜系扩展轮 2 — 现有数据重标（保守）：扫描 generic 菜，按菜名/desc 关键词
 * 找明显云南（dian）/ 陕西（shan）/ 新疆（xinjiang）特色菜，只改 cuisine 字段。
 *
 * 用法：
 *   node scripts/relabel-cuisine-r2.mjs scan    # 只输出候选，不改文件
 *   node scripts/relabel-cuisine-r2.mjs apply   # 按 APPROVED 表落盘（仅改 cuisine 行）
 */

import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile, readdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** 候选规则：每组 { cuisine, patterns: [{ re, note }] }，re 命中 name 或 desc 任一即候选 */
const RULES = [
  {
    cuisine: 'dian',
    patterns: [
      { re: /(云南|滇西|滇南|昆明|大理|丽江|西双版纳|香格里拉|普洱)/, note: '显式云南地名' },
      { re: /过桥米线|汽锅鸡|汽锅|鲜花饼|破酥包|乳扇|饵块|饵丝/, note: '云南名菜/小吃' },
      { re: /牛肝菌|鸡枞|干巴菌|青头菌|见手青|野生菌|菌子火锅/, note: '云南菌子' },
      { re: /(^|[^桂])米线/, note: '米线类' },
      { re: /傣味|菠萝紫米饭|宣威火腿|昭通|沾益/, note: '云南特色' },
    ],
  },
  {
    cuisine: 'shan',
    patterns: [
      { re: /(陕西|西安|宝鸡|咸阳|渭南|岐山|临潼|延安|汉中|秦镇)/, note: '显式陕西地名' },
      { re: /肉夹馍|凉皮|米皮|羊肉泡馍|泡馍|裤带面|biangbiang|油泼面|臊子面|岐山面|水盆羊肉|葫芦头|甑糕|石子馍|锅盔|白吉馍/, note: '陕西名吃' },
    ],
  },
  {
    cuisine: 'xinjiang',
    patterns: [
      { re: /(新疆|乌鲁木齐|喀什|伊犁|吐鲁番|阿克苏|和田|库尔勒|塔城)/, note: '显式新疆地名' },
      { re: /大盘鸡|烤包子|馕包肉|馕|拉条子|丁丁炒面/, note: '新疆名菜' },
      { re: /手抓饭|抓饭|椒麻鸡|烤全羊|红柳/, note: '新疆特色（需结合上下文）' },
    ],
  },
]

/** 用 esbuild 打包数据模块并返回全量 meals 数组 */
async function loadMeals() {
  const result = await build({
    stdin: {
      contents: `import { meals } from './src/data/meals'\nprocess.stdout.write(JSON.stringify(meals))`,
      resolveDir: root,
      sourcefile: 'export-entry.ts',
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    logLevel: 'warning',
  })
  const dir = await mkdtemp(path.join(os.tmpdir(), 'mfood-'))
  const tmp = path.join(dir, 'data.cjs')
  await writeFile(tmp, result.outputFiles[0].text)
  const json = execFileSync(process.execPath, [tmp], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  await rm(dir, { recursive: true, force: true })
  return JSON.parse(json)
}

/** 定位每个 id 的源文件与 cuisine 行号；返回 Map<id, {file, lineIdx}> 及 file->content 表 */
async function locateMeals() {
  const dataDir = path.join(root, 'src', 'data')
  const files = (await readdir(dataDir, { recursive: true })).filter((f) => f.endsWith('.ts'))
  const loc = new Map()
  const contents = new Map()
  for (const rel of files) {
    const file = path.join(dataDir, rel)
    const content = await readFile(file, 'utf8')
    contents.set(file, content)
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^\s*id:\s*'([^']+)',\s*$/)
      if (!m) continue
      const id = m[1]
      if (loc.has(id)) continue // id 全库唯一
      for (let j = i + 1; j < lines.length; j++) {
        const cm = lines[j].match(/^\s*cuisine:\s*'[^']*',?\s*$/)
        if (cm) {
          loc.set(id, { file, lineIdx: j })
          break
        }
        if (/^\s*\},\s*$/.test(lines[j])) break
      }
    }
  }
  return { loc, contents }
}

/** 对 generic 菜跑规则，返回候选列表 */
function scan(meals) {
  const hits = []
  for (const meal of meals) {
    if (meal.cuisine !== 'generic') continue
    const hay = `${meal.name} ${meal.desc}`
    for (const rule of RULES) {
      for (const p of rule.patterns) {
        if (p.re.test(hay)) {
          hits.push({ id: meal.id, name: meal.name, cuisine: rule.cuisine, note: p.note })
          break
        }
      }
    }
  }
  return hits
}

const mode = process.argv[2] ?? 'scan'

if (mode === 'scan') {
  const meals = await loadMeals()
  const hits = scan(meals)
  for (const h of hits) {
    const meal = meals.find((m) => m.id === h.id)
    console.log(`${h.cuisine.padEnd(8)} | ${h.id.padEnd(16)} | ${h.name.padEnd(12)} | ${h.note} | ${meal.desc}`)
  }
  const byCuisine = {}
  for (const h of hits) byCuisine[h.cuisine] = (byCuisine[h.cuisine] ?? 0) + 1
  console.log('---')
  console.log('候选数:', JSON.stringify(byCuisine))
} else if (mode === 'apply') {
  // scan 后人工复核通过的 id -> 新菜系（保守原则，仅明显无疑的）
  const { APPROVED } = await import(path.join(root, 'scripts', 'relabel-r2-approved.mjs'))
  const { loc, contents } = await locateMeals()
  const perFile = new Map() // file -> Map<lineIdx, newCuisine>
  let missing = 0
  for (const [id, newCuisine] of Object.entries(APPROVED)) {
    const entry = loc.get(id)
    if (!entry) {
      console.error(`[warn] ${id} 未定位到源文件，跳过`)
      missing++
      continue
    }
    if (!perFile.has(entry.file)) perFile.set(entry.file, new Map())
    perFile.get(entry.file).set(entry.lineIdx, newCuisine)
  }
  if (missing > 0) {
    console.error(`[abort] ${missing} 个 id 未定位，不落盘`)
    process.exit(1)
  }
  let total = 0
  for (const [file, lineMap] of perFile) {
    const lines = contents.get(file).split('\n')
    for (const [lineIdx, newCuisine] of lineMap) {
      const old = lines[lineIdx]
      const m = old.match(/^(\s*)cuisine:\s*'([^']*)',?\s*$/)
      if (!m) {
        console.error(`[abort] ${file}:${lineIdx + 1} cuisine 行格式不符: ${old}`)
        process.exit(1)
      }
      lines[lineIdx] = `${m[1]}cuisine: '${newCuisine}',`
      total++
    }
    await writeFile(file, lines.join('\n'))
    console.log(`[apply] ${file} 更新 ${lineMap.size} 处`)
  }
  console.log(`[apply] 共重标 ${total} 道菜`)
} else {
  console.error('用法: node scripts/relabel-cuisine-r2.mjs [scan|apply]')
  process.exit(1)
}
