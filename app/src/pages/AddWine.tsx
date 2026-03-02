import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAddWine } from '../hooks/useWines'
import { useAddBottles } from '../hooks/useBottles'
import { parseCellarTrackerCsv } from '../lib/csv-import'
import { supabase } from '../lib/supabase'
import type { Wine } from '../types/database'

type ErrorWithMessage = { message: string }

type Tab = 'manual' | 'csv'

const colorOptions: { value: Wine['color']; label: string }[] = [
  { value: 'red', label: 'Rood' },
  { value: 'white', label: 'Wit' },
  { value: 'rosé', label: 'Ros\u00e9' },
  { value: 'sparkling', label: 'Mousseux' },
  { value: 'dessert', label: 'Dessert / Zoet' },
  { value: 'fortified', label: 'Versterkt' },
  { value: 'other', label: 'Overig' },
]

export default function AddWine() {
  const [tab, setTab] = useState<Tab>('manual')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Wijn toevoegen</h1>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-stone-200 rounded-lg p-1">
        <button
          onClick={() => setTab('manual')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'manual' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
          }`}
        >
          Handmatig
        </button>
        <button
          onClick={() => setTab('csv')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'csv' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
          }`}
        >
          CSV Import
        </button>
      </div>

      {tab === 'manual' ? <ManualForm /> : <CsvImport />}
    </div>
  )
}

