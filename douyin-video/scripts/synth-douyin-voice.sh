#!/usr/bin/env bash
# synth-douyin-voice.sh · 按镜头切换点分句合成豆包配音，精确对齐拼接
#
# 前置：
#   1) 在 skill 根目录 .env 填好豆包 key：
#        cp .claude/skills/huashu-design/.env.example .claude/skills/huashu-design/.env
#        然后编辑填 DOUBAO_TTS_API_KEY（或 DOUBAO_APP_ID+DOUBAO_ACCESS_KEY）与 DOUBAO_TTS_VOICE_ID
#   2) 在 douyin-video/ 下运行
#
# 用法：
#   bash scripts/synth-douyin-voice.sh                    # 用 .env 音色
#   bash scripts/synth-douyin-voice.sh --voice <voice_id>
#   bash scripts/synth-douyin-voice.sh --dry-run          # 只检查依赖与读取 cue
#
# 输出：
#   _voiceover/voiceover.mp3         对齐到 30s 的配音
#   _voiceover/douyin_30s_voice.mp4  配音混入视频
#   _voiceover/report.tsv            每句实际时长 vs 镜头切换目标时长

set -uo pipefail

SKILL_ROOT="/Users/foxlink/Desktop/仓库/Moments_food/.claude/skills/huashu-design"
TTS="$SKILL_ROOT/scripts/cloud/tts-doubao.mjs"
ENV_FILE="$SKILL_ROOT/.env"
VIDEO="douyin_30s.mp4"
CUE="voiceover-cue.json"
OUT_DIR="_voiceover"

VOICE=""
DRY=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --voice) VOICE="$2"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    *) shift ;;
  esac
done

# node 探测（本机 node 装在 codex runtime）
NODE_BIN=""
for cand in \
  "/Users/foxlink/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" \
  "/opt/homebrew/bin/node" "/usr/local/bin/node"; do
  if [[ -x "$cand" ]]; then NODE_BIN="$cand"; break; fi
done
if [[ -z "$NODE_BIN" ]]; then echo "未找到 node"; exit 1; fi
NODE="$NODE_BIN"
export PATH="$(dirname "$NODE"):$PATH"

mkdir -p "$OUT_DIR"

# 读取 cue，生成每句命令清单（保持 JSON 输出，用 node 只做 JSON 解析打印）
python3 - "$CUE" "$OUT_DIR" "$VOICE" <<'PY'
import json, sys
cue = json.load(open(sys.argv[1]))
outdir, voice = sys.argv[2], sys.argv[3]
rows = []
for c in cue:
    rows.append({
        "id": c["id"], "scene": c["scene"], "text": c["text"],
        "start": c["start"], "end": c["end"], "target": c["target"],
        "out": f"{outdir}/seg_{c['id']:02d}.mp3",
        "json": f"{outdir}/seg_{c['id']:02d}.json",
    })
json.dump(rows, open(f"{outdir}/plan.json", "w"), ensure_ascii=False, indent=2)
print(f"cue {len(rows)} 句")
PY

if [[ $DRY -eq 1 ]]; then
  echo "[dry-run] 依赖检查："
  command -v ffmpeg >/dev/null && echo "  ffmpeg OK" || echo "  ffmpeg 缺失"
  [[ -f "$ENV_FILE" ]] && echo "  .env 存在（$ENV_FILE）" || echo "  .env 不存在：cp .claude/skills/huashu-design/.env.example .claude/skills/huashu-design/.env 后填写"
  if [[ -f "$ENV_FILE" ]]; then grep -q "DOUBAO_TTS_API_KEY=your_api_key_here" "$ENV_FILE" && echo "  ⚠️ .env 还是示例 key，需替换" || echo "  .env key 已填"; fi
  echo ""
  echo "  将执行：对 voiceover-cue.json 的 9 句各调一次 tts-doubao.mjs（--timestamps），"
  echo "  再按每句 start 用 ffmpeg adelay 拼到 30s 时间轴，混入 douyin_30s.mp4。"
  exit 0
fi

# 从 .env 注入（若存在且当前环境未覆盖）
if [[ -f "$ENV_FILE" ]]; then
  set -a; source "$ENV_FILE"; set +a
