# Warband data schema

One JSON file per warband in `src/data/warbands/<id>.json`. Profiles are the ORIGINAL d6 Mordheim values exactly as printed in the warband PDF; the app doubles WS, BS, S, T, I itself. Do not double anything.

```json
{
  "id": "undead",
  "name": "Undead",
  "source": "Undead.pdf",
  "startingGold": 500,
  "minModels": 3,
  "maxModels": 15,
  "specialRules": [{ "name": "Rule name", "text": "Short rules text, no lore." }],
  "equipmentLists": [
    {
      "id": "main",
      "name": "Undead equipment list",
      "usedBy": "Who uses it, as printed (e.g. 'Vampire, Necromancer, Dregs')",
      "items": [
        { "name": "Dagger", "category": "melee", "listCost": 2, "note": "1st free" },
        { "name": "Double-handed weapon", "category": "melee", "listCost": 15 }
      ]
    }
  ],
  "fighters": [
    {
      "id": "vampire",
      "name": "Vampire",
      "kind": "hero",
      "cost": 110,
      "min": 1,
      "max": 1,
      "startingExp": 20,
      "profile": { "M": 6, "WS": 4, "BS": 4, "S": 4, "T": 4, "W": 2, "I": 5, "A": 2, "Ld": 8 },
      "equipmentList": "main",
      "isLeader": true,
      "spellcaster": null,
      "skills": ["Combat", "Academic", "Strength", "Speed"],
      "fixedEquipment": [],
      "specialRules": [{ "name": "Leader", "text": "..." }],
      "notes": ""
    }
  ],
  "spells": { "listName": "Necromancy", "usedBy": ["necromancer"] },
  "conversionNotes": ["Any d6-to-d12 judgement calls or text you could not resolve."]
}
```

Field rules:
- `kind`: "hero" or "henchman". Henchmen are bought in groups of 1-5 identical models; `min`/`max` on a henchman are the warband-wide model limits for that type (use null for "any number").
- `equipmentList`: id (or array of ids) of the list(s) that fighter buys from, or null if it cannot buy equipment (e.g. animals). `fixedEquipment` lists gear it always has (names), for animals put "Natural weapons" style notes here.
- `category`: one of melee, missile, armour, misc.
- `listCost`: the gc cost printed in the warband list (number). If the cost has a dice part like "35 + 2D6", put the base number in listCost and the full text in `note`.
- `spellcaster`: null, or the spell list name (e.g. "Necromancy", "Chaos Rituals", "Magic of the Horned Rat").
- `skills`: the skill tables that fighter can use (heroes only; [] for henchmen).
- `specialRules`: keep text short and mechanical; replace any "on a 6" / "4+" d6 wording with the d12 equivalent using these conversions: natural 6 -> natural 12, 5-6 -> 9-12, 4+ -> 7+, 3+ -> 5+, 2+ -> 3+. Record each such conversion in `conversionNotes`.
- Include every fighter type and every equipment list in the PDF (some warbands have separate hero and henchman lists, or extra lists for specific fighters).
- Hired swords, dramatis personae and campaign-only content are out of scope.
