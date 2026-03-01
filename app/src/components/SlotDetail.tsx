import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useConsumeBottle } from '../hooks/useBottles'
import type { Slot, BottleWithWine, Location } from '../types/database'

type Props = {
  slotId: string
  onClose: () => void
}

const wineColorDot: Record<string, string> = {
  red: 'bg-red-700',
  white: 'bg-amber-300',
  rosé: 'bg-pink-400',
  other: 'bg-stone-400',
}

export default function SlotDetail({ slotId, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['slot-detail', slotId],
    queryFn: async () => {
      const { data: slot, error } = await supabase
        .from('slots')
        .select('*, bottles(*, wine:wines(*)), location:locations(*)')
        .eq('id', slotId)
        .single()
      if (error) throw error
      return slot as Slot & { bottles: BottleWithWine[]; location: Location }
    },
    enabled: !!slotId,
  })

  const consumeMutation = useConsumeBottle()

  const activeBottles =
    data?.bottles.filter((b) => !b.consumed_at) ?? []

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col animate-slide-up">
        {/* Handle bar */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 rounded-full bg-stone-300" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 border-b border-stone-200">
          <div className="flex items-center justify-between">
            <div>
              {isLoading ? (
                <div className="h-5 w-32 bg-stone-200 animate-pulse rounded" />
              ) : (
                <>
                  <h2 className="text-lg font-bold">
                    {data?.label ?? `Plek ${data?.position}`}
                  </h2>
                  <p className="text-xs text-stone-500">
                    {data?.location?.name}
                  </p>
                </>
              )}
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-stone-700">
                {activeBottles.length} / {data?.capacity ?? '?'}
              </span>
              <p className="text-xs text-stone-500">flessen</p>
            </div>
          </div>
        </div>

        {/* Bottle list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-stone-100 animate-pulse rounded-lg"
                />
              ))}
            </div>
          )}

          {!isLoading && activeBottles.length === 0 && (
            <p className="text-stone-400 text-sm text-center py-8">
              Dit vak is leeg.
            </p>
          )}

          {!isLoading && activeBottles.length > 0 && (
            <div className="space-y-2">
              {activeBottles.map((bottle) => (
                <div
                  key={bottle.id}
                  className="flex items-center gap-3 bg-stone-50 rounded-lg p-3 border border-stone-200"
                >
                  {/* Color dot */}
                  <span
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      wineColorDot[bottle.wine?.color ?? 'other']
                    }`}
                  />

                  {/* Wine info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {bottle.wine?.name ?? 'Onbekende wijn'}
                    </div>
                    <div className="text-xs text-stone-500">
                      {[
                        bottle.wine?.vintage,
                        bottle.wine?.producer,
                        bottle.wine?.region,
                      ]
                        .filter(Boolean)
                        .join(' \u00b7 ')}
                    </div>
                  </div>

                  {/* Consume button */}
                  <button
                    onClick={() => consumeMutation.mutate(bottle.id)}
                    disabled={consumeMutation.isPending}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full bg-red-800 text-white hover:bg-red-900 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {consumeMutation.isPending ? '...' : 'Gedronken'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close button */}
        <div className="px-4 pb-6 pt-2 border-t border-stone-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 active:scale-[0.99] transition-all"
          >
            Sluiten
          </button>
        </div>
      </div>
    </>
  )
}
