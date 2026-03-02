import { useState } from 'react'
import { useConsumeBottle } from '../hooks/useBottles'

type Props = {
  bottleId: string
  wineName: string
  onClose: () => void
}

const reasons = [
  { value: 'drunk' as const, label: 'Gedronken', icon: '\uD83C\uDF77' },
  { value: 'sold' as const, label: 'Verkocht', icon: '\uD83D\uDCB0' },
  { value: 'gifted' as const, label: 'Weggegeven', icon: '\uD83C\uDF81' },
  { value: 'lost' as const, label: 'Verloren', icon: '\u2753' },
]

export default function ConsumeSheet({ bottleId, wineName, onClose }: Props) {
  const [reason, setReason] = useState<'drunk' | 'sold' | 'lost' | 'gifted'>('drunk')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const consumeMutation = useConsumeBottle()

  function handleConfirm() {
    consumeMutation.mutate(
      { bottleId, reason, date: new Date(date).toISOString() },
      { onSuccess: onClose }
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl shadow-xl animate-slide-up">
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 rounded-full bg-stone-300" />
        </div>

        <div className="px-4 pb-6 space-y-4">
          <h3 className="font-semibold text-lg">Fles verwijderen</h3>
          <p className="text-sm text-stone-500 truncate">{wineName}</p>

          {/* Reason buttons */}
          <div className="grid grid-cols-2 gap-2">
            {reasons.map((r) => (
              <button
                key={r.value}
                onClick={() => setReason(r.value)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  reason === r.value
                    ? 'border-red-800 bg-red-50 text-red-800'
                    : 'border-stone-200 text-stone-600 hover:border-stone-300'
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>

          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30"
            />
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleConfirm}
              disabled={consumeMutation.isPending}
              className="w-full py-2.5 text-sm font-medium text-white bg-red-800 rounded-lg hover:bg-red-900 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {consumeMutation.isPending ? 'Bezig...' : 'Bevestigen'}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 active:scale-[0.99] transition-all"
            >
              Annuleren
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
