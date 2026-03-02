import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWines } from '../hooks/useWines'
import type { WineWithBottles } from '../hooks/useWines'

/** Major section ordering (CellarTracker-style) */
const sectionOrder = ['sparkling', 'dry', 'off-dry', 'sweet', 'fortified'] as const
type Section = (typeof sectionOrder)[number]

const sectionLabel: Record<Section, string> = {
  sparkling: 'Mousserende Wijnen',
  dry: 'Droge Wijnen',
  'off-dry': 'Halfdroge Wijnen',
  sweet: 'Dessert- & Zoete Wijnen',
  fortified: 'Versterkte Wijnen',
}

/** Colors within each section, in display order */
const colorOrder = ['white', 'rosé', 'red', 'other'] as const

const colorLabel: Record<string, string> = {
  red: 'Rood',
  white: 'Wit',
  'rosé': 'Rosé',
  other: 'Overig',
}

function getSection(wine: WineWithBottles): Section {
  if (wine.color === 'sparkling') return 'sparkling'
  if (wine.color === 'fortified') return 'fortified'
  if (wine.color === 'dessert') return 'sweet'
  // For red, white, rosé, other: default to "dry"
  return 'dry'
}

/** Map sparkling wines to a display color based on their name/varietal */
function getSparklingColor(wine: WineWithBottles): string {
  const name = (wine.name || '').toLowerCase()
  const varietal = (wine.varietal || '').toLowerCase()
  if (name.includes('rosé') || name.includes('rosea') || varietal.includes('rosé')) return 'rosé'
  if (name.includes('lambrusco') || name.includes('pruno nero')) return 'red'
  return 'white'
}

function getBottleCounts(wine: WineWithBottles): { active: number; pending: number } {
  let active = 0
  let pending = 0
  for (const b of wine.bottles) {
    if (b.consumed_at) continue
    if (b.pending) pending++
    else active++
  }
  return { active, pending }
}

type GroupedWine = {
  wine: WineWithBottles
  quantity: number
  pendingCount: number
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

function buildColorGroups(wines: GroupedWine[], getColor: (gw: GroupedWine) => string): ColorGroup[] {
  const colorMap = new Map<string, GroupedWine[]>()
  for (const gw of wines) {
    const c = getColor(gw)
    if (!colorMap.has(c)) colorMap.set(c, [])
    colorMap.get(c)!.push(gw)
  }

  const colors: ColorGroup[] = []
  // Use colorOrder for consistent ordering, then add extras
  const orderedKeys = [...colorOrder.filter((c) => colorMap.has(c))]
  for (const c of colorMap.keys()) {
    if (!orderedKeys.includes(c as any)) orderedKeys.push(c as any)
  }

  for (const col of orderedKeys) {
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

  return colors
}

export default function WineList() {
  const navigate = useNavigate()
  const { data: allWines, isLoading } = useWines()

  const sections = useMemo(() => {
    if (!allWines) return []

    const active = allWines
      .map((w) => {
        const counts = getBottleCounts(w)
        return { wine: w, quantity: counts.active, pendingCount: counts.pending }
      })
      .filter((w) => w.quantity > 0 || w.pendingCount > 0)

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

      // ALL sections get color grouping
      let colors: ColorGroup[]
      if (sec === 'sparkling') {
        // Sparkling: infer color from name (rosé sparkling, red lambrusco, etc.)
        colors = buildColorGroups(wines, (gw) => getSparklingColor(gw.wine))
      } else {
        // Dry, sweet, fortified: use actual wine.color
        colors = buildColorGroups(wines, (gw) => gw.wine.color)
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
  const totalPending = useMemo(() => {
    if (!allWines) return 0
    return allWines.reduce((sum, w) => sum + getBottleCounts(w).pending, 0)
  }, [allWines])

  if (isLoading) return <div className="p-4 text-stone-500">Laden...</div>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Wijnlijst</h1>
        <p className="text-sm text-stone-500 mt-1">
          {totalBottles} flessen op voorraad
          {totalPending > 0 && <span className="text-orange-500"> + {totalPending} besteld</span>}
        </p>
      </div>

      {sections.map((section) => (
        <div key={section.section} className="mb-10">
          {section.colors.length === 1 || section.section === 'sparkling' ? (
            /* Section header: always for single-color sections and for sparkling */
            <div className="mb-6">
              <hr className="border-stone-300" />
              <h2 className="text-center text-2xl font-serif tracking-wide py-3">
                {section.label}
              </h2>
              <hr className="border-stone-300" />
            </div>
          ) : null}

          {section.colors.map((colorGroup) => (
            <div key={colorGroup.color} className="mb-8">
              {section.colors.length > 1 && section.section !== 'sparkling' ? (
                /* Multi-color section (non-sparkling): each color gets its own full header */
                <div className="mb-6">
                  <hr className="border-stone-300" />
                  <h2 className="text-center text-2xl font-serif tracking-wide py-3">
                    {section.label} — {colorLabel[colorGroup.color] ?? colorGroup.color}
                  </h2>
                  <hr className="border-stone-300" />
                </div>
              ) : section.colors.length > 1 && section.section === 'sparkling' ? (
                /* Sparkling: color as subtle sub-heading, not a full section header */
                <h4 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2 ml-1">
                  {colorLabel[colorGroup.color] ?? colorGroup.color}
                </h4>
              ) : null}

              {colorGroup.countries.map((countryGroup) => (
                <div key={countryGroup.country} className="mb-4">
                  {/* ── Country header ── */}
                  <h4 className="text-lg font-semibold text-stone-800 mb-1 ml-1">
                    {countryGroup.country}
                  </h4>

                  {countryGroup.regions.map((regionGroup) => (
                    <div key={regionGroup.region} className="mb-3">
                      {/* ── Region/appellation header ── */}
                      {regionGroup.region && (
                        <h5 className="text-sm font-semibold text-stone-600 mb-0.5 ml-1">
                          {regionGroup.region}
                        </h5>
                      )}

                      {/* ── Wine entries ── */}
                      {regionGroup.wines.map((gw) => (
                        <button
                          key={gw.wine.id}
                          onClick={() => navigate(`/wines/${gw.wine.id}`)}
                          className="w-full text-left py-0.5 pl-1 pr-1 flex items-baseline gap-1.5 hover:bg-stone-50 rounded transition-colors"
                        >
                          <span className="text-sm font-medium text-stone-700 shrink-0 w-9 text-right tabular-nums">
                            {gw.wine.vintage ?? 'NV'}
                          </span>
                          <span className="text-sm text-stone-800 flex-1 min-w-0">
                            <span className="font-medium">{gw.wine.name}</span>
                            {gw.wine.producer && (
                              <span className="text-stone-400 font-normal"> ({gw.wine.producer})</span>
                            )}
                          </span>
                          <span className="text-sm text-stone-500 shrink-0 tabular-nums text-right">
                            {gw.quantity > 0 ? gw.quantity : ''}
                            {gw.pendingCount > 0 && (
                              <span className="text-orange-500">{gw.quantity > 0 ? ' +' : ''}{gw.pendingCount} besteld</span>
                            )}
                            {(gw.wine.drink_from || gw.wine.drink_until) && (
                              <span className="text-stone-400">
                                , {gw.wine.drink_from ?? '?'}–{gw.wine.drink_until ?? '?'}
                              </span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
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
