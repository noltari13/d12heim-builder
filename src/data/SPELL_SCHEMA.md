# Spell list schema

One JSON file per school in `src/data/spells/<id>.json`:

```json
{
  "id": "necromancy",
  "name": "Necromancy",
  "aliases": ["Necromancy"],
  "kind": "magic",
  "source": "d12heim Rulebook p.62",
  "notes": "Short, rules-only notes that apply to the whole list (e.g. who uses it, prayers can't be used in armour). Optional.",
  "spells": [
    { "roll": "1", "name": "Lifestealer", "difficulty": "10", "text": "Short mechanical text in d12 terms." }
  ]
}
```

- `aliases`: every `spellcaster` string the warband files use for this school, exactly (the app matches on these). Required values are given in your task.
- `kind`: "magic", "prayer" or "ritual".
- `roll`: the table result as printed ("1", "2", ... or "11-12" for 2D6 tables); "" if the list has no roll table.
- `difficulty`: as printed ("7", "Auto", "-"); casting dice are an open question in d12heim (working rule: 2d6 vs difficulty), so do NOT convert difficulties.
- `text`: no lore. Convert to d12heim: Strength values of hits double (S3 hit -> S6), characteristic bonuses/penalties to WS/BS/S/T/I double (+1 S -> +2 S), M/W/A/Ld modifiers do not double. Dice rolls: natural 6 -> natural 12, 6+ -> natural 12, 5+ -> 9+, 4+ -> 7+, 3+ -> 5+, 2+ -> 3+, a roll of 1 -> 1-2. Leave D3/D6 quantity rolls (number of hits, inches, wounds) as written. Ranges in inches unchanged.
- Note any judgement call at the end of `notes`.
