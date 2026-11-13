import { Fragment, useMemo, useState, type ReactNode } from 'react';
import quickref from '../data/quickref.json';
import type { Roster, WarbandDef } from '../types';
import type { Computed } from '../logic/stats';
import { Calculator } from './Calculator';
import { SPELL_SCHOOLS, schoolFor } from '../data';

type Block =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'steps'; items: { title: string; text: string }[] }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'note'; tone: 'working' | 'info'; text: string };
interface Section {
  id: string;
  title: string;
  summary?: string;
  blocks: Block[];
}
interface Term {
  term: string;
  text: string;
  source?: string;
}
const QR = quickref as unknown as { sections: Section[]; glossary: Term[] };

/** Renders **bold** and highlights the search term. */
function rich(text: string, q: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const bold = part.startsWith('**') && part.endsWith('**');
    const body = bold ? part.slice(2, -2) : part;
    const marked = q ? highlight(body, q) : body;
    return bold ? <b key={i}>{marked}</b> : <Fragment key={i}>{marked}</Fragment>;
  });
}
function highlight(text: string, q: string): ReactNode {
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {highlight(text.slice(i + q.length), q)}
    </>
  );
}

const blockText = (b: Block): string =>
  b.type === 'p' || b.type === 'note'
    ? b.text
    : b.type === 'list'
      ? b.items.join(' ')
      : b.type === 'steps'
        ? b.items.map((s) => `${s.title} ${s.text}`).join(' ')
        : [...b.head, ...b.rows.flat()].join(' ');

function BlockView({ b, q }: { b: Block; q: string }) {
  switch (b.type) {
    case 'p':
      return <p>{rich(b.text, q)}</p>;
    case 'list':
      return (
        <ul>
          {b.items.map((t, i) => (
            <li key={i}>{rich(t, q)}</li>
          ))}
        </ul>
      );
    case 'steps':
      return (
        <ol className="steps">
          {b.items.map((s, i) => (
            <li key={i}>
              <b>{rich(s.title, q)}</b> {rich(s.text, q)}
            </li>
          ))}
        </ol>
      );
    case 'table':
      return (
        <div className="table-wrap">
          <table className="ref-table">
            <thead>
              <tr>
                {b.head.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{rich(c, q)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'note':
      return (
        <p className={`note ${b.tone}`}>
          {b.tone === 'working' && <span className="tag working">Working rule</span>} {rich(b.text, q)}
        </p>
      );
  }
}

interface Props {
  roster?: Roster;
  wb?: WarbandDef;
  computed?: Map<string, Computed>;
}

export function Reference({ roster, wb, computed }: Props) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const sections = useMemo(() => {
    if (!q) return QR.sections.map((s) => ({ s, blocks: s.blocks }));
    return QR.sections
      .map((s) => ({ s, blocks: s.title.toLowerCase().includes(q) ? s.blocks : s.blocks.filter((b) => blockText(b).toLowerCase().includes(q)) }))
      .filter((x) => x.blocks.length > 0);
  }, [q]);
  const terms = useMemo(
    () => QR.glossary.filter((t) => !q || `${t.term} ${t.text}`.toLowerCase().includes(q)).sort((a, b) => a.term.localeCompare(b.term)),
    [q],
  );

  return (
    <div className="reference">
      <div className="ref-search">
        <input type="search" placeholder="Search rules (e.g. stunned, parry, fear)" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search rules" />
      </div>

      {!q && (
        <nav className="ref-toc" aria-label="Sections">
          <a href="#ref-calc">Calculator</a>
          {QR.sections.map((s) => (
            <a key={s.id} href={`#ref-${s.id}`}>
              {s.title}
            </a>
          ))}
          <a href="#ref-spells">Spells</a>
          <a href="#ref-glossary">Weapon rules</a>
        </nav>
      )}

      {!q && <Calculator roster={roster} wb={wb} computed={computed} />}

      {sections.map(({ s, blocks }) => (
        <details key={s.id} id={`ref-${s.id}`} className="ref-section" open={!!q || undefined}>
          <summary>
            <span>{s.title}</span>
            {s.summary && <small>{s.summary}</small>}
          </summary>
          <div className="ref-body">
            {blocks.map((b, i) => (
              <BlockView key={i} b={b} q={q} />
            ))}
          </div>
        </details>
      ))}

      <SpellsRef q={q} defaultSchool={roster && wb ? schoolFor(wb.fighters.find((f) => f.spellcaster && roster.entries.some((e) => e.typeId === f.id))?.spellcaster ?? wb.fighters.find((f) => f.spellcaster)?.spellcaster)?.id : undefined} />

      {terms.length > 0 && (
        <details id="ref-glossary" className="ref-section" open={!!q || undefined}>
          <summary>
            <span>Weapon &amp; armour rules</span>
            <small>{terms.length} keywords from the equipment sheet</small>
          </summary>
          <dl className="glossary">
            {terms.map((t) => (
              <div key={t.term}>
                <dt>{rich(t.term, q)}</dt>
                <dd>{rich(t.text, q)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {q && sections.length === 0 && terms.length === 0 && !SPELL_SCHOOLS.some((sc) => sc.spells.some((sp) => `${sc.name} ${sp.name} ${sp.text}`.toLowerCase().includes(q))) && <p className="muted empty">Nothing matches "{query}".</p>}
    </div>
  );
}

function SpellsRef({ q, defaultSchool }: { q: string; defaultSchool?: string }) {
  const [school, setSchool] = useState(defaultSchool ?? SPELL_SCHOOLS[0]?.id ?? '');
  const lists = q
    ? SPELL_SCHOOLS.map((sc) => ({ sc, spells: sc.spells.filter((sp) => `${sc.name} ${sp.name} ${sp.text}`.toLowerCase().includes(q)) })).filter((x) => x.spells.length)
    : SPELL_SCHOOLS.filter((sc) => sc.id === school).map((sc) => ({ sc, spells: sc.spells }));
  if (q && lists.length === 0) return null;
  return (
    <details id="ref-spells" className="ref-section" open={!!q || undefined}>
      <summary>
        <span>Spells &amp; prayers</span>
        <small>{SPELL_SCHOOLS.length} lists · difficulty is rolled on 2d6 (working rule)</small>
      </summary>
      {!q && (
        <div className="school-pick">
          <select value={school} onChange={(e) => setSchool(e.target.value)} aria-label="Spell list">
            {SPELL_SCHOOLS.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name} ({sc.spells.length})
              </option>
            ))}
          </select>
        </div>
      )}
      {lists.map(({ sc, spells }) => (
        <div key={sc.id}>
          {(q || sc.notes) && (
            <p className="ref-body muted small" style={{ paddingTop: 10 }}>
              {q && <b>{sc.name}. </b>}
              {sc.notes}
            </p>
          )}
          {spells.length === 0 ? (
            <p className="ref-body muted">This list isn't in the source PDF.</p>
          ) : (
            <ul className="spell-ref" style={{ paddingTop: 10 }}>
              {spells.map((sp) => (
                <li key={sp.name}>
                  <div className="spell-title">
                    <span>
                      {sp.roll ? `${sp.roll}. ` : ''}
                      {rich(sp.name, q)}
                    </span>
                    <span className="diff">Diff {sp.difficulty}</span>
                  </div>
                  <p>{rich(sp.text, q)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </details>
  );
}
