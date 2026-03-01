import { createClient } from '@supabase/supabase-js';
const s = createClient('https://rvcajlemlmowwfiqqnre.supabase.co', 'sb_publishable_bxAZ963GJw65UEzghYP3XQ_N2iIrqSw');

// ── Fetch everything ──
const { data: bottles } = await s.from('bottles')
  .select('id, wine_id, slot_id, consumed_at, wine:wines(id, name, producer, vintage, color, country, region, subregion, price, varietal, designation)')
  .is('consumed_at', null);

const { data: slots } = await s.from('slots')
  .select('id, location_id, position, capacity, label, row_index, col_index')
  .order('position');

const { data: locations } = await s.from('locations').select('*').order('sort_order');

const active = bottles.filter(b => b.wine);
console.log(`Total active bottles: ${active.length}`);

// ── Location / slot lookups ──
const locByName = {};
locations.forEach(l => { locByName[l.name] = l; });

function getSlots(locName) {
  const loc = locByName[locName];
  if (!loc) { console.log(`WARNING: location "${locName}" not found`); return []; }
  return slots.filter(sl => sl.location_id === loc.id).sort((a, b) => a.position - b.position);
}

// ── Group bottles by wine_id ──
const byWine = new Map();
active.forEach(b => {
  if (!byWine.has(b.wine_id)) byWine.set(b.wine_id, { wine: b.wine, bottles: [] });
  byWine.get(b.wine_id).bottles.push(b);
});

// ── CORE PLACEMENT FUNCTIONS ──
// STRICT RULE: All bottles of same wine_id go in ONE slot. Never split.
const assignments = []; // { bottleId, slotId }
const slotUsed = {};    // slotId -> count placed

function slotRoom(slotId) {
  const sl = slots.find(s => s.id === slotId);
  return sl.capacity - (slotUsed[slotId] || 0);
}

// Place ALL bottles of a wine group in a single slot. Returns true if successful.
function placeWineInSlot(wineGroup, slotId) {
  const count = wineGroup.bottles.length;
  if (count === 0) return true;
  const room = slotRoom(slotId);
  if (count > room) return false;
  wineGroup.bottles.forEach(b => assignments.push({ bottleId: b.id, slotId }));
  slotUsed[slotId] = (slotUsed[slotId] || 0) + count;
  wineGroup.bottles = [];
  return true;
}

// Try to place a wine group in the first slot that has enough room.
function placeWineInFirstFit(wineGroup, slotIds) {
  if (wineGroup.bottles.length === 0) return true;
  for (const slotId of slotIds) {
    if (placeWineInSlot(wineGroup, slotId)) return true;
  }
  return false;
}

// Place a list of wine groups into slots, keeping each wine together.
// Sort largest groups first so they fit before slots fill up.
function placeWinesInSlots(wineGroups, slotIds) {
  const remaining = wineGroups.filter(g => g.bottles.length > 0);
  remaining.sort((a, b) => b.bottles.length - a.bottles.length);
  const unplaced = [];
  for (const g of remaining) {
    if (!placeWineInFirstFit(g, slotIds)) {
      unplaced.push(g);
    }
  }
  return unplaced;
}

// ── CATEGORIZE WINES ──
// Each wine goes into exactly one category. Order matters (first match wins).
const categories = {
  sparkling: [],
  nonAlcoholic: [],
  brunello: [],
  rossoMontalcino: [],
  chianti: [],         // Chianti wines (Paneretta 2019 etc.)
  otherToscaneRed: [], // Other Tuscan reds
  amarone: [],         // Amarone / Ripasso
  piemonte: [],        // Barolo, Barbaresco, Nebbiolo, Piedmont reds
  otherItalianRed: [], // Other Italian reds
  frenchRed: [],       // French reds
  germanRed: [],       // German reds
  otherRed: [],        // Other reds (Portugal, Spain, Chile, Morocco...)
  cheapRed: [],        // Red < €8
  dessert: [],         // Dessert/sweet wines (all countries)
  forgesWhite: [],     // Domaine des Forges white
  frenchWhite: [],     // French white (non-Forges)
  germanWhite: [],     // German white
  otherWhite: [],      // Other white
  cheapWhiteRose: [],  // White/rosé < €8
  rose: [],            // Rosé
  rest: [],            // Everything else
};

