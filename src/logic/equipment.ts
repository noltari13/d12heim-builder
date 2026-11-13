import type { FighterType, GearOption, ListItem, SheetItem, WarbandDef } from '../types';
import { SHEET, WARBAND_ITEMS } from '../data';

/**
 * Maps warband-list names (book names) to Equipment.xlsx items.
 * Order of matching:
 *  1. Exact sheet name (after normalising and aliases) -> that item.
 *  2. Warband equipment file (warband-only weapons/armour with draft d12 stats) by name or alias.
 *  3. Sheet "RaW" column (the book item it replaces) -> every sheet item with that RaW.
 *     Rare substitutes are hidden unless allowRare, except when nothing common exists.
 *  4. No match -> warband-specific item at the list price, no stats.
 * Sheet price always wins when the sheet has a numeric price (group ruling); warband items use the list price.
 * Price-multiplier items (sheet cost "X4", e.g. Gromril Weapon) expand into one option per melee weapon in the list.
 */

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/armour/g, 'armor')
    .replace(/duelling/g, 'dueling')
    .replace(/[^a-z0-9]/g, '');

const ALIASES: Record<string, string> = {
  battleaxe: 'axe',
  crossbowpistol: 'xbowpistol',
  throwingstars: 'throwingknives',
  throwingstarsknives: 'throwingknives',
  hochlandlongrifle: 'longrifle',
  huntingrifle: 'longrifle',
  lightarmor: 'light',
  heavyarmor: 'heavy',
  doublehandedweapon: 'doublehandedweapon',
  twohandedweapon: 'doublehandedweapon',
  ithilmararmor: 'ithilmarchainmail',
  gromrilarmor: 'gromrilplate',
};

const isCommon = (s: SheetItem) => /common/i.test(s.availability) || s.availability === '' || s.source === 'warband';
const multiplierOf = (s: SheetItem) => {
  const m = /^x\s*(\d+)$/i.exec(s.costText.trim());
  return m ? Number(m[1]) : null;
};

// Sheet names like "Hunting Arrows (bows)" compare without their parenthetical.
const sheetKey = (s: SheetItem) => norm(s.name.replace(/\(.*?\)/g, ''));
const wbKeys = (s: SheetItem) => [s.name, ...(s.aliases ?? [])].map(norm);

function matchSheet(name: string, allowRare: boolean): SheetItem[] {
  // "Cutlass (Sword)", "Stone Axe (counts as a club)": try the full name, then the bracketed item.
  const paren = /^(.*?)\s*\((?:counts as (?:an? )?)?(.+?)\)\s*$/i.exec(name);
  if (paren) {
    const first = matchSheet(paren[1], allowRare);
    return first.length ? first : matchSheet(paren[2], allowRare);
  }
  const raw = norm(name);
  const n = ALIASES[raw] ?? raw;
  let exact = SHEET.filter((s) => sheetKey(s) === n);
  // Plural list names ("Javelins") match a singular sheet name.
  if (!exact.length && n.endsWith('s')) exact = SHEET.filter((s) => sheetKey(s) === n.slice(0, -1));
  if (exact.length) return exact;
  const wb = WARBAND_ITEMS.find((s) => wbKeys(s).includes(raw) || (raw.endsWith('s') && wbKeys(s).includes(raw.slice(0, -1))));
  if (wb) return [wb];
  const byRaw = SHEET.filter((s) => s.raw.split(',').map(norm).includes(n));
  if (!byRaw.length) return [];
  if (allowRare) return byRaw;
  const common = byRaw.filter(isCommon);
  if (common.length) return common;
  // Nothing common (e.g. Heavy armour -> Plate / Gromril Plate): offer only the cheapest.
  const cheapest = [...byRaw].sort((a, b) => (a.cost ?? 1e9) - (b.cost ?? 1e9))[0];
  return [cheapest];
}

export function listsFor(wb: WarbandDef, ft: FighterType) {
  const ids = ft.equipmentList == null ? [] : Array.isArray(ft.equipmentList) ? ft.equipmentList : [ft.equipmentList];
  return wb.equipmentLists.filter((l) => ids.includes(l.id));
}

