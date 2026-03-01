import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useAddBottles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { wine_id: string; slot_id?: string; count: number }) => {
      const bottles = Array.from({ length: params.count }, () => ({
        wine_id: params.wine_id,
        slot_id: params.slot_id ?? null,
      }))
      const { data, error } = await supabase.from('bottles').insert(bottles).select()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wines'] })
      qc.invalidateQueries({ queryKey: ['location'] })
    },
  })
}

export function useConsumeBottle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (bottleId: string) => {
      const { error } = await supabase
        .from('bottles')
        .update({ consumed_at: new Date().toISOString(), slot_id: null })
        .eq('id', bottleId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wines'] })
      qc.invalidateQueries({ queryKey: ['location'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useMoveBottle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { bottleId: string; slotId: string }) => {
      const { error } = await supabase
        .from('bottles')
        .update({ slot_id: params.slotId })
        .eq('id', params.bottleId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['location'] })
      qc.invalidateQueries({ queryKey: ['wines'] })
    },
  })
}
