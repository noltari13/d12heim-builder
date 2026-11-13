import type { Roster, WarbandDef } from '../types';
import { d12Profile } from '../logic/stats';

interface Props {
  wb: WarbandDef;
  roster: Roster;
  onAdd: (typeId: string) => void;
  onToggleRare: (v: boolean) => void;
}

export function RecruitPanel({ wb, roster, onAdd, onToggleRare }: Props) {
  return (
    <div className="recruit-inner">
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
                <button key={f.id} className="recruit-btn" disabled={full} onClick={() => onAdd(f.id)}>
                  <span>
                    {f.name}
                    <small>
                      {have}/{f.max ?? '∞'}
                      {f.min ? ` · min ${f.min}` : ''} · WS{p.WS} S{p.S} T{p.T} W{p.W}
                    </small>
                  </span>
                  <b>{f.cost} gc</b>
                </button>
              );
            })}
        </div>
      ))}
      <label className="toggle">
        <input type="checkbox" checked={roster.allowRareSubstitutes} onChange={(e) => onToggleRare(e.target.checked)} />
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
    </div>
  );
}
