import { useMemo, useState } from 'react';
import { statNum, type Roster, type WarbandDef } from '../types';
import { WARBANDS, getWarband } from '../data';
import { calculate, pct, type CalcInput } from '../logic/calc';
import { d12Profile, type Computed } from '../logic/stats';

interface Props {
  roster?: Roster;
  wb?: WarbandDef;
  computed?: Map<string, Computed>;
}

const n = (v: unknown, d = 0) => {
  const x = statNum(v as number);
  return Number.isNaN(x) ? d : x;
};

const DEFAULT: CalcInput = {
  mode: 'melee',
  ws: 6,
  bs: 6,
  s: 6,
  ap: 0,
  attacks: 1,
  defWs: 6,
  defT: 6,
  defW: 1,
  defAv: 0,
  helmet: false,
  mods: { longRange: false, cover: false, concealment: 0, intoMelee: false },
};

function Num({ label, value, onChange, min = 0, max = 20 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <label className="num">
      <span>{label}</span>
      <div className="num-ctl">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Decrease ${label}`}>
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        />
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
    </label>
  );
}

export function Calculator({ roster, wb, computed }: Props) {
  const [c, setC] = useState<CalcInput>(DEFAULT);
  const [attKey, setAttKey] = useState('custom');
  const [defWb, setDefWb] = useState('');
  const [defFighter, setDefFighter] = useState('');
  const set = (patch: Partial<CalcInput>) => setC((x) => ({ ...x, ...patch }));
  const setMods = (patch: Partial<CalcInput['mods']>) => setC((x) => ({ ...x, mods: { ...x.mods, ...patch } }));

  // Attacker options: each roster fighter x each of its weapons.
  const attackers = useMemo(() => {
    const out: { key: string; label: string; apply: () => Partial<CalcInput> }[] = [];
    if (!roster || !computed) return out;
    for (const e of roster.entries) {
      const cc = computed.get(e.id);
      if (!cc) continue;
      const who = e.name || cc.ft.name;
      const base = { ws: n(cc.p12.WS), bs: n(cc.p12.BS), attacks: n(cc.p12.A, 1) };
      if (cc.weapons.length === 0) {
        out.push({ key: `${e.id}|natural`, label: `${who}: natural attacks`, apply: () => ({ ...base, mode: 'melee', s: n(cc.p12.S), ap: n(cc.p12.S) >= 8 ? 1 : 0 }) });
      }
      cc.weapons.forEach((w, i) => {
        const s = Number(w.strength);
        out.push({
          key: `${e.id}|${i}`,
          label: `${who}: ${w.name}`,
          apply: () => ({
            ...base,
            mode: w.kind === 'missile' ? 'ranged' : 'melee',
            s: Number.isNaN(s) ? n(cc.p12.S) : s,
            ap: w.ap,
            attacks: w.kind === 'missile' ? (/double shot/i.test(w.rules) ? 2 : 1) : base.attacks,
          }),
        });
      });
    }
    return out;
  }, [roster, computed]);

  const pickAttacker = (key: string) => {
    setAttKey(key);
    const a = attackers.find((x) => x.key === key);
    if (a) set(a.apply());
  };

  const defWarband = defWb ? getWarband(defWb) : undefined;
  const pickDefender = (fid: string) => {
    setDefFighter(fid);
    const f = defWarband?.fighters.find((x) => x.id === fid);
    if (!f) return;
    const p = d12Profile(f.profile);
    set({ defWs: n(p.WS), defT: n(p.T), defW: n(p.W, 1) });
  };

  const r = calculate(c);
  const melee = c.mode === 'melee';

  return (
    <details className="ref-section calc-wrap" id="ref-calc" open>
      <summary>
        <span>Attack calculator</span>
        <small>Hit, wound, save and injury odds for any matchup</small>
      </summary>
      <section className="calc" aria-label="Attack calculator">

      <div className="calc-grid">
        <fieldset>
          <legend>Attacker</legend>
          {attackers.length > 0 && (
            <select value={attKey} onChange={(e) => pickAttacker(e.target.value)} aria-label="Attacker from your warband">
              <option value="custom">Custom stats</option>
              {attackers.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          )}
          <div className="seg" role="group" aria-label="Attack type">
            <button type="button" className={melee ? 'on' : ''} onClick={() => set({ mode: 'melee' })}>
              Melee
            </button>
            <button type="button" className={!melee ? 'on' : ''} onClick={() => set({ mode: 'ranged' })}>
              Ranged
            </button>
          </div>
          <div className="nums">
            {melee ? <Num label="WS" value={c.ws} onChange={(v) => set({ ws: v })} /> : <Num label="BS" value={c.bs} onChange={(v) => set({ bs: v })} />}
            <Num label="Hit S" value={c.s} onChange={(v) => set({ s: v })} max={30} />
            <Num label="AP" value={c.ap} onChange={(v) => set({ ap: v })} max={10} />
            <Num label={melee ? 'Attacks' : 'Shots'} value={c.attacks} onChange={(v) => set({ attacks: v })} min={1} max={10} />
          </div>
          {!melee && (
            <div className="mods">
              <label className="chk">
                <input type="checkbox" checked={c.mods.longRange} onChange={(e) => setMods({ longRange: e.target.checked })} /> Long range +1
              </label>
              <label className="chk">
                <input type="checkbox" checked={c.mods.cover} onChange={(e) => setMods({ cover: e.target.checked })} /> Cover +2
              </label>
              <label className="chk">
                <input type="checkbox" checked={c.mods.intoMelee} onChange={(e) => setMods({ intoMelee: e.target.checked })} /> Into melee +4
              </label>
              <Num label="Concealment" value={c.mods.concealment} onChange={(v) => setMods({ concealment: v })} max={5} />
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Target</legend>
          <div className="row2">
            <select
              value={defWb}
              onChange={(e) => {
                setDefWb(e.target.value);
                setDefFighter('');
              }}
              aria-label="Target warband"
            >
              <option value="">Any warband…</option>
              {WARBANDS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            {defWarband && (
              <select value={defFighter} onChange={(e) => pickDefender(e.target.value)} aria-label="Target fighter">
                <option value="">Fighter…</option>
                {defWarband.fighters.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="nums">
            {melee && <Num label="WS" value={c.defWs} onChange={(v) => set({ defWs: v })} />}
            <Num label="T" value={c.defT} onChange={(v) => set({ defT: v })} />
            <Num label="W" value={c.defW} onChange={(v) => set({ defW: v })} min={1} max={10} />
            <Num label="AV" value={c.defAv} onChange={(v) => set({ defAv: v })} max={10} />
          </div>
          <label className="chk">
            <input type="checkbox" checked={c.helmet} onChange={(e) => set({ helmet: e.target.checked })} /> Helmet (8+ vs stun)
          </label>
        </fieldset>
      </div>

      <ol className="calc-steps">
        <li>
          <span>To hit</span>
          <b>{r.hitTN}+</b>
          <em>{pct(r.pHit)}</em>
        </li>
        <li>
          <span>To wound</span>
          <b>{r.woundTN}+</b>
          <em>{pct(r.pWound)}</em>
        </li>
        <li>
          <span>Save</span>
          <b>{r.saveTN ? `${r.saveTN}+` : 'none'}</b>
          <em>{r.saveTN ? `${pct(1 - r.pSaveFail)} saved` : '—'}</em>
        </li>
        <li>
          <span>Injury</span>
          <b>{c.defW > 1 ? `−1 W` : '9-12 OOA'}</b>
          <em>{c.defW > 1 ? `of ${c.defW}` : '33%'}</em>
        </li>
      </ol>

      <div className="calc-out">
        <div>
          <small>Per {melee ? 'attack' : 'shot'}: unsaved wound</small>
          <b>{pct(r.pUnsaved)}</b>
        </div>
        {c.defW <= 1 ? (
          <div>
            <small>Per {melee ? 'attack' : 'shot'}: out of action</small>
            <b>{pct(r.pOOA)}</b>
          </div>
        ) : (
          <div>
            <small>Expected wounds ({c.attacks} {melee ? (c.attacks === 1 ? 'attack' : 'attacks') : c.attacks === 1 ? 'shot' : 'shots'})</small>
            <b>{r.expectedWounds.toFixed(2)}</b>
          </div>
        )}
        <div>
          <small>
            ≥1 {c.defW <= 1 ? 'out of action' : 'wound'} in {c.attacks} {melee ? (c.attacks === 1 ? 'attack' : 'attacks') : c.attacks === 1 ? 'shot' : 'shots'}
          </small>
          <b>{pct(c.defW <= 1 ? r.atLeastOneOOA : r.atLeastOneUnsaved)}</b>
        </div>
      </div>
      <p className="muted small">
        Natural 12 to wound is a critical hit (Critical chart). Injury: 1-4 knocked down, 5-8 stunned{c.helmet ? ' (helmet 8+ → knocked down)' : ''}, 9-12 out of action.
        Parry, critical effects and special rules are not included.
      </p>
      </section>
    </details>
  );
}
