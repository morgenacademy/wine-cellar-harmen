import { useDashboard } from '../hooks/useDashboard'

const colorMap: Record<string, string> = {
  kast: 'bg-amber-100 text-amber-800',
  rek: 'bg-stone-100 text-stone-800',
  koelkast: 'bg-blue-100 text-blue-800',
  kistje: 'bg-red-100 text-red-800',
}

export default function Dashboard() {
  const { data, isLoading } = useDashboard()

  if (isLoading) return <div className="p-4">Laden...</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Wijnkelder</h1>

      {/* Total count */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
        <div className="text-4xl font-bold text-red-800">{data.totalBottles}</div>
        <div className="text-stone-500">flessen in voorraad</div>
      </div>

      {/* Per location */}
      <div className="grid grid-cols-2 gap-3">
        {data.locationCounts.map((loc) => (
          <div key={loc.name} className={`rounded-xl p-4 ${colorMap[loc.type] ?? 'bg-stone-100'}`}>
            <div className="text-2xl font-bold">{loc.count}</div>
            <div className="text-sm">{loc.name}</div>
          </div>
        ))}
        {data.unplaced > 0 && (
          <div className="rounded-xl p-4 bg-yellow-100 text-yellow-800">
            <div className="text-2xl font-bold">{data.unplaced}</div>
            <div className="text-sm">Niet geplaatst</div>
          </div>
        )}
      </div>

      {/* Drink soon */}
      {data.drinkSoon.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Binnenkort drinken</h2>
          <div className="space-y-2">
            {data.drinkSoon.map((wine: any) => (
              <div key={wine.id} className="bg-white rounded-lg p-3 shadow-sm border border-orange-200">
                <div className="font-medium">{wine.name}</div>
                <div className="text-sm text-stone-500">
                  {wine.vintage} &middot; Drinken voor {wine.drink_until}
                </div>
              </div>
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
