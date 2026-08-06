import { useCallback, useEffect, useState } from 'react'
import { fetchDailyPlan } from '../api/meals'
import type { Category, PlanSlot } from '../types'

/** 今日三餐搭配 Hook 返回结构 */
interface UseDailyPlanResult {
  plan: PlanSlot[]
  loading: boolean
  refresh: () => void
}

/**
 * 今日三餐搭配 Hook：通过 API 模块异步加载搭配，支持「换一批」刷新
 * 首次加载 / 分类变化使用日期种子（同一天内刷新页面结果稳定）；
 * 「换一批」传 Date.now() 种子，保证每次换出新组合
 * @param category 可选：按分类过滤候选池（如 'fat-loss'），分类变化时自动重新拉取
 */
export default function useDailyPlan(category?: Category): UseDailyPlanResult {
  const [plan, setPlan] = useState<PlanSlot[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    (shuffle: boolean) => {
      setLoading(true)
      fetchDailyPlan(category, shuffle ? Date.now() : undefined)
        .then((data) => {
          setPlan(data)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    },
    [category]
  )

  /** 「换一批」：Date.now() 种子，结果必然变化 */
  const refresh = useCallback(() => load(true), [load])

  // 首次挂载自动加载一组搭配；category 变化（如提交目标）时重新拉取
  useEffect(() => {
    load(false)
  }, [load])

  return { plan, loading, refresh }
}
