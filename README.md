# 🍜 每日食光 · EveryDay Food

> 深夜食堂风的暗色玻璃拟态中文美食应用 —— 797 道家常菜、营养食谱与食疗/烘焙/小吃，热量计算、智能三餐搭配、年夜饭生成器、家庭餐桌与购物清单，一个纯前端 SPA 全搞定。

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38BDF8?logo=tailwindcss&logoColor=white)
![Deploy](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)
![SPA](https://img.shields.io/badge/SPA-纯前端-8B5CF6)

## ✨ 功能特性

- 📚 **797 道食谱库**：减脂 / 增肌 / 维持 / 营养四大类各 50+ 道，外加 418 道家常菜，以及食疗食补 51 道 / 烘焙 50 道 / 小吃 68 道，每道菜含食材、做法步骤与完整营养数据
- 🔍 **四维筛选**：分类（减脂 / 增肌 / 维持 / 营养 / 家常 / 食疗食补 / 烘焙 / 小吃）+ 餐次（早 / 午 / 晚）+ 地区菜系（川 / 湘 / 粤 / 鄂 / 鲁 / 苏浙 / 北方）+ 关键词搜索与 kcal / 蛋白质排序，组合过滤即时生效
- 🔥 **热量计算器**：输入身体参数 → BMI（中国成人标准）、BMR（Mifflin-St Jeor 公式）、TDEE、目标热量、宏量克数（4-4-9 法则）与三餐热量分配；结果自动持久化到 localStorage，刷新不丢
- 🍽️ **每日三餐智能搭配**：按「早餐 / 午餐 / 晚餐」餐次从全库抽取，三餐互不重复；热量计算器一键「生成今日搭配」，结果即替换当日计划
- 🧧 **年夜饭生成器**：凉菜 / 硬菜 / 热菜 / 汤 / 主食 / 甜品六池随机配出一桌 11 道菜（2+3+3+1+1+1），支持整桌重抽与单道「换一道」，配好一键加入家庭餐桌
- 🛒 **家庭餐桌**：全库多选加入，实时汇总 kcal / 蛋白质 / 碳水 / 脂肪；一键生成购物清单，按食材自动合并去重、一键复制
- 🍳 **做法详情弹窗**：每道菜卡片点击即开，食材清单 + 分步做法 + 每份与每 100g 营养一目了然
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
| 纯前端 SPA | 无后端依赖，797 道食谱数据全部本地打包 |

## 🚀 快速开始

```bash
# 克隆仓库
git clone https://github.com/Jiayu-zheng1/EveryDay_Food.git
cd EveryDay_Food

# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 构建生产产物（输出到 dist/）
npm run build

# 本地预览生产构建
npm run preview
```

## ☁️ 部署（Cloudflare Pages）

项目已为 Cloudflare Pages 就绪，`public/_redirects` 与 `public/_headers` 已提交到仓库：

- `public/_redirects`：`/* /index.html 200` —— 纯前端 SPA fallback，深链接刷新不再 404
- `public/_headers`：`/assets/*` 一年强缓存（immutable），`/*` 协商缓存

**方式一 · Dashboard 连 Git**：在 Cloudflare Pages 新建项目 → 连接 GitHub 仓库 `EveryDay_Food` → 构建配置：

| 配置项 | 值 |
| --- | --- |
| 构建命令 | `npm run build` |
| 输出目录 | `dist` |

**方式二 · Wrangler CLI**：

```bash
npx wrangler pages deploy dist --project-name every-day-food
```

## 📊 数据说明

### 食谱总量与分类

797 道菜全部本地打包（`src/data/` 分批文件合并）：

| 分类 | 数量 |
| --- | --- |
| 减脂餐（fat-loss） | 53 |
| 增肌餐（muscle-gain） | 52 |
| 维持餐（maintain） | 52 |
| 营养餐（nutrition） | 53 |
| 家常菜（home） | 418 |
| 食疗食补（therapy） | 51 |
| 烘焙（bakery） | 50 |
| 小吃（snack） | 68 |
| **合计** | **797** |

其中家常菜 118 道 / 小吃 18 道 / 食疗食补 1 道 / 营养餐 1 道（共 138 道）收录自《老乡鸡菜品溯源报告》整理菜品（Gar-b-age/CookLikeHOC）做法要点（家庭份重写，商业份量换算为家庭份）。

### 菜系分布

| 菜系 | 数量 | | 菜系 | 数量 |
| --- | --- | --- | --- | --- |
| 家常 generic | 511 | | 苏浙 suzhe | 43 |
| 北方 bei | 78 | | 湘菜 xiang | 14 |
| 粤菜 yue | 78 | | 鲁菜 lu | 11 |
| 川菜 chuan | 53 | | 鄂菜 e | 9 |

### 数据字段 Schema

每道菜 13 个字段，结构统一：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 唯一标识（全库唯一） |
| `name` | `string` | 中文菜名 |
| `category` | `string` | 分类：`fat-loss` / `muscle-gain` / `maintain` / `nutrition` / `home` / `therapy` / `bakery` / `snack` |
| `cuisine` | `string` | 地区菜系：`chuan` / `xiang` / `yue` / `e` / `lu` / `suzhe` / `bei` / `generic` |
| `emoji` | `string` | 食物图标（渐变底色 + emoji 代替真实图片） |
| `kcal` | `number` | 每份热量（kcal） |
| `desc` | `string` | 一句话简介 |
| `ingredients` | `string[]` | 食材清单 |
| `steps` | `string[]` | 做法步骤（3–6 步） |
| `nutrition` | `{ protein, carbs, fat }` | 每份三大营养素（克） |
| `per100g` | `{ protein, carbs, fat }` | 每 100g 营养密度（克） |
| `servingSize` | `{ amount, unit }` | 每份的克数与单位 |
| `mealType` | `Array<'breakfast'\|'lunch'\|'dinner'>` | 适合的餐次（支撑三餐搭配按餐次抽取） |

### 营养自洽硬规则

- 每份三大营养素 = `per100g × servingSize.amount / 100`（四舍五入）
- 每份热量 ≈ `蛋白质 × 4 + 碳水 × 4 + 脂肪 × 9`（误差 ±10%）

## 📁 目录结构

```
EveryDay_Food/
├── public/
│   ├── _redirects              # SPA fallback：/* → /index.html
│   ├── _headers                # 静态资源缓存策略
│   └── redesign/               # 设计方案展示页（多风格对比）
├── src/
│   ├── api/
│   │   └── meals.js            # 数据访问层（模拟异步，可无缝替换为真实接口）
│   ├── components/             # UI 组件：卡片 / 弹窗 / 计算器 / 年夜饭 / 家庭餐桌…
│   ├── data/                   # 797 道食谱数据（分批文件合并）
│   │   ├── meals.ts            # 合并入口 + 基础菜谱 + 分类展示元信息
│   │   ├── category-expansion.ts
│   │   ├── category-extra-*.ts # 四大分类二次扩充
│   │   ├── therapy-meals.ts / bakery-meals.ts / snack-meals.ts  # 食疗食补 / 烘焙 / 小吃
│   │   ├── lxj-home-a.ts / lxj-home-b.ts / lxj-home-c.ts / lxj-extra.ts  # 老乡鸡收录 138 道（做法参考真实配料步骤，家庭份重写）
│   │   └── home-meals/         # a~f 六批家常菜（每批 50 道）
│   ├── hooks/                  # useMeals / useNutrition / useFamilyTable / useDailyPlan…
│   ├── lib/                    # nutrition.js 营养算法 / shoppingList.js 购物清单解析
│   ├── App.jsx                 # 应用入口（首页 / 菜谱库 / 年夜饭 / 我的餐桌 四模块）
│   ├── main.tsx
│   └── index.css               # Tailwind v4 + 暗色玻璃拟态主题
├── docs/
│   └── screenshots/            # README 截图
├── index.html
├── package.json
└── vite.config.js
```
