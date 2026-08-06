import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// 应用入口：挂载根组件
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// PWA：生产环境注册 Service Worker（缓存 /assets 与 /data，页面网络优先），
// 注册失败静默降级——应用本身不依赖 SW
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* SW 不可用时忽略（如不支持或隐私模式），不影响功能 */
    })
  })
}
