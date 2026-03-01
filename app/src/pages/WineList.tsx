import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWines } from '../hooks/useWines'
import type { WineWithBottles } from '../hooks/useWines'

/** Major section ordering (CellarTracker-style) */
const sectionOrder = ['sparkling', 'dry', 'off-dry', 'sweet', 'fortified'] as const
type Section = (typeof sectionOrder)[number]

const sectionLabel: Record<Section, string> = {
  sparkling: 'Mousserende wijnen',
  dry: 'Droge wijnen',
  'off-dry': 'Halfdroge wijnen',
  sweet: 'Dessert- & Zoete wijnen',
  fortified: 'Versterkte wijnen',
}

/** Colors within each section, in display order */
const colorOrder = ['white', 'rosé', 'red'] as const

const colorLabel: Record<string, string> = {
  red: 'Rood',
  white: 'Wit',
  'rosé': 'Rosé',
}

function getSection(wine: WineWithBottles): Section {
  if (wine.color === 'sparkling') return 'sparkling'
  if (wine.color === 'fortified') return 'fortified'
  if (wine.color === 'dessert') return 'sweet'
  if (wine.color === 'other') return 'dry' // non-alcoholic etc go with dry
  // For red, white, rosé: default to "dry"
  return 'dry'
}

function getActiveBottles(wine: WineWithBottles): number {
  return wine.bottles.filter((b) => !b.consumed_at).length
}

type GroupedWine = {
  wine: WineWithBottles
  quantity: number
}

type RegionGroup = {
  region: string
  wines: GroupedWine[]
}

type CountryGroup = {
  country: string
  regions: RegionGroup[]
}

type ColorGroup = {
  color: string
  countries: CountryGroup[]
}

type SectionGroup = {
  section: Section
  label: string
  colors: ColorGroup[]
  totalBottles: number
}

