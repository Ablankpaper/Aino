import { useEffect, useState } from 'react'

export function useCheckoutExpiry(deadline: number, active: boolean) {
  const [expiredDeadline, setExpiredDeadline] = useState<number | null>(null)

  useEffect(() => {
    if (!active || !Number.isFinite(deadline)) {
      return
    }

    const timer = setTimeout(() => setExpiredDeadline(deadline), Math.max(0, deadline - Date.now()))

    return () => clearTimeout(timer)
  }, [active, deadline])

  return !Number.isFinite(deadline) || deadline <= Date.now() || expiredDeadline === deadline
}
