# 豆包语音 TTS · Key 获取与音色适配指引

## ⚠️ 为什么你给的 ark- key 不行
你提供的是 `ark-6b99e13e...` —— 这是**火山方舟（Ark 大模型平台）**的 API Key，用于 `+chat/+gen` 等大模型对话。
而 **豆包语音 TTS 走的是独立的 `openspeech.bytedance.com` 接口**，鉴权是另一套（`X-Api-Key`），两者不通用。
官方文档也明确说明：*"方舟 ARK API Key ≠ 豆包语音 API Key，arkcli auth 不能用于 TTS"*。
所以刚才报 `401 Invalid X-Api-Key` 是正常的——不是脚本问题。

## ✅ 正确获取豆包语音 API Key（2 分钟）
1. 登录火山引擎控制台：https://console.volcengine.com/speech
2. 若未开通，先在「语音合成大模型」页面开通服务（新用户有免费额度）：https://console.volcengine.com/speech/service/10
3. 进入 **豆包语音 → API Key 管理**：https://console.volcengine.com/speech/new/setting/apikeys
4. 创建一个 API Key（新版控制台），形如 `a1b2c3d4...`（**不是** ark- 开头）
5. 把 key 填进 `.claude/skills/huashu-design/.env` 的 `DOUBAO_TTS_API_KEY`

或者用旧版鉴权（在应用详情页）：`DOUBAO_APP_ID`（数字）+ `DOUBAO_ACCESS_KEY`（Access Token）。

## 🎙️ 音色适配（美食/深夜食堂/抖音）
已在 `.env` 预选 **甜美桃子 2.0**，备选如下（都是 2.0 大模型音色，`seed-tts-2.0`）：

| 推荐 | 音色 id | 气质 | 适合 |
|---|---|---|---|
| ⭐ 甜美桃子 2.0 | `zh_female_tianmeitaozi_uranus_bigtts` | 甜美女声 | 美食/轻快，默认已选 |
| 爽快思思 2.0 | `zh_female_shuangkuaisisi_uranus_bigtts` | 爽朗活泼 | 抖音节奏快，带货感 |
| 邻家女孩 2.0 | `zh_female_linjianvhai_uranus_bigtts` | 亲切邻家 | 深夜食堂温馨感 |
| 小何 2.0 | `zh_female_xiaohe_uranus_bigtts` | 自然亲切 | 通用稳妥 |
| 知性灿灿 2.0 | `zh_female_cancan_uranus_bigtts` | 知性干练 | 介绍功能/讲数据 |

想换就改 `.env` 里的 `DOUBAO_TTS_VOICE_ID`。

## 🎬 配合镜头切换时间（30s 版）
分镜已按 9 幕的镜头切换点切好句：`douyin-video/voiceover-cue.json`
每句的 `start` 就是该幕镜头切入时间（0 / 4.0 / 8.5 / 12.5 / 16.5 / 20.5 / 23.5 / 26.5 / 28.5s），
合成后按这些时间点用 `ffmpeg adelay` 精确落到时间轴，再混入 `douyin_30s.mp4`。

拿到正确 key 后跑：
```bash
cd douyin-video && bash scripts/synth-douyin-voice.sh
```
产出 `_voiceover/voiceover.mp3` + `_voiceover/douyin_30s_voice.mp4` + `_voiceover/report.tsv`（每句实测时长 vs 镜头切换目标）。
