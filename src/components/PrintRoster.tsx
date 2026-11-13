import type { Roster, WarbandDef } from '../types';
import { STAT_KEYS } from '../types';
import { baseAP, saveText } from '../logic/stats';
import type { RosterSummary } from '../logic/validate';

export function PrintRoster({ wb, r, s }: { wb: WarbandDef; r: Roster; s: RosterSummary }) {
  return (
    <section className="print-only print-roster">
      <h1>{r.name || 'Unnamed warband'}</h1>
      <p>
        {wb.name} · {s.spent} gc spent · {s.remaining} gc treasury · {s.models} models · {s.heroes} heroes
      </p>
      <table className="print-table">
        <thead>
          <tr>
            <th>Fighter</th>
            {STAT_KEYS.map((k) => (
              <th key={k}>{k}</th>
            ))}
            <th>AP</th>
            <th>AV / save</th>
            <th>Equipment</th>
            <th>gc</th>
          </tr>
        </thead>
        <tbody>
          {r.entries.map((e) => {
            const c = s.computed.get(e.id);
            if (!c) return null;
            return (
              <tr key={e.id}>
                <td>
                  <b>{e.name || c.ft.name}</b>
                  {c.ft.kind === 'henchman' ? ` ×${e.count}` : ''}
                  <br />
                  <small>
                    {c.ft.name}
                    {c.ft.startingExp ? ` · ${c.ft.startingExp} XP` : ''}
                  </small>
                </td>
                {STAT_KEYS.map((k) => (
                  <td key={k}>{c.p12[k] ?? '-'}</td>
                ))}
                <td>{baseAP(c.p12)}</td>
                <td>
                  {c.av} / {saveText(c.av)}
                  {c.helmet ? ' · helm 8+' : ''}
                </td>
                <td className="small">
                  {c.weapons.map((w) => `${w.name} (S${w.strength}${w.ap ? ` AP${w.ap}` : ''}${w.range ? ` ${w.range}` : ''})`).join('; ')}
                  {c.gear.filter((g) => g.category !== 'melee' && g.category !== 'missile').length > 0 && '; '}
                  {c.gear
                    .filter((g) => g.category !== 'melee' && g.category !== 'missile')
                    .map((g) => g.label)
                    .join('; ')}
                  {(e.spells?.length ?? 0) > 0 && (
                    <>
                      <br />
                      <b>Spells:</b> {e.spells!.join(', ')}
                    </>
                  )}
                  {c.ft.specialRules.length > 0 && (
                    <>
                      <br />
                      <i>{c.ft.specialRules.map((x) => x.name).join(', ')}</i>
                    </>
                  )}
                </td>
                <td>{c.totalCost}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {wb.specialRules.length > 0 && (
        <div className="print-rules">
          <h2>Warband rules</h2>
          {wb.specialRules.map((x) => (
            <p key={x.name}>
              <b>{x.name}.</b> {x.text}
            </p>
          ))}
        </div>
      )}
      <div className="print-rules">
        <h2>Fighter rules</h2>
        {[...new Set(r.entries.map((e) => e.typeId))].map((tid) => {
          const ft = wb.fighters.find((f) => f.id === tid);
          if (!ft || !ft.specialRules.length) return null;
          return (
            <p key={tid}>
              <b>{ft.name}:</b> {ft.specialRules.map((x) => `${x.name}: ${x.text}`).join(' · ')}
            </p>
          );
        })}
      </div>
      {r.notes && (
        <div className="print-rules">
          <h2>Notes</h2>
          <p>{r.notes}</p>
        </div>
      )}
    </section>
  );
}
