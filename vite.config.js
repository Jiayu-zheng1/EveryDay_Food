import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite 配置：React 插件 + Tailwind CSS v4 官方插件（通过 @tailwindcss/vite 集成，无需 postcss 旧配置）
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
