import { useEffect, useMemo, useRef, useState } from 'react';
import type { Roster, RosterEntry } from './types';
import { WARBANDS, getWarband } from './data';
import { summarise } from './logic/validate';
import { d12Profile } from './logic/stats';
import { downloadJson, loadActive, loadRosters, newRoster, parseRoster, saveActive, saveRosters, uid } from './logic/storage';
import { EntryCard } from './components/EntryCard';
import { PrintRoster } from './components/PrintRoster';

export default function App() {
  const [rosters, setRosters] = useState<Roster[]>(loadRosters);
  const [activeId, setActiveId] = useState<string | null>(() => loadActive());
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => saveRosters(rosters), [rosters]);
  useEffect(() => {
    if (activeId) saveActive(activeId);
  }, [activeId]);

  const roster = rosters.find((r) => r.id === activeId) ?? rosters[0];
  const wb = roster ? getWarband(roster.warbandId) : undefined;
  const summary = useMemo(() => (wb && roster ? summarise(wb, roster) : null), [wb, roster]);

  const update = (patch: Partial<Roster>) =>
    setRosters((rs) => rs.map((r) => (r.id === roster!.id ? { ...r, ...patch, updated: Date.now() } : r)));
  const setEntries = (fn: (es: RosterEntry[]) => RosterEntry[]) => update({ entries: fn(roster!.entries) });

  const create = (warbandId: string) => {
    const w = getWarband(warbandId)!;
    const r = newRoster(warbandId, `New ${w.name} warband`);
    setRosters((rs) => [...rs, r]);
    setActiveId(r.id);
    setCreating(false);
  };

  const importFile = async (f: File) => {
    try {
      const r = parseRoster(await f.text());
      if (!getWarband(r.warbandId)) throw new Error(`Unknown warband "${r.warbandId}".`);
      setRosters((rs) => [...rs, r]);
      setActiveId(r.id);
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    }
  };

  const removeRoster = () => {
    if (!roster || !confirm(`Delete "${roster.name}"?`)) return;
    const rest = rosters.filter((r) => r.id !== roster.id);
    setRosters(rest);
    setActiveId(rest[0]?.id ?? null);
  };

  const showPicker = creating || !roster;

  return (
    <div className="app">
      <header className="topbar no-print">
        <h1>
          d12heim <span>Warband Builder</span>
        </h1>
        <div className="top-actions">
          {rosters.length > 0 && (
            <select value={roster?.id ?? ''} onChange={(e) => setActiveId(e.target.value)} aria-label="Saved warbands">
              {rosters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({getWarband(r.warbandId)?.name ?? r.warbandId})
                </option>
              ))}
            </select>
          )}
          <button onClick={() => setCreating(true)}>New</button>
          <button onClick={() => fileRef.current?.click()}>Import</button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile(f);
              e.target.value = '';
            }}
          />
          {roster && !showPicker && (
            <>
              <button onClick={() => downloadJson(roster)}>Export</button>
              <button onClick={() => window.print()}>Print</button>
              <button className="danger" onClick={removeRoster}>
                Delete
              </button>
            </>
          )}
        </div>
      </header>

      {showPicker && (
        <main className="picker no-print">
          <h2>Choose a warband</h2>
          <div className="picker-grid">
            {WARBANDS.map((w) => {
              const leader = w.fighters.find((f) => f.isLeader);
              return (
                <button key={w.id} className="picker-card" onClick={() => create(w.id)}>
                  <b>{w.name}</b>
                  <span>
                    {w.startingGold} gc · {w.minModels}-{w.maxModels} models
                  </span>
                  {leader && <small>Led by a {leader.name}</small>}
                </button>
              );
            })}
          </div>
          {creating && roster && (
            <button className="link" onClick={() => setCreating(false)}>
              Cancel
            </button>
          )}
        </main>
      )}

      {!showPicker && roster && wb && summary && (
        <>
          <section className="summary no-print">
            <input className="roster-name" value={roster.name} onChange={(e) => update({ name: e.target.value })} aria-label="Warband name" />
            <div className="stats-row">
              <Stat label="Spent" value={`${summary.spent} gc`} />
              <Stat label="Treasury" value={`${summary.remaining} gc`} bad={summary.remaining < 0} />
              <Stat label="Models" value={`${summary.models} / ${wb.maxModels}`} bad={summary.models > wb.maxModels || summary.models < wb.minModels} />
              <Stat label="Heroes" value={`${summary.heroes} / 6`} bad={summary.heroes > 6} />
            </div>
            <div className="budget">
              <div className={`budget-fill ${summary.remaining < 0 ? 'over' : ''}`} style={{ width: `${Math.min(100, (summary.spent / wb.startingGold) * 100)}%` }} />
            </div>
            {summary.errors.length > 0 ? (
              <ul className="errors">
                {summary.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            ) : (
              <p className="ok">Legal starting warband.</p>
            )}
          </section>

          <div className="layout no-print">
            <aside className="recruit">
              <h2>Recruit</h2>
              {(['hero', 'henchman'] as const).map((kind) => (
                <div key={kind}>
                  <h3>{kind === 'hero' ? 'Heroes' : 'Henchmen'}</h3>
                  {wb.fighters
                    .filter((f) => f.kind === kind)
                    .map((f) => {
                      const have = roster.entries
                        .filter((e) => e.typeId === f.id)
                        .reduce((n, e) => n + (f.kind === 'hero' ? 1 : e.count), 0);
                      const full = f.max != null && have >= f.max;
                      const p = d12Profile(f.profile);
                      return (
                        <button
                          key={f.id}
                          className="recruit-btn"
                          disabled={full}
                          title={`M${p.M} WS${p.WS} BS${p.BS} S${p.S} T${p.T} W${p.W} I${p.I} A${p.A} Ld${p.Ld}`}
                          onClick={() =>
                            setEntries((es) => [...es, { id: uid(), typeId: f.id, name: '', count: 1, gear: [] }])
                          }
                        >
                          <span>
                            {f.name}
                            <small>
                              {have}/{f.max ?? '∞'}
                              {f.min ? `, min ${f.min}` : ''}
                            </small>
                          </span>
                          <b>{f.cost} gc</b>
                        </button>
                      );
                    })}
                </div>
              ))}
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={roster.allowRareSubstitutes}
                  onChange={(e) => update({ allowRareSubstitutes: e.target.checked })}
                />
                Show rare sheet substitutes (e.g. Chainmail for "Light armour")
              </label>
              {wb.specialRules.length > 0 && (
                <details className="wb-rules">
                  <summary>Warband rules</summary>
                  {wb.specialRules.map((r) => (
                    <p key={r.name}>
                      <b>{r.name}.</b> {r.text}
                    </p>
                  ))}
                </details>
              )}
              {wb.conversionNotes && wb.conversionNotes.length > 0 && (
                <details className="wb-rules">
                  <summary>d6 → d12 conversion notes</summary>
                  <ul>
                    {wb.conversionNotes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </details>
              )}
            </aside>

            <main className="entries">
              {roster.entries.length === 0 && <p className="muted empty">Recruit fighters from the list on the left.</p>}
              {roster.entries.map((e, i) => {
                const c = summary.computed.get(e.id);
                if (!c) return null;
                return (
                  <EntryCard
                    key={e.id}
                    wb={wb}
                    entry={e}
                    c={c}
                    allowRare={roster.allowRareSubstitutes}
                    onChange={(ne) => setEntries((es) => es.map((x) => (x.id === e.id ? ne : x)))}
                    onRemove={() => setEntries((es) => es.filter((x) => x.id !== e.id))}
                    onDuplicate={() =>
                      setEntries((es) => [...es.slice(0, i + 1), { ...e, id: uid(), name: '' }, ...es.slice(i + 1)])
                    }
                  />
                );
              })}
              <label className="notes">
                Notes
                <textarea value={roster.notes} onChange={(e) => update({ notes: e.target.value })} rows={3} />
              </label>
            </main>
          </div>

          <PrintRoster wb={wb} r={roster} s={summary} />
        </>
      )}
    </div>
  );
}

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className={`stat ${bad ? 'bad' : ''}`}>
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}
