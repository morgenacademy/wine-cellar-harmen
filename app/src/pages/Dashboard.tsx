import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../hooks/useDashboard'

const wineColorLabel: Record<string, string> = {
  red: 'Rood',
  white: 'Wit',
  'rosé': 'Rosé',
  sparkling: 'Mousseux',
  dessert: 'Dessert',
  fortified: 'Versterkt',
  other: 'Overig',
}

const wineColorBar: Record<string, string> = {
  red: 'bg-red-700',
  white: 'bg-amber-300',
  'rosé': 'bg-pink-400',
  sparkling: 'bg-yellow-300',
  dessert: 'bg-amber-500',
  fortified: 'bg-amber-800',
  other: 'bg-stone-400',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data, isLoading } = useDashboard()

  if (isLoading) return <div className="p-4">Laden...</div>
  if (!data) return null

  const { stats } = data

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Wijnkelder</h1>

      {/* Total count */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
        <div className="text-4xl font-bold text-red-800">{data.totalBottles}</div>
        <div className="text-stone-500">flessen in voorraad</div>
        {stats.totalValue > 0 && (
          <div className="text-sm text-stone-400 mt-1">
            Totale waarde: €{stats.totalValue.toFixed(0)}
          </div>
        )}
      </div>

      {/* Unplaced */}
      {data.unplaced > 0 && (
        <button
          onClick={() => navigate('/place')}
          className="w-full rounded-xl p-4 bg-yellow-100 text-yellow-800 text-left hover:bg-yellow-200 transition-colors"
        >
          <div className="text-2xl font-bold">{data.unplaced}</div>
          <div className="text-sm">flessen nog niet geplaatst</div>
        </button>
      )}

      {/* Stats: by color */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-stone-200">
        <h2 className="font-semibold text-sm mb-3">Verdeling per categorie</h2>
        <div className="space-y-2">
          {Object.entries(stats.colorCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([color, count]) => (
              <div key={color} className="flex items-center gap-3">
                <span className="text-xs text-stone-500 w-20 text-right">
                  {wineColorLabel[color] ?? color}
                </span>
                <div className="flex-1 h-5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${wineColorBar[color] ?? 'bg-stone-400'}`}
                    style={{ width: `${(count / data.totalBottles) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-stone-700 w-8">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Stats: countries + regions side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-stone-200">
          <h2 className="font-semibold text-sm mb-2">Top landen</h2>
          <div className="space-y-1">
            {stats.countryCounts.map(([country, count]) => (
              <div key={country} className="flex justify-between text-sm">
                <span className="text-stone-600 truncate">{country}</span>
                <span className="font-medium text-stone-800">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-stone-200">
          <h2 className="font-semibold text-sm mb-2">Top regio's</h2>
          <div className="space-y-1">
            {stats.topRegions.map(([region, count]) => (
              <div key={region} className="flex justify-between text-sm">
                <span className="text-stone-600 truncate">{region}</span>
                <span className="font-medium text-stone-800">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats: varietals + vintage info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-stone-200">
          <h2 className="font-semibold text-sm mb-2">Top druiven</h2>
          <div className="space-y-1">
            {stats.topVarietals.map(([varietal, count]) => (
              <div key={varietal} className="flex justify-between text-sm">
                <span className="text-stone-600 truncate">{varietal}</span>
                <span className="font-medium text-stone-800">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-stone-200">
          <h2 className="font-semibold text-sm mb-2">Vintage</h2>
          <div className="space-y-2">
            {stats.avgVintage && (
              <div>
                <div className="text-2xl font-bold text-stone-800">{stats.avgVintage}</div>
                <div className="text-xs text-stone-400">Gemiddeld</div>
              </div>
            )}
            {stats.oldestVintage && (
              <div>
                <div className="text-lg font-bold text-stone-600">{stats.oldestVintage}</div>
                <div className="text-xs text-stone-400">Oudste fles</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drink soon */}
      {data.drinkSoon.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Binnenkort drinken</h2>
          <div className="space-y-2">
            {data.drinkSoon.map((wine: any) => (
              <button
                key={wine.id}
                onClick={() => navigate(`/wines/${wine.id}`)}
                className="w-full text-left bg-white rounded-lg p-3 shadow-sm border border-orange-200 hover:border-orange-400 transition-colors"
              >
                <div className="font-medium">{wine.name}</div>
                <div className="text-sm text-stone-500">
                  {wine.vintage} &middot; Drinken voor {wine.drink_until}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent consumed */}
      {data.recentConsumed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Recent gedronken</h2>
          <div className="space-y-2">
            {data.recentConsumed.map((bottle: any) => (
              <div key={bottle.id} className="bg-white rounded-lg p-3 shadow-sm border border-stone-200 text-sm">
                <span className="font-medium">{bottle.wine.name}</span>
                <span className="text-stone-400 ml-2">
                  {new Date(bottle.consumed_at).toLocaleDateString('nl-NL')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