for (const [wineId, group] of byWine) {
  const w = group.wine;
  const name = w.name.toLowerCase();
  const price = w.price || 0;
  const color = w.color;
  const country = w.country || '';
  const region = (w.region || '').toLowerCase();
  const producer = (w.producer || '').toLowerCase();

  // Non-alcoholic
  if (name.includes('mozero') || name.includes('entalkohol') || name.includes('jus de raisin')) {
    categories.nonAlcoholic.push(group); continue;
  }

  // Sparkling
  if (color === 'sparkling') {
    categories.sparkling.push(group); continue;
  }

  // Dessert / sweet wines (any country)
  if (color === 'dessert' || name.includes('beerenauslese') || name.includes('eiswein') ||
      name.includes('moelleux') || name.includes('auslese')) {
    categories.dessert.push(group); continue;
  }

  // Brunello di Montalcino
  if (name.includes('brunello di montalcino') || (name.includes('brunello') && region.includes('tuscan'))) {
    categories.brunello.push(group); continue;
  }

  // Rosso di Montalcino
  if (name.includes('rosso di montalcino')) {
    categories.rossoMontalcino.push(group); continue;
  }

  // Chianti (incl. Paneretta)
  if (name.includes('chianti')) {
    categories.chianti.push(group); continue;
  }

  // Other Tuscan reds (Vino Nobile, Toscana IGT, Ornellaia, etc.)
  if (color === 'red' && (region.includes('tuscan') || name.includes('toscana'))) {
    categories.otherToscaneRed.push(group); continue;
  }

  // Amarone / Ripasso
  if (name.includes('amarone') || name.includes('ripasso')) {
    categories.amarone.push(group); continue;
  }

  // Piemonte reds (Barolo, Barbaresco, Nebbiolo, etc.)
  if (color === 'red' && (region.includes('piedmont') || name.includes('barolo') || name.includes('barbaresco') || name.includes('nebbiolo'))) {
    categories.piemonte.push(group); continue;
  }

  // Rosé
  if (color === 'rosé') {
    // Cheap rosé goes to cheapWhiteRose
    if (price > 0 && price < 8) {
      categories.cheapWhiteRose.push(group); continue;
    }
    categories.rose.push(group); continue;
  }

  // Cheap red (< €8)
  if (color === 'red' && price > 0 && price < 8) {
    categories.cheapRed.push(group); continue;
  }

  // Cheap white (< €8)
  if ((color === 'white' || color === 'other') && price > 0 && price < 8) {
    categories.cheapWhiteRose.push(group); continue;
  }

  // Forges white
  if ((color === 'white') && producer.includes('forges')) {
    categories.forgesWhite.push(group); continue;
  }

  // French red
  if (color === 'red' && country === 'France') {
    categories.frenchRed.push(group); continue;
  }

  // French white
  if (color === 'white' && country === 'France') {
    categories.frenchWhite.push(group); continue;
  }

  // German red
  if (color === 'red' && country === 'Germany') {
    categories.germanRed.push(group); continue;
  }

  // German white
  if (color === 'white' && country === 'Germany') {
    categories.germanWhite.push(group); continue;
  }

  // Other Italian red
  if (color === 'red' && country === 'Italy') {
    categories.otherItalianRed.push(group); continue;
  }

  // Other white
  if (color === 'white') {
    categories.otherWhite.push(group); continue;
  }

  // Other red
  if (color === 'red') {
    categories.otherRed.push(group); continue;
  }

  // Everything else
  categories.rest.push(group);
}

// ── Print categories ──
for (const [cat, groups] of Object.entries(categories)) {
  const total = groups.reduce((s, g) => s + g.bottles.length, 0);
  if (total === 0) continue;
  console.log(`\n${cat}: ${total} bottles (${groups.length} wines)`);
  groups.forEach(g => console.log(`  ${g.bottles.length}x ${g.wine.name} (${g.wine.vintage || 'NV'}) - ${g.wine.producer} - €${g.wine.price || '?'} [${g.wine.color}]`));
}

// ── SLOT REFERENCES ──
const k1 = getSlots('Kast kolom 1'); // pos1=HuiswijnRood(12), pos2=HuiswijnWit(12)
const k2 = getSlots('Kast kolom 2'); // pos1=Champagne(12), pos2(8), pos3(5), pos4(8), pos5(8), pos6(12)
const k3 = getSlots('Kast kolom 3'); // pos1(5), pos2(12), pos3(8), pos4(5), pos5(8), pos6(8), pos7(12)
const k4 = getSlots('Kast kolom 4'); // pos1(12), pos2(5), pos3(12), pos4(8), pos5(5), pos6(8), pos7(8), pos8(12)
const wk = getSlots('Woonkamer rek');
const gang = getSlots('Gang rek');
const koel = getSlots('Koelkast');
const kistje = getSlots('Kistje Brunello');

