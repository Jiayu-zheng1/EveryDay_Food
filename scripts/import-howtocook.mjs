#!/usr/bin/env node
/**
 * 从 HowToCook（Unlicense）导入尚未收录的菜谱。
 *
 * 用法：npm run import:howtocook
 *
 * 流程：
 * 1. 稀疏克隆 HowToCook 的 dishes/**\/*.md（不下载图片）
 * 2. 解析标题、简介、预估热量、食材、步骤
 * 3. 与 public/data/meals.json 现有菜名对比，只保留没有的
 * 4. 按食材克数估算每份营养，写入 src/data/howtocook-import.json
 *
 * 注意：自动解析的营养值是估算值，不是实验室检测；导入后仍应抽检。
 * 本脚本只在需要重新抓取时运行，不参与 build。
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const repo = 'https://github.com/Anduin2017/HowToCook.git'
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'howtocook-'))
const dishesDir = path.join(tmp, 'dishes')
const outFile = path.join(root, 'src', 'data', 'howtocook-import.json')

try {
  console.log('[import] 克隆 HowToCook（仅 Markdown）…')
  execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', repo, tmp], { stdio: 'inherit' })
  execFileSync('git', ['sparse-checkout', 'set', '--no-cone', 'dishes/**/*.md'], { cwd: tmp, stdio: 'inherit' })

  const current = new Set(JSON.parse(fs.readFileSync(path.join(root, 'public', 'data', 'meals.json'), 'utf8')).map(m => m.name))
  const files = []
  for (const dir of fs.readdirSync(dishesDir)) {
    const p = path.join(dishesDir, dir)
    if (!fs.statSync(p).isDirectory()) continue
    for (const f of fs.readdirSync(p)) {
      if (f.endsWith('.md')) files.push({ folder: dir, file: path.join(p, f) })
      else {
        const sub = path.join(p, f)
        if (fs.statSync(sub).isDirectory()) {
          for (const g of fs.readdirSync(sub)) if (g.endsWith('.md')) files.push({ folder: dir, file: path.join(sub, g) })
        }
      }
    }
  }

  // 每 100g 可食部的粗略 P/C/F 克数；用于没有逐道称重时的估算
  const NUT = [
    [/五花肉|猪五花/, [10, 0, 35]], [/猪蹄|猪肘/, [17, 0, 20]], [/排骨|猪排/, [18, 0, 18]], [/猪肉|肉末|里脊|猪/, [20, 0, 10]],
    [/牛腩|牛腱|牛肉|牛排/, [26, 0, 15]], [/羊肉|羊排/, [25, 0, 20]], [/鸡翅/, [20, 0, 15]], [/鸡腿|鸡胸|鸡肉|鸡/, [27, 0, 8]],
    [/鸭/, [19, 0, 18]], [/鱼|鲈鱼|鳕鱼|三文鱼|带鱼|鳝/, [20, 0, 5]], [/虾|小龙虾|虾仁/, [20, 0, 2]], [/蟹/, [18, 0, 3]],
    [/鸡蛋|蛋液|蛋黄|蛋白/, [13, 1, 10]], [/牛奶/, [3, 5, 3]], [/淡奶油|奶油/, [2, 3, 35]], [/芝士|奶酪|马苏里拉|马斯卡彭/, [20, 2, 30]],
    [/黄油/, [1, 0, 81]], [/面粉|高筋|低筋|中筋/, [10, 74, 1]], [/糯米粉|粘米粉|澄面|淀粉/, [7, 78, 0]],
    [/米饭|大米|糙米|糯米/, [7, 78, 1]], [/面条|挂面|意面|面/, [10, 70, 1]], [/粉丝|粉条|米粉|河粉/, [2, 80, 0]],
    [/面包|吐司/, [8, 50, 4]], [/饼干|消化饼/, [7, 70, 15]], [/燕麦/, [13, 66, 7]], [/玉米/, [3, 19, 1]],
    [/土豆|马铃薯/, [2, 17, 0]], [/红薯|紫薯|芋头|山药/, [2, 20, 0]], [/南瓜/, [1, 6, 0]], [/番茄|西红柿/, [1, 4, 0]],
    [/豆腐|豆干|腐竹/, [8, 2, 5]], [/黄豆|红豆|绿豆|鹰嘴豆/, [20, 60, 5]], [/红豆沙|豆沙/, [5, 55, 1]], [/椰蓉|椰丝/, [5, 50, 30]],
    [/坚果|花生|核桃|杏仁|腰果|芝麻/, [20, 20, 50]], [/糖|冰糖|红糖|白糖|蜂蜜|麦芽糖/, [0, 100, 0]],
    [/食用油|橄榄油|玉米油|花生油|植物油|油/, [0, 0, 100]], [/酱油|生抽|老抽|蚝油|豆瓣酱|酱/, [5, 5, 2]], [/盐|水|清水|料酒|啤酒|咖啡|茶/, [0, 0, 0]],
    [/蔬菜|青菜|生菜|菠菜|白菜|西兰花|黄瓜|萝卜|藕|菌|菇|木耳|海带|葱|姜|蒜|椒/, [2, 5, 0]],
  ]
  const nutrientFor = (name) => {
    for (const [re, v] of NUT) if (re.test(name)) return v
    return [5, 10, 3]
  }
  const toGrams = (line) => {
    const m = line.match(/(\d+(?:\.\d+)?)/)
    if (!m) return null
    const n = Number(m[1])
    const unit = (line.match(/\d+(?:\.\d+)?\s*([^\s，,。；;）)]+)/) || [])[1] || ''
    const u = unit.toLowerCase()
    if (/斤/.test(u)) return n * 500
    if (/两/.test(u)) return n * 50
    if (/升|l/.test(u)) return n * 1000
    if (/克|g|ml|毫升/.test(u)) return n
    if (/个|只|颗|根|片|瓣|块|条|包|杯|勺|汤匙|茶匙/.test(u)) {
      const per = /瓣/.test(u) ? 5 : /片/.test(u) ? 25 : /根/.test(u) ? 30 : /杯/.test(u) ? 240 : /勺|汤匙/.test(u) ? 15 : /茶匙/.test(u) ? 5 : /包/.test(u) ? 100 : 50
      return n * per
    }
    return n
  }
  const clean = (s) => s.replace(/^[*-]\s*/, '').replace(/\*+\s*份数/g, '').replace(/\s+/g, ' ').replace(/[|]/g, ' ').replace(/\s*=\s*/g, ' ').trim()

  const parse = ({ folder, file }) => {
    const raw = fs.readFileSync(file, 'utf8')
    const title = raw.match(/^#\s+(.+?)(?:的做法)?\s*$/m)?.[1]?.trim()
    if (!title) return null
    const body = raw.replace(/^#.*$/m, '')
    const sourceKcal = Number(body.match(/预估卡路里[：:]\s*(\d+)\s*大卡/)?.[1] ?? 0)
    const desc = body
      .split(/\n\s*\n/).map(s => s.trim())
      .find(s => s && !s.startsWith('!') && !s.startsWith('预估') && !s.startsWith('##') && !s.startsWith('---') && !s.startsWith('>'))
      ?.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ') ?? ''

    const sections = {}
    let current = ''
    for (const line of raw.split('\n')) {
      const h = line.match(/^##\s+(.+)$/)
      if (h) { current = h[1].trim(); sections[current] = []; continue }
      if (current) sections[current].push(line)
    }
    const ingKey = Object.keys(sections).find(k => k.includes('计算'))
    const stepKey = Object.keys(sections).find(k => k.includes('操作'))
    if (!ingKey || !stepKey) return null

    const ingredients = (sections[ingKey] || []).map(clean).filter(l =>
      l && !/^(以下是|按照|总量|每次|注意|如果|---|每份|份数|\d+\s*[份人])/.test(l)
    )
    const steps = (sections[stepKey] || [])
      .map(l => l.replace(/^\s*[-*]\s*/, '').replace(/^\s*\d+[.、]\s*/, '').trim())
      .filter(l => l && !l.startsWith('#') && !l.startsWith('!['))
    if (ingredients.length < 2 || steps.length < 2) return null

    let servings = 1
    const servingText = [raw, ...(sections[ingKey] || [])].join('\n')
    const sm = servingText.match(/(?:按|约|够)?\s*(\d+(?:\.\d+)?)\s*(?:份|人)/)
    if (sm) servings = Math.max(1, Math.min(6, Number(sm[1])))

    let totalP = 0, totalC = 0, totalF = 0, totalG = 0
    for (const line of ingredients) {
      if (/^(水|清水|饮用水)/.test(line)) continue
      const g = toGrams(line)
      const [p, c, f] = nutrientFor(line)
      if (g) {
        if (g > 0 && g < 5000) {
          totalG += g
          totalP += p * g / 100
          totalC += c * g / 100
          totalF += f * g / 100
        }
      } else if (!/盐|胡椒|花椒|八角|桂皮|香叶|葱|姜|蒜|料酒|生抽|老抽|醋|糖|油/.test(line)) {
        totalG += 100
        totalP += p
        totalC += c
        totalF += f
      }
    }
    if (totalG < 60) return null
    const calc = 4 * totalP + 4 * totalC + 9 * totalF
    if (calc <= 0) return null
    // 来源的「预估卡路里」通常按整锅计；用它校准总量，再按份数拆分。
    // 这样 kcal 与来源一致，宏量比例仍来自食材，避免只凭热量反推蛋白/脂肪。
    const scale = sourceKcal > 0 ? sourceKcal / calc : 1
    totalP *= scale
    totalC *= scale
    totalF *= scale
    const totalKcal = 4 * totalP + 4 * totalC + 9 * totalF
    const kcalCapG = totalKcal > 900 ? (900 / totalKcal) * totalG : totalG
    const perServingG = Math.max(80, Math.min(600, totalG / servings, kcalCapG))
    const scaleToServing = perServingG / totalG
    const nutrition = {
      protein: Math.round(totalP * scaleToServing * 10) / 10,
      carbs: Math.round(totalC * scaleToServing * 10) / 10,
      fat: Math.round(totalF * scaleToServing * 10) / 10,
    }
    if (nutrition.protein > 100 || nutrition.carbs > 150 || nutrition.fat > 90) return null
    const emoji = /蛋糕|面包|吐司|饼干|曲奇|挞|派|塔|布丁|慕斯|雪媚娘|麻薯/.test(title) ? '🍰'
      : /奶茶|饮|茶|酒|咖啡|汁/.test(title) ? '🥤'
      : /面|粉|米线|意面/.test(title) ? '🍜'
      : /饭|粥/.test(title) ? '🍚'
      : /鱼|虾|蟹|鳝|蚝/.test(title) ? '🐟'
      : /鸡/.test(title) ? '🍗'
      : /牛|羊|猪|肉|排/.test(title) ? '🍖'
      : /蛋/.test(title) ? '🥚'
      : /豆腐|豆/.test(title) ? '🫘' : '🍲'
    const methods = ['炒','蒸','煮','炖','烤','炸','煎','焖','凉拌','卤','烘焙','熬'].filter(x => raw.includes(x)).slice(0, 2)
    const flavors = ['麻辣','酸辣','酸甜','糖醋','咸鲜','清淡','酱香','孜然','蒜香','五香','奶香','咖喱','甜','辣'].filter(x => raw.includes(x)).slice(0, 2)
    const category = folder === 'dessert' ? 'bakery' : folder === 'breakfast' || folder === 'drink' ? 'snack' : 'home'
    const mealType = folder === 'breakfast' ? ['breakfast'] : folder === 'dessert' || folder === 'drink' ? ['breakfast', 'lunch'] : ['lunch', 'dinner']

    if (/示例|模板/.test(title)) return null

    return {
      id: 'htc-' + path.basename(file, '.md').replace(/\s+/g, '-'),
      name: title.replace(/的做法$/, ''),
      category,
      cuisine: 'generic',
      methods: methods.length ? methods : ['煮'],
      flavors: flavors.length ? flavors : ['咸鲜'],
      emoji,
      kcal: Math.round(4 * nutrition.protein + 4 * nutrition.carbs + 9 * nutrition.fat),
      desc: desc.slice(0, 120) || `${title}，来自 HowToCook 的家常做法。`,
      ingredients,
      steps: steps.slice(0, 8),
      nutrition,
      servingSize: { amount: Math.round(perServingG), unit: 'g' },
      mealType,
      nutritionQuality: 'estimated',
      source: { name: 'HowToCook', url: 'https://github.com/Anduin2017/HowToCook', license: 'Unlicense' },
    }
  }

  const imported = []
  const skipped = []
  for (const f of files) {
    try {
      const m = parse(f)
      if (!m) { skipped.push(f.file); continue }
      if (current.has(m.name)) { skipped.push(m.name); continue }
      imported.push(m)
    } catch (e) { skipped.push(`${f.file}: ${e.message}`) }
  }

  fs.writeFileSync(outFile, JSON.stringify(imported, null, 2) + '\n')
  console.log(`[import] 解析 ${files.length} 个 Markdown，导入 ${imported.length} 道，跳过 ${skipped.length} 道`)
  console.log(`[import] 写入 ${path.relative(root, outFile)}`)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}
