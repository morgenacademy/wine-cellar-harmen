import { createClient } from '@supabase/supabase-js';
const s = createClient('https://rvcajlemlmowwfiqqnre.supabase.co', 'sb_publishable_bxAZ963GJw65UEzghYP3XQ_N2iIrqSw');

const { data: locations } = await s.from('locations').select('*').order('sort_order');
console.log('=== LOCATIONS ===');
locations.forEach(l => console.log(l.id, l.name, l.type, 'sort:', l.sort_order));

const { data: slots } = await s.from('slots').select('id, location_id, position, capacity, label, row_index, col_index').order('position');
console.log('\n=== SLOTS ===');
for (const loc of locations) {
  const locSlots = slots.filter(sl => sl.location_id === loc.id);
  console.log('\n' + loc.name + ':');
  locSlots.forEach(sl => console.log('  pos', sl.position, 'cap', sl.capacity, 'label:', sl.label, 'row:', sl.row_index, 'col:', sl.col_index, 'id:', sl.id));
}

const { data: bottles } = await s.from('bottles').select('id, wine_id, slot_id, consumed_at, wine:wines(id, name, producer, vintage, color, country, region, price, varietal, designation)').is('consumed_at', null);

const slotCounts = {};
let unplaced = 0;
bottles.forEach(b => {
  if (b.slot_id === null) { unplaced++; return; }
  slotCounts[b.slot_id] = (slotCounts[b.slot_id] || 0) + 1;
});

console.log('\n=== WHAT IS IN EACH SLOT ===');
for (const sl of slots) {
  const slotBottles = bottles.filter(b => b.slot_id === sl.id);
  if (slotBottles.length === 0) continue;
  const loc = locations.find(l => l.id === sl.location_id);
  console.log(`\n${loc.name} | pos ${sl.position} | ${sl.label || 'no label'} | ${slotBottles.length}/${sl.capacity}:`);
  // Group by wine
  const byWine = {};
  slotBottles.forEach(b => {
    const key = b.wine_id;
    if (!byWine[key]) byWine[key] = { wine: b.wine, count: 0 };
    byWine[key].count++;
  });
  Object.values(byWine).forEach(g => {
    console.log(`  ${g.count}x ${g.wine.name} (${g.wine.vintage || 'NV'}) - ${g.wine.producer || ''} - ${g.wine.color} - ${g.wine.country || ''} - ${g.wine.region || ''} - €${g.wine.price || '?'}`);
  });
}

console.log('\n=== UNPLACED BOTTLES ===');
const unplacedBottles = bottles.filter(b => b.slot_id === null);
const byWineUnplaced = {};
unplacedBottles.forEach(b => {
  if (!byWineUnplaced[b.wine_id]) byWineUnplaced[b.wine_id] = { wine: b.wine, count: 0 };
  byWineUnplaced[b.wine_id].count++;
});
Object.values(byWineUnplaced).forEach(g => {
  console.log(`  ${g.count}x ${g.wine.name} (${g.wine.vintage || 'NV'}) - ${g.wine.color} - €${g.wine.price || '?'}`);
});

console.log('\nTotal active:', bottles.length, '| Placed:', bottles.length - unplaced, '| Unplaced:', unplaced);

// Also find magnums
console.log('\n=== WINES WITH MAGNUM/1.5L IN NAME ===');
const { data: allWines } = await s.from('wines').select('id, name, producer, vintage');
allWines.filter(w => w.name.toLowerCase().includes('magnum') || w.name.toLowerCase().includes('1.5l') || w.name.toLowerCase().includes('1,5')).forEach(w => console.log(w.id, w.name, w.producer, w.vintage));

// Find Brunello and Rosso di Montalcino
console.log('\n=== BRUNELLO DI MONTALCINO ===');
bottles.filter(b => b.wine.name.toLowerCase().includes('brunello')).forEach(b => {
  const sl = slots.find(s => s.id === b.slot_id);
  const loc = sl ? locations.find(l => l.id === sl.location_id) : null;
  console.log(`  ${b.wine.name} (${b.wine.vintage}) in ${loc?.name || 'unplaced'} pos ${sl?.position || '-'} label: ${sl?.label || '-'}`);
});

console.log('\n=== ROSSO DI MONTALCINO ===');
bottles.filter(b => b.wine.name.toLowerCase().includes('rosso') && b.wine.name.toLowerCase().includes('montalcino')).forEach(b => {
  const sl = slots.find(s => s.id === b.slot_id);
  const loc = sl ? locations.find(l => l.id === sl.location_id) : null;
  console.log(`  ${b.wine.name} (${b.wine.vintage}) - ${b.wine.producer} in ${loc?.name || 'unplaced'} pos ${sl?.position || '-'} label: ${sl?.label || '-'}`);
});

// Find Domaine des Forges
console.log('\n=== DOMAINE DES FORGES ===');
bottles.filter(b => b.wine.producer?.toLowerCase().includes('forges') || b.wine.name.toLowerCase().includes('forges')).forEach(b => {
  const sl = slots.find(s => s.id === b.slot_id);
  const loc = sl ? locations.find(l => l.id === sl.location_id) : null;
  console.log(`  ${b.wine.name} (${b.wine.vintage}) - ${b.wine.color} in ${loc?.name || 'unplaced'} pos ${sl?.position || '-'} label: ${sl?.label || '-'}`);
});

// Find sparkling/champagne
console.log('\n=== SPARKLING/CHAMPAGNE ===');
bottles.filter(b => b.wine.color === 'sparkling').forEach(b => {
  const sl = slots.find(s => s.id === b.slot_id);
  const loc = sl ? locations.find(l => l.id === sl.location_id) : null;
  console.log(`  ${b.wine.name} (${b.wine.vintage || 'NV'}) - ${b.wine.producer} in ${loc?.name || 'unplaced'} pos ${sl?.position || '-'} label: ${sl?.label || '-'}`);
});

// Koelkast contents
console.log('\n=== KOELKAST ===');
const koelkastLoc = locations.find(l => l.type === 'koelkast');
if (koelkastLoc) {
  const koelkastSlots = slots.filter(sl => sl.location_id === koelkastLoc.id);
  koelkastSlots.forEach(sl => {
    const slotBottles = bottles.filter(b => b.slot_id === sl.id);
    slotBottles.forEach(b => console.log(`  ${b.wine.name} (${b.wine.vintage || 'NV'}) - ${b.wine.color} - €${b.wine.price || '?'}`));
  });
}