function optionsForItem(item: ListItem, allowRare: boolean): GearOption[] {
  let base = item.name;
  let quantity = 1;
  const brace = /^brace of (.+?)s?$/i.exec(base);
  if (brace) {
    base = brace[1];
    quantity = 2;
  }
  // "Mace/Hammer" style entries: each half is its own choice.
  const parts = base.includes('/') ? base.split('/').map((p) => p.trim()) : [base];
  const out: GearOption[] = [];
  for (const part of parts) {
    const matches = matchSheet(part, allowRare);
    if (!matches.length) {
      out.push({
        key: `${item.name}::`,
        label: item.name,
        listItem: item,
        quantity,
        cost: item.listCost,
        category: item.category,
        flags: ['Warband item: list price, no d12 stats yet'],
      });
      continue;
    }
    for (const s of matches) {
      const flags: string[] = [];
      let cost: number;
      if (s.source === 'warband') {
        cost = item.listCost * (quantity > 1 && !brace ? quantity : 1);
        if (!s.reviewed) flags.push('Draft d12 stats');
      } else if (s.cost == null) {
        cost = item.listCost * quantity;
        if (!multiplierOf(s)) flags.push(`Sheet price "${s.costText}": using list price`);
      } else cost = s.cost * quantity;
      if (!isCommon(s)) flags.push(s.availability);
      if (quantity > 1) flags.push('Brace: 2x price');
      const label = quantity > 1 ? `Brace of ${s.name.replace(/s$/, '')}s` : s.name;
      out.push({ key: `${item.name}::${s.name}`, label, listItem: item, sheet: s, quantity, cost, category: item.category, flags });
    }
  }
  return out;
}

const isShield = (o: GearOption) => !!o.sheet && /shield|buckler/i.test(`${o.sheet.raw} ${o.sheet.name}`);

/** True when a fighter's restrictions allow this option. */
export function allowedFor(ft: FighterType, o: GearOption): boolean {
  const r = o.listItem.restrictedTo;
  if (r && r.length && !r.includes(ft.id)) return false;
  for (const c of ft.cannotBuy ?? []) {
    const cl = c.toLowerCase();
    if (cl === o.category) return false;
    if (cl === 'shield' && isShield(o)) return false;
    if (cl === o.listItem.name.toLowerCase() || cl === o.label.toLowerCase()) return false;
  }
  return true;
}

/** Every purchasable option for a fighter. `enforce` drops options the fighter's restrictions forbid. */
export function gearOptions(wb: WarbandDef, ft: FighterType, allowRare: boolean, enforce = true): GearOption[] {
  const seen = new Set<string>();
  const out: GearOption[] = [];
  const multipliers: GearOption[] = [];
  for (const list of listsFor(wb, ft)) {
    for (const item of list.items) {
      for (const o of optionsForItem(item, allowRare)) {
        if (seen.has(o.key)) continue;
        seen.add(o.key);
        if (o.sheet && multiplierOf(o.sheet)) multipliers.push(o);
        else out.push(o);
      }
    }
  }
  // Gromril / Ithilmar weapons: one option per melee weapon the fighter could buy, at base cost x multiplier.
  const bases = [...out];
  for (const m of multipliers) {
    const mult = multiplierOf(m.sheet!)!;
    const prefix = m.sheet!.name.replace(/\s*weapon$/i, '');
    for (const b of bases) {
      if (b.category !== 'melee' || !b.sheet || b.sheet.name === 'Dagger' || b.sheet.source === 'warband') continue;
      const sheet: SheetItem = {
        ...b.sheet,
        name: `${prefix} ${b.sheet.name}`,
        costText: String(b.cost * mult),
        cost: b.cost * mult,
        availability: m.sheet!.availability,
        rules: [b.sheet.rules, m.sheet!.rules].filter(Boolean).join(', '),
      };
      out.push({ ...m, key: `${m.key}::${b.sheet.name}`, label: sheet.name, sheet, cost: b.cost * mult, category: 'melee', flags: [`${mult}x ${b.sheet.name}`, m.sheet!.availability] });
    }
  }
  return enforce ? out.filter((o) => allowedFor(ft, o)) : out;
}

/** Resolve a saved gear key regardless of the rare toggle or restrictions, so a saved roster never loses items. */
export function resolveGear(wb: WarbandDef, ft: FighterType, key: string): GearOption | undefined {
  return gearOptions(wb, ft, true, false).find((o) => o.key === key);
}

export const isDagger = (o: GearOption) => o.sheet?.name === 'Dagger';
