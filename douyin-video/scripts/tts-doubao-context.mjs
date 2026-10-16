#!/usr/bin/env node
// tts-doubao-context.mjs · 带语气控制（context_texts）的豆包 TTS 单句合成
// 用法：node tts-doubao-context.mjs --text "..." --out x.mp3 --context "用鼠鼠的语气" [--speed 1.2] [--voice id]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ENV_PATH = '/Users/foxlink/Desktop/仓库/Moments_food/.claude/skills/huashu-design/.env';

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return;
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim(), v = t.slice(i + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const args = { speed: '1.2' };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--text') args.text = process.argv[++i];
  else if (a === '--out') args.out = process.argv[++i];
  else if (a === '--context') args.context = process.argv[++i];
  else if (a === '--speed') args.speed = process.argv[++i];
  else if (a === '--voice') args.voice = process.argv[++i];
}

const voiceId = args.voice || process.env.DOUBAO_TTS_VOICE_ID;
if (!voiceId) { console.error('缺音色'); process.exit(1); }
if (!args.text || !args.out) { console.error('缺 --text / --out'); process.exit(1); }

const resourceId = voiceId.includes('_uranus_') || voiceId.startsWith('saturn_')
  ? 'seed-tts-2.0'
  : voiceId.startsWith('S_') ? 'seed-icl-2.0' : 'seed-tts-1.0';

const additions = args.context ? JSON.stringify({ context_texts: [args.context] }) : undefined;
const speechRate = Math.max(-50, Math.min(100, Math.round((parseFloat(args.speed) - 1) * 100)));

const body = {
  user: { uid: 'huashu-douyin' },
  req_params: {
    text: args.text,
    speaker: voiceId,
    audio_params: { format: 'mp3', sample_rate: 24000, speech_rate: speechRate },
    ...(additions ? { additions } : {}),
  },
};

const res = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': process.env.DOUBAO_TTS_API_KEY,
    'X-Api-Resource-Id': resourceId,
    'X-Api-Request-Id': randomUUID(),
  },
  body: JSON.stringify(body),
});

if (!res.ok) { console.error('HTTP', res.status, (await res.text()).slice(0, 300)); process.exit(1); }

const text = await res.text();
const chunks = [];
for (const line of text.split(/\r?\n/)) {
  const t = line.trim();
  if (!t) continue;
  const j = JSON.parse(t);
  if (j.code === 20000000) break;
  if (j.code !== 0) { console.error('API', j.code, j.message); process.exit(1); }
  if (j.data) chunks.push(Buffer.from(j.data, 'base64'));
}
if (!chunks.length) { console.error('无音频'); process.exit(1); }
fs.writeFileSync(args.out, Buffer.concat(chunks));
console.log(JSON.stringify({ path: args.out, bytes: Buffer.concat(chunks).length }));