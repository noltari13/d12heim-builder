import type { SheetItem, WarbandDef } from '../types';
import equipment from './equipment.json';
import beastmen from './warbands/beastmen.json';
import nuln from './warbands/nuln.json';
import skaven from './warbands/skaven.json';
import undead from './warbands/undead.json';

// Add new warbands here (schema: WARBAND_SCHEMA.md).
export const WARBANDS: WarbandDef[] = ([beastmen, nuln, skaven, undead] as unknown as WarbandDef[]).sort((a, b) =>
  a.name.localeCompare(b.name),
);
export const SHEET: SheetItem[] = equipment as SheetItem[];

export function getWarband(id: string): WarbandDef | undefined {
  return WARBANDS.find((w) => w.id === id);
}
