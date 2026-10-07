'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { DashboardActivityHistory } from '@/features/dashboard/components/DashboardActivityHistory'
import {
  loadActivityFeed,
  type AttivitaItem,
} from '@/features/dashboard/services/dashboard-activity.service'

const HISTORY_LIMIT = 100

export default function DashboardAttivitaPage() {
  const [items, setItems] = useState<AttivitaItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void loadActivityFeed(supabase as any, {
      limit: HISTORY_LIMIT,
      perSourceLimit: HISTORY_LIMIT,
    })
      .then(feed => {
        if (!cancelled) setItems(feed)
      })
      .catch(error => {
        console.error('Error fetching activity history:', error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return <DashboardActivityHistory items={items} loading={loading} />
}