// Helper: estimate price for wines without a recorded price
function estimatePrice(wine) {
  if (wine.price) return wine.price;
  const name = (wine.name || '').toLowerCase();
  if (name.includes('barolo')) return 45;
  if (name.includes('barbaresco')) return 45;
  if (name.includes('amarone')) return 40;
  if (name.includes('châteauneuf') || name.includes('chateauneuf')) return 30;
  if (name.includes('ornellaia') || name.includes('le volte')) return 25;
  if (name.includes('ripasso')) return 15;
  if (name.includes('chianti classico')) return 15;
  if (name.includes('gran selezione')) return 40;
  if (name.includes('riserva')) return 20;
  return 10; // default for unknown
}

// Helper: sort by price desc within a category
function sortByPriceDesc(groups) {
  return groups.sort((a, b) => estimatePrice(b.wine) - estimatePrice(a.wine));
}

// Helper: sort by producer then vintage
function sortByProducerVintage(groups) {
  return groups.sort((a, b) => {
    const pa = (a.wine.producer || '').toLowerCase();
    const pb = (b.wine.producer || '').toLowerCase();
    if (pa !== pb) return pa.localeCompare(pb);
    return (b.wine.vintage || 0) - (a.wine.vintage || 0);
  });
}

// ═══════════════════════════════════════════════════
// STEP 1: CHAMPAGNE SLOT (kolom 2, pos 1, cap 12)
// Only sparkling + non-alcoholic
// ═══════════════════════════════════════════════════
console.log('\n=== PLACING: Champagne slot (don\'t touch) ===');
const champSlot = k2[0].id;
// Non-alcoholic first, then sparkling — user says keep these together
placeWinesInSlots(categories.nonAlcoholic, [champSlot]);
sortByPriceDesc(categories.sparkling);
placeWinesInSlots(categories.sparkling, [champSlot]);
console.log(`  Filled: ${slotUsed[champSlot] || 0}/${k2[0].capacity}`);

// ═══════════════════════════════════════════════════
// STEP 2: KISTJE BRUNELLO (cap 3)
// Keep the Castelgiocondo 2018s that are there
// ═══════════════════════════════════════════════════
console.log('\n=== PLACING: Kistje Brunello ===');
if (kistje.length > 0) {
  // Find Castelgiocondo 2018 specifically
  const castelgiocondo2018 = categories.brunello.find(g =>
    g.wine.producer?.includes('Castelgiocondo') && g.wine.vintage === 2018
  );
  if (castelgiocondo2018) {
    // Place up to 3 in kistje
    const kistjeId = kistje[0].id;
    const toPlace = Math.min(castelgiocondo2018.bottles.length, kistje[0].capacity);
    const placedBottles = castelgiocondo2018.bottles.splice(0, toPlace);
    placedBottles.forEach(b => assignments.push({ bottleId: b.id, slotId: kistjeId }));
    slotUsed[kistjeId] = (slotUsed[kistjeId] || 0) + toPlace;
    console.log(`  Castelgiocondo 2018: ${toPlace} in kistje`);
  }
  // Fill remaining kistje space with other brunello
  placeWinesInSlots(categories.brunello.filter(g => g.bottles.length > 0), [kistje[0].id]);
}

// ═══════════════════════════════════════════════════
// STEP 3: KOLOM 3 - RED ITALIAN (Brunello, Rosso, Chianti, Toscane)
// pos 1 (5), pos 2 (12), pos 3 (8), pos 4 (5) = Brunello
// pos 5 (8) = Rosso di Montalcino
// pos 6 (8) = Chianti (Paneretta 2019 etc)
// pos 7 (12) = Other Tuscan red + overflow
// ═══════════════════════════════════════════════════
console.log('\n=== PLACING: Kolom 3 - Brunello ===');
const brunelloSlotIds = [k3[0].id, k3[1].id, k3[2].id, k3[3].id];
sortByProducerVintage(categories.brunello);
placeWinesInSlots(categories.brunello, brunelloSlotIds);

console.log('\n=== PLACING: Kolom 3 - Rosso di Montalcino ===');
const rossoSlotIds = [k3[4].id]; // pos 5, cap 8
sortByProducerVintage(categories.rossoMontalcino);
let rossoUnplaced = placeWinesInSlots(categories.rossoMontalcino, rossoSlotIds);
// Overflow rosso into pos 6 or pos 7
if (rossoUnplaced.length > 0) {
  placeWinesInSlots(rossoUnplaced, [k3[5].id, k3[6].id]);
}

