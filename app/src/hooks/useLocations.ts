import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Location, Slot, BottleWithWine } from '../types/database'

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data as Location[]
    },
  })
}

export function useLocationWithSlots(locationId: string) {
  return useQuery({
    queryKey: ['location', locationId],
    queryFn: async () => {
      const { data: slots, error: slotsError } = await supabase
        .from('slots')
        .select('*, bottles(*, wine:wines(*))')
        .eq('location_id', locationId)
        .order('position')
      if (slotsError) throw slotsError

      const { data: location, error: locError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .single()
      if (locError) throw locError

      return { ...location, slots } as Location & { slots: (Slot & { bottles: BottleWithWine[] })[] }
    },
    enabled: !!locationId,
  })
}

export function useUpdateSlotLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { slotId: string; label: string | null }) => {
      const { error } = await supabase
        .from('slots')
        .update({ label: params.label || null })
        .eq('id', params.slotId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['location'] })
      qc.invalidateQueries({ queryKey: ['slot-detail'] })
      qc.invalidateQueries({ queryKey: ['allSlots'] })
    },
  })
}
