import type { Roster, WarbandDef } from '../types';
import { computeEntry, type Computed } from './stats';

export const MAX_HEROES = 6;
export const MAX_GROUP = 5;

export interface RosterSummary {
  computed: Map<string, Computed>;
  spent: number;
  remaining: number;
  models: number;
  heroes: number;
  errors: string[];
}

export function summarise(wb: WarbandDef, r: Roster): RosterSummary {
  const computed = new Map<string, Computed>();
  let spent = 0;
  let models = 0;
  let heroes = 0;
  const errors: string[] = [];
  const perType = new Map<string, number>();

  for (const e of r.entries) {
    const c = computeEntry(wb, e);
    if (!c) {
      errors.push(`Unknown fighter type "${e.typeId}".`);
      continue;
    }
    computed.set(e.id, c);
    spent += c.totalCost;
    const n = c.ft.kind === 'hero' ? 1 : e.count;
    models += n;
    if (c.ft.kind === 'hero') heroes += 1;
    else if (e.count < 1 || e.count > MAX_GROUP) errors.push(`${e.name || c.ft.name}: henchman groups are 1-${MAX_GROUP} models.`);
    perType.set(c.ft.id, (perType.get(c.ft.id) ?? 0) + n);
  }

  if (spent > wb.startingGold) errors.push(`Over budget by ${spent - wb.startingGold} gc.`);
  if (models < wb.minModels) errors.push(`Needs at least ${wb.minModels} models.`);
  if (models > wb.maxModels) errors.push(`Maximum ${wb.maxModels} models.`);
  if (heroes > MAX_HEROES) errors.push(`Maximum ${MAX_HEROES} heroes.`);
  for (const ft of wb.fighters) {
    const n = perType.get(ft.id) ?? 0;
    if (ft.min != null && n < ft.min) errors.push(`Needs ${ft.min === ft.max ? 'exactly' : 'at least'} ${ft.min} ${ft.name}.`);
    if (ft.max != null && n > ft.max) errors.push(`Maximum ${ft.max} ${ft.name}.`);
  }

  return { computed, spent, remaining: wb.startingGold - spent, models, heroes, errors };
}