console.log('\n=== PLACING: Kolom 3 - Chianti ===');
// Paneretta 2017 goes to gang rek (nice bottle)
const paneretta2017 = categories.chianti.find(g =>
  g.wine.producer?.includes('Paneretta') && g.wine.vintage === 2017
);
if (paneretta2017) {
  placeWineInFirstFit(paneretta2017, gang.map(s => s.id));
}
// Paneretta 2019 goes to huiswijn rood (kolom 1, pos 1) - user OK'd this
const paneretta2019 = categories.chianti.find(g =>
  g.wine.producer?.includes('Paneretta') && g.wine.vintage === 2019
);
if (paneretta2019) {
  placeWineInSlot(paneretta2019, k1[0].id);
  console.log(`  Paneretta 2019 (${paneretta2019.bottles.length === 0 ? 'placed' : 'no fit'}) → Huiswijn Rood`);
}
// Rest of Chianti in kolom 3
const chiantiSlotIds = [k3[5].id, k3[6].id]; // pos 6 (8), pos 7 (12)
sortByProducerVintage(categories.chianti);
placeWinesInSlots(categories.chianti, chiantiSlotIds);

console.log('\n=== PLACING: Kolom 3 - Other Tuscan red ===');
sortByProducerVintage(categories.otherToscaneRed);
placeWinesInSlots(categories.otherToscaneRed, [k3[5].id, k3[6].id]);

// Any remaining brunello overflow
const brunelloLeft = categories.brunello.filter(g => g.bottles.length > 0);
if (brunelloLeft.length > 0) {
  placeWinesInSlots(brunelloLeft, [k3[4].id, k3[5].id, k3[6].id]);
}

// ═══════════════════════════════════════════════════
// STEP 4: KOLOM 3 OVERFLOW → Amarone, Piemonte
// These are quality Italian reds that belong near Brunello
// ═══════════════════════════════════════════════════
console.log('\n=== PLACING: Kolom 3 overflow - Amarone/Piemonte ===');
const k3overflow = [k3[4].id, k3[5].id, k3[6].id].filter(id => slotRoom(id) > 0);
sortByPriceDesc(categories.amarone);
placeWinesInSlots(categories.amarone, k3overflow);
sortByPriceDesc(categories.piemonte);
placeWinesInSlots(categories.piemonte, k3overflow);

// ═══════════════════════════════════════════════════
// STEP 5: KOLOM 2 - FRENCH + WHITE + ROSÉ
// pos 2 (8), pos 3 (5) = French red
// pos 4 (8) = Forges white (grouped)
// pos 5 (8) = French white (Loire, Burgundy, etc.)
// pos 6 (12) = Dessert wines + French white overflow
// ═══════════════════════════════════════════════════
console.log('\n=== PLACING: Kolom 2 - French red ===');
const frRedSlots = [k2[1].id, k2[2].id]; // pos 2 (8), pos 3 (5)
sortByPriceDesc(categories.frenchRed);
placeWinesInSlots(categories.frenchRed, frRedSlots);

console.log('\n=== PLACING: Kolom 2 - Forges white ===');
const forgesSlots = [k2[3].id]; // pos 4 (8)
sortByProducerVintage(categories.forgesWhite);
placeWinesInSlots(categories.forgesWhite, forgesSlots);

console.log('\n=== PLACING: Kolom 2 - French white ===');
const frWhiteSlots = [k2[3].id, k2[4].id]; // pos 4 (overflow) + pos 5 (8)
sortByPriceDesc(categories.frenchWhite);
placeWinesInSlots(categories.frenchWhite, frWhiteSlots);

console.log('\n=== PLACING: Kolom 2 - Dessert wines ===');
const dessertSlots = [k2[5].id]; // pos 6 (12)
sortByProducerVintage(categories.dessert);
placeWinesInSlots(categories.dessert, dessertSlots);

// French white overflow into pos 6
const frWhiteLeft = categories.frenchWhite.filter(g => g.bottles.length > 0);
if (frWhiteLeft.length > 0) {
  placeWinesInSlots(frWhiteLeft, [k2[5].id]);
}

// ═══════════════════════════════════════════════════
// STEP 5b: ROSÉ (non-cheap) → 5-bottle position in kast
// Cheap rosé already in cheapWhiteRose for huiswijn/koelkast
// ═══════════════════════════════════════════════════
console.log('\n=== PLACING: Rosé (non-cheap) ===');
// Use a 5-bottle position: k4 pos 2 (5) or k3 pos 1/4 if there's room
const roseFiveSlots = [k4[1].id, k3[0].id, k3[3].id].filter(id => slotRoom(id) > 0);
sortByPriceDesc(categories.rose);
placeWinesInSlots(categories.rose, roseFiveSlots);

