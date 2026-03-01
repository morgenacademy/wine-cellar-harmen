import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useMoveBottle } from '../hooks/useBottles'
import type { Wine } from '../types/database'

const wineColorDot: Record<string, string> = {
  red: 'bg-red-700',
  white: 'bg-amber-300',
  rosé: 'bg-pink-400',
  sparkling: 'bg-yellow-300',
  dessert: 'bg-amber-500',
  fortified: 'bg-amber-800',
  other: 'bg-stone-400',
}

const colorLabel: Record<string, string> = {
  red: 'Rood',
  white: 'Wit',
  'rosé': 'Rosé',
  sparkling: 'Mousseux',
  dessert: 'Dessert',
  fortified: 'Versterkt',
  other: 'Overig',
}

type UnplacedBottle = {
  id: string
  wine_id: string
  wine: Wine
}

type SlotOption = {
  id: string
  label: string
  capacity: number
  filled: number
  locationName: string
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

function useSlotOptions() {
  return useQuery({
    queryKey: ['slot-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slots')
        .select('id, position, label, capacity, location:locations(id, name), bottles(id, consumed_at)')
        .order('position')
      if (error) throw error
      return (data ?? []).map((s) => {
        const loc = s.location as unknown as { id: string; name: string } | null
        const filled = (s.bottles ?? []).filter((b: any) => !b.consumed_at).length
        return {
          id: s.id,
          label: s.label ?? `Positie ${s.position}`,
          capacity: s.capacity,
          filled,
          locationName: loc?.name ?? '?',
        } as SlotOption
      })
    },
  })
}

export default function BulkPlace() {
  const navigate = useNavigate()
  const { data: unplaced, isLoading } = useUnplacedBottles()
  const { data: slots } = useSlotOptions()
  const moveMutation = useMoveBottle()
  const [search, setSearch] = useState('')
  const [colorFilter, setColorFilter] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string>('')

  // Group by wine
  const grouped = useMemo(() => {
    if (!unplaced) return []
    const map = new Map<string, { wine: Wine; bottles: { id: string }[] }>()
    for (const b of unplaced) {
      if (!map.has(b.wine_id)) {
        map.set(b.wine_id, { wine: b.wine, bottles: [] })
      }
      map.get(b.wine_id)!.bottles.push({ id: b.id })
    }
    let result = [...map.values()]

    if (colorFilter) {
      result = result.filter((g) => g.wine.color === colorFilter)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (g) =>
          g.wine.name.toLowerCase().includes(q) ||
          g.wine.producer?.toLowerCase().includes(q) ||
          g.wine.region?.toLowerCase().includes(q) ||
          g.wine.varietal?.toLowerCase().includes(q)
      )
    }
    return result.sort((a, b) => a.wine.name.localeCompare(b.wine.name))
  }, [unplaced, search, colorFilter])

  const totalUnplaced = unplaced?.length ?? 0
  const availableSlots = (slots ?? []).filter((s) => s.filled < s.capacity)

  function handlePlace(bottleId: string) {
    if (!selectedSlot) return
    moveMutation.mutate({ bottleId, slotId: selectedSlot })
  }

  function handlePlaceAll(bottles: { id: string }[]) {
    if (!selectedSlot) return
    const slot = slots?.find((s) => s.id === selectedSlot)
    if (!slot) return
    const spotsLeft = slot.capacity - slot.filled
    const toPlace = bottles.slice(0, spotsLeft)
    toPlace.forEach((b) => moveMutation.mutate({ bottleId: b.id, slotId: selectedSlot }))
  }

  // Color counts for filter chips
  const colorCounts = useMemo(() => {
    if (!unplaced) return {}
    const counts: Record<string, number> = {}
    for (const b of unplaced) {
      counts[b.wine.color] = (counts[b.wine.color] ?? 0) + 1
    }
    return counts
  }, [unplaced])

  if (isLoading) return <div className="p-4 text-stone-500">Laden...</div>

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/')}
        className="text-red-800 text-sm font-medium hover:underline"
      >
        &larr; Terug naar dashboard
      </button>

      <h1 className="text-2xl font-bold">Snel plaatsen</h1>
      <p className="text-sm text-stone-500">
        {totalUnplaced} fles{totalUnplaced !== 1 ? 'sen' : ''} nog niet geplaatst
      </p>

      {/* Slot selector - sticky */}
      <div className="sticky top-0 bg-stone-50 py-2 z-10 space-y-2">
        <label className="text-sm font-medium text-stone-700">Doellocatie:</label>
        <select
          value={selectedSlot}
          onChange={(e) => setSelectedSlot(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30"
        >
          <option value="">Kies een vak...</option>
          {availableSlots.map((s) => (
            <option key={s.id} value={s.id}>
              {s.locationName} - {s.label} ({s.filled}/{s.capacity})
            </option>
          ))}
        </select>
      </div>

      {/* Search + color filter */}
      <input
        type="text"
        placeholder="Zoek op naam, druif, regio..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30"
      />

      <div className="flex gap-2 flex-wrap">
        {Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([color, count]) => (
            <button
              key={color}
              onClick={() => setColorFilter(colorFilter === color ? null : color)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                colorFilter === color
                  ? 'bg-red-800 text-white'
                  : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
              }`}
            >
              {colorLabel[color] ?? color} ({count})
            </button>
          ))}
      </div>

      {/* Wine list */}
      <div className="space-y-2">
        {grouped.map((group) => (
          <div
            key={group.wine.id}
            className="bg-white rounded-lg p-3 shadow-sm border border-stone-200"
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full flex-shrink-0 ${wineColorDot[group.wine.color]}`}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{group.wine.name}</div>
                <div className="text-xs text-stone-500">
                  {[group.wine.vintage, group.wine.producer, group.wine.region]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-stone-400 font-medium">
                  {group.bottles.length}×
                </span>
                <button
                  onClick={() => handlePlace(group.bottles[0].id)}
                  disabled={!selectedSlot || moveMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-700 text-white hover:bg-green-800 active:scale-95 transition-all disabled:opacity-30"
                >
                  +1
                </button>
                {group.bottles.length > 1 && (
                  <button
                    onClick={() => handlePlaceAll(group.bottles)}
                    disabled={!selectedSlot || moveMutation.isPending}
                    className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-700 text-white hover:bg-green-800 active:scale-95 transition-all disabled:opacity-30"
                  >
                    Alle
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {grouped.length === 0 && (
        <div className="text-center py-12 text-stone-400">
          <p className="text-lg mb-1">
            {totalUnplaced === 0 ? 'Alle flessen zijn geplaatst!' : 'Geen resultaten'}
          </p>
        </div>
      )}
    </div>
  )
}
