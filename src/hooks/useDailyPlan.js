import { useCallback, useEffect, useState } from 'react'
import { fetchDailyPlan } from '../api/meals'

/**
 * 今日三餐搭配 Hook：通过 API 模块异步加载搭配，支持「换一批」刷新
 * @param {string} [category] 可选：按分类过滤候选池（如 'fat-loss'），分类变化时自动重新拉取
 * @returns {{ plan: Array<{ slot, meal }>, loading: boolean, refresh: () => void }}
 */
export default function useDailyPlan(category) {
  const [plan, setPlan] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    fetchDailyPlan(category)
      .then((data) => {
        setPlan(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [category])

  // 首次挂载自动加载一组搭配；category 变化（如提交目标）时重新拉取
  useEffect(() => {
    refresh()
  }, [refresh])

  return { plan, loading, refresh }
}