function ManualForm() {
  const navigate = useNavigate()
  const addWine = useAddWine()
  const addBottles = useAddBottles()

  const [name, setName] = useState('')
  const [producer, setProducer] = useState('')
  const [vintage, setVintage] = useState('')
  const [color, setColor] = useState<Wine['color']>('red')
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState('')
  const [varietal, setVarietal] = useState('')
  const [shop, setShop] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [price, setPrice] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ wineId: string; name: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Naam is verplicht')
      return
    }

    try {
      const wine = await addWine.mutateAsync({
        name: name.trim(),
        producer: producer.trim() || null,
        vintage: vintage ? parseInt(vintage) : null,
        color,
        country: country.trim() || null,
        region: region.trim() || null,
        subregion: null,
        appellation: null,
        varietal: varietal.trim() || null,
        designation: null,
        drink_from: null,
        drink_until: null,
        price: price ? parseFloat(price) : null,
        estimated_value: null,
        shop: shop.trim() || null,
        notes: null,
        cellartracker_id: null,
      })

      const qty = parseInt(quantity) || 1
      if (qty > 0) {
        await addBottles.mutateAsync({ wine_id: wine.id, count: qty })
      }

      setSuccess({ wineId: wine.id, name: wine.name })
    } catch (err: unknown) {
      setError((err as ErrorWithMessage).message ?? 'Er ging iets mis')
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
        <div className="text-green-800 font-semibold text-lg">Wijn toegevoegd!</div>
        <p className="text-green-700 text-sm">{success.name} is opgeslagen.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(`/wines/${success.wineId}`)}
            className="px-4 py-2 bg-red-800 text-white text-sm rounded-lg hover:bg-red-900"
          >
            Bekijk wijn
          </button>
          <button
            onClick={() => {
              setSuccess(null)
              setName('')
              setProducer('')
              setVintage('')
              setColor('red')
              setCountry('')
              setRegion('')
              setVarietal('')
              setShop('')
              setQuantity('1')
              setPrice('')
            }}
            className="px-4 py-2 bg-stone-200 text-stone-700 text-sm rounded-lg hover:bg-stone-300"
          >
            Nog een toevoegen
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Naam *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Producent</label>
        <input
          type="text"
          value={producer}
          onChange={(e) => setProducer(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Vintage</label>
          <input
            type="number"
            value={vintage}
            onChange={(e) => setVintage(e.target.value)}
            placeholder="bijv. 2020"
            className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Categorie</label>
          <select
            value={color}
            onChange={(e) => setColor(e.target.value as Wine['color'])}
            className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800"
          >
            {colorOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Land</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Regio</label>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Druif</label>
        <input
          type="text"
          value={varietal}
          onChange={(e) => setVarietal(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Shop</label>
        <input
          type="text"
          value={shop}
          onChange={(e) => setShop(e.target.value)}
          placeholder="Waar gekocht"
          className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Aantal flessen</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Prijs per fles</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            step="0.01"
            placeholder="&euro;"
            className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={addWine.isPending || addBottles.isPending}
        className="w-full py-3 bg-red-800 text-white font-medium rounded-lg hover:bg-red-900 disabled:opacity-50 transition-colors"
      >
        {addWine.isPending || addBottles.isPending ? 'Bezig...' : 'Opslaan'}
      </button>
    </form>
  )
}

type ImportStatus = 'idle' | 'previewing' | 'importing' | 'done' | 'error'

type ImportMode = 'sync' | 'add'

type SyncResult = {
  newWines: number
  updatedWines: number
  addedBottles: number
  removedBottles: number
  totalBottles: number
}

function CsvImport() {
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [preview, setPreview] = useState<ReturnType<typeof parseCellarTrackerCsv>>([])
  const [importMode, setImportMode] = useState<ImportMode>('sync')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      try {
        const parsed = parseCellarTrackerCsv(text)
        setPreview(parsed)
        setStatus('previewing')
      } catch {
        setError('Kon het CSV-bestand niet verwerken. Controleer het bestandsformaat.')
        setStatus('error')
      }
    }
    reader.readAsText(file, 'windows-1252')
  }

  async function handleImport() {
    setStatus('importing')
    setProgress(0)

    const stats: SyncResult = { newWines: 0, updatedWines: 0, addedBottles: 0, removedBottles: 0, totalBottles: 0 }

    try {
      if (importMode === 'sync') {
        // Smart sync: match by cellartracker_id, preserve placements
        // 1. Fetch all existing wines with cellartracker_id
        const { data: existingWines } = await supabase
          .from('wines')
          .select('id, cellartracker_id')
        const wineByCtId = new Map<string, string>()
        for (const w of existingWines ?? []) {
          if (w.cellartracker_id) wineByCtId.set(w.cellartracker_id, w.id)
        }

        for (let i = 0; i < preview.length; i++) {
          const item = preview[i]
          const ctId = item.wine.cellartracker_id
          const existingWineId = ctId ? wineByCtId.get(ctId) : null

          if (existingWineId) {
            // UPDATE existing wine data (preserve id)
            const { cellartracker_id: _ct, ...updateData } = item.wine
            await supabase.from('wines').update(updateData).eq('id', existingWineId)
            stats.updatedWines++

            // Count active bottles for this wine
            const { count } = await supabase
              .from('bottles')
              .select('*', { count: 'exact', head: true })
              .eq('wine_id', existingWineId)
              .is('consumed_at', null)
            const currentCount = count ?? 0

            if (item.quantity > currentCount) {
              // Need more bottles → add unplaced
              const toAdd = item.quantity - currentCount
              const newBottles = Array.from({ length: toAdd }, () => ({
                wine_id: existingWineId,
                slot_id: null,
                pending: isPending,
              }))
              await supabase.from('bottles').insert(newBottles)
              stats.addedBottles += toAdd
            } else if (item.quantity < currentCount) {
              // Too many bottles → remove (unplaced first, then placed)
              const toRemove = currentCount - item.quantity
              const { data: bottles } = await supabase
                .from('bottles')
                .select('id, slot_id')
                .eq('wine_id', existingWineId)
                .is('consumed_at', null)
                .order('slot_id', { ascending: true, nullsFirst: true })
                .limit(toRemove)
              if (bottles?.length) {
                await supabase.from('bottles').delete().in('id', bottles.map(b => b.id))
                stats.removedBottles += bottles.length
              }
            }
            stats.totalBottles += item.quantity
          } else {
            // NEW wine → insert
            const { data: wineData, error: wineError } = await supabase
              .from('wines')
              .insert(item.wine)
              .select()
              .single()
            if (wineError) throw wineError
            const wine = wineData as Wine
            stats.newWines++

            if (item.quantity > 0) {
              const bottles = Array.from({ length: item.quantity }, () => ({
                wine_id: wine.id,
                slot_id: null,
                pending: isPending,
              }))
              await supabase.from('bottles').insert(bottles)
              stats.addedBottles += item.quantity
            }
            stats.totalBottles += item.quantity
          }

          setProgress(Math.round(((i + 1) / preview.length) * 100))
        }
      } else {
        // Add mode: just insert everything as new
        for (let i = 0; i < preview.length; i++) {
          const item = preview[i]
          const { data: wineData, error: wineError } = await supabase
            .from('wines')
            .insert(item.wine)
            .select()
            .single()
          if (wineError) throw wineError
          const wine = wineData as Wine
          stats.newWines++

          if (item.quantity > 0) {
            const bottles = Array.from({ length: item.quantity }, () => ({
              wine_id: wine.id,
              slot_id: null,
              pending: isPending,
            }))
            await supabase.from('bottles').insert(bottles)
            stats.addedBottles += item.quantity
          }
          stats.totalBottles += item.quantity
          setProgress(Math.round(((i + 1) / preview.length) * 100))
        }
      }

      setResult(stats)
      setStatus('done')
    } catch (err: unknown) {
      setError((err as ErrorWithMessage).message ?? 'Import mislukt')
      setStatus('error')
    }
  }

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
    'rosé': 'Ros\u00e9',
    sparkling: 'Mousseux',
    dessert: 'Dessert / Zoet',
    fortified: 'Versterkt',
    other: 'Overig',
  }

  if (status === 'done' && result) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
        <div className="text-green-800 font-semibold text-lg">
          {importMode === 'sync' ? 'Synchronisatie voltooid!' : 'Import voltooid!'}
        </div>
        <div className="text-green-700 text-sm space-y-1">
          {result.newWines > 0 && <p>{result.newWines} nieuwe wijnen toegevoegd</p>}
          {result.updatedWines > 0 && <p>{result.updatedWines} wijnen bijgewerkt</p>}
          {result.addedBottles > 0 && <p>{result.addedBottles} flessen toegevoegd</p>}
          {result.removedBottles > 0 && <p>{result.removedBottles} flessen verwijderd</p>}
          <p className="font-medium mt-2">{result.totalBottles} flessen totaal in import</p>
        </div>
        <button
          onClick={() => {
            setStatus('idle')
            setPreview([])
            setResult(null)
          }}
          className="px-4 py-2 bg-stone-200 text-stone-700 text-sm rounded-lg hover:bg-stone-300"
        >
          Nog een import
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {/* File input */}
      {status === 'idle' || status === 'error' ? (
        <div className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center">
          <p className="text-stone-500 mb-3">Selecteer een CellarTracker CSV-bestand</p>
          <label className="inline-block px-4 py-2 bg-red-800 text-white text-sm font-medium rounded-lg hover:bg-red-900 cursor-pointer">
            Bestand kiezen
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      ) : null}

      {/* Preview */}
      {status === 'previewing' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            {preview.length} wijnen gevonden, totaal{' '}
            {preview.reduce((sum, p) => sum + p.quantity, 0)} flessen
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {preview.map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-lg p-3 border border-stone-200 flex items-center justify-between text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{item.wine.name}</div>
                  <div className="text-stone-400">
                    {item.wine.vintage ?? 'NV'} &middot; {item.quantity} fles{item.quantity > 1 ? 'sen' : ''}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2 ${colorBadge[item.wine.color]}`}>
                  {colorLabel[item.wine.color]}
                </span>
              </div>
            ))}
          </div>

          {/* Import mode */}
          <div className="flex gap-2 bg-stone-100 rounded-lg p-1">
            <button
              onClick={() => setImportMode('sync')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                importMode === 'sync' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
              }`}
            >
              Synchroniseren
            </button>
            <button
              onClick={() => setImportMode('add')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                importMode === 'add' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
              }`}
            >
              Toevoegen
            </button>
          </div>
          <p className="text-xs text-stone-400">
            {importMode === 'sync'
              ? 'Wijnen worden gematcht op CellarTracker ID. Bestaande plaatsingen blijven behouden. Nieuwe flessen worden ongeplaatst toegevoegd.'
              : 'Alle wijnen worden als nieuw toegevoegd aan de collectie.'}
          </p>

          <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isPending}
              onChange={(e) => setIsPending(e.target.checked)}
              className="rounded border-stone-300 text-orange-500 focus:ring-orange-500/30"
            />
            Dit zijn bestelde (pending) flessen
          </label>

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              className="flex-1 py-3 bg-red-800 text-white font-medium rounded-lg hover:bg-red-900 transition-colors"
            >
              {importMode === 'sync' ? 'Synchroniseer' : 'Importeer'}
            </button>
            <button
              onClick={() => {
                setStatus('idle')
                setPreview([])
              }}
              className="px-4 py-3 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300"
            >
              Annuleer
            </button>
          </div>
        </div>
      )}

      {/* Importing progress */}
      {status === 'importing' && (
        <div className="space-y-3 py-8 text-center">
          <div className="text-stone-600 font-medium">Importeren...</div>
          <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-red-800 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-sm text-stone-400">{progress}%</div>
        </div>
      )}
    </div>
  )
}
