# 每日食光 · 抖音介绍视频 — 品牌资产与产品事实

## 产品事实（来自仓库 README / index.html / index.css，非记忆）
- **名称**：每日食光 · EveryDay Food（meirishiguang.com，GitHub: Jiayu-zheng1/EveryDay_Food）
- **定位**：深夜食堂风格的中文食谱站
- **核心数字**：1077 道食谱（家常菜 672 / 小吃 94 / 减脂 53 / 营养 53 / 增肌 52 / 维持 52 / 食疗 51 / 烘焙 50），14 个菜系，44 个单元测试
- **功能**：筛选搜索（分类/餐次/菜系/做法/口味/排序）、热量计算器（BMI/BMR/TDEE/三大营养素）、每日三餐搭配、年夜饭生成器、家庭餐桌+购物清单（跨单位合并）、PWA 可安装离线可用
- **技术**：React 18 + TS strict + Vite 6 + Tailwind v4 + Vitest，Cloudflare Pages 部署

## 视觉资产
- **Logo**：`public/favicon.svg` — 深紫黑圆角方（#0b0a10）+ 🍱 emoji。已 base64 内嵌备用：
  `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjMGIwYTEwIi8+PHRleHQgeD0iNTAiIHk9Ijc0IiBmb250LXNpemU9IjYyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn469PC90ZXh0Pjwvc3ZnPg==`
- **色板**（src/index.css 实测值）：
  - ink 页面底色 `#0b0a10`
  - ink-2 卡片表面 `#16131d`
  - ink-3 hover 表面 `#201a2e`
  - snow 主文字 `#f4f1fb`
  - mist 次要文字 `#9b94ab`
  - grape 暖紫 accent `#8b7cf6`
  - berry 深紫辅助 `#4a3f7d`
  - tangerine 琥珀橙 accent `#f5a524`
- **字体**：Space Grotesk（display 数字/英文）+ Noto Sans SC / 系统栈（中文）
- **UI 气质**：深紫黑底玻璃拟态卡片，滚动动画 + 鼠标光效

## 真实 UI 截图（仓库内，视频素材首选）
- `redesign-b-smoke/01-hero-initial.png` ~ `11-card-tilt.png`（14 张，含 hero/搜索/排序/卡片 tilt/目标规划等状态）
- `docs/screenshots/home-dailyplan.webp`、`recipe-library.webp`、`newyear-dinner.webp`、`my-table.webp`

## 禁区
- 不用紫渐变 AI slop（品牌本身是深紫黑+琥珀橙双色体系，用品牌实色即可，不叠渐变光晕）
- 不画 SVG 食物——食物一律真实照片或诚实占位
- 不编造数据：1077/14 菜系/44 测试等数字全部来自 README
