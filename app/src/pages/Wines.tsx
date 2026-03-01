import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWines } from '../hooks/useWines'
import type { WineWithBottles } from '../hooks/useWines'
import type { Wine } from '../types/database'

const colorOptions: { value: Wine['color']; label: string; className: string }[] = [
  { value: 'red', label: 'Rood', className: 'bg-red-700 text-white' },
  { value: 'white', label: 'Wit', className: 'bg-amber-300 text-amber-900' },
  { value: 'rosé', label: 'Ros\u00e9', className: 'bg-pink-400 text-white' },
  { value: 'other', label: 'Overig', className: 'bg-stone-400 text-white' },
]

const colorBadge: Record<Wine['color'], string> = {
  red: 'bg-red-700 text-white',
  white: 'bg-amber-300 text-amber-900',
  'rosé': 'bg-pink-400 text-white',
  other: 'bg-stone-400 text-white',
}

const colorLabel: Record<Wine['color'], string> = {
  red: 'Rood',
  white: 'Wit',
  'rosé': 'Ros\u00e9',
  other: 'Overig',
}

export default function Wines() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [colorFilter, setColorFilter] = useState<Wine['color'] | undefined>()
  const [countryFilter, setCountryFilter] = useState<string | undefined>()
  const [regionFilter, setRegionFilter] = useState<string | undefined>()

  const { data: wines, isLoading } = useWines({
    search: search || undefined,
    color: colorFilter,
    country: countryFilter,
    region: regionFilter,
  })

  // Extract unique countries and regions for filter dropdowns
  const { data: allWines } = useWines()
  const countries = [...new Set((allWines ?? []).map((w) => w.country).filter(Boolean))].sort() as string[]
  const regions = [...new Set(
    (allWines ?? [])
      .filter((w) => !countryFilter || w.country === countryFilter)
      .map((w) => w.region)
      .filter(Boolean)
  )].sort() as string[]

  function getActiveBottles(wine: WineWithBottles): number {
    return wine.bottles.filter((b) => !b.consumed_at).length
  }

  function getLocationSummary(wine: WineWithBottles): string {
    const active = wine.bottles.filter((b) => !b.consumed_at && b.slot_id)
    if (active.length === 0) return 'Niet geplaatst'
    return `${active.length} fles${active.length > 1 ? 'sen' : ''} opgeslagen`
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Wijnen</h1>

      {/* Search bar */}
      <input
        type="text"
        placeholder="Zoek op naam..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800"
      />

      {/* Color filter chips */}
      <div className="flex gap-2 flex-wrap">
        {colorOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setColorFilter(colorFilter === opt.value ? undefined : opt.value)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              colorFilter === opt.value
                ? opt.className
                : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Country and region dropdowns */}
      <div className="flex gap-2">
        <select
          value={countryFilter ?? ''}
          onChange={(e) => {
            setCountryFilter(e.target.value || undefined)
            setRegionFilter(undefined)
          }}
          className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30"
        >
          <option value="">Alle landen</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={regionFilter ?? ''}
          onChange={(e) => setRegionFilter(e.target.value || undefined)}
          className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30"
        >
          <option value="">Alle regio's</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Result count */}
      {!isLoading && wines && (
        <p className="text-sm text-stone-500">
          {wines.length} wijn{wines.length !== 1 ? 'en' : ''} gevonden
        </p>
      )}

      {/* Loading state */}
      {isLoading && <div className="text-stone-500 py-8 text-center">Laden...</div>}

      {/* Empty state */}
      {!isLoading && wines && wines.length === 0 && (
        <div className="text-center py-12 text-stone-400">
          <p className="text-lg mb-1">Geen wijnen gevonden</p>
          <p className="text-sm">Pas je zoekopdracht of filters aan</p>
        </div>
      )}

      {/* Wine cards */}
      <div className="space-y-2">
        {(wines ?? []).map((wine) => (
          <button
            key={wine.id}
            onClick={() => navigate(`/wines/${wine.id}`)}
            className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-stone-200 hover:border-red-800/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{wine.name}</div>
                <div className="text-sm text-stone-500 flex items-center gap-2 mt-0.5">
                  {wine.vintage && <span>{wine.vintage}</span>}
                  {wine.producer && <span>&middot; {wine.producer}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorBadge[wine.color]}`}>
                  {colorLabel[wine.color]}
                </span>
                <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full text-xs font-bold">
                  {getActiveBottles(wine)}
                </span>
              </div>
            </div>
            <div className="text-xs text-stone-400 mt-1">{getLocationSummary(wine)}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
