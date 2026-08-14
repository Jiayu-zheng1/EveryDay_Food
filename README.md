# 🍜 每日食光 · EveryDay Food

> 深夜食堂风的暗色玻璃拟态中文美食应用 —— 1077 道家常菜、营养食谱与食疗/烘焙/小吃，热量计算、智能三餐搭配、年夜饭生成器、家庭餐桌与购物清单，一个纯前端 SPA 全搞定。

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38BDF8?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)
![Deploy](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-可安装-5B21B6)
![SPA](https://img.shields.io/badge/SPA-纯前端-8B5CF6)

## ⭐ 支持项目

> 创作不易，如果这个项目对你有帮助，可以帮忙去 [GitHub](https://github.com/Jiayu-zheng1/EveryDay_Food) 点一个 **Star** ⭐ 支持一下，谢谢！

[![GitHub stars](https://img.shields.io/github/stars/Jiayu-zheng1/EveryDay_Food?style=social&label=Star)](https://github.com/Jiayu-zheng1/EveryDay_Food)
[![GitHub forks](https://img.shields.io/github/forks/Jiayu-zheng1/EveryDay_Food?style=social&label=Fork)](https://github.com/Jiayu-zheng1/EveryDay_Food)
[![GitHub](https://img.shields.io/badge/GitHub-Jiayu--zheng1%2FEveryDay__Food-8B5CF6?logo=github&logoColor=white)](https://github.com/Jiayu-zheng1/EveryDay_Food)

## ✨ 功能特性

- 📚 **1077 道食谱库**：减脂 / 增肌 / 维持 / 营养四大类各 50+ 道，外加 672 道家常菜，以及食疗食补 51 道 / 烘焙 50 道 / 小吃 94 道，每道菜含食材、做法步骤与完整营养数据
- 🔍 **四维筛选**：分类（减脂 / 增肌 / 维持 / 营养 / 家常 / 食疗食补 / 烘焙 / 小吃）+ 餐次（早 / 午 / 晚）+ 地区菜系（川 / 湘 / 粤 / 鄂 / 鲁 / 苏浙 / 北方 / **徽菜 / 闽菜 / 东北 / 滇菜 / 陕菜 / 新疆**）+ 关键词搜索（匹配菜名、简介与**食材**）与 kcal / 蛋白质排序，组合过滤即时生效
- 🔥 **热量计算器**：输入身体参数 → BMI（中国成人标准）、BMR（Mifflin-St Jeor 公式）、TDEE、目标热量、宏量克数（4-4-9 法则）与三餐热量分配；带**表单校验、重置与 NaN 防护**（无效输入给提示而非 NaN），结果自动持久化到 localStorage，刷新不丢
- 🍽️ **每日三餐智能搭配**：按「早餐 / 午餐 / 晚餐」餐次从全库抽取，三餐互不重复；**按日期种子随机**（同一天内多次刷新结果稳定）；热量计算器一键「生成今日搭配」，结果即替换当日计划
- 🧧 **年夜饭生成器**：凉菜 / 硬菜 / 热菜 / 汤 / 主食 / 甜品六池随机配出一桌 11 道菜（2+3+3+1+1+1），支持整桌重抽与单道「换一道」，配好一键加入家庭餐桌；**热菜池候选已扩充**（通用技法关键词，候选约 195 道），**所选菜系某池无候选时提示已用全库补充**，不再静默回退
- 🛒 **家庭餐桌**：全库多选加入，实时汇总 kcal / 蛋白质 / 碳水 / 脂肪；一键生成购物清单，**跨单位归一合并**（如「黄瓜 100 克 + 半根」→ 200 克）、调味品自动分离、一键复制
- 🍳 **做法详情弹窗**：每道菜卡片点击即开，食材清单 + 分步做法 + 每份与每 100g 营养一目了然；**弹窗内可直接加入餐桌，同款多变体时提示对比后分别加入**
- 🔗 **Hash 路由**：`#home` / `#library` / `#newyear` / `#table` 直达各模块，刷新保持当前页、浏览器前进 / 后退同步，链接可直接分享
- 📱 **PWA 可安装**：`manifest.json` + Service Worker（生产环境注册），构建产物缓存优先、数据网络优先离线回退，支持离线打开应用外壳
- ♿ **无障碍**：heading-order / nested-interactive / region 等 axe 规则全绿，键盘可完整操作
- 🌙 **暗色玻璃拟态 UI**：深夜食堂风设计，玻璃卡片、渐变品牌色、鼠标跟随光源、滚动进场动画，全套动效打磨

## 📸 截图

| 首页 · 今日搭配 | 菜谱库 · 四维筛选 |
| :---: | :---: |
| ![首页 · 今日搭配](docs/screenshots/home-dailyplan.webp) | ![菜谱库 · 四维筛选](docs/screenshots/recipe-library.webp) |

| 年夜饭生成器 | 我的餐桌 · 购物清单 |
| :---: | :---: |
| ![年夜饭生成器](docs/screenshots/newyear-dinner.webp) | ![我的餐桌 · 购物清单](docs/screenshots/my-table.webp) |

## 🛠️ 技术栈

| 技术 | 说明 |
| --- | --- |
| [React](https://react.dev/) 18 | UI 组件与状态管理（Hooks 驱动） |
| [Vite](https://vitejs.dev/) 6 | 开发服务器与构建工具 |
| [Tailwind CSS](https://tailwindcss.com/) v4 | 原子化样式（`@tailwindcss/vite` 插件） |
| TypeScript ✓ | 全库静态类型（strict 模式） |
| [Vitest](https://vitest.dev/) ✓ | 单元测试（44 用例，见下方「测试」） |
| PWA ✓ | `manifest.json` + Service Worker，生产可安装 / 离线 |
| 纯前端 SPA | 无后端依赖；1077 道食谱数据以静态 JSON（`public/data/meals.json`）运行时加载，不打包进 JS bundle |

## 🚀 快速开始

```bash
# 克隆仓库
git clone https://github.com/Jiayu-zheng1/EveryDay_Food.git
cd EveryDay_Food

# 安装依赖
npm install

# 启动开发服务器（先自动导出数据，默认 http://localhost:5173）
npm run dev

# 运行单元测试（44 用例）
npm test

# 构建生产产物（导出数据 → tsc 类型检查 → vite build，输出到 dist/）
npm run build

# 本地预览生产构建
npm run preview
```

## 🧪 测试

44 个 Vitest 用例（`npm test`），node 环境纯函数单测（无 DOM、无网络），覆盖：

- **营养计算**：BMI / BMR / TDEE / 每日目标热量与宏量克数，含除零保护与分类边界
- **智能搭配防卡死**：`generateSmartPlan` 快速返回 + 结果合理性回归（超时防挂起）
- **购物清单解析**：同单位与跨单位合并（黄瓜 100 克 + 半根 → 200 克）、「各」句式 / 分数半量 / 共享数量行解析、调味品分离
- **表单校验**：`validateNutritionForm` 年龄 / 身高 / 体重边界
- **数据自洽**：对 `public/data/meals.json` 全量断言宏量与热量吻合（见「数据说明」）

## ☁️ 部署（Cloudflare Pages）

`public/_redirects` 与 `public/_headers` 已提交到仓库：

- `public/_redirects`：`/* /index.html 200` —— 纯前端 SPA fallback，深链接刷新不再 404
- `public/_headers`：`/assets/*` 一年强缓存（immutable），`/*` 协商缓存

**方式一 · GitHub Actions 自动部署（推荐）**：`.github/workflows/deploy.yml` 已配置 —— main 分支 push 时自动执行 `npm ci → npm test → npm run build`，再用 wrangler-action 部署到 Cloudflare Pages（项目名 `everyday-food`）。首次使用：

1. 在 Cloudflare 创建 Pages 项目 `everyday-food`（若项目名不同，改 workflow 里的 `--project-name` 即可）
2. 在仓库 **Settings → Secrets and variables → Actions** 配置两个 secret：
   - `CLOUDFLARE_API_TOKEN` — Cloudflare API Token（权限：Cloudflare Pages → Edit）
   - `CLOUDFLARE_ACCOUNT_ID` — Cloudflare 账号 ID（仪表盘首页右下角可查）
3. 之后每次 push 到 main 自动构建部署；也可在 Actions 页面手动触发（`workflow_dispatch`）

**方式二 · Dashboard 连 Git**：新建 Pages 项目 → 连接 GitHub 仓库 `EveryDay_Food` → 构建配置：

| 配置项 | 值 |
| --- | --- |
| 构建命令 | `npm run build` |
| 输出目录 | `dist` |

**方式三 · Wrangler CLI**：

```bash
npm run build
npx wrangler pages deploy dist --project-name everyday-food
```

## 📊 数据说明

数据源为 `src/data/*.ts`（TypeScript 分批文件）；`npm run dev` / `npm run build` 时由 `scripts/export-data.mjs` 用 esbuild 打包后导出为 `public/data/meals.json`（1077 道，约 827KB）。运行时由 `src/api/meals.ts` fetch 加载并内存缓存 —— **数据不打包进 JS bundle**（主 chunk 806KB → 约 200KB），静态托管可 gzip。

### 食谱总量与分类

| 分类 | 数量 |
| --- | --- |
| 减脂餐（fat-loss） | 53 |
| 增肌餐（muscle-gain） | 52 |
| 维持餐（maintain） | 52 |
| 营养餐（nutrition） | 53 |
| 家常菜（home） | 672 |
| 食疗食补（therapy） | 51 |
| 烘焙（bakery） | 50 |
| 小吃（snack） | 94 |
| **合计** | **1077** |

其中家常菜 118 道 / 小吃 18 道 / 食疗食补 1 道 / 营养餐 1 道（共 138 道）收录自《老乡鸡菜品溯源报告》整理菜品（Gar-b-age/CookLikeHOC）做法要点（家庭份重写，商业份量换算为家庭份）。

### 菜系分布

| 菜系 | 数量 | | 菜系 | 数量 |
| --- | --- | --- | --- | --- |
| 家常 generic | 493 | | 湘菜 xiang | 54 |
| 北方 bei | 78 | | 鲁菜 lu | 11 |
| 粤菜 yue | 79 | | 鄂菜 e | 9 |
| 川菜 chuan | 53 | | 闽菜 min | 42 |
| 徽菜 hui | 49 | | 滇菜 dian | 45 |
| 东北菜 dongbei | 40 | | 陕菜 shan | 40 |
| 苏浙 suzhe | 42 | | 新疆 xinjiang | 42 |

轮 1（徽 / 闽 / 东北，各 40 道）：徽菜 49 道（9 道既有菜重标 + 新增 40 道）、闽菜 42 道（2 道既有菜重标 + 新增 40 道）、东北菜 40 道（本次新增），合计新增 120 道。
轮 2（滇 / 陕 / 新疆 / 湘，各 40 道）：滇菜 45 道（5 道既有菜重标 + 新增 40 道）、陕菜 40 道（本次新增）、新疆菜 42 道（2 道既有菜重标 + 新增 40 道）、湘菜 54 道（既有 14 道 + 新增 40 道），合计新增 160 道。
两轮累计新增 280 道，菜系筛选共 14 项（含家常）。

### 数据字段 Schema

每道菜 13 个字段，结构统一：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 唯一标识（全库唯一） |
| `name` | `string` | 中文菜名 |
| `category` | `string` | 分类：`fat-loss` / `muscle-gain` / `maintain` / `nutrition` / `home` / `therapy` / `bakery` / `snack` |
| `cuisine` | `string` | 地区菜系：`chuan` / `xiang` / `yue` / `e` / `lu` / `suzhe` / `bei` / `hui` / `min` / `dongbei` / `dian` / `shan` / `xinjiang` / `generic` |
| `emoji` | `string` | 食物图标（渐变底色 + emoji 代替真实图片） |
| `kcal` | `number` | 每份热量（kcal） |
| `desc` | `string` | 一句话简介 |
| `ingredients` | `string[]` | 食材清单 |
| `steps` | `string[]` | 做法步骤（3–6 步） |
| `nutrition` | `{ protein, carbs, fat }` | 每份三大营养素（克） |
| `per100g` | `{ protein, carbs, fat }` | 每 100g 营养密度（克） |
| `servingSize` | `{ amount, unit }` | 每份的克数与单位 |
| `mealType` | `Array<'breakfast'\|'lunch'\|'dinner'>` | 适合的餐次（支撑三餐搭配按餐次抽取） |

`mealType` 全库 1077 道均非空（早 / 午 / 晚至少一项），三餐搭配按餐次抽取无盲区。

### 营养自洽规则（由测试断言）

- 每份三大营养素 ≈ `per100g × servingSize.amount / 100`（四舍五入）：全量 1077 道中 ≥90% 宏量单元精确相等，抽样 20 道容差 20%
- 每份热量 ≈ `蛋白质 × 4 + 碳水 × 4 + 脂肪 × 9`：≥95% 菜品误差 ≤10%（抽样 20 道同样容差 10%）

## 📁 目录结构

```
EveryDay_Food/
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD：main push → npm ci → npm test → build → Cloudflare Pages
├── public/
│   ├── _redirects                # SPA fallback：/* → /index.html
│   ├── _headers                  # 静态资源缓存策略
│   ├── manifest.json             # PWA manifest（可安装）
│   ├── sw.js                     # Service Worker（构建产物缓存优先，数据网络优先 + 离线回退）
│   ├── favicon.svg               # SVG 站点图标
│   ├── data/
│   │   └── meals.json            # 全量数据产物（1077 道 827KB，构建时由 export-data.mjs 生成）
│   └── redesign/                 # 设计方案展示页（多风格对比）
├── scripts/
│   └── export-data.mjs           # 把 src/data/*.ts 导出为 public/data/meals.json
├── src/
│   ├── api/
│   │   └── meals.ts              # 数据访问层（fetch /data/meals.json + 内存缓存 + 可播种随机数）
│   ├── components/               # UI 组件：卡片 / 弹窗 / 计算器 / 年夜饭 / 家庭餐桌…
│   ├── data/                     # 1077 道食谱数据（分批 TS 文件合并）
│   │   ├── meals.ts              # 合并入口 + 基础菜谱 + 分类展示元信息
│   │   ├── category-expansion.ts # 四大分类首轮扩充
│   │   ├── category-extra-*.ts   # 四大分类二次扩充
│   │   ├── therapy-meals.ts / bakery-meals.ts / snack-meals.ts  # 食疗食补 / 烘焙 / 小吃
│   │   ├── cuisine-hui.ts / cuisine-min.ts / cuisine-dongbei.ts # 徽菜 / 闽菜 / 东北菜（各 40 道）
│   │   ├── cuisine-dian.ts / cuisine-shan.ts / cuisine-xinjiang.ts / cuisine-xiang2.ts # 滇菜 / 陕菜 / 新疆菜 / 湘菜加深（各 40 道）
│   │   ├── lxj-home-a~c.ts / lxj-extra.ts   # 老乡鸡收录 138 道（家庭份重写）
│   │   └── home-meals/           # a~f 六批家常菜（每批 50 道）
│   ├── hooks/                    # useMeals / useNutrition / useFamilyTable / useDailyPlan / useTilt…
│   ├── lib/                      # nutrition.ts 营养算法 / shoppingList.ts 购物清单解析（含 .test.ts）
│   ├── App.tsx                   # 应用入口 + hash 路由（#home / #library / #newyear / #table）
│   ├── main.tsx                  # 入口（生产环境注册 Service Worker）
│   ├── types.ts                  # Meal 等共享类型定义
│   └── index.css                 # Tailwind v4 + 暗色玻璃拟态主题
├── docs/
│   └── screenshots/              # README 截图
├── index.html
├── package.json
├── tsconfig.json
├── vitest.config.ts              # Vitest 配置（node 环境，src/**/*.test.ts）
└── vite.config.js
```
