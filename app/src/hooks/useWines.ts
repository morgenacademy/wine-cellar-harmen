import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Wine, Bottle, Slot, Location } from '../types/database'

type WineFilters = {
  search?: string
  color?: Wine['color']
  country?: string
  region?: string
}

export type WineWithBottles = Wine & {
  bottles: Pick<Bottle, 'id' | 'slot_id' | 'consumed_at' | 'pending'>[]
}

export type WineDetail = Wine & {
  bottles: (Bottle & {
    slot: (Slot & { location: Location }) | null
  })[]
}

export function useWines(filters: WineFilters = {}) {
  return useQuery({
    queryKey: ['wines', filters],
    queryFn: async () => {
      let query = supabase
        .from('wines')
        .select('*, bottles(id, slot_id, consumed_at, pending)')
        .order('name')

      if (filters.color) query = query.eq('color', filters.color)
      if (filters.country) query = query.eq('country', filters.country)
      if (filters.region) query = query.eq('region', filters.region)
      // Search is now done client-side to support all fields

      const { data, error } = await query
      if (error) throw error
      return data as WineWithBottles[]
    },
  })
}

export function useWine(wineId: string) {
  return useQuery({
    queryKey: ['wine', wineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wines')
        .select('*, bottles(*, slot:slots(*, location:locations(*)))')
        .eq('id', wineId)
        .single()
      if (error) throw error
      return data as WineDetail
    },
    enabled: !!wineId,
  })
}

export function useAddWine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (wine: Omit<Wine, 'id'>) => {
      const { data, error } = await supabase.from('wines').insert(wine).select().single()
      if (error) throw error
      return data as Wine
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wines'] }),
  })
}
