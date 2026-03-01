import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useConsumeBottle, useMoveBottle } from '../hooks/useBottles'
import { useUpdateSlotLabel } from '../hooks/useLocations'
import type { Slot, BottleWithWine, Location, Wine } from '../types/database'

type Props = {
  slotId: string
  onClose: () => void
}

const wineColorDot: Record<string, string> = {
  red: 'bg-red-700',
  white: 'bg-amber-300',
  rosé: 'bg-pink-400',
  sparkling: 'bg-yellow-300',
  dessert: 'bg-amber-500',
  fortified: 'bg-amber-800',
  other: 'bg-stone-400',
}

type UnplacedBottle = {
  id: string
  wine_id: string
  wine: Wine
}

function useUnplacedBottles() {
  return useQuery({
    queryKey: ['unplaced-bottles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bottles')
        .select('id, wine_id, wine:wines(*)')
        .is('slot_id', null)
        .is('consumed_at', null)
        .order('wine_id')
      if (error) throw error
      return data as unknown as UnplacedBottle[]
    },
  })
}

export default function SlotDetail({ slotId, onClose }: Props) {
  const navigate = useNavigate()
  const [showAddBottle, setShowAddBottle] = useState(false)
  const [bottleSearch, setBottleSearch] = useState('')
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelValue, setLabelValue] = useState('')

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
  const moveMutation = useMoveBottle()
  const updateLabel = useUpdateSlotLabel()
  const { data: unplacedBottles } = useUnplacedBottles()

  const activeBottles =
    data?.bottles.filter((b) => !b.consumed_at) ?? []
  const spotsLeft = (data?.capacity ?? 0) - activeBottles.length

  // Group unplaced bottles by wine for cleaner display
  const groupedUnplaced = (() => {
    if (!unplacedBottles) return []
    const map = new Map<string, { wine: Wine; bottles: { id: string }[] }>()
    for (const b of unplacedBottles) {
      if (!map.has(b.wine_id)) {
        map.set(b.wine_id, { wine: b.wine, bottles: [] })
      }
      map.get(b.wine_id)!.bottles.push({ id: b.id })
    }
    let result = [...map.values()]
    if (bottleSearch) {
      const q = bottleSearch.toLowerCase()
      result = result.filter(
        (g) =>
          g.wine.name.toLowerCase().includes(q) ||
          g.wine.producer?.toLowerCase().includes(q) ||
          g.wine.region?.toLowerCase().includes(q) ||
          g.wine.varietal?.toLowerCase().includes(q)
      )
    }
    return result.sort((a, b) => a.wine.name.localeCompare(b.wine.name))
  })()

  function handlePlaceBottle(bottleId: string) {
    moveMutation.mutate({ bottleId, slotId })
  }

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
              ) : editingLabel ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    updateLabel.mutate(
                      { slotId, label: labelValue.trim() || null },
                      { onSuccess: () => setEditingLabel(false) }
                    )
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={labelValue}
                    onChange={(e) => setLabelValue(e.target.value)}
                    placeholder={`Plek ${data?.position}`}
                    className="px-2 py-1 rounded border border-stone-300 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-red-800/30"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={updateLabel.isPending}
                    className="px-2 py-1 text-xs font-medium rounded bg-red-800 text-white hover:bg-red-900 disabled:opacity-50"
                  >
                    {updateLabel.isPending ? '...' : 'OK'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLabel(false)}
                    className="px-2 py-1 text-xs text-stone-500 hover:text-stone-700"
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">
                      {data?.label ?? `Plek ${data?.position}`}
                    </h2>
                    <button
                      onClick={() => {
                        setLabelValue(data?.label ?? '')
                        setEditingLabel(true)
                      }}
                      className="text-stone-400 hover:text-stone-600 transition-colors"
                      title="Label bewerken"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                      </svg>
                    </button>
                  </div>
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

        {/* Content */}
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

          {/* Current bottles (grouped by wine) */}
          {!isLoading && activeBottles.length > 0 && (() => {
            const grouped = new Map<string, { wine: typeof activeBottles[0]['wine']; bottles: typeof activeBottles }>()
            activeBottles.forEach((b) => {
              const key = b.wine_id
              if (!grouped.has(key)) grouped.set(key, { wine: b.wine, bottles: [] })
              grouped.get(key)!.bottles.push(b)
            })
            return (
              <div className="space-y-2">
                {[...grouped.values()].map((group) => (
                  <div
                    key={group.bottles[0].id}
                    className="flex items-center gap-3 bg-stone-50 rounded-lg p-3 border border-stone-200"
                  >
                    <span
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        wineColorDot[group.wine?.color ?? 'other']
                      }`}
                    />
                    <button
                      onClick={() => {
                        onClose()
                        navigate(`/wines/${group.bottles[0].wine_id}`)
                      }}
                      className="flex-1 min-w-0 text-left hover:text-red-800 transition-colors"
                    >
                      <div className="font-medium text-sm truncate">
                        {group.wine?.name ?? 'Onbekende wijn'}
                        {group.bottles.length > 1 && (
                          <span className="ml-1.5 text-xs font-semibold text-stone-500">
                            {group.bottles.length}\u00d7
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500">
                        {[
                          group.wine?.vintage,
                          group.wine?.producer,
                          group.wine?.region,
                        ]
                          .filter(Boolean)
                          .join(' \u00b7 ')}
                      </div>
                    </button>
                    <button
                      onClick={() => consumeMutation.mutate(group.bottles[0].id)}
                      disabled={consumeMutation.isPending}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full bg-red-800 text-white hover:bg-red-900 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {consumeMutation.isPending ? '...' : 'Gedronken'}
                    </button>
                  </div>
                ))}
              </div>
            )
          })()}

          {!isLoading && activeBottles.length === 0 && !showAddBottle && (
            <p className="text-stone-400 text-sm text-center py-4">
              Dit vak is leeg.
            </p>
          )}

          {/* Add bottle section */}
          {!isLoading && showAddBottle && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-700">Fles plaatsen</h3>
                <button
                  onClick={() => { setShowAddBottle(false); setBottleSearch('') }}
                  className="text-xs text-stone-400 hover:text-stone-600"
                >
                  Annuleren
                </button>
              </div>
              <input
                type="text"
                placeholder="Zoek op naam, druif, regio..."
                value={bottleSearch}
                onChange={(e) => setBottleSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30"
                autoFocus
              />
              {groupedUnplaced.length === 0 && (
                <p className="text-stone-400 text-xs text-center py-4">
                  Geen ongeplaatste flessen gevonden
                </p>
              )}
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {groupedUnplaced.map((group) => (
                  <div
                    key={group.wine.id}
                    className="flex items-center gap-3 rounded-lg p-2.5 border border-stone-100 hover:bg-stone-50"
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        wineColorDot[group.wine.color]
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{group.wine.name}</div>
                      <div className="text-xs text-stone-500">
                        {[group.wine.vintage, group.wine.region].filter(Boolean).join(' · ')}
                        {' · '}{group.bottles.length} fles{group.bottles.length > 1 ? 'sen' : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePlaceBottle(group.bottles[0].id)}
                      disabled={moveMutation.isPending || spotsLeft <= 0}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full bg-green-700 text-white hover:bg-green-800 active:scale-95 transition-all disabled:opacity-50"
                    >
                      +1
                    </button>
                    {group.bottles.length > 1 && (
                      <button
                        onClick={() => {
                          // Place up to spotsLeft bottles of this wine
                          const toPlace = group.bottles.slice(0, spotsLeft)
                          toPlace.forEach((b) => moveMutation.mutate({ bottleId: b.id, slotId }))
                        }}
                        disabled={moveMutation.isPending || spotsLeft <= 0}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full bg-green-700 text-white hover:bg-green-800 active:scale-95 transition-all disabled:opacity-50"
                      >
                        Alle ({Math.min(group.bottles.length, spotsLeft)})
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-4 pb-6 pt-2 border-t border-stone-100 space-y-2">
          {!isLoading && spotsLeft > 0 && !showAddBottle && (
            <button
              onClick={() => setShowAddBottle(true)}
              className="w-full py-2.5 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 active:scale-[0.99] transition-all"
            >
              + Fles plaatsen ({spotsLeft} plek{spotsLeft > 1 ? 'ken' : ''} vrij)
            </button>
          )}
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