// ═══════════════════════════════════════════════════
// STEP 6: KOLOM 4 - GERMAN, OTHER, REST
// pos 1 (12) = German white
// pos 2 (5) = German white overflow / rosé
// pos 3 (12) = Other white
// pos 4 (8) = Italian red (MULTI-BOTTLE ONLY, singles go to rek)
// pos 5 (5) = Italian red overflow / Amarone/Piemonte overflow
// pos 6 (8) = German red + other red (quality)
// pos 7 (8) = White restbak
// pos 8 (12) = Red restbak
// ═══════════════════════════════════════════════════
console.log('\n=== PLACING: Kolom 4 - German white ===');
const germanWhiteSlots = [k4[0].id, k4[1].id, k4[2].id]; // pos 1,2,3
sortByPriceDesc(categories.germanWhite);
placeWinesInSlots(categories.germanWhite, germanWhiteSlots);

console.log('\n=== PLACING: Kolom 4 - Other white ===');
const otherWhiteSlots = [k4[2].id, k4[1].id];
sortByPriceDesc(categories.otherWhite);
placeWinesInSlots(categories.otherWhite, otherWhiteSlots);

console.log('\n=== PLACING: Kolom 4 - Italian red (multi-bottle for kast) ===');
const italRedSlots = [k4[3].id, k4[4].id]; // pos 4 (8), pos 5 (5)
// Only multi-bottle Italian reds in kast; singles reserved for rek
const italRedMulti = categories.otherItalianRed.filter(g => g.bottles.length > 1);
sortByPriceDesc(italRedMulti);
placeWinesInSlots(italRedMulti, italRedSlots);

// Amarone / Piemonte overflow (multi-bottle)
const amaroneLeft = categories.amarone.filter(g => g.bottles.length > 1);
const piemonteLeft = categories.piemonte.filter(g => g.bottles.length > 1);
sortByPriceDesc([...amaroneLeft, ...piemonteLeft]);
placeWinesInSlots([...amaroneLeft, ...piemonteLeft], italRedSlots);

console.log('\n=== PLACING: Kolom 4 - German red + other red ===');
// German red (multi-bottle) in kast
const germanRedMulti = categories.germanRed.filter(g => g.bottles.length > 1);
placeWinesInSlots(germanRedMulti, [k4[5].id]);
// Quality other reds (multi-bottle, or expensive)
const qualityOtherRedMulti = categories.otherRed.filter(g => g.bottles.length > 1 && estimatePrice(g.wine) >= 10);
const cheapOtherRed = categories.otherRed.filter(g => estimatePrice(g.wine) < 10);
sortByPriceDesc(qualityOtherRedMulti);
placeWinesInSlots(qualityOtherRedMulti, [k4[5].id, k4[3].id, k4[4].id]);

// Single-bottle Amarone/Piemonte/French red that didn't fit in kast → try kast overflow
const amaroneSingles = categories.amarone.filter(g => g.bottles.length === 1);
const piemonteSingles = categories.piemonte.filter(g => g.bottles.length === 1);
const frenchRedLeft = categories.frenchRed.filter(g => g.bottles.length > 0);
// These are quality wines (Barolo, Amarone, Châteauneuf) → squeeze into any red kast slot
const qualitySinglesForKast = [...amaroneSingles, ...piemonteSingles, ...frenchRedLeft]
  .filter(g => g.bottles.length > 0 && estimatePrice(g.wine) >= 20);
sortByPriceDesc(qualitySinglesForKast);
const anyRedKast = [...k3, k4[3], k4[4], k4[5], k4[7], k2[1], k2[2], k1[0]]
  .map(s => s.id).filter(id => slotRoom(id) > 0);
placeWinesInSlots(qualitySinglesForKast, anyRedKast);

// ═══════════════════════════════════════════════════
// STEP 7: KOLOM 1 - HUISWIJN
// ═══════════════════════════════════════════════════
console.log('\n=== PLACING: Kolom 1 - Huiswijn Rood ===');
sortByPriceDesc(categories.cheapRed);
placeWinesInSlots(categories.cheapRed, [k1[0].id]);
placeWinesInSlots(cheapOtherRed, [k1[0].id]);

console.log('\n=== PLACING: Kolom 1 - Huiswijn Wit/Rosé ===');
sortByPriceDesc(categories.cheapWhiteRose);
placeWinesInSlots(categories.cheapWhiteRose, [k1[1].id]);

// ═══════════════════════════════════════════════════
// STEP 8: KOELKAST
// Remaining sparkling, then cheap white/rosé
// ═══════════════════════════════════════════════════
console.log('\n=== PLACING: Koelkast ===');
const sparklingLeft = categories.sparkling.filter(g => g.bottles.length > 0);
placeWinesInSlots(sparklingLeft, koel.map(s => s.id));
// Cheap rosé for the fridge
const cheapRoseForFridge = categories.cheapWhiteRose.filter(g => g.bottles.length > 0 && g.wine.color === 'rosé');
placeWinesInSlots(cheapRoseForFridge, koel.map(s => s.id));
// Then cheap white
const koelCandidates = [
  ...categories.cheapWhiteRose.filter(g => g.bottles.length > 0),
  ...categories.forgesWhite.filter(g => g.bottles.length > 0),
  ...categories.frenchWhite.filter(g => g.bottles.length > 0 && estimatePrice(g.wine) < 12),
  ...categories.germanWhite.filter(g => g.bottles.length > 0 && estimatePrice(g.wine) < 12),
  ...categories.otherWhite.filter(g => g.bottles.length > 0 && estimatePrice(g.wine) < 12),
].sort((a, b) => estimatePrice(a.wine) - estimatePrice(b.wine));
placeWinesInSlots(koelCandidates, koel.map(s => s.id));

