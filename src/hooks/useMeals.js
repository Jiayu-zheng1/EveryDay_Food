import { useEffect, useState } from 'react'
import { fetchMeals } from '../api/meals'

/**
 * 食谱列表 Hook：通过 API 模块异步加载全部食谱
 * 将来接入后端后本 Hook 无需改动
 * @returns {{ meals: object[], loading: boolean, error: Error|null }}
 */
export default function useMeals() {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true // 防止卸载后 setState
    fetchMeals()
      .then((data) => {
        if (alive) {
          setMeals(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (alive) {
          setError(err)
          setLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [])

  return { meals, loading, error }
}
