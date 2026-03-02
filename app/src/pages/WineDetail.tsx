import { useParams, useNavigate } from 'react-router-dom'
import { useWine } from '../hooks/useWines'
import type { WineDetail as WineDetailType } from '../hooks/useWines'
import { useMoveBottle, useReceiveBottle, useReceiveAllBottles } from '../hooks/useBottles'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Wine } from '../types/database'
import ConsumeSheet from '../components/ConsumeSheet'

const colorBadge: Record<Wine['color'], string> = {
  red: 'bg-red-700 text-white',
  white: 'bg-amber-300 text-amber-900',
  'rosé': 'bg-pink-400 text-white',
  sparkling: 'bg-yellow-300 text-yellow-900',
  dessert: 'bg-amber-500 text-white',
  fortified: 'bg-amber-800 text-white',
  other: 'bg-stone-400 text-white',
}

const colorLabel: Record<Wine['color'], string> = {
  red: 'Rood',
  white: 'Wit',
  'rosé': 'Rosé',
  sparkling: 'Mousseux',
  dessert: 'Dessert / Zoet',
  fortified: 'Versterkt',
  other: 'Overig',
}

function useAllSlots() {
  return useQuery({
    queryKey: ['allSlots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slots')
        .select('id, position, label, location:locations(id, name, type)')
        .order('position')
      if (error) throw error
      return (data ?? []).map((s) => {
        const loc = s.location as unknown as { id: string; name: string; type: string } | null
        return {
          id: s.id,
          locationId: loc?.id ?? '',
          locationType: loc?.type ?? '',
          label: loc
            ? `${loc.name} - ${s.label ?? `Positie ${s.position}`}`
            : s.label ?? `Positie ${s.position}`,
        }
      })
    },
  })
}