export default function WineList() {
  const navigate = useNavigate()
  const { data: allWines, isLoading } = useWines()

  const sections = useMemo(() => {
    if (!allWines) return []

    // Only wines with active bottles
    const active = allWines
      .map((w) => ({ wine: w, quantity: getActiveBottles(w) }))
      .filter((w) => w.quantity > 0)

    // Group into sections
    const sectionMap = new Map<Section, GroupedWine[]>()
    for (const gw of active) {
      const sec = getSection(gw.wine)
      if (!sectionMap.has(sec)) sectionMap.set(sec, [])
      sectionMap.get(sec)!.push(gw)
    }

    const result: SectionGroup[] = []
    for (const sec of sectionOrder) {
      const wines = sectionMap.get(sec)
      if (!wines || wines.length === 0) continue

      // For sparkling/fortified/sweet: no color sub-grouping needed
      const needsColorGrouping = sec === 'dry' || sec === 'off-dry'

      const colorMap = new Map<string, GroupedWine[]>()
      for (const gw of wines) {
        const c = needsColorGrouping ? gw.wine.color : '_all'
        if (!colorMap.has(c)) colorMap.set(c, [])
        colorMap.get(c)!.push(gw)
      }

      const colors: ColorGroup[] = []
      const colKeys = needsColorGrouping
        ? colorOrder.filter((c) => colorMap.has(c))
        : ['_all']

      // Add any extra colors not in colorOrder (like 'other')
      if (needsColorGrouping) {
        for (const c of colorMap.keys()) {
          if (!colKeys.includes(c as any)) colKeys.push(c as any)
        }
      }

      for (const col of colKeys) {
        const colWines = colorMap.get(col)
        if (!colWines) continue

        // Group by country
        const countryMap = new Map<string, GroupedWine[]>()
        for (const gw of colWines) {
          const country = gw.wine.country || 'Onbekend'
          if (!countryMap.has(country)) countryMap.set(country, [])
          countryMap.get(country)!.push(gw)
        }

        const countries: CountryGroup[] = []
        for (const [country, cWines] of [...countryMap.entries()].sort((a, b) =>
          a[0].localeCompare(b[0])
        )) {
          // Group by region/appellation
          const regionMap = new Map<string, GroupedWine[]>()
          for (const gw of cWines) {
            const region = gw.wine.appellation || gw.wine.region || gw.wine.subregion || ''
            if (!regionMap.has(region)) regionMap.set(region, [])
            regionMap.get(region)!.push(gw)
          }

          const regions: RegionGroup[] = []
          for (const [region, rWines] of [...regionMap.entries()].sort((a, b) =>
            a[0].localeCompare(b[0])
          )) {
            // Sort wines within region: by vintage, then name
            rWines.sort((a, b) => {
              const vCmp = (a.wine.vintage ?? 9999) - (b.wine.vintage ?? 9999)
              if (vCmp !== 0) return vCmp
              return a.wine.name.localeCompare(b.wine.name)
            })
            regions.push({ region, wines: rWines })
          }

          countries.push({ country, regions })
        }

        colors.push({ color: col, countries })
      }

      result.push({
        section: sec,
        label: sectionLabel[sec],
        colors,
        totalBottles: wines.reduce((sum, w) => sum + w.quantity, 0),
      })
    }

    return result
  }, [allWines])

  const totalBottles = sections.reduce((sum, s) => sum + s.totalBottles, 0)

  if (isLoading) return <div className="p-4 text-stone-500">Laden...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wijnlijst</h1>
        <p className="text-sm text-stone-500 mt-1">{totalBottles} flessen op voorraad</p>
      </div>

      {sections.map((section) => (
        <div key={section.section}>
          {/* Section header */}
          <div className="bg-red-800 text-white px-4 py-2 rounded-t-lg font-bold text-sm uppercase tracking-wide flex justify-between items-center">
            <span>{section.label}</span>
            <span className="text-red-200 text-xs font-normal">{section.totalBottles} fl.</span>
          </div>

          <div className="bg-white border border-t-0 border-stone-200 rounded-b-lg divide-y divide-stone-100">
            {section.colors.map((colorGroup) => (
              <div key={colorGroup.color}>
                {/* Color sub-header (only for dry/off-dry) */}
                {colorGroup.color !== '_all' && (
                  <div className="bg-stone-100 px-4 py-1.5 font-semibold text-xs text-stone-600 uppercase tracking-wide">
                    {colorLabel[colorGroup.color] ?? colorGroup.color}
                  </div>
                )}

                {colorGroup.countries.map((countryGroup) => (
                  <div key={countryGroup.country}>
                    {/* Country header */}
                    <div className="px-4 py-1.5 bg-stone-50 border-b border-stone-100">
                      <span className="font-semibold text-xs text-stone-700">
                        {countryGroup.country}
                      </span>
                    </div>

                    {countryGroup.regions.map((regionGroup) => (
                      <div key={regionGroup.region}>
                        {/* Region/appellation header */}
                        {regionGroup.region && (
                          <div className="px-4 py-1 pl-6">
                            <span className="text-xs font-medium text-stone-500 italic">
                              {regionGroup.region}
                            </span>
                          </div>
                        )}

                        {/* Wine entries */}
                        {regionGroup.wines.map((gw) => (
                          <button
                            key={gw.wine.id}
                            onClick={() => navigate(`/wines/${gw.wine.id}`)}
                            className="w-full text-left px-4 py-1.5 pl-8 flex items-baseline gap-2 hover:bg-stone-50 transition-colors"
                          >
                            <span className="text-xs text-stone-400 w-10 shrink-0 text-right tabular-nums">
                              {gw.wine.vintage ?? 'NV'}
                            </span>
                            <span className="text-sm text-stone-800 flex-1 min-w-0 truncate">
                              {gw.wine.name}
                              {gw.wine.producer && (
                                <span className="text-stone-400 ml-1">({gw.wine.producer})</span>
                              )}
                            </span>
                            <span className="text-xs text-stone-500 shrink-0 tabular-nums">
                              {gw.quantity}×
                            </span>
                            {(gw.wine.drink_from || gw.wine.drink_until) && (
                              <span className="text-xs text-stone-400 shrink-0 tabular-nums">
                                {gw.wine.drink_from ?? '?'}–{gw.wine.drink_until ?? '?'}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}

      {sections.length === 0 && (
        <div className="text-center py-12 text-stone-400">
          <p className="text-lg">Geen wijnen in voorraad</p>
        </div>
      )}
    </div>
  )
}
