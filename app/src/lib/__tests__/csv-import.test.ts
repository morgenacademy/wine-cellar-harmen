import { describe, it, expect } from 'vitest'
import { parseCellarTrackerCsv } from '../csv-import'

const sampleCsv = `"iWine","Type","Color","Category","Size","Currency","Value","Price","TotalQuantity","Quantity","Pending","Vintage","Wine","Locale","Producer","Varietal","MasterVarietal","Designation","Vineyard","Country","Region","SubRegion","Appellation","BeginConsume","EndConsume","WindowSource","CScore"
"4952293","White","White","Dry","750ml","EUR","11,0007","11","2","2","0","2022","J.J. Adeneuer Purist Blanc de Noir","Germany, Ahr","J.J. Adeneuer","Spätburgunder","Pinot Noir","Purist Blanc de Noir","Unknown","Germany","Ahr","Unknown","Unknown","2024","2026","Community Average","87"`

describe('parseCellarTrackerCsv', () => {
  it('parses a CellarTracker CSV row into wine + bottle count', () => {
    const results = parseCellarTrackerCsv(sampleCsv)
    expect(results).toHaveLength(1)
    expect(results[0].wine.name).toBe('J.J. Adeneuer Purist Blanc de Noir')
    expect(results[0].wine.color).toBe('white')
    expect(results[0].wine.vintage).toBe(2022)
    expect(results[0].wine.producer).toBe('J.J. Adeneuer')
    expect(results[0].wine.country).toBe('Germany')
    expect(results[0].wine.region).toBe('Ahr')
    expect(results[0].wine.drink_from).toBe(2024)
    expect(results[0].wine.drink_until).toBe(2026)
    expect(results[0].wine.cellartracker_id).toBe('4952293')
    expect(results[0].quantity).toBe(2)
  })

  it('maps color values correctly', () => {
    const roseCsv = sampleCsv.replace('"White","White"', '"Rosé","Rosé"')
    const results = parseCellarTrackerCsv(roseCsv)
    expect(results[0].wine.color).toBe('rosé')
  })

  it('handles 9999 as null drinking window', () => {
    const noWindow = sampleCsv.replace('"2024","2026"', '"9999","9999"')
    const results = parseCellarTrackerCsv(noWindow)
    expect(results[0].wine.drink_from).toBeNull()
    expect(results[0].wine.drink_until).toBeNull()
  })
})
