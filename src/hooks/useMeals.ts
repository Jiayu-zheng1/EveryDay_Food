import { useEffect, useState } from 'react'
import { fetchMeals } from '../api/meals'
import type { Meal } from '../types'

/** 食谱列表 Hook 返回结构 */
interface UseMealsResult {
  meals: Meal[]
  loading: boolean
  error: Error | null
}

/**
 * 食谱列表 Hook：通过 API 模块异步加载全部食谱
 * 将来接入后端后本 Hook 无需改动
 */
export default function useMeals(): UseMealsResult {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true // 防止卸载后 setState
    fetchMeals()
      .then((data) => {
        if (alive) {
          setMeals(data)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (alive) {
          // 只暴露 Error 实例（非 Error 统一包装，保证 error 字段类型稳定）
          setError(err instanceof Error ? err : new Error(String(err)))
          setLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [])

  return { meals, loading, error }
}