// ═══════════════════════════════════════════════════
// STEP 9: WOONKAMER + GANG REK
// Primarily red, middelmatig quality.
// ═══════════════════════════════════════════════════
console.log('\n=== PLACING: Woonkamer + Gang rek ===');
const rekSlotIds = [...wk.map(s => s.id), ...gang.map(s => s.id)];

// Collect all remaining unplaced wines
function allRemaining() {
  const all = [];
  for (const groups of Object.values(categories)) {
    for (const g of groups) {
      if (g.bottles.length > 0) all.push(g);
    }
  }
  return all;
}

// Multi-bottle wines can't go on rek (cap 1) → squeeze into kast first
const multiBottle = allRemaining().filter(g => g.bottles.length > 1);
const expensiveMultiRed = multiBottle.filter(g => g.wine.color === 'red' && estimatePrice(g.wine) >= 10);
const expensiveMultiWhite = multiBottle.filter(g => g.wine.color !== 'red' && estimatePrice(g.wine) >= 10);
sortByPriceDesc(expensiveMultiRed);
sortByPriceDesc(expensiveMultiWhite);
const redKastSlots = [...k3, k4[3], k4[4], k4[5], k4[7], k1[0]]
  .map(s => s.id).filter(id => slotRoom(id) > 0);
placeWinesInSlots(expensiveMultiRed, redKastSlots);
const whiteKastSlots = [k2[3], k2[4], k2[5], k4[0], k4[1], k4[2], k4[6], k1[1]]
  .map(s => s.id).filter(id => slotRoom(id) > 0);
placeWinesInSlots(expensiveMultiWhite, whiteKastSlots);

// RED SINGLES ON REK FIRST (primarily red!)
const redRekCandidates = allRemaining().filter(g =>
  g.bottles.length === 1 && g.wine.color === 'red' && estimatePrice(g.wine) >= 8
);
sortByPriceDesc(redRekCandidates);
placeWinesInSlots(redRekCandidates, rekSlotIds);

// Then white/rosé singles on remaining rek spots
const otherRekCandidates = allRemaining().filter(g =>
  g.bottles.length === 1 && g.wine.color !== 'red' && estimatePrice(g.wine) >= 10
);
sortByPriceDesc(otherRekCandidates);
placeWinesInSlots(otherRekCandidates, rekSlotIds);

// Then fill any remaining rek with whatever single-bottle is left
const lastResort = allRemaining().filter(g => g.bottles.length === 1);
sortByPriceDesc(lastResort);
placeWinesInSlots(lastResort, rekSlotIds);

// ═══════════════════════════════════════════════════
// STEP 10: RESTBAK - everything that's left
// Kolom 4 pos 7 (8) = white/other restbak
// Kolom 4 pos 8 (12) = red restbak
// ═══════════════════════════════════════════════════
console.log('\n=== PLACING: Restbak (kolom 4 rij 7-8) ===');
let remaining = allRemaining();
const restWhite = remaining.filter(g => g.wine.color !== 'red');
const restRed = remaining.filter(g => g.wine.color === 'red');
placeWinesInSlots(restWhite, [k4[6].id]);
placeWinesInSlots(restRed, [k4[7].id]);

// Overflow: color-matching slots only
remaining = allRemaining();
if (remaining.length > 0) {
  const count = remaining.reduce((s, g) => s + g.bottles.length, 0);
  console.log(`\n=== OVERFLOW: ${count} bottles remaining ===`);
  const overflowRed = remaining.filter(g => g.wine.color === 'red');
  const overflowNonRed = remaining.filter(g => g.wine.color !== 'red');
  placeWinesInSlots(overflowRed, [k1[0].id, k4[3].id, k4[4].id, k4[5].id, k4[7].id]);
  placeWinesInSlots(overflowNonRed, [k1[1].id, k4[0].id, k4[1].id, k4[2].id, k4[6].id]);
}

// ═══════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════
console.log(`\n${'='.repeat(50)}`);
console.log('=== VALIDATION ===');

