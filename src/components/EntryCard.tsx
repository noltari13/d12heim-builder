import { useMemo, useState } from 'react';
import type { GearOption, RosterEntry, WarbandDef } from '../types';
import { gearOptions } from '../logic/equipment';
import { saveText, type Computed } from '../logic/stats';
import { MAX_GROUP } from '../logic/validate';
import { ProfileTable } from './ProfileTable';
import { SpellPicker } from './SpellPicker';

const CAT_LABEL: Record<string, string> = { melee: 'Close combat', missile: 'Missile', armour: 'Armour', misc: 'Other' };

interface Props {
  wb: WarbandDef;
  entry: RosterEntry;
  c: Computed;
  allowRare: boolean;
  onChange: (e: RosterEntry) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

export function EntryCard({ wb, entry, c, allowRare, onChange, onRemove, onDuplicate }: Props) {
  const { ft } = c;
  const [showRules, setShowRules] = useState(false);
  const options = useMemo(() => gearOptions(wb, ft, allowRare), [wb, ft, allowRare]);
  const grouped = useMemo(() => {
    const g: Record<string, GearOption[]> = {};
    for (const o of options) (g[o.category] ??= []).push(o);
    return g;
  }, [options]);
  const isHench = ft.kind === 'henchman';

  const addGear = (key: string) => key && onChange({ ...entry, gear: [...entry.gear, key] });
  const removeGear = (i: number) => onChange({ ...entry, gear: entry.gear.filter((_, j) => j !== i) });

  return (
    <article id={`entry-${entry.id}`} className={`card ${ft.kind}`}>
      <header className="card-head">
        <div className="card-title">
          <input
            className="name-input"
            value={entry.name}
            placeholder={ft.name}
            onChange={(ev) => onChange({ ...entry, name: ev.target.value })}
            aria-label="Name"
          />
          <div className="sub">
            {ft.name}
            {ft.isLeader && <span className="tag leader">Leader</span>}
            <span className={`tag ${ft.kind}`}>{isHench ? 'Henchmen' : 'Hero'}</span>
            {ft.spellcaster && <span className="tag magic">{ft.spellcaster}</span>}
            {ft.startingExp > 0 && <span className="tag">{ft.startingExp} XP</span>}
          </div>
        </div>
        <div className="card-cost">
          {isHench && (
            <div className="stepper" aria-label="Group size">
              <button onClick={() => onChange({ ...entry, count: Math.max(1, entry.count - 1) })} disabled={entry.count <= 1}>
                −
              </button>
              <span>{entry.count}</span>
              <button onClick={() => onChange({ ...entry, count: Math.min(MAX_GROUP, entry.count + 1) })} disabled={entry.count >= MAX_GROUP}>
                +
              </button>
            </div>
          )}
          <div className="gc">
            {c.totalCost} gc
            {isHench && entry.count > 1 && <small>{c.perModelCost} each</small>}
          </div>
        </div>
      </header>

      <ProfileTable p12={c.p12} />

      <div className="gear">
        {c.gear.map((g, i) => (
          <span key={i} className="chip" title={[g.listItem.note, ...g.flags].filter(Boolean).join(' · ')}>
            {g.label}
            <small>{g.cost} gc</small>
            {g.flags.length > 0 && <span className="flag">!</span>}
            <button onClick={() => removeGear(i)} aria-label={`Remove ${g.label}`}>
              ×
            </button>
          </span>
        ))}
        {options.length > 0 ? (
          <select value="" onChange={(ev) => addGear(ev.target.value)} aria-label="Add equipment">
            <option value="">+ Add equipment…</option>
            {Object.entries(grouped).map(([cat, opts]) => (
              <optgroup key={cat} label={CAT_LABEL[cat] ?? cat}>
                {opts.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label} ({o.cost} gc){o.label.toLowerCase() !== o.listItem.name.toLowerCase() ? ` · list: ${o.listItem.name}` : ''}
                    {o.flags.length ? ` · ${o.flags.join(', ')}` : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <span className="muted">{ft.fixedEquipment.join('; ') || 'No equipment'}</span>
        )}
      </div>

      {c.weapons.length > 0 && (
        <ul className="weapons">
          {c.weapons.map((w, i) => (
            <li key={i}>
              <div className="w-main">
                <span className="w-name">
                  {w.name}
                  {w.draft && <span className="tag working" title="Draft d12 stats, not yet reviewed by the group">draft</span>}
                </span>
                <span className="w-stats">
                  <span>S {w.strength}</span>
                  <span>AP {w.ap}</span>
                  {w.range && <span>{w.range}</span>}
                </span>
              </div>
              {w.rules && <div className="w-rules">{w.rules}</div>}
            </li>
          ))}
        </ul>
      )}

      <SpellPicker ft={ft} entry={entry} onChange={onChange} />

      <div className="defence">
        <span>
          <b>AV {c.av}</b> · save {saveText(c.av)} vs AP0
          {c.av > 0 && <> · {saveText(c.av, 4)} vs AP4</>}
        </span>
        {c.helmet && <span>Helmet: stun save 8+</span>}
      </div>

      {c.warnings.length > 0 && (
        <ul className="warn">
          {c.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      {(ft.specialRules.length > 0 || ft.skills.length > 0) && (
        <div className="rules-box">
          <button className="link" onClick={() => setShowRules(!showRules)}>
            {showRules ? 'Hide' : 'Show'} special rules ({ft.specialRules.map((r) => r.name).join(', ') || 'none'})
          </button>
          {showRules && (
            <div>
              {ft.skills.length > 0 && (
                <p>
                  <b>Skills:</b> {ft.skills.join(', ')}
                </p>
              )}
              {ft.specialRules.map((r) => (
                <p key={r.name}>
                  <b>{r.name}.</b> {r.text}
                </p>
              ))}
              {ft.notes && <p className="muted">{ft.notes}</p>}
            </div>
          )}
        </div>
      )}

      <footer className="card-actions">
        <button className="link" onClick={onDuplicate}>
          Duplicate
        </button>
        <button className="link danger" onClick={onRemove}>
          Remove
        </button>
      </footer>
    </article>
  );
}
