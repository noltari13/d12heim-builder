import { useEffect, useMemo, useRef, useState } from 'react';
import type { Roster, RosterEntry } from './types';
import { WARBANDS, getWarband } from './data';
import { summarise } from './logic/validate';
import { downloadJson, loadActive, loadRosters, newRoster, parseRoster, saveActive, saveRosters, uid } from './logic/storage';
import { EntryCard } from './components/EntryCard';
import { PrintRoster } from './components/PrintRoster';
import { RecruitPanel } from './components/RecruitPanel';
import { Reference } from './components/Reference';

type Tab = 'builder' | 'reference';
const initialTab = (): Tab => (location.hash.startsWith('#ref') ? 'reference' : 'builder');

export default function App() {
  const [rosters, setRosters] = useState<Roster[]>(loadRosters);
  const [activeId, setActiveId] = useState<string | null>(() => loadActive());
  const [creating, setCreating] = useState(false);
  const [pick, setPick] = useState('');
  const [tab, setTab] = useState<Tab>(initialTab);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const pickWb = pick ? getWarband(pick) : undefined;
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => saveRosters(rosters), [rosters]);
  useEffect(() => {
    if (activeId) saveActive(activeId);
  }, [activeId]);
  useEffect(() => {
    if (!lastAdded) return;
    document.getElementById(`entry-${lastAdded}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setLastAdded(null);
  }, [lastAdded]);

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
    setPick('');
  };

  const addFighter = (typeId: string) => {
    const id = uid();
    setEntries((es) => [...es, { id, typeId, name: '', count: 1, gear: [] }]);
    setSheetOpen(false);
    setLastAdded(id);
  };

  const importFile = async (f: File) => {
    try {
      const r = parseRoster(await f.text());
      if (!getWarband(r.warbandId)) throw new Error(`Unknown warband "${r.warbandId}".`);
      setRosters((rs) => [...rs, r]);
      setActiveId(r.id);
      setCreating(false);
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

  const go = (t: Tab) => {
    setTab(t);
    setMenuOpen(false);
    history.replaceState(null, '', t === 'reference' ? '#ref' : '#');
    window.scrollTo({ top: 0 });
  };

  const menu = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  const showPicker = creating || !roster;
  const legal = summary && summary.errors.length === 0;

  return (
    <div className={`app tab-${tab}`}>
      <header className="topbar no-print">
        <h1>
          d12heim <span>Warbands</span>
        </h1>
        <nav className="tabs desktop-only" aria-label="Sections">
          <button className={tab === 'builder' ? 'on' : ''} onClick={() => go('builder')}>
            Builder
          </button>
          <button className={tab === 'reference' ? 'on' : ''} onClick={() => go('reference')}>
            Quick reference
          </button>
        </nav>
        {tab === 'builder' && (
          <div className="menu-wrap">
            <button className="icon-btn" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Warband menu">
              ☰ <span className="desktop-only">Menu</span>
            </button>
            {menuOpen && (
              <>
                <div className="scrim clear" onClick={() => setMenuOpen(false)} />
                <div className="menu" role="menu">
                  <button role="menuitem" onClick={menu(() => setCreating(true))}>
                    New warband
                  </button>
                  <button role="menuitem" onClick={menu(() => fileRef.current?.click())}>
                    Import file…
                  </button>
                  {roster && !showPicker && (
                    <>
                      <button role="menuitem" onClick={menu(() => downloadJson(roster))}>
                        Export file
                      </button>
                      <button role="menuitem" onClick={menu(() => window.print())}>
                        Print roster
                      </button>
                      <button role="menuitem" className="danger" onClick={menu(removeRoster)}>
                        Delete warband
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
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
      </header>

      {tab === 'reference' && (
        <main className="no-print">
          <Reference roster={roster} wb={wb} computed={summary?.computed} />
        </main>
      )}

      {tab === 'builder' && showPicker && (
        <main className="picker no-print">
          <h2>New warband</h2>
          <label className="picker-field">
            Warband
            <select value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Choose one of {WARBANDS.length} warbands…</option>
              {WARBANDS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          {pickWb && (
            <div className="picker-preview">
              <p className="muted">
                {pickWb.startingGold} gc · {pickWb.minModels}-{pickWb.maxModels} models
                {pickWb.fighters.find((f) => f.isLeader) && <> · led by a {pickWb.fighters.find((f) => f.isLeader)!.name}</>}
              </p>
              <ul>
                {pickWb.fighters.map((f) => (
                  <li key={f.id}>
                    <span>
                      {f.name} <small>{f.kind === 'hero' ? 'Hero' : 'Henchmen'}{f.max != null ? `, max ${f.max}` : ''}</small>
                    </span>
                    <b>{f.cost} gc</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="picker-actions">
            <button className="primary" disabled={!pickWb} onClick={() => pickWb && create(pickWb.id)}>
              Create warband
            </button>
            {creating && roster && (
              <button className="link" onClick={() => setCreating(false)}>
                Cancel
              </button>
            )}
            {!roster && (
              <button className="link" onClick={() => fileRef.current?.click()}>
                or import a file
              </button>
            )}
          </div>
        </main>
      )}

      {tab === 'builder' && !showPicker && roster && wb && summary && (
        <>
          <div className="roster-switch no-print">
            <select value={roster.id} onChange={(e) => setActiveId(e.target.value)} aria-label="Saved warbands">
              {rosters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {getWarband(r.warbandId)?.name ?? r.warbandId}
                </option>
              ))}
            </select>
          </div>

          <section className="summary no-print">
            <input className="roster-name" value={roster.name} onChange={(e) => update({ name: e.target.value })} aria-label="Warband name" />
            <div className="sub muted">{wb.name}</div>
          </section>

          <div className="statusbar no-print">
            <div className="stat-pills">
              <span className={`pill ${summary.remaining < 0 ? 'bad' : ''}`}>
                <b>{summary.spent}</b>/{wb.startingGold} gc
              </span>
              <span className={`pill ${summary.models > wb.maxModels || summary.models < wb.minModels ? 'bad' : ''}`}>
                <b>{summary.models}</b>/{wb.maxModels} models
              </span>
              <span className={`pill ${summary.heroes > 6 ? 'bad' : ''}`}>
                <b>{summary.heroes}</b>/6 heroes
              </span>
              <button className={`pill status ${legal ? 'ok' : 'bad'}`} onClick={() => setShowErrors(!showErrors)} disabled={!!legal}>
                {legal ? '✓ Legal' : `⚠ ${summary.errors.length} issue${summary.errors.length > 1 ? 's' : ''}`}
              </button>
            </div>
            <div className="budget">
              <div className={`budget-fill ${summary.remaining < 0 ? 'over' : ''}`} style={{ width: `${Math.min(100, (summary.spent / wb.startingGold) * 100)}%` }} />
            </div>
            {!legal && showErrors && (
              <ul className="errors">
                {summary.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="layout no-print">
            <aside className="recruit desktop-only">
              <h2>Recruit</h2>
              <RecruitPanel wb={wb} roster={roster} onAdd={addFighter} onToggleRare={(v) => update({ allowRareSubstitutes: v })} />
            </aside>

            <main className="entries">
              {roster.entries.length === 0 && (
                <div className="empty">
                  <p>No fighters yet.</p>
                  <button className="primary mobile-only" onClick={() => setSheetOpen(true)}>
                    + Recruit a fighter
                  </button>
                  <p className="muted desktop-only">Recruit fighters from the list on the left.</p>
                </div>
              )}
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
                    onDuplicate={() => setEntries((es) => [...es.slice(0, i + 1), { ...e, id: uid(), name: '' }, ...es.slice(i + 1)])}
                  />
                );
              })}
              <label className="notes">
                Notes
                <textarea value={roster.notes} onChange={(e) => update({ notes: e.target.value })} rows={3} />
              </label>
            </main>
          </div>

          <button className="fab mobile-only no-print" onClick={() => setSheetOpen(true)} aria-label="Recruit a fighter">
            + Recruit
          </button>

          {sheetOpen && (
            <div className="sheet-wrap mobile-only no-print">
              <div className="scrim" onClick={() => setSheetOpen(false)} />
              <div className="sheet" role="dialog" aria-label="Recruit">
                <div className="sheet-head">
                  <h2>Recruit</h2>
                  <span className="muted">{summary.remaining} gc left</span>
                  <button className="icon-btn" onClick={() => setSheetOpen(false)} aria-label="Close">
                    ✕
                  </button>
                </div>
                <RecruitPanel wb={wb} roster={roster} onAdd={addFighter} onToggleRare={(v) => update({ allowRareSubstitutes: v })} />
              </div>
            </div>
          )}

          <PrintRoster wb={wb} r={roster} s={summary} />
        </>
      )}

      <nav className="bottom-nav mobile-only no-print" aria-label="Sections">
        <button className={tab === 'builder' ? 'on' : ''} onClick={() => go('builder')}>
          <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /></svg>
          Builder
        </button>
        <button className={tab === 'reference' ? 'on' : ''} onClick={() => go('reference')}>
          <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z" /><path d="M8 7h7M8 11h7" /></svg>
          Reference
        </button>
      </nav>
    </div>
  );
}
