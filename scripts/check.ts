// Data checker: `npm run check`. Validates every warband file and lists equipment names that
// don't map to Equipment.xlsx (these fall back to the warband-list price in the app).
import { WARBANDS } from '../src/data';
import { gearOptions } from '../src/logic/equipment';
import { summarise } from '../src/logic/validate';
import { STAT_KEYS, type FighterType } from '../src/types';

let problems = 0;
const unmatched = new Map<string, string[]>();
const bad = (wb: string, msg: string) => {
  problems++;
  console.log(`  ✗ ${wb}: ${msg}`);
};

const ids = new Set<string>();
for (const w of WARBANDS) {
  if (ids.has(w.id)) bad(w.id, 'duplicate warband id');
  ids.add(w.id);
  for (const k of ['name', 'startingGold', 'minModels', 'maxModels', 'fighters', 'equipmentLists'] as const) {
    if ((w as any)[k] == null) bad(w.id, `missing ${k}`);
  }
  const listIds = new Set(w.equipmentLists.map((l) => l.id));
  const fids = new Set<string>();
  for (const l of w.equipmentLists) {
    for (const it of l.items) {
      if (!['melee', 'missile', 'armour', 'misc'].includes(it.category)) bad(w.id, `${l.id}/${it.name}: bad category ${it.category}`);
      if (typeof it.listCost !== 'number') bad(w.id, `${l.id}/${it.name}: listCost not a number`);
    }
  }
  const leaders = w.fighters.filter((f) => f.isLeader);
  if (leaders.length !== 1) bad(w.id, `${leaders.length} leaders`);
  for (const f of w.fighters as FighterType[]) {
    if (fids.has(f.id)) bad(w.id, `duplicate fighter id ${f.id}`);
    fids.add(f.id);
    if (f.kind !== 'hero' && f.kind !== 'henchman') bad(w.id, `${f.id}: kind ${f.kind}`);
    if (typeof f.cost !== 'number') bad(w.id, `${f.id}: cost not a number`);
    for (const s of STAT_KEYS) {
      const v = f.profile?.[s];
      if (v === undefined || (typeof v !== 'number' && typeof v !== 'string' && v !== null)) bad(w.id, `${f.id}: profile.${s} = ${v}`);
      else if (typeof v !== 'number') console.log(`  · ${w.id}/${f.id}: ${s} = ${v} (non-numeric, shown as printed)`);
    }
    const lists = f.equipmentList == null ? [] : Array.isArray(f.equipmentList) ? f.equipmentList : [f.equipmentList];
    for (const l of lists) if (!listIds.has(l)) bad(w.id, `${f.id}: unknown list ${l}`);
    if (!Array.isArray(f.specialRules) || !Array.isArray(f.skills) || !Array.isArray(f.fixedEquipment)) bad(w.id, `${f.id}: array field missing`);
    for (const o of gearOptions(w, f, true)) {
      if (!o.sheet) {
        const k = o.listItem.name;
        if (!unmatched.has(k)) unmatched.set(k, []);
        const arr = unmatched.get(k)!;
        if (!arr.includes(w.id)) arr.push(w.id);
      }
    }
  }
}

// Smoke test: one of every fighter carrying every option must compute without NaN.
for (const w of WARBANDS) {
  const entries = w.fighters.map((f, i) => ({ id: String(i), typeId: f.id, name: '', count: 1, gear: gearOptions(w, f, true).map((o) => o.key) }));
  try {
    const s = summarise(w, { id: 'x', name: 'x', warbandId: w.id, entries, notes: '', allowRareSubstitutes: true, updated: 0 });
    if (Number.isNaN(s.spent)) bad(w.id, 'cost computes to NaN');
  } catch (e) {
    bad(w.id, `summarise threw: ${(e as Error).message}`);
  }
}

console.log(`\n${WARBANDS.length} warbands, ${problems} problems.`);
console.log(`\nEquipment names not on the sheet (use list price):`);
for (const [k, ws] of [...unmatched].sort()) console.log(`  ${k}  [${ws.join(', ')}]`);
process.exit(problems ? 1 : 0);