fi
if [[ -n "$VOICE" ]]; then export DOUBAO_TTS_VOICE_ID="$VOICE"; fi
if [[ -z "${DOUBAO_TTS_VOICE_ID:-}" ]]; then echo "缺 DOUBAO_TTS_VOICE_ID（.env 或 --voice）"; exit 1; fi

# [1] 分句合成
echo "[1/3] 分句合成…"
TTS_ABS="$TTS"
python3 - "$OUT_DIR" "$TTS_ABS" <<'PY'
import json, subprocess, os, sys
outdir = sys.argv[1]
tts = sys.argv[2]
plan = json.load(open(f"{outdir}/plan.json"))
for seg in plan:
    cmd = ["node", tts, "--text", seg["text"], "--out", seg["out"],
           "--speed", "1.0", "--timestamps", "--yes"]
    print("  seg", seg["id"], seg["scene"], "→", os.path.basename(seg["out"]))
    r = subprocess.run(cmd, capture_output=True, text=True)
    print(r.stdout.strip()[-300:] if r.stdout else r.stderr.strip()[-300:])
PY

# [2] 读每句实际时长 + 目标，做对齐报告
echo "[2/3] 对齐报告…"
python3 - "$OUT_DIR" <<'PY'
import json, sys, os, re
outdir = sys.argv[1]
plan = json.load(open(f"{outdir}/plan.json"))
lines = ["id\tscene\ttarget_s\tactual_s\tdeviation_s"]
total_target = 0
for seg in plan:
    actual = None
    jf = seg["json"]
    if os.path.exists(jf):
        try:
            j = json.load(open(jf))
            actual = j.get("duration")
        except Exception:
            m = re.search(r'"duration":([\d.]+)', open(jf).read())
            if m: actual = float(m.group(1))
    if actual is None:
        # 从 stdout 缓存里找（tts-doubao 打印 JSON）
        pass
    dev = "" if actual is None else f"{actual - seg['target']:+.2f}"
    lines.append(f"{seg['id']}\t{seg['scene']}\t{seg['target']}\t{actual}\t{dev}")
open(f"{outdir}/report.tsv", "w").write("\n".join(lines))
print("\n".join(lines))
PY

# [3] 按 start 绝对时间拼接 + 尾部静音补齐到 30s，再混流
echo "[3/3] 按镜头切换时间拼接…"
python3 - "$OUT_DIR" <<'PY'
import json, sys, os
outdir = sys.argv[1]
plan = json.load(open(f"{outdir}/plan.json"))
present = [s for s in plan if os.path.exists(s["out"])]
if not present:
    print("没有合成成功的音频，跳过拼接"); sys.exit(0)
# 构造 ffmpeg filter：每路 adelay 到 start*1000 ms，amix
parts = []
inputs = []
for i, s in enumerate(present):
    inputs += ["-i", s["out"]]
    parts.append(f"[{i}:a]adelay={int(s['start']*1000)}|{int(s['start']*1000)},apad=pad_dur=0.2[a{i}]")
mix = "".join(f"[a{i}]" for i in range(len(present)))
filter_complex = ";".join(parts) + f";{mix}amix=inputs={len(present)}:duration=longest:normalize=0[out]"
cmd = ["ffmpeg","-y"] + inputs + ["-filter_complex", filter_complex, "-map","[out]",
       "-c:a","libmp3lame","-q:a","2", f"{outdir}/voiceover.mp3"]
print("  ffmpeg", " ".join(cmd[:6]), "...")
subprocess.run(cmd, check=True)
print("✅", f"{outdir}/voiceover.mp3")
PY

# 混流到视频
if [[ -f "$VIDEO" && -f "$OUT_DIR/voiceover.mp3" ]]; then
  ffmpeg -y -i "$VIDEO" -i "$OUT_DIR/voiceover.mp3" \
    -c:v copy -c:a aac -shortest -fflags +shortest \
    "$OUT_DIR/douyin_30s_voice.mp4" && echo "✅ $OUT_DIR/douyin_30s_voice.mp4"
fi

echo "完成。对齐报告：$OUT_DIR/report.tsv"