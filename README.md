# d12heim Warband Builder

Builds a legal 500gc starting warband for the d12heim homebrew Mordheim rules. Runs in the browser and saves rosters in local storage, with JSON export/import and a printable landscape roster.

**Live:** https://noltari13.github.io/d12heim-builder/ (deploys from `main` via GitHub Actions)

Run it locally: `npm install`, then `npm run dev` (http://localhost:3000). `npm run build` makes a static site in `dist/`.

## What it applies

- Group ruling: WS, BS, S, T, I double; M, W, A, Ld don't. AP 1 if doubled S is 8+.
- Prices come from Equipment.xlsx (`src/data/equipment.json`). Warband-list names map to sheet items by exact name, then by the sheet's RaW column ("Light armour" → Gambeson/Leather, "Halberd" → Polearm, "Double-handed weapon" → the four 2H weapons). Rare substitutes are hidden unless toggled on (when a list item has no common substitute, the cheapest is offered, e.g. Heavy armour → Plate). Items not on the sheet use the warband-list price and are flagged.
- Weapon S: "User" = doubled S, "User +n" = doubled S + n, a static S doubles. Weapon AP adds to the model's AP. AV stacks; save = 13 − AV + AP.
- Every warrior has a free dagger; buying a Dagger adds a second one.
- Checks: budget, min/max models, max 6 heroes, per-type limits, henchman groups of 1-5, S7 for plate/tower shield, two-handed + shield, more than 2 weapons of a kind.

## Data

- `src/data/warbands/*.json`: one file per warband with original d6 profiles (see `src/data/WARBAND_SCHEMA.md`). Add a warband by writing a file and importing it in `src/data/index.ts`.
- `src/data/equipment.json`: generated from `../mordheim/Equipment.xlsx`.

Campaign tracking (experience, injuries, advances, treasury) is planned for v2. The data already keeps `startingExp` per fighter type ready for it.
