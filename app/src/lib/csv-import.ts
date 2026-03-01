import type { Wine } from '../types/database'

type CsvImportResult = {
  wine: Omit<Wine, 'id'>
  quantity: number
}

function mapColor(color: string): Wine['color'] {
  const lower = color.toLowerCase()
  if (lower.includes('rosé') || lower.includes('rose')) return 'rosé'
  if (lower.includes('red')) return 'red'
  if (lower.includes('white')) return 'white'
  return 'other'
}

function parseYear(val: string): number | null {
  const n = parseInt(val)
  if (isNaN(n) || n >= 9999) return null
  return n
}

function parsePrice(val: string): number | null {
  if (!val) return null
  const cleaned = val.replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

export function parseCellarTrackerCsv(csvText: string): CsvImportResult[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  const results: CsvImportResult[] = []

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of lines[i]) {
      if (char === '"') { inQuotes = !inQuotes; continue }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue }
      current += char
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })

    results.push({
      wine: {
        name: row['Wine'] ?? '',
        producer: row['Producer'] || null,
        vintage: parseYear(row['Vintage']),
        color: mapColor(row['Color'] ?? ''),
        country: row['Country'] || null,
        region: row['Region'] || null,
        subregion: row['SubRegion'] !== 'Unknown' ? row['SubRegion'] : null,
        appellation: row['Appellation'] !== 'Unknown' ? row['Appellation'] : null,
        varietal: row['Varietal'] || null,
        designation: row['Designation'] !== 'Unknown' ? row['Designation'] : null,
        drink_from: parseYear(row['BeginConsume']),
        drink_until: parseYear(row['EndConsume']),
        price: parsePrice(row['Price']),
        notes: null,
        cellartracker_id: row['iWine'] || null,
      },
      quantity: parseInt(row['Quantity']) || 0,
    })
  }

  return results.filter(r => r.quantity > 0)
}
