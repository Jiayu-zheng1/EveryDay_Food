#!/usr/bin/env node
/**
 * 导出全量食谱数据为 public/data/meals.json（构建 / 开发启动前执行）
 *
 * 目的：把 616KB 菜谱数据移出 JS 主 chunk（806KB → ~200KB，gzip 213KB → ~68KB），
 * 前端改为运行时 fetch('/data/meals.json')（见 src/api/meals.ts）。
 *
 * 实现：数据源 src/data/meals.ts 是 TS 且带无扩展名相对 import，Node 原生
 * TS 加载器要求显式扩展名，因此先用 esbuild（vite 自带依赖）把数据模块打成
 * 单个 CJS bundle，再执行它把 JSON 写到 stdout。
 *
 * 产物为纯数据 JSON，静态托管可 gzip；schema 与 src/types.ts 的 Meal 一致。
 */

import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'data')
const outFile = path.join(outDir, 'meals.json')
const tmpFile = path.join(root, 'scripts', '.export-data.tmp.cjs')

try {
  // 1) 打包数据模块（bundle 后数据内联进单个 CJS 文件，绕过扩展名解析限制）
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

  const code = result.outputFiles[0].text
  await writeFile(tmpFile, code)

  // 2) 执行 bundle，stdout 即 JSON（maxBuffer 放大以容纳全量数据）
  const json = execFileSync(process.execPath, [tmpFile], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })

  // 3) 落盘
  await mkdir(outDir, { recursive: true })
  await writeFile(outFile, json)

  const count = JSON.parse(json).length
  const size = (Buffer.byteLength(json) / 1024).toFixed(1)
  console.log(`[export-data] ${count} 道菜 → public/data/meals.json (${size} KB)`)
} finally {
  await rm(tmpFile, { force: true })
}
