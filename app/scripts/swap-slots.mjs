import { createClient } from '@supabase/supabase-js';
const s = createClient('https://rvcajlemlmowwfiqqnre.supabase.co', 'sb_publishable_bxAZ963GJw65UEzghYP3XQ_N2iIrqSw');

// Swap bottles between two slots (just update slot_id on each bottle)
async function swapSlots(slotA_id, slotB_id, labelA, labelB) {
  // Get active bottles in each slot
  const { data: bottlesA } = await s.from('bottles')
    .select('id').eq('slot_id', slotA_id).is('consumed_at', null);
  const { data: bottlesB } = await s.from('bottles')
    .select('id').eq('slot_id', slotB_id).is('consumed_at', null);

  console.log(`Swapping ${bottlesA.length} bottles (slot A) ↔ ${bottlesB.length} bottles (slot B)`);

  // Move A bottles to B's slot, and B bottles to A's slot
  // First: move A bottles to null (temp)
  for (const b of bottlesA) {
    await s.from('bottles').update({ slot_id: null }).eq('id', b.id);
  }
  // Move B bottles to A's slot
  for (const b of bottlesB) {
    await s.from('bottles').update({ slot_id: slotA_id }).eq('id', b.id);
  }
  // Move A bottles (now null) to B's slot
  for (const b of bottlesA) {
    await s.from('bottles').update({ slot_id: slotB_id }).eq('id', b.id);
  }

  // Update labels
  if (labelA) await s.from('slots').update({ label: labelA }).eq('id', slotA_id);
  if (labelB) await s.from('slots').update({ label: labelB }).eq('id', slotB_id);

  console.log(`  Labels: slot A → "${labelA}", slot B → "${labelB}"`);
}

// Get slot IDs
const { data: slots } = await s.from('slots')
  .select('id, position, capacity, label, location:locations(name)')
  .order('position');

function findSlot(locName, pos) {
  return slots.find(sl => sl.location?.name === locName && sl.position === pos);
}

const k2pos2 = findSlot('Kast kolom 2', 2); // Frankrijk Rood (8/8)
const k2pos3 = findSlot('Kast kolom 2', 3); // Frankrijk Rood (5/5)
const k4pos2 = findSlot('Kast kolom 4', 2); // Duits Wit (5/5)
const k4pos7 = findSlot('Kast kolom 4', 7); // Overig Wit (8/8)

console.log(`\nSwap 1: k2-pos2 "${k2pos2.label}" (cap ${k2pos2.capacity}) ↔ k4-pos7 "${k4pos7.label}" (cap ${k4pos7.capacity})`);
await swapSlots(k2pos2.id, k4pos7.id, 'Overig Wit', 'Frankrijk Rood');

console.log(`\nSwap 2: k2-pos3 "${k2pos3.label}" (cap ${k2pos3.capacity}) ↔ k4-pos2 "${k4pos2.label}" (cap ${k4pos2.capacity})`);
await swapSlots(k2pos3.id, k4pos2.id, 'Duits Wit', 'Frankrijk Rood');

console.log('\n✅ Done! Kolom 2 is now all white/sparkling/dessert.');
