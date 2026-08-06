import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 纯函数单测：node 环境，无 DOM、无网络
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
