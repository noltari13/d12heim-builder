import type { Roster } from '../types';

const KEY = 'd12heim_rosters_v1';
const ACTIVE = 'd12heim_active_v1';

export const uid = () => Math.random().toString(36).slice(2, 10);

export function loadRosters(): Roster[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Roster[];
  } catch {
    /* storage unavailable */
  }
  return [];
}

export function saveRosters(rs: Roster[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rs));
  } catch {
    /* storage unavailable */
  }
}

export function loadActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE);
  } catch {
    return null;
  }
}

export function saveActive(id: string) {
  try {
    localStorage.setItem(ACTIVE, id);
  } catch {
    /* storage unavailable */
  }
}

export function newRoster(warbandId: string, name: string): Roster {
  return { id: uid(), name, warbandId, entries: [], notes: '', allowRareSubstitutes: false, updated: Date.now() };
}

export function downloadJson(r: Roster) {
  const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(r.name || 'warband').replace(/[^\w-]+/g, '_')}.d12heim.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function parseRoster(text: string): Roster {
  const r = JSON.parse(text) as Roster;
  if (!r || typeof r.warbandId !== 'string' || !Array.isArray(r.entries)) throw new Error('Not a d12heim roster file.');
  return { ...r, id: uid(), updated: Date.now() };
}
