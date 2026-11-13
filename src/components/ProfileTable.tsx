import { STAT_KEYS, type Profile } from '../types';
import { DOUBLED, baseAP } from '../logic/stats';

export function ProfileTable({ p12 }: { p12: Profile }) {
  return (
    <table className="profile">
      <thead>
        <tr>
          {STAT_KEYS.map((k) => (
            <th key={k} className={DOUBLED.has(k) ? 'dbl' : ''} title={DOUBLED.has(k) ? 'Doubled for d12' : 'Not doubled'}>
              {k}
            </th>
          ))}
          <th title="Armour piercing from Strength 8+">AP</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          {STAT_KEYS.map((k) => (
            <td key={k}>{p12[k]}</td>
          ))}
          <td>{baseAP(p12)}</td>
        </tr>
      </tbody>
    </table>
  );
}
