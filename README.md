# 🍜 每日食光 · EveryDay Food

深夜食堂风格的中文食谱站：1077 道家常菜和健康食谱，热量、营养、做法都替你算好、整理好了。纯前端 SPA，线上在 [meirishiguang.com](https://meirishiguang.com)。

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38BDF8?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)
![Deploy](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-可安装-5B21B6)

## 支持一下

做这个项目花了不少功夫，如果对你有用，欢迎去 [GitHub](https://github.com/Jiayu-zheng1/EveryDay_Food) 点个 Star ⭐，谢谢！

[![GitHub stars](https://img.shields.io/github/stars/Jiayu-zheng1/EveryDay_Food?style=social&label=Star)](https://github.com/Jiayu-zheng1/EveryDay_Food)
[![GitHub forks](https://img.shields.io/github/forks/Jiayu-zheng1/EveryDay_Food?style=social&label=Fork)](https://github.com/Jiayu-zheng1/EveryDay_Food)

## 功能

- **1077 道食谱**：减脂 / 增肌 / 维持 / 营养四大类各 50 多道，另有 672 道家常菜、51 道食疗、50 道烘焙、94 道小吃，每道都带食材、做法和营养数据。
- **筛选和搜索**：分类、餐次（早 / 午 / 晚）、菜系（川 / 湘 / 粤 / 鄂 / 鲁 / 苏浙 / 北方 / 徽 / 闽 / 东北 / 滇 / 陕 / 新疆）、做法、口味都能组合着筛，也能按菜名和食材搜关键词，按热量或蛋白质排序。
- **热量计算器**：填年龄、身高、体重，算 BMI、基础代谢、每日目标热量和三大营养素克数；输入不对会提示而不是给 NaN，结果存在本地，刷新不丢。
- **每日三餐搭配**：按餐次从全库抽菜，同一天内刷新结果不变；计算器里也能一键生成今天的搭配。
- **年夜饭生成器**：凉菜 / 硬菜 / 热菜 / 汤 / 主食 / 甜品各抽几道凑一桌，哪道不顺眼就单换哪道，配好直接加进家庭餐桌。
- **家庭餐桌**：想吃的菜都加进来，实时汇总热量和营养，一键生成购物清单——「黄瓜 100 克 + 半根」会自动合并成 200 克，调味品单独归一类。
- **做法弹窗**：点卡片看食材、分步做法、每份和每 100g 的营养，弹窗里也能直接加菜。
- **PWA**：能装到桌面 / 手机，离线也能打开。
- 深色玻璃拟态 UI，滚动动画、鼠标光效都有，效果直接看线上。

## 截图

| 首页 · 今日搭配 | 菜谱库 · 筛选 |
| :---: | :---: |
| ![首页 · 今日搭配](docs/screenshots/home-dailyplan.webp) | ![菜谱库 · 筛选](docs/screenshots/recipe-library.webp) |

| 年夜饭生成器 | 我的餐桌 · 购物清单 |
| :---: | :---: |
| ![年夜饭生成器](docs/screenshots/newyear-dinner.webp) | ![我的餐桌 · 购物清单](docs/screenshots/my-table.webp) |

## 技术栈

React 18 + TypeScript（strict）+ Vite 6 + Tailwind CSS v4 + Vitest。食谱数据在构建时从 `src/data/*.ts` 导出成 JSON（约 830KB），运行时 fetch 加载、内存缓存，不打包进 JS bundle。

## 本地跑起来

```bash
git clone https://github.com/Jiayu-zheng1/EveryDay_Food.git
cd EveryDay_Food
npm install

npm run dev      # 开发服务器，默认 http://localhost:5173
npm test         # 44 个单元测试
npm run build    # 生产构建，输出到 dist/
npm run preview  # 本地预览生产包
```

## 测试

`npm test` 跑 44 个 Vitest 用例，都是 node 环境的纯函数测试，不碰 DOM 和网络：

- 营养计算：BMI / BMR / TDEE / 目标热量与宏量克数，含除零和边界
- 智能搭配：超时防挂起 + 结果合理性回归
- 购物清单：跨单位合并（黄瓜 100 克 + 半根 → 200 克）、分数半量、调味品分离
- 表单校验：年龄 / 身高 / 体重边界
- 数据自洽：全量断言每道菜宏量与热量吻合

## 部署

线上跑在 Cloudflare Pages，push 到 main 后 GitHub Actions 自动构建部署（项目名 `everyday-food`）。SPA fallback 和缓存策略写在 `public/_redirects`、`public/_headers` 里。

**方式一 · GitHub Actions（推荐，push 即部署）**

`.github/workflows/deploy.yml` 已配好，首次需要：

1. 在 Cloudflare 建 Pages 项目 `everyday-food`（项目名不同就改 workflow 里的 `--project-name`）
2. 仓库 Settings → Secrets and variables → Actions 加两个 secret：
   - `CLOUDFLARE_API_TOKEN`：Cloudflare API Token（权限 Pages → Edit）
   - `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 账号 ID（仪表盘首页右下角）
3. 之后每次 push 到 main 自动部署，也可以在 Actions 页面手动触发

**方式二 · Dashboard 连 Git**

新建 Pages 项目 → 连接仓库 `EveryDay_Food` → 构建命令 `npm run build`，输出目录 `dist`。

**方式三 · Wrangler CLI**

```bash
npm run build
npx wrangler pages deploy dist --project-name everyday-food
```

## 数据

数据源是 `src/data/*.ts`，构建时由 `scripts/export-data.mjs` 导出成 `public/data/meals.json`（1077 道，约 830KB），运行时由 `src/api/meals.ts` fetch 加载并缓存。

### 分类数量

| 分类 | 数量 |
| --- | --- |
| 减脂餐 | 53 |
| 增肌餐 | 52 |
| 维持餐 | 52 |
| 营养餐 | 53 |
| 家常菜 | 672 |
| 食疗食补 | 51 |
| 烘焙 | 50 |
| 小吃 | 94 |
| **合计** | **1077** |

家常菜里 138 道（118 家常 + 18 小吃 + 1 食疗 + 1 营养）整理自《老乡鸡菜品溯源报告》，按家庭份量重写。

### 菜系分布

| 菜系 | 数量 | | 菜系 | 数量 |
| --- | --- | --- | --- | --- |
| 家常 | 493 | | 湘菜 | 54 |
| 北方 | 78 | | 鲁菜 | 11 |
| 粤菜 | 79 | | 鄂菜 | 9 |
| 川菜 | 53 | | 闽菜 | 42 |
| 徽菜 | 49 | | 滇菜 | 45 |
| 东北菜 | 40 | | 陕菜 | 40 |
| 苏浙 | 42 | | 新疆 | 42 |

### 字段

每道菜 13 个字段：`id`（唯一）、`name`、`category`（分类）、`cuisine`（菜系）、`emoji`（图标）、`kcal`（每份热量）、`desc`（简介）、`ingredients`（食材）、`steps`（3–6 步做法）、`nutrition`（每份蛋白 / 碳水 / 脂肪）、`per100g`（每 100g 营养）、`servingSize`（份量）、`mealType`（早 / 午 / 晚餐次，全库非空，三餐搭配按它抽取）。

分类 key：`fat-loss` / `muscle-gain` / `maintain` / `nutrition` / `home` / `therapy` / `bakery` / `snack`
菜系 key：`chuan` / `xiang` / `yue` / `e` / `lu` / `suzhe` / `bei` / `hui` / `min` / `dongbei` / `dian` / `shan` / `xinjiang` / `generic`

营养数据有两道自检（测试里断言）：每份营养素 ≈ 每 100g × 份量 / 100；每份热量 ≈ 蛋白 × 4 + 碳水 × 4 + 脂肪 × 9。

## 目录结构

```
├── .github/workflows/deploy.yml  # CI/CD：push 自动构建部署
├── public/                       # 静态资源：manifest / sw / _redirects / _headers / data/meals.json
├── scripts/export-data.mjs       # 数据导出脚本
├── src/
│   ├── api/                      # 数据访问层
│   ├── components/               # UI 组件
│   ├── data/                     # 1077 道食谱数据（分批 TS 文件）
│   ├── hooks/                    # 自定义 hooks
│   ├── lib/                      # 营养算法 / 购物清单解析
│   ├── App.tsx                   # 入口 + hash 路由
│   └── index.css                 # Tailwind v4 主题
└── docs/screenshots/             # README 截图
```
