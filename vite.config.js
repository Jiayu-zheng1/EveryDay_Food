import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite 配置：React 插件 + Tailwind CSS v4 官方插件（通过 @tailwindcss/vite 集成，无需 postcss 旧配置）
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 允许 ngrok 等穿透域访问 dev server（.ngrok-free.app 为后缀通配，覆盖随机子域）
    allowedHosts: ['.ngrok-free.app'],
  },
})