// Check no duplicate bottles
const bottleIds = assignments.map(a => a.bottleId);
const dupes = bottleIds.filter((id, i) => bottleIds.indexOf(id) !== i);
if (dupes.length > 0) {
  console.log(`❌ ERROR: ${dupes.length} duplicate bottle assignments!`);
  process.exit(1);
} else {
  console.log('✅ No duplicate bottles');
}

// Check slot overflows
let overflowError = false;
for (const [slotId, count] of Object.entries(slotUsed)) {
  const sl = slots.find(s => s.id === slotId);
  if (count > sl.capacity) {
    const loc = locations.find(l => l.id === sl.location_id);
    console.log(`❌ Slot overflow! ${loc.name} pos ${sl.position} (${sl.label}): ${count}/${sl.capacity}`);
    overflowError = true;
  }
}
if (!overflowError) console.log('✅ No slot overflows');

// Check NO wine split across slots (kistje is exception - physically separate)
const kistjeLocId = locByName['Kistje Brunello']?.id;
const wineSlotMap = new Map(); // wineId -> Set of slotIds
assignments.forEach(a => {
  const bottle = active.find(b => b.id === a.bottleId);
  if (!wineSlotMap.has(bottle.wine_id)) wineSlotMap.set(bottle.wine_id, new Set());
  wineSlotMap.get(bottle.wine_id).add(a.slotId);
});
let splitError = false;
for (const [wineId, slotSet] of wineSlotMap) {
  if (slotSet.size > 1) {
    // Allow split if one of the slots is in kistje (physically separate storage)
    const slotInfos = [...slotSet].map(sid => {
      const sl = slots.find(s => s.id === sid);
      const loc = locations.find(l => l.id === sl.location_id);
      return { loc, sl };
    });
    const hasKistje = slotInfos.some(si => si.loc.id === kistjeLocId);
    const nonKistje = slotInfos.filter(si => si.loc.id !== kistjeLocId);
    if (hasKistje && nonKistje.length <= 1) continue; // OK: kistje + 1 other location

    const w = byWine.get(wineId)?.wine || active.find(b => b.wine_id === wineId)?.wine;
    const slotNames = slotInfos.map(si => `${si.loc.name} pos ${si.sl.position}`);
    console.log(`❌ SPLIT: ${w?.name} (${w?.vintage}) split across: ${slotNames.join(', ')}`);
    splitError = true;
  }
}
if (!splitError) console.log('✅ No wines split across slots');

// Check no mixed colors per kast slot (rek slots are 1-bottle so n/a)
let colorMixError = false;
for (const [slotId, count] of Object.entries(slotUsed)) {
  if (count <= 1) continue;
  const sl = slots.find(s => s.id === slotId);
  const loc = locations.find(l => l.id === sl.location_id);
  if (loc.type !== 'kast' && loc.type !== 'kistje') continue;

  const slotBottles = assignments.filter(a => a.slotId === slotId);
  const colors = new Set();
  slotBottles.forEach(a => {
    const bottle = active.find(b => b.id === a.bottleId);
    let c = bottle.wine.color;
    // Treat 'other' (non-alcoholic) same as sparkling for champagne slot
    if (c === 'other') c = 'sparkling';
    // Treat dessert same as white (both are "wit-achtig")
    if (c === 'dessert') c = 'white';
    // Treat rosé same as white (can share a box)
    if (c === 'rosé') c = 'white';
    colors.add(c);
  });
  if (colors.size > 1) {
    console.log(`⚠️  Mixed colors in ${loc.name} pos ${sl.position} (${sl.label}): ${[...colors].join(', ')}`);
    colorMixError = true;
  }
}
if (!colorMixError) console.log('✅ No mixed colors in kast slots');

// ═══════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════
const totalPlaced = assignments.length;
const totalUnplaced = active.length - totalPlaced;
console.log(`\n=== PLACEMENT SUMMARY ===`);
console.log(`Total placed: ${totalPlaced} / ${active.length}`);
console.log(`Total unplaced: ${totalUnplaced}`);

// Print what goes where
console.log(`\n=== NEW PLACEMENT ===`);
for (const loc of locations) {
  const locSlots = slots.filter(sl => sl.location_id === loc.id).sort((a, b) => a.position - b.position);
  for (const sl of locSlots) {
    const slotAssignments = assignments.filter(a => a.slotId === sl.id);
    if (slotAssignments.length === 0 && (slotUsed[sl.id] || 0) === 0) continue;

    const byW = {};
    for (const a of slotAssignments) {
      const bottle = active.find(b => b.id === a.bottleId);
      const wid = bottle.wine_id;
      if (!byW[wid]) byW[wid] = { wine: bottle.wine, count: 0 };
      byW[wid].count++;
    }

    console.log(`\n${loc.name} | pos ${sl.position} | ${sl.label || '-'} | ${slotAssignments.length}/${sl.capacity}:`);
    Object.values(byW).forEach(g => {
      console.log(`  ${g.count}x ${g.wine.name} (${g.wine.vintage || 'NV'}) - ${g.wine.producer} - €${g.wine.price || '?'} [${g.wine.color}]`);
    });
  }
}

