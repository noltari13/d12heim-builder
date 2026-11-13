import { statNum, type FighterType, type GearOption, type Profile, type RosterEntry, type WarbandDef } from '../types';
import { isDagger, listsFor, resolveGear } from './equipment';

/** Group ruling: only stats you roll against double (WS, BS, S, T, I). */
export const DOUBLED = new Set(['WS', 'BS', 'S', 'T', 'I']);

export function d12Profile(p: Profile): Profile {
  const out = { ...p };
  for (const k of Object.keys(out) as (keyof Profile)[]) {
    if (!DOUBLED.has(k)) continue;
    const v = p[k];
    out[k] = typeof v === 'number' ? v * 2 : v == null ? null : `(${v})×2`;
  }
  return out;
}

/** Rulebook p.65 overlay: AP 1 if (doubled) Strength is 8+. */
export const baseAP = (p12: Profile) => (statNum(p12.S) >= 8 ? 1 : 0);

export interface WeaponLine {
  name: string;
  kind: 'melee' | 'missile';
  strength: string;
  ap: number;
  range: string;
  rules: string;
}

function weaponStrength(str: string | null, s12: number): string {
  if (!str) return '-';
  if (Number.isNaN(s12) && /^\s*user/i.test(str)) return str;
  const t = str.replace(/\s+/g, '');
  if (/^user$/i.test(t)) return String(s12);
  const m = /^user([+-])(\d+)$/i.exec(t);
  if (m) return String(s12 + (m[1] === '+' ? 1 : -1) * Number(m[2]));
  if (/^\d+$/.test(t)) return String(Number(t) * 2);
  return str;
}

const ruleAP = (rules: string) => {
  const m = /\+(\d+)\s*AP/i.exec(rules);
  return m ? Number(m[1]) : 0;
};

export function weaponLine(o: GearOption, p12: Profile): WeaponLine | null {
  const s = o.sheet;
  if (o.category !== 'melee' && o.category !== 'missile') return null;
  if (!s) {
    return { name: o.label, kind: o.category, strength: '?', ap: baseAP(p12), range: '', rules: o.listItem.note ?? 'Warband item, see list' };
  }
  return {
    name: o.label,
    kind: s.category === 'missile' ? 'missile' : 'melee',
    strength: weaponStrength(s.strength, statNum(p12.S)),
    ap: baseAP(p12) + ruleAP(s.rules),
    range: s.range ?? '',
    rules: [s.hands === '2' ? 'Two-handed' : '', s.rules].filter(Boolean).join(', '),
  };
}

export const DAGGER_LINE = (p12: Profile): WeaponLine => ({
  name: 'Dagger (free)',
  kind: 'melee',
  strength: Number.isNaN(statNum(p12.S)) ? 'User -1' : String(statNum(p12.S) - 1),
  ap: baseAP(p12),
  range: '',
  rules: '',
});

export interface Computed {
  ft: FighterType;
  p12: Profile;
  gear: GearOption[];
  perModelCost: number;
  totalCost: number;
  weapons: WeaponLine[];
  av: number;
  helmet: boolean;
  warnings: string[];
}

export function computeEntry(wb: WarbandDef, e: RosterEntry): Computed | null {
  const ft = wb.fighters.find((f) => f.id === e.typeId);
  if (!ft) return null;
  const p12 = d12Profile(ft.profile);
  const gear = e.gear.map((k) => resolveGear(wb, ft, k)).filter((g): g is GearOption => !!g);
  const canBuy = listsFor(wb, ft).length > 0;
  const warnings: string[] = [];

  // First dagger bought is free (every warrior already has one); extra daggers cost.
  let gearCost = 0;
  for (const g of gear) gearCost += g.cost;

  const weapons: WeaponLine[] = [];
  if (canBuy) weapons.push(DAGGER_LINE(p12));
  for (const g of gear) {
    const w = weaponLine(g, p12);
    if (w) weapons.push(isDagger(g) ? { ...w, name: 'Dagger (extra)' } : w);
  }

  let av = 0;
  let helmet = false;
  for (const g of gear) {
    if (g.category !== 'armour') continue;
    if (g.sheet?.name === 'Helmet') helmet = true;
    av += g.sheet?.av ?? 0;
    if (g.sheet && /need a 7 strength/i.test(g.sheet.rules) && statNum(p12.S) < 7 && !/dwar/i.test(ft.name)) {
      warnings.push(`${g.label} needs Strength 7 (has ${p12.S}).`);
    }
  }

  const melee = gear.filter((g) => g.category === 'melee' && !isDagger(g));
  const missile = gear.filter((g) => g.category === 'missile');
  if (melee.length > 2) warnings.push('More than 2 close combat weapons (besides the free dagger).');
  if (missile.length > 2) warnings.push('More than 2 missile weapons.');
  const twoHanded = gear.some((g) => g.sheet?.hands === '2');
  const shield = gear.some((g) => g.sheet && /shield|buckler/i.test(g.sheet.raw));
  if (twoHanded && shield) warnings.push('Two-handed weapon and shield/buckler: only one can be used at a time.');
  const bodyArmour = gear.filter((g) => g.sheet && /^(light|heavy)$/i.test(g.sheet.raw));
  if (bodyArmour.length > 1) warnings.push('More than one suit of body armour.');
  const shields = gear.filter((g) => g.sheet && /shield/i.test(g.sheet.raw));
  if (shields.length > 1) warnings.push('More than one shield.');
  if (!canBuy && gear.length) warnings.push(`${ft.name} cannot buy equipment.`);

  const count = ft.kind === 'hero' ? 1 : e.count;
  const perModelCost = ft.cost + gearCost;
  return { ft, p12, gear, perModelCost, totalCost: perModelCost * count, weapons, av, helmet, warnings };
}

/** Armour save: d12 >= 13 - AV + AP; no save if AP > AV. */
export function saveText(av: number, ap = 0): string {
  if (av <= 0 || ap > av) return 'none';
  const tn = 13 - av + ap;
  return tn > 12 ? 'none' : `${tn}+`;
}
