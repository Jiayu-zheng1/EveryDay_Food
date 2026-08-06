/* 每日食光 Service Worker（轻量版，无第三方库）
 *
 * 缓存策略（与 public/_headers 的静态托管缓存配合）：
 *  - /assets/*  构建产物带内容哈希（immutable）→ 缓存优先，miss 回源并缓存
 *  - /data/*    数据文件（部署后内容会变）→ 网络优先，离线回退缓存
 *  - 页面导航    → 网络优先，离线回退到上次缓存的首页（App 外壳可离线打开）
 *  - 跨域请求（Google Fonts 等）不缓存
 *
 * 升级缓存策略 / 资源时把 CACHE 版本号 +1，activate 会清掉旧缓存。
 */

const CACHE = 'meals-food-v1'

self.addEventListener('install', () => {
  // 不预缓存：首屏资源由首次访问的 fetch 逐个缓存，SW 立即接管
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  const { pathname } = url

  // 构建产物：缓存优先
  if (pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((cache) => cache.put(request, copy))
            }
            return res
          })
      )
    )
    return
  }

  // 数据文件：网络优先，离线回退缓存
  if (pathname.startsWith('/data/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return res
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // 页面导航：网络优先，离线回退缓存首页
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html'))
    )
  }
})
