import { useLocationWithSlots } from '../hooks/useLocations'

type Props = {
  locationId: string
  onSlotClick: (slotId: string) => void
  highlightSlotId?: string | null
}

const wineColorClass: Record<string, string> = {
  red: 'bg-red-700',
  white: 'bg-amber-300',
  rosé: 'bg-pink-400',
  sparkling: 'bg-yellow-300',
  dessert: 'bg-amber-500',
  fortified: 'bg-amber-800',
  other: 'bg-stone-400',
}

const wineColorBorder: Record<string, string> = {
  red: 'border-red-700',
  white: 'border-amber-300',
  rosé: 'border-pink-400',
  sparkling: 'border-yellow-300',
  dessert: 'border-amber-500',
  fortified: 'border-amber-800',
  other: 'border-stone-400',
}

export default function RackView({ locationId, onSlotClick, highlightSlotId }: Props) {
  const { data, isLoading } = useLocationWithSlots(locationId)

  if (isLoading) return <div className="text-stone-500 text-sm py-4">Laden...</div>
  if (!data) return null

  const isKoelkast = data.type === 'koelkast'

  if (isKoelkast) {
    // Koelkast: horizontal bottle icons (top shelf)
    return <RekLayout location={data} onSlotClick={onSlotClick} highlightSlotId={highlightSlotId} />
  }

  // Rek / kistje: vertical list with slot cards
  return <ListLayout location={data} onSlotClick={onSlotClick} highlightSlotId={highlightSlotId} />
}

function RekLayout({
  location,
  onSlotClick,
  highlightSlotId,
}: {
  location: { name: string; slots: any[] }
  onSlotClick: (slotId: string) => void
  highlightSlotId?: string | null
}) {
  const slots = location.slots ?? []

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{location.name}</h2>
      <div className="flex gap-2 overflow-x-auto pb-3">
        {slots.map((slot) => {
          const activeBottles = slot.bottles.filter(
            (b: any) => !b.consumed_at,
          )
          const bottle = activeBottles[0]
          const wineColor = bottle?.wine?.color ?? null
          const isEmpty = activeBottles.length === 0

          return (
            <button
              key={slot.id}
              onClick={() => onSlotClick(slot.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 group ${
                slot.id === highlightSlotId ? 'ring-2 ring-red-800/50 rounded-lg animate-pulse' : ''
              }`}
            >
              {/* Bottle shape */}
              <div
                className={`w-8 transition-transform group-hover:scale-110 group-active:scale-95 ${
                  isEmpty ? 'opacity-40' : ''
                }`}
              >
                {/* Bottle neck */}
                <div
                  className={`w-2 h-4 mx-auto rounded-t-sm ${
                    isEmpty
                      ? 'border border-stone-300 bg-transparent'
                      : `${wineColorClass[wineColor ?? 'other']}`
                  }`}
                />
                {/* Bottle body */}
                <div
                  className={`w-8 h-12 rounded-b-md ${
                    isEmpty
                      ? 'border-2 border-dashed border-stone-300 bg-transparent'
                      : `${wineColorClass[wineColor ?? 'other']} border ${wineColorBorder[wineColor ?? 'other']}`
                  }`}
                />
              </div>
              {/* Position label */}
              <span className="text-[10px] text-stone-500">
                {slot.label ?? slot.position}
              </span>
            </button>
          )
        })}
      </div>
      <div className="text-xs text-stone-500">
        {slots.filter((s) => s.bottles.some((b: any) => !b.consumed_at)).length}{' '}
        / {slots.length} bezet
      </div>
    </div>
  )
}

function ListLayout({
  location,
  onSlotClick,
  highlightSlotId,
}: {
  location: { name: string; type: string; slots: any[] }
  onSlotClick: (slotId: string) => void
  highlightSlotId?: string | null
}) {
  const slots = location.slots ?? []

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{location.name}</h2>
      {slots.length === 0 && (
        <p className="text-stone-500 text-sm">Geen vakken gevonden.</p>
      )}
      <div className="space-y-2">
        {slots.map((slot) => {
          const activeBottles = slot.bottles.filter(
            (b: any) => !b.consumed_at,
          )
          return (
            <button
              key={slot.id}
              onClick={() => onSlotClick(slot.id)}
              className={`w-full text-left bg-white rounded-lg p-3 shadow-sm border transition-all hover:shadow-md hover:border-stone-300 active:scale-[0.99] ${
                slot.id === highlightSlotId
                  ? 'border-red-800 ring-2 ring-red-800/50 animate-pulse'
                  : 'border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">
                    {slot.label ?? `Plek ${slot.position}`}
                  </div>
                  <div className="text-xs text-stone-500">
                    {activeBottles.length} / {slot.capacity} flessen
                  </div>
                </div>
                <div className="flex gap-1">
                  {activeBottles.map((b: any) => (
                    <span
                      key={b.id}
                      className={`w-3 h-8 rounded-sm ${
                        wineColorClass[b.wine?.color ?? 'other']
                      }`}
                    />
                  ))}
                  {Array.from(
                    { length: slot.capacity - activeBottles.length },
                    (_, i) => (
                      <span
                        key={`empty-${i}`}
                        className="w-3 h-8 rounded-sm border border-dashed border-stone-300"
                      />
                    ),
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
