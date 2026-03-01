import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWines } from '../hooks/useWines'
import type { WineWithBottles } from '../hooks/useWines'
import type { Wine } from '../types/database'

const colorOptions: { value: Wine['color']; label: string; className: string }[] = [
  { value: 'red', label: 'Rood', className: 'bg-red-700 text-white' },
  { value: 'white', label: 'Wit', className: 'bg-amber-300 text-amber-900' },
  { value: 'rosé', label: 'Rosé', className: 'bg-pink-400 text-white' },
  { value: 'sparkling', label: 'Mousseux', className: 'bg-yellow-300 text-yellow-900' },
  { value: 'dessert', label: 'Dessert', className: 'bg-amber-500 text-white' },
  { value: 'fortified', label: 'Versterkt', className: 'bg-amber-800 text-white' },
  { value: 'other', label: 'Overig', className: 'bg-stone-400 text-white' },
]

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

type SortOption = 'name' | 'vintage' | 'varietal' | 'region' | 'drink_window' | 'price'

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Naam' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'varietal', label: 'Druif' },
  { value: 'region', label: 'Regio' },
  { value: 'drink_window', label: 'Drinkvenster' },
  { value: 'price', label: 'Prijs' },
]

export default function Wines() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [colorFilters, setColorFilters] = useState<Set<Wine['color']>>(new Set())
  const [countryFilter, setCountryFilter] = useState<string | undefined>()
  const [regionFilter, setRegionFilter] = useState<string | undefined>()
  const [varietalFilter, setVarietalFilter] = useState<string | undefined>()
  const [appellationFilter, setAppellationFilter] = useState<string | undefined>()
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const { data: allWines, isLoading } = useWines({
    search: search || undefined,
    country: countryFilter,
    region: regionFilter,
  })

  // Client-side filters (color multi-select, varietal, appellation)
  const filteredWines = useMemo(() => {
    if (!allWines) return []
    let result = allWines
    if (colorFilters.size > 0) {
      result = result.filter((w) => colorFilters.has(w.color))
    }
    if (varietalFilter) {
      result = result.filter((w) => w.varietal === varietalFilter)
    }
    if (appellationFilter) {
      result = result.filter((w) => w.appellation === appellationFilter)
    }
    return result
  }, [allWines, colorFilters, varietalFilter, appellationFilter])

  // Client-side sorting
  const wines = useMemo(() => {
    const sorted = [...filteredWines]
    sorted.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'vintage':
          cmp = (a.vintage ?? 0) - (b.vintage ?? 0)
          break
        case 'varietal':
          cmp = (a.varietal ?? '').localeCompare(b.varietal ?? '')
          break
        case 'region':
          cmp = (a.region ?? '').localeCompare(b.region ?? '')
          break
        case 'drink_window':
          cmp = (a.drink_from ?? 9999) - (b.drink_from ?? 9999)
          break
        case 'price':
          cmp = (a.price ?? 0) - (b.price ?? 0)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [filteredWines, sortBy, sortDir])

  // Extract unique values for filter dropdowns
  const { data: unfilteredWines } = useWines()
  const countries = [...new Set((unfilteredWines ?? []).map((w) => w.country).filter(Boolean))].sort() as string[]
  const regions = [...new Set(
    (unfilteredWines ?? [])
      .filter((w) => !countryFilter || w.country === countryFilter)
      .map((w) => w.region)
      .filter(Boolean)
  )].sort() as string[]
  const varietals = [...new Set((unfilteredWines ?? []).map((w) => w.varietal).filter(Boolean))].sort() as string[]
  const appellations = [...new Set((unfilteredWines ?? []).map((w) => w.appellation).filter(Boolean))].sort() as string[]

  function toggleColor(color: Wine['color']) {
    setColorFilters((prev) => {
      const next = new Set(prev)
      if (next.has(color)) {
        next.delete(color)
      } else {
        next.add(color)
      }
      return next
    })
  }

  function getActiveBottles(wine: WineWithBottles): number {
    return wine.bottles.filter((b) => !b.consumed_at).length
  }

  function getLocationSummary(wine: WineWithBottles): string {
    const active = wine.bottles.filter((b) => !b.consumed_at && b.slot_id)
    if (active.length === 0) return 'Niet geplaatst'
    return `${active.length} fles${active.length > 1 ? 'sen' : ''} opgeslagen`
  }

  /** Extra info line based on current sort */
  function getSortInfo(wine: WineWithBottles): string | null {
    switch (sortBy) {
      case 'varietal':
        return wine.varietal || null
      case 'drink_window':
        if (wine.drink_from || wine.drink_until)
          return `Drinken: ${wine.drink_from ?? '?'} – ${wine.drink_until ?? '?'}`
        return null
      case 'price':
        return wine.price != null ? `€${wine.price.toFixed(2)}` : null
      default:
        return null
    }
  }

  function toggleSortDir() {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
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

      {/* Color filter chips (multi-select) */}
      <div className="flex gap-2 flex-wrap">
        {colorOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => toggleColor(opt.value)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              colorFilters.has(opt.value)
                ? opt.className
                : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filter dropdowns */}
      <div className="flex gap-2 flex-wrap">
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

        <select
          value={varietalFilter ?? ''}
          onChange={(e) => setVarietalFilter(e.target.value || undefined)}
          className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30"
        >
          <option value="">Alle druiven</option>
          {varietals.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>

        <select
          value={appellationFilter ?? ''}
          onChange={(e) => setAppellationFilter(e.target.value || undefined)}
          className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30"
        >
          <option value="">Alle appellations</option>
          {appellations.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-1 justify-end">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={toggleSortDir}
          className="px-2 py-2 rounded-lg border border-stone-300 bg-white text-sm hover:bg-stone-50"
          title={sortDir === 'asc' ? 'Oplopend' : 'Aflopend'}
        >
          {sortDir === 'asc' ? '↑' : '↓'}
        </button>
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
        {wines.map((wine) => {
          const sortInfo = getSortInfo(wine)
          return (
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
                    {wine.region && <span>&middot; {wine.region}</span>}
                  </div>
                  {sortInfo && (
                    <div className="text-xs text-red-800/70 font-medium mt-0.5">{sortInfo}</div>
                  )}
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
          )
        })}
      </div>
    </div>
  )
}
