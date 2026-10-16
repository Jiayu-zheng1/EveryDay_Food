# 每日食光 · 抖音竖屏视频 30s

`index.html` 1080×1920 纯前端动画，30 秒循环，已按 GitHub README `Jiayu-zheng1/EveryDay_Food` 的完整介绍与 `brand-spec.md` 品牌资产（#0b0a10 深紫黑 + #8b7cf6 暖紫 + #f5a524 琥珀橙）实现。

## 预览
```bash
python3 -m http.server 8000 --directory douyin-video
# http://localhost:8000/index.html
# ?t=秒数 跳帧，如 ?t=14 看“真实截图”那一幕
```
双击 `index.html` 也能直接打开（图片与 GSAP 已内联，不依赖 CDN）。旧 18 秒版备份在 `index-18s.html`。

## 分镜（9 幕 · 30s，来自 GitHub README 结构）
| 时间 | 场景 | 来源 |
|---|---|---|
| 0-4.0s | Hook：今天吃什么？· 1077 道开箱即用 | README 首屏 + Hero |
| 4.0-8.5s | 品牌：每日食光 · meirishiguang.com · GitHub 开源 · 创作不易欢迎 Star ⭐ | README About / 支持一下 |
| 8.5-12.5s | 筛选：分类×餐次×菜系×做法×口味组合过滤 · 搜索·排序·分批渲染 | README 功能 #2 |
| 12.5-16.5s | 真实界面：docs/screenshots 4 张实拍（首页/菜谱库/年夜饭/餐桌） | README 截图 |
| 16.5-20.5s | 热量计算器：BMI/BMR/TDEE + 三大营养素 · 每日三餐 1 键生成 | README 功能 #3 #4 |
| 20.5-23.5s | 年夜饭生成器 + 家庭餐桌·购物清单（黄瓜 100g+半根→200g 自动合并） | README 功能 #5 #6 |
| 23.5-26.5s | 数据墙：14 菜系·8 分类·1077 构成·每道 13 字段·138 道老乡鸡溯源 | README 数据 |
| 26.5-28.5s | 技术栈与管线：React 18·TS 7·Vite 6·Tailwind v4·Vitest 44·CF Pages·约 830KB | README 技术栈/测试 |
| 28.5-30s | CTA：meirishiguang.com · GitHub Jiayu-zheng1/EveryDay_Food · PWA/MIT | README 部署 |

额外细节：关于页 GitHub 19 Commits · 0 Star/0 Fork 现状未编造，仅展示“欢迎 Star”引导文案；Topics、数据字段、目录结构等在对应幕以小字呈现。

## 转视频（抖音 9:16）
- **录屏最快**：全屏 F11 录 30s（`window.__recording=true` 时控件自动隐藏）
- **逐帧无损**：`playwright screenshot "?t=$t" --viewport-size=1080,1920` 拼 `ffmpeg -framerate 60 -i frame_%04d.png -c:v libx264 -pix_fmt yuv420p douyin30s.mp4`
- **HyperFrames**：`#stage` 已带 `data-composition-id="main" data-duration="30" data-width="1080" data-height="1920`，`npx hyperframes render --fps 60`

## 备注
- 4 张实拍截图已 base64 内嵌（16K/22K/13K/10K），食物氛围图 720px 压缩（`assets/gen` 6 张 Unsplash 免版权）
- 后续可把 `s7` QR 占位换真码：`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://meirishiguang.com`
