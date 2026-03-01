import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      // All active bottles with wine info
      const { data: allBottles } = await supabase
        .from('bottles')
        .select('id, slot_id, consumed_at, wine:wines(id, name, color, country, region, vintage, price, drink_from, drink_until, varietal), slot:slots(location:locations(id, name, type))')
        .is('consumed_at', null)

      // Recently consumed (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: recentConsumed } = await supabase
        .from('bottles')
        .select('*, wine:wines(*)')
        .not('consumed_at', 'is', null)
        .gte('consumed_at', thirtyDaysAgo)
        .order('consumed_at', { ascending: false })
        .limit(10)

      const bottles = allBottles ?? []
      const currentYear = new Date().getFullYear()

      // Aggregate location counts
      const counts: Record<string, { name: string; type: string; count: number }> = {}
      let unplaced = 0
      bottles.forEach((b: any) => {
        if (!b.slot?.location) { unplaced++; return }
        const loc = b.slot.location
        if (!counts[loc.id]) counts[loc.id] = { name: loc.name, type: loc.type, count: 0 }
        counts[loc.id].count++
      })

      // Stats: by color
      const colorCounts: Record<string, number> = {}
      bottles.forEach((b: any) => {
        const c = b.wine?.color ?? 'other'
        colorCounts[c] = (colorCounts[c] ?? 0) + 1
      })

      // Stats: by country
      const countryCounts: Record<string, number> = {}
      bottles.forEach((b: any) => {
        const c = b.wine?.country ?? 'Onbekend'
        countryCounts[c] = (countryCounts[c] ?? 0) + 1
      })

      // Stats: total value
      const totalValue = bottles.reduce((sum: number, b: any) => sum + (b.wine?.price ?? 0), 0)

      // Stats: average vintage
      const vintages = bottles
        .map((b: any) => b.wine?.vintage)
        .filter((v: any) => v && v > 1900) as number[]
      const avgVintage = vintages.length > 0
        ? Math.round(vintages.reduce((a, b) => a + b, 0) / vintages.length)
        : null

      // Stats: oldest wine
      const oldestVintage = vintages.length > 0 ? Math.min(...vintages) : null

      // Drink soon (within 1 year)
      const drinkSoon = bottles
        .filter((b: any) => {
          const du = b.wine?.drink_until
          return du && du >= currentYear && du <= currentYear + 1
        })
        // Unique wines
        .reduce((acc: any[], b: any) => {
          if (!acc.find((w: any) => w.id === b.wine.id)) acc.push(b.wine)
          return acc
        }, [])

      // Stats: top regions
      const regionCounts: Record<string, number> = {}
      bottles.forEach((b: any) => {
        const r = b.wine?.region
        if (r) regionCounts[r] = (regionCounts[r] ?? 0) + 1
      })
      const topRegions = Object.entries(regionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)

      // Stats: top varietals
      const varietalCounts: Record<string, number> = {}
      bottles.forEach((b: any) => {
        const v = b.wine?.varietal
        if (v) varietalCounts[v] = (varietalCounts[v] ?? 0) + 1
      })
      const topVarietals = Object.entries(varietalCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)

      return {
        totalBottles: bottles.length,
        locationCounts: Object.values(counts).sort((a, b) => b.count - a.count),
        unplaced,
        drinkSoon,
        recentConsumed: recentConsumed ?? [],
        stats: {
          colorCounts,
          countryCounts: Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8),
          totalValue,
          avgVintage,
          oldestVintage,
          topRegions,
          topVarietals,
        },
      }
    },
  })
}
