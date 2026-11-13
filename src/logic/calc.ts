// d12heim attack maths. Target numbers (TN) are "roll this or higher on a d12".

export const clampTN = (tn: number) => Math.min(12, Math.max(1, tn));
export const pRoll = (tn: number) => (13 - clampTN(tn)) / 12;

/** Melee to-hit and every to-wound: 7 + defender's stat - attacker's stat. */
export const opposedTN = (attacker: number, defender: number) => clampTN(7 + defender - attacker);

export interface RangedMods {
  longRange: boolean;
  cover: boolean;
  concealment: number;
  intoMelee: boolean;
}

/** Ranged to-hit: 13 - BS, +1 long range, +2 cover, +1 per concealment layer, +4 into melee. */
export function rangedTN(bs: number, m: RangedMods) {
  return clampTN(13 - bs + (m.longRange ? 1 : 0) + (m.cover ? 2 : 0) + m.concealment + (m.intoMelee ? 4 : 0));
}

/** Armour save TN = 13 - AV + AP; none if AV is 0, AP > AV, or the TN is above 12. */
export function saveTN(av: number, ap: number): number | null {
  if (av <= 0 || ap > av) return null;
  const tn = 13 - av + ap;
  return tn > 12 ? null : Math.max(2, tn);
}

export interface CalcInput {
  mode: 'melee' | 'ranged';
  ws: number;
  bs: number;
  s: number;
  ap: number;
  attacks: number;
  defWs: number;
  defT: number;
  defW: number;
  defAv: number;
  helmet: boolean;
  mods: RangedMods;
}

export interface CalcResult {
  hitTN: number;
  woundTN: number;
  saveTN: number | null;
  pHit: number;
  pWound: number;
  pCrit: number;
  pSaveFail: number;
  pUnsaved: number;
  pOOA: number;
  pStun: number;
  pKD: number;
  atLeastOneUnsaved: number;
  atLeastOneOOA: number;
  expectedWounds: number;
}

export function calculate(c: CalcInput): CalcResult {
  const hitTN = c.mode === 'melee' ? opposedTN(c.ws, c.defWs) : rangedTN(c.bs, c.mods);
  const woundTN = opposedTN(c.s, c.defT);
  const sTN = saveTN(c.defAv, c.ap);
  const pHit = pRoll(hitTN);
  const pWound = pRoll(woundTN);
  // A natural 12 to wound is a critical hit (always wounds; Critical chart).
  const pCrit = 1 / 12;
  const pSaveFail = sTN == null ? 1 : 1 - pRoll(sTN);
  const pUnsaved = pHit * pWound * pSaveFail;
  // Injury d12: 1-4 knocked down, 5-8 stunned, 9-12 out of action. Only rolled when the last wound goes.
  const injury = c.defW <= 1 ? 1 : 0;
  const pOOA = pUnsaved * (4 / 12) * injury;
  let pStun = pUnsaved * (4 / 12) * injury;
  let pKD = pUnsaved * (4 / 12) * injury;
  if (c.helmet) {
    // Helmet: 8+ save turns a Stunned result into Knocked Down.
    const saved = pStun * pRoll(8);
    pStun -= saved;
    pKD += saved;
  }
  const n = Math.max(1, c.attacks);
  return {
    hitTN,
    woundTN,
    saveTN: sTN,
    pHit,
    pWound,
    pCrit,
    pSaveFail,
    pUnsaved,
    pOOA,
    pStun,
    pKD,
    atLeastOneUnsaved: 1 - (1 - pUnsaved) ** n,
    atLeastOneOOA: 1 - (1 - pOOA) ** n,
    expectedWounds: pUnsaved * n,
  };
}

export const pct = (p: number) => `${Math.round(p * 100)}%`;
