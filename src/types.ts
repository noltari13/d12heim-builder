export type StatKey = 'M' | 'WS' | 'BS' | 'S' | 'T' | 'W' | 'I' | 'A' | 'Ld';
export const STAT_KEYS: StatKey[] = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'Ld'];
/** Stats are numbers; a few fighters print dice ("2D6") or variable (null) values. */
export type StatValue = number | string | null;
export type Profile = Record<StatKey, StatValue>;
export const statNum = (v: StatValue) => (typeof v === 'number' ? v : NaN);

export interface Rule {
  name: string;
  text: string;
}

export type ListCategory = 'melee' | 'missile' | 'armour' | 'misc';

export interface ListItem {
  name: string;
  category: ListCategory;
  listCost: number;
  note?: string;
}

export interface EquipmentList {
  id: string;
  name: string;
  usedBy?: string;
  items: ListItem[];
}

export interface FighterType {
  id: string;
  name: string;
  kind: 'hero' | 'henchman';
  cost: number;
  min: number | null;
  max: number | null;
  startingExp: number;
  profile: Profile;
  equipmentList: string | string[] | null;
  isLeader?: boolean;
  spellcaster: string | null;
  skills: string[];
  fixedEquipment: string[];
  specialRules: Rule[];
  notes?: string;
}

export interface WarbandDef {
  id: string;
  name: string;
  source: string;
  startingGold: number;
  minModels: number;
  maxModels: number;
  specialRules: Rule[];
  equipmentLists: EquipmentList[];
  fighters: FighterType[];
  conversionNotes?: string[];
}

export type SheetCategory = 'melee' | 'missile' | 'ammo' | 'armour' | 'misc';

export interface SheetItem {
  name: string;
  category: SheetCategory;
  subcategory?: string;
  costText: string;
  cost: number | null;
  availability: string;
  strength: string | null;
  raw: string;
  cls: number | null;
  rules: string;
  hands: string | null;
  range: string | null;
  av: number | null;
}

/** One purchasable choice: a warband-list entry resolved to a sheet item (or not). */
export interface GearOption {
  key: string;
  label: string;
  listItem: ListItem;
  sheet?: SheetItem;
  quantity: number;
  cost: number;
  category: ListCategory;
  flags: string[];
}

export interface RosterEntry {
  id: string;
  typeId: string;
  name: string;
  count: number;
  gear: string[];
  /** Spell names known by this fighter (casters only). */
  spells?: string[];
}

export interface Roster {
  id: string;
  name: string;
  warbandId: string;
  entries: RosterEntry[];
  notes: string;
  allowRareSubstitutes: boolean;
  updated: number;
}

export interface Spell {
  roll: string;
  name: string;
  difficulty: string;
  text: string;
}

export interface SpellSchool {
  id: string;
  name: string;
  aliases: string[];
  kind: 'magic' | 'prayer' | 'ritual';
  source: string;
  notes?: string;
  spells: Spell[];
}