export default function WineDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: wine, isLoading } = useWine(id ?? '')
  const moveBottle = useMoveBottle()
  const receiveMutation = useReceiveBottle()
  const receiveAll = useReceiveAllBottles()
  const { data: allSlots } = useAllSlots()
  const [movingBottleId, setMovingBottleId] = useState<string | null>(null)
  const [consumingBottleId, setConsumingBottleId] = useState<string | null>(null)

  if (isLoading) return <div className="p-4 text-stone-500">Laden...</div>
  if (!wine) return <div className="p-4 text-stone-500">Wijn niet gevonden</div>

  const w: WineDetailType = wine

  const currentYear = new Date().getFullYear()
  const inDrinkingWindow =
    w.drink_from != null &&
    w.drink_until != null &&
    currentYear >= w.drink_from &&
    currentYear <= w.drink_until

  const activeBottles = w.bottles.filter((b) => !b.consumed_at && !b.pending)
  const pendingBottles = w.bottles.filter((b) => !b.consumed_at && b.pending)
  const consumedBottles = w.bottles.filter((b) => b.consumed_at)

  function handleMove(bottleId: string, slotId: string) {
    moveBottle.mutate({ bottleId, slotId }, {
      onSuccess: () => setMovingBottleId(null),
    })
  }

  function navigateToSlot(slotId: string) {
    const slotInfo = allSlots?.find((s) => s.id === slotId)
    if (slotInfo) {
      const locParam = slotInfo.locationType === 'kast' ? 'kast' : slotInfo.locationId
      navigate(`/locations?loc=${locParam}&slot=${slotId}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/wines')}
        className="text-red-800 text-sm font-medium hover:underline"
      >
        &larr; Terug naar wijnen
      </button>

      {/* Wine header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{w.name}</h1>
            <div className="text-stone-500 mt-1 space-x-2">
              {w.vintage && <span>{w.vintage}</span>}
              {w.producer && <span>&middot; {w.producer}</span>}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium shrink-0 ${colorBadge[w.color]}`}>
            {colorLabel[w.color]}
          </span>
        </div>
      </div>

      {/* Info section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200 space-y-3">
        <h2 className="font-semibold text-lg">Details</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {w.country && (
            <>
              <span className="text-stone-500">Land</span>
              <span>{w.country}</span>
            </>
          )}
          {w.region && (
            <>
              <span className="text-stone-500">Regio</span>
              <span>{w.region}</span>
            </>
          )}
          {w.subregion && (
            <>
              <span className="text-stone-500">Subregio</span>
              <span>{w.subregion}</span>
            </>
          )}
          {w.appellation && (
            <>
              <span className="text-stone-500">Appellation</span>
              <span>{w.appellation}</span>
            </>
          )}
          {w.varietal && (
            <>
              <span className="text-stone-500">Druif</span>
              <span>{w.varietal}</span>
            </>
          )}
          {w.designation && (
            <>
              <span className="text-stone-500">Aanduiding</span>
              <span>{w.designation}</span>
            </>
          )}
          {w.price != null && (
            <>
              <span className="text-stone-500">Prijs</span>
              <span>&euro;{w.price.toFixed(2)}</span>
            </>
          )}
          {w.shop && (
            <>
              <span className="text-stone-500">Shop</span>
              <span>{w.shop}</span>
            </>
          )}
        </div>
      </div>

      {/* Drinking window */}
      {(w.drink_from != null || w.drink_until != null) && (
        <div className={`rounded-xl p-4 border ${
          inDrinkingWindow
            ? 'bg-green-50 border-green-300'
            : 'bg-white border-stone-200'
        }`}>
          <h2 className="font-semibold text-sm mb-1">Drinkvenster</h2>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              {w.drink_from ?? '?'} &ndash; {w.drink_until ?? '?'}
            </span>
            {inDrinkingWindow && (
              <span className="text-green-700 text-sm font-medium bg-green-100 px-2 py-0.5 rounded-full">
                Nu drinkbaar
              </span>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {w.notes && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
          <h2 className="font-semibold text-lg mb-2">Notities</h2>
          <p className="text-stone-600 text-sm whitespace-pre-wrap">{w.notes}</p>
        </div>
      )}

      {/* Bottles */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">
          Flessen ({activeBottles.length} op voorraad
          {pendingBottles.length > 0 ? `, ${pendingBottles.length} besteld` : ''}
          {consumedBottles.length > 0 ? `, ${consumedBottles.length} verwijderd` : ''})
        </h2>

        {/* Active bottles */}
        {activeBottles.map((bottle) => {
          const slot = bottle.slot
          const location = slot?.location
          const locationStr = location && slot
            ? `${location.name} - ${slot.label ?? `Positie ${slot.position}`}`
            : 'Niet geplaatst'
          const isPlaced = !!bottle.slot_id

          return (
            <div
              key={bottle.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-stone-200"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  {isPlaced ? (
                    <button
                      onClick={() => navigateToSlot(bottle.slot_id!)}
                      className="font-medium text-red-800 hover:underline"
                    >
                      {locationStr}
                    </button>
                  ) : (
                    <span className="font-medium text-stone-400">{locationStr}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMovingBottleId(movingBottleId === bottle.id ? null : bottle.id)}
                    className="px-3 py-1 text-xs rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50"
                  >
                    Verplaats
                  </button>
                  <button
                    onClick={() => setConsumingBottleId(bottle.id)}
                    className="px-3 py-1 text-xs rounded-lg bg-red-800 text-white hover:bg-red-900"
                  >
                    Verwijderen
                  </button>
                </div>
              </div>

              {/* Move dropdown */}
              {movingBottleId === bottle.id && (
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleMove(bottle.id, e.target.value)
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>Kies nieuwe locatie...</option>
                    {(allSlots ?? []).map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )
        })}

        {/* Pending bottles */}
        {pendingBottles.length > 0 && (
          <div className="space-y-1 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-orange-600">Besteld</h3>
              {pendingBottles.length > 1 && (
                <button
                  onClick={() => receiveAll.mutate(pendingBottles.map(b => b.id))}
                  disabled={receiveAll.isPending}
                  className="text-xs font-medium text-green-700 hover:text-green-800 disabled:opacity-50"
                >
                  Alle ontvangen ({pendingBottles.length})
                </button>
              )}
            </div>
            {pendingBottles.map((bottle) => (
              <div
                key={bottle.id}
                className="bg-orange-50 rounded-lg p-3 text-sm border border-orange-200 flex items-center justify-between"
              >
                <span className="text-orange-700">Besteld</span>
                <button
                  onClick={() => receiveMutation.mutate(bottle.id)}
                  disabled={receiveMutation.isPending}
                  className="px-3 py-1 text-xs rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
                >
                  Ontvangen
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Consumed/removed bottles */}
        {consumedBottles.length > 0 && (
          <div className="space-y-1 mt-4">
            <h3 className="text-sm font-medium text-stone-400">Verwijderd</h3>
            {consumedBottles.map((bottle) => (
              <div
                key={bottle.id}
                className="bg-stone-50 rounded-lg p-3 text-sm text-stone-400 border border-stone-100"
              >
                {bottle.consume_reason === 'sold' ? '\uD83D\uDCB0 Verkocht' :
                 bottle.consume_reason === 'gifted' ? '\uD83C\uDF81 Weggegeven' :
                 bottle.consume_reason === 'lost' ? '\u2753 Verloren' :
                 '\uD83C\uDF77 Gedronken'} op {new Date(bottle.consumed_at!).toLocaleDateString('nl-NL')}
              </div>
            ))}
          </div>
        )}

        {w.bottles.length === 0 && (
          <p className="text-stone-400 text-sm py-4 text-center">
            Geen flessen voor deze wijn.
          </p>
        )}
      </div>

      {/* Consume sheet */}
      {consumingBottleId && (
        <ConsumeSheet
          bottleId={consumingBottleId}
          wineName={w.name}
          onClose={() => setConsumingBottleId(null)}
        />
      )}
    </div>
  )
}