// Print remaining unplaced
const placedIds = new Set(assignments.map(a => a.bottleId));
const stillUnplaced = active.filter(b => !placedIds.has(b.id));
if (stillUnplaced.length > 0) {
  console.log(`\n=== STILL UNPLACED (${stillUnplaced.length}) ===`);
  const byW = {};
  stillUnplaced.forEach(b => {
    if (!byW[b.wine_id]) byW[b.wine_id] = { wine: b.wine, count: 0 };
    byW[b.wine_id].count++;
  });
  Object.values(byW).forEach(g => {
    console.log(`  ${g.count}x ${g.wine.name} (${g.wine.vintage || 'NV'}) - €${g.wine.price || '?'} [${g.wine.color}]`);
  });
}

// ═══════════════════════════════════════════════════
// LABEL UPDATES
// ═══════════════════════════════════════════════════
const labelUpdates = [
  // Kolom 1
  { id: k1[0].id, label: 'Huiswijn Rood' },
  { id: k1[1].id, label: 'Huiswijn Wit / Rosé' },
  // Kolom 2
  { id: k2[0].id, label: 'Mousseux' },
  { id: k2[1].id, label: 'Frankrijk Rood' },
  { id: k2[2].id, label: 'Frankrijk Rood' },
  { id: k2[3].id, label: 'Forges / Loire Wit' },
  { id: k2[4].id, label: 'Frankrijk Wit' },
  { id: k2[5].id, label: 'Dessert / Zoet' },
  // Kolom 3
  { id: k3[0].id, label: 'Brunello' },
  { id: k3[1].id, label: 'Brunello' },
  { id: k3[2].id, label: 'Brunello' },
  { id: k3[3].id, label: 'Brunello' },
  { id: k3[4].id, label: 'Rosso di Montalcino' },
  { id: k3[5].id, label: 'Chianti / Toscane' },
  { id: k3[6].id, label: 'Toscane / Italiaans' },
  // Kolom 4
  { id: k4[0].id, label: 'Duits Wit' },
  { id: k4[1].id, label: 'Duits Wit' },
  { id: k4[2].id, label: 'Wit Overig' },
  { id: k4[3].id, label: 'Italiaans Rood' },
  { id: k4[4].id, label: 'Italiaans Rood' },
  { id: k4[5].id, label: 'Duits / Overig Rood' },
  { id: k4[6].id, label: 'Overig Wit' },
  { id: k4[7].id, label: 'Overig Rood' },
];

console.log(`\n=== LABEL UPDATES ===`);
labelUpdates.forEach(u => {
  const sl = slots.find(s => s.id === u.id);
  const loc = locations.find(l => l.id === sl.location_id);
  console.log(`  ${loc.name} pos ${sl.position}: "${sl.label}" → "${u.label}"`);
});

// ═══════════════════════════════════════════════════
// EXECUTE
// ═══════════════════════════════════════════════════
const DRY_RUN = !process.argv.includes('--execute');

if (DRY_RUN) {
  console.log(`\n⚠️  DRY RUN - no changes made. Run with --execute to apply.`);
} else {
  console.log(`\nApplying changes...`);

  // 1. Unplace all bottles
  const allBottleIds = active.map(b => b.id);
  for (let i = 0; i < allBottleIds.length; i += 100) {
    const batch = allBottleIds.slice(i, i + 100);
    const { error } = await s.from('bottles').update({ slot_id: null }).in('id', batch);
    if (error) { console.log('Unplace error:', error); process.exit(1); }
  }
  console.log(`Unplaced ${allBottleIds.length} bottles`);

  // 2. Place bottles according to assignments
  for (let i = 0; i < assignments.length; i += 50) {
    const batch = assignments.slice(i, i + 50);
    for (const a of batch) {
      const { error } = await s.from('bottles').update({ slot_id: a.slotId }).eq('id', a.bottleId);
      if (error) { console.log('Place error:', error, a); }
    }
    console.log(`Placed ${Math.min(i + 50, assignments.length)}/${assignments.length}`);
  }

  // 3. Update labels
  for (const u of labelUpdates) {
    const { error } = await s.from('slots').update({ label: u.label }).eq('id', u.id);
    if (error) console.log('Label error:', error);
  }
  console.log(`Updated ${labelUpdates.length} labels`);

  console.log(`\n✅ Done!`);
}
