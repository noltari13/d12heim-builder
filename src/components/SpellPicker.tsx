import { useState } from 'react';
import type { FighterType, RosterEntry } from '../types';
import { schoolFor } from '../data';

interface Props {
  ft: FighterType;
  entry: RosterEntry;
  onChange: (e: RosterEntry) => void;
}

/** Lets a caster record the spells it knows, limited to its own school. */
export function SpellPicker({ ft, entry, onChange }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const school = schoolFor(ft.spellcaster);
  const known = entry.spells ?? [];
  const word = school?.kind === 'prayer' ? 'prayer' : school?.kind === 'ritual' ? 'ritual' : 'spell';

  if (!ft.spellcaster) return null;
  if (!school || school.spells.length === 0) {
    return (
      <div className="spells">
        <div className="spells-head">
          <b>{ft.spellcaster}</b>
          <span className="muted small">spell list not available yet</span>
        </div>
      </div>
    );
  }

  const available = school.spells.filter((s) => !known.includes(s.name));
  const roll = () => {
    if (!available.length) return;
    const s = available[Math.floor(Math.random() * available.length)];
    onChange({ ...entry, spells: [...known, s.name] });
  };

  return (
    <div className="spells">
      <div className="spells-head">
        <b>{school.name}</b>
        <span className="muted small">
          {known.length} {word}
          {known.length === 1 ? '' : 's'} known
        </span>
      </div>
      {known.length > 0 && (
        <ul className="spell-list">
          {known.map((name) => {
            const s = school.spells.find((x) => x.name === name);
            const isOpen = open === name;
            return (
              <li key={name}>
                <div className="spell-row">
                  <button className="spell-name" onClick={() => setOpen(isOpen ? null : name)} aria-expanded={isOpen}>
                    {name}
                    {s && <span className="diff">Diff {s.difficulty}</span>}
                  </button>
                  <button className="chip-x" onClick={() => onChange({ ...entry, spells: known.filter((k) => k !== name) })} aria-label={`Remove ${name}`}>
                    ×
                  </button>
                </div>
                {isOpen && s && <p className="spell-text">{s.text}</p>}
              </li>
            );
          })}
        </ul>
      )}
      {available.length > 0 && (
        <div className="spell-add">
          <select value="" onChange={(e) => e.target.value && onChange({ ...entry, spells: [...known, e.target.value] })} aria-label={`Add ${word}`}>
            <option value="">+ Add {word}…</option>
            {available.map((s) => (
              <option key={s.name} value={s.name}>
                {s.roll ? `${s.roll}. ` : ''}
                {s.name} (Diff {s.difficulty})
              </option>
            ))}
          </select>
          <button onClick={roll} title={`Pick a random ${word} you don't know yet`}>
            Roll
          </button>
        </div>
      )}
    </div>
  );
}
