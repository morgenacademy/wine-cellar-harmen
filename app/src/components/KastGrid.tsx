import { useLocationWithSlots } from '../hooks/useLocations'
import type { Location, SlotWithBottles } from '../types/database'

type Props = {
  locations: Location[]
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

type CellDef =
  | { kind: 'non-wine'; label: string }
  | { kind: 'wine'; capacityHint: number }
  | { kind: 'split-wine'; topCapacity: number; bottomCapacity: number }


const gridLayout: CellDef[][] = [
  // Row 1
  [
    { kind: 'non-wine', label: 'Balk' },
    { kind: 'non-wine', label: 'Decanteerkan' },
    { kind: 'non-wine', label: 'Bierglazen' },
    { kind: 'non-wine', label: 'Opslag' },
  ],
  // Row 2
  [
    { kind: 'non-wine', label: 'Wijnglazen rood' },
    { kind: 'non-wine', label: 'Champagneglazen' },
    { kind: 'non-wine', label: 'Wijnkoeler' },
    { kind: 'wine', capacityHint: 12 },
  ],
  // Row 3
  [
    { kind: 'non-wine', label: 'Wijnglazen wit' },
    { kind: 'wine', capacityHint: 12 },
    { kind: 'split-wine', topCapacity: 5, bottomCapacity: 12 },
    { kind: 'split-wine', topCapacity: 5, bottomCapacity: 12 },
  ],
  // Row 4
  [
    { kind: 'non-wine', label: 'Waterglazen' },
    { kind: 'wine', capacityHint: 8 },
    { kind: 'wine', capacityHint: 8 },
    { kind: 'wine', capacityHint: 8 },
  ],
  // Row 5
  [
    { kind: 'non-wine', label: 'Theedoos' },
    { kind: 'wine', capacityHint: 5 },
    { kind: 'wine', capacityHint: 5 },
    { kind: 'wine', capacityHint: 5 },
  ],
  // Row 6
  [
    { kind: 'non-wine', label: 'Kruiden' },
    { kind: 'wine', capacityHint: 8 },
    { kind: 'wine', capacityHint: 8 },
    { kind: 'wine', capacityHint: 8 },
  ],
  // Row 7
  [
    { kind: 'wine', capacityHint: 12 },
    { kind: 'wine', capacityHint: 8 },
    { kind: 'wine', capacityHint: 8 },
    { kind: 'wine', capacityHint: 8 },
  ],
  // Row 8
  [
    { kind: 'wine', capacityHint: 12 },
    { kind: 'wine', capacityHint: 12 },
    { kind: 'wine', capacityHint: 12 },
    { kind: 'wine', capacityHint: 12 },
  ],
]

// Row 3 is taller to fit split shelves (boven/onder)
const ROW_HEIGHTS = ['h-16', 'h-16', 'h-24', 'h-16', 'h-16', 'h-16', 'h-16', 'h-16']

function WineSlotButton({
  slot,
  onSlotClick,
  className,
  highlight,
}: {
  slot: SlotWithBottles | undefined
  onSlotClick: (slotId: string) => void
  className: string
  highlight?: boolean
}) {
  if (!slot) {
    return (
      <div
        className={`${className} rounded-md border-2 border-dashed border-stone-300 flex items-center justify-center`}
      >
        <span className="text-[10px] text-stone-400">Leeg</span>
      </div>
    )
  }

  const activeBottles = slot.bottles.filter((b) => !b.consumed_at)
  const fillCount = activeBottles.length
  const fillPercent = slot.capacity > 0 ? (fillCount / slot.capacity) * 100 : 0

  const colorCounts: Record<string, number> = {}
  activeBottles.forEach((b) => {
    const c = b.wine?.color ?? 'other'
    colorCounts[c] = (colorCounts[c] ?? 0) + 1
  })
  const dominantColor =
    Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other'

  return (
    <button
      onClick={() => onSlotClick(slot.id)}
      className={`${className} w-full rounded-md border bg-white relative overflow-hidden text-left transition-all hover:shadow-md hover:border-stone-400 active:scale-[0.98] ${
        highlight
          ? 'border-red-800 ring-2 ring-red-800/50 animate-pulse'
          : 'border-stone-300'
      }`}
    >
      {fillCount > 0 && (
        <div
          className={`absolute bottom-0 left-0 right-0 ${wineColorClass[dominantColor]} opacity-30 transition-all`}
          style={{ height: `${fillPercent}%` }}
        />
      )}
      <div className="absolute top-0.5 right-0.5 flex gap-0.5">
        {Object.keys(colorCounts).map((color) => (
          <span
            key={color}
            className={`w-2 h-2 rounded-full ${wineColorClass[color]}`}
          />
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        <span className="text-sm font-bold text-stone-800">
          {fillCount}/{slot.capacity}
        </span>
        {slot.label && (
          <span className="text-[9px] text-stone-500 truncate max-w-full px-1">
            {slot.label}
          </span>
        )}
      </div>
    </button>
  )
}

function KastColumn({
  location,
  colIndex,
  onSlotClick,
  highlightSlotId,
}: {
  location: Location
  colIndex: number
  onSlotClick: (slotId: string) => void
  highlightSlotId?: string | null
}) {
  const { data } = useLocationWithSlots(location.id)
  const slots = data?.slots ?? []

  // Build map of row_index -> slots[] (multiple slots possible per row for split shelves)
  const slotsByRow = new Map<number, SlotWithBottles[]>()
  slots.forEach((s) => {
    if (s.row_index != null) {
      const existing = slotsByRow.get(s.row_index) ?? []
      existing.push(s)
      slotsByRow.set(s.row_index, existing)
    }
  })
  // Sort by position for consistent top/bottom ordering
  slotsByRow.forEach((arr) => arr.sort((a, b) => a.position - b.position))

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold text-stone-500 text-center pb-1">
        Kolom {colIndex + 1}
      </div>
      {gridLayout.map((row, rowIdx) => {
        const cellDef = row[colIndex]
        const rowIndex = rowIdx + 1 // row_index in DB is 1-based
        const rowSlots = slotsByRow.get(rowIndex) ?? []
        const height = ROW_HEIGHTS[rowIdx]

        if (cellDef.kind === 'non-wine') {
          return (
            <div
              key={rowIdx}
              className={`${height} rounded-md bg-stone-200 flex items-center justify-center px-1`}
            >
              <span className="text-[10px] text-stone-500 text-center leading-tight">
                {cellDef.label}
              </span>
            </div>
          )
        }

        if (cellDef.kind === 'wine') {
          return (
            <WineSlotButton
              key={rowIdx}
              slot={rowSlots[0]}
              onSlotClick={onSlotClick}
              className={height}
              highlight={rowSlots[0]?.id === highlightSlotId}
            />
          )
        }

        if (cellDef.kind === 'split-wine') {
          return (
            <div key={rowIdx} className={`${height} flex flex-col gap-0.5`}>
              <WineSlotButton
                slot={rowSlots[0]}
                onSlotClick={onSlotClick}
                className="flex-1 min-h-0"
                highlight={rowSlots[0]?.id === highlightSlotId}
              />
              <WineSlotButton
                slot={rowSlots[1]}
                onSlotClick={onSlotClick}
                className="flex-1 min-h-0"
                highlight={rowSlots[1]?.id === highlightSlotId}
              />
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

export default function KastGrid({ locations, onSlotClick, highlightSlotId }: Props) {
  const sorted = [...locations].sort((a, b) => a.sort_order - b.sort_order)

  if (sorted.length === 0) {
    return (
      <div className="text-stone-500 text-sm py-4">
        Geen kastlocaties gevonden.
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Kast bij entree</h2>
      <div className="grid grid-cols-4 gap-1.5 max-w-xl">
        {sorted.map((loc, idx) => (
          <KastColumn
            key={loc.id}
            location={loc}
            colIndex={idx}
            onSlotClick={onSlotClick}
            highlightSlotId={highlightSlotId}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-stone-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-700" /> Rood
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-amber-300" /> Wit
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-pink-400" /> Ros&eacute;
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-stone-200" /> Niet-wijn
        </span>
      </div>
    </div>
  )
}
