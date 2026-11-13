import type { FighterType, GearOption, ListItem, SheetItem, WarbandDef } from '../types';
import { SHEET } from '../data';

/**
 * Maps warband-list names (book names) to Equipment.xlsx items.
 * Order of matching:
 *  1. Exact sheet name (after normalising and aliases) -> that item.
 *  2. Sheet "RaW" column (the book item it replaces) -> every sheet item with that RaW.
 *     Rare substitutes are hidden unless allowRare, except when nothing common exists.
 *  3. No match -> warband-specific item at the list price.
 * Sheet price always wins when the sheet has a numeric price (group ruling).
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

const isCommon = (s: SheetItem) => /common/i.test(s.availability) || s.availability === '';

// Sheet names like "Hunting Arrows (bows)" compare without their parenthetical.
const sheetKey = (s: SheetItem) => norm(s.name.replace(/\(.*?\)/g, ''));

function matchSheet(name: string, allowRare: boolean): SheetItem[] {
  // "Cutlass (Sword)", "Stone Axe (counts as a club)": try the full name, then the bracketed item.
  const paren = /^(.*?)\s*\((?:counts as (?:an? )?)?(.+?)\)\s*$/i.exec(name);
  if (paren) {
    const first = matchSheet(paren[1], allowRare);
    return first.length ? first : matchSheet(paren[2], allowRare);
  }
  let n = norm(name);
  n = ALIASES[n] ?? n;
  let exact = SHEET.filter((s) => sheetKey(s) === n);
  // Plural list names ("Javelins") match a singular sheet name.
  if (!exact.length && n.endsWith('s')) exact = SHEET.filter((s) => sheetKey(s) === n.slice(0, -1));
  if (exact.length) return exact;
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
        flags: ['Warband item: list price'],
      });
      continue;
    }
    for (const s of matches) {
      const flags: string[] = [];
      let cost = s.cost;
      if (cost == null) {
        cost = item.listCost * quantity;
        flags.push(`Sheet price "${s.costText}": using list price`);
      } else cost = cost * quantity;
      if (!isCommon(s)) flags.push(s.availability);
      if (quantity > 1) flags.push('Brace: 2x sheet price');
      const label = quantity > 1 ? `Brace of ${s.name}s` : s.name;
      out.push({
        key: `${item.name}::${s.name}`,
        label,
        listItem: item,
        sheet: s,
        quantity,
        cost,
        category: item.category,
        flags,
      });
    }
  }
  return out;
}

export function gearOptions(wb: WarbandDef, ft: FighterType, allowRare: boolean): GearOption[] {
  const seen = new Set<string>();
  const out: GearOption[] = [];
  for (const list of listsFor(wb, ft)) {
    for (const item of list.items) {
      for (const o of optionsForItem(item, allowRare)) {
        if (seen.has(o.key)) continue;
        seen.add(o.key);
        out.push(o);
      }
    }
  }
  return out;
}

/** Resolve a saved gear key regardless of the rare toggle, so a saved roster never loses items. */
export function resolveGear(wb: WarbandDef, ft: FighterType, key: string): GearOption | undefined {
  return gearOptions(wb, ft, true).find((o) => o.key === key);
}

export const isDagger = (o: GearOption) => o.sheet?.name === 'Dagger';
