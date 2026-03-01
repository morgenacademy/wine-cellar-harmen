import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      // Bottles per location (active only)
      const { data: locationCounts } = await supabase
        .from('bottles')
        .select('slot:slots(location:locations(id, name, type))')
        .is('consumed_at', null)

      // Wines nearing end of drinking window (within 1 year)
      const currentYear = new Date().getFullYear()
      const { data: drinkSoon } = await supabase
        .from('wines')
        .select('*, bottles(id, consumed_at)')
        .lte('drink_until', currentYear + 1)
        .gte('drink_until', currentYear)

      // Recently consumed (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: recentConsumed } = await supabase
        .from('bottles')
        .select('*, wine:wines(*)')
        .not('consumed_at', 'is', null)
        .gte('consumed_at', thirtyDaysAgo)
        .order('consumed_at', { ascending: false })
        .limit(10)

      // Aggregate location counts
      const counts: Record<string, { name: string; type: string; count: number }> = {}
      let unplaced = 0
      locationCounts?.forEach((b: any) => {
        if (!b.slot?.location) { unplaced++; return }
        const loc = b.slot.location
        if (!counts[loc.id]) counts[loc.id] = { name: loc.name, type: loc.type, count: 0 }
        counts[loc.id].count++
      })

      return {
        totalBottles: locationCounts?.length ?? 0,
        locationCounts: Object.values(counts).sort((a, b) => b.count - a.count),
        unplaced,
        drinkSoon: drinkSoon?.filter(w => w.bottles?.some((b: any) => !b.consumed_at)) ?? [],
        recentConsumed: recentConsumed ?? [],
      }
    },
  })
}
