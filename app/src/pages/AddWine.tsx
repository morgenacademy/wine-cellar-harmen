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

type ImportMode = 'replace' | 'add'

function CsvImport() {
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [preview, setPreview] = useState<ReturnType<typeof parseCellarTrackerCsv>>([])
  const [importMode, setImportMode] = useState<ImportMode>('replace')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ wines: number; bottles: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    let totalWines = 0
    let totalBottles = 0

    try {
      if (importMode === 'replace') {
        // Delete all bottles first (FK constraint), then wines
        const { error: delBottles } = await supabase.from('bottles').delete().gte('added_at', '1970-01-01')
        if (delBottles) throw delBottles
        const { error: delWines } = await supabase.from('wines').delete().gte('created_at', '1970-01-01')
        if (delWines) throw delWines
      }

      for (let i = 0; i < preview.length; i++) {
        const item = preview[i]

        // Insert wine
        const { data: wineData, error: wineError } = await supabase
          .from('wines')
          .insert(item.wine)
          .select()
          .single()

        if (wineError) throw wineError
        const wine = wineData as Wine

        // Insert bottles
        const bottles = Array.from({ length: item.quantity }, () => ({
          wine_id: wine.id,
          slot_id: null,
        }))

        const { error: bottlesError } = await supabase
          .from('bottles')
          .insert(bottles)

        if (bottlesError) throw bottlesError

        totalWines++
        totalBottles += item.quantity
        setProgress(Math.round(((i + 1) / preview.length) * 100))
      }

      setResult({ wines: totalWines, bottles: totalBottles })
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
        <div className="text-green-800 font-semibold text-lg">Import voltooid!</div>
        <p className="text-green-700 text-sm">
          {result.wines} wijnen en {result.bottles} flessen geïmporteerd.
        </p>
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
              onClick={() => setImportMode('replace')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                importMode === 'replace' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
              }`}
            >
              Vervangen
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
            {importMode === 'replace'
              ? 'Alle bestaande wijnen en flessen worden verwijderd en vervangen door de import.'
              : 'Wijnen worden toegevoegd aan de bestaande collectie.'}
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              className="flex-1 py-3 bg-red-800 text-white font-medium rounded-lg hover:bg-red-900 transition-colors"
            >
              {importMode === 'replace' ? 'Vervang & importeer' : 'Importeer'}
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
