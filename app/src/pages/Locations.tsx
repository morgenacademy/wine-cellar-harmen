import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLocations } from '../hooks/useLocations'
import KastGrid from '../components/KastGrid'
import RackView from '../components/RackView'
import SlotDetail from '../components/SlotDetail'

export default function Locations() {
  const { data: locations, isLoading } = useLocations()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [highlightSlotId, setHighlightSlotId] = useState<string | null>(null)

  // Handle deep-link from wine detail: ?loc=kast&slot=xyz
  useEffect(() => {
    const loc = searchParams.get('loc')
    const slot = searchParams.get('slot')
    if (loc) {
      setSelectedLocationId(loc)
      if (slot) {
        setSelectedSlotId(slot)
        setHighlightSlotId(slot)
        // Remove highlight after 3 seconds
        const timer = setTimeout(() => setHighlightSlotId(null), 3000)
        return () => clearTimeout(timer)
      }
      // Clean up URL params
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  if (isLoading) return <div className="p-4 text-stone-500">Laden...</div>

  const kastLocations = locations?.filter((l) => l.type === 'kast') ?? []
  const otherLocations = locations?.filter((l) => l.type !== 'kast') ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Locaties</h1>

      {/* Location tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => {
            setSelectedLocationId('kast')
            setSelectedSlotId(null)
          }}
          className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
            selectedLocationId === 'kast'
              ? 'bg-red-800 text-white'
              : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
          }`}
        >
          Kast
        </button>
        {otherLocations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => {
              setSelectedLocationId(loc.id)
              setSelectedSlotId(null)
            }}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
              selectedLocationId === loc.id
                ? 'bg-red-800 text-white'
                : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
            }`}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Prompt when nothing selected */}
      {!selectedLocationId && (
        <p className="text-stone-400 text-sm py-8 text-center">
          Kies een locatie hierboven om de inhoud te bekijken.
        </p>
      )}

      {/* Content area */}
      {selectedLocationId === 'kast' && (
        <KastGrid locations={kastLocations} onSlotClick={setSelectedSlotId} highlightSlotId={highlightSlotId} />
      )}
      {selectedLocationId && selectedLocationId !== 'kast' && (
        <RackView
          locationId={selectedLocationId}
          onSlotClick={setSelectedSlotId}
          highlightSlotId={highlightSlotId}
        />
      )}

      {/* Slot detail overlay */}
      {selectedSlotId && (
        <SlotDetail
          slotId={selectedSlotId}
          onClose={() => setSelectedSlotId(null)}
        />
      )}
    </div>
  )
}
