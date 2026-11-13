# Warband equipment schema

`src/data/warband-equipment/*.json` hold d12heim stats for weapons and armour that appear in warband lists but not in Equipment.xlsx. Each file is an array of items with the same columns as the sheet:

```json
{
  "name": "Weeping Blades",
  "aliases": [],
  "category": "melee",
  "warbands": ["skaven"],
  "costText": "50",
  "cost": 50,
  "availability": "Rare 9",
  "strength": "User",
  "hands": "2",
  "range": null,
  "av": null,
  "rules": "+1 AP, Parry (1), Pair (+1 attack), Warpstone: +1 to wound",
  "basis": "Pair of swords in the book: Parry like Sword; AP from Sword (0) +1 for warpstone edge.",
  "reviewed": false
}
```

- `name`: exactly as printed in the warband list (the app matches on name and `aliases`, case-insensitive).
- `category`: melee, missile or armour.
- `costText`/`cost`: the warband list price (the sheet has none). Dice costs: `costText` "35+2D6", `cost` 35.
- `strength`: in the sheet's form, NOT doubled: "User", "User +1", "User -1", or a static number as printed in the book ("4" for a S4 gun; the app doubles static values). Armour: null.
- `hands`: "1" or "2" for melee; null otherwise. `range`: e.g. "24\"" for missile; null otherwise. `av`: armour value for armour (Light 1-2, Chainmail 3, Heavy/Plate 4, shields Buckler 1 / Small 2 / Large 3); null otherwise.
- `rules`: comma-separated keywords in the sheet's vocabulary where they fit: "+N AP", "Parry (n)", "Reload (n)", "Steady Aim (move or shoot)", "Unwieldy (no dual wield, shield ok)", "Strike first", "Strike last", "H2H", "Skirmish (no pen move)", "Double Shot", "Extra Stun", "+1 Crit result", "Need a 7 Strength". Then any other rule in short d12 terms. AP must appear as "+N AP" here when non-zero.
- AP guide (match the sheet): Sword/Axe/Spear/Dagger 0 (Axe gets "+1 Crit result"), Mace/Hammer +1 or Extra Stun, Flail +1, 2H weapons +3 (2H Mace +4), Polearm +3, Short bow/Bow/Long bow 0, Crossbow +1, Pistol +3, Handgun +4, Long rifle +4, Blunderbuss 0. Book "-1 save modifier" with no sheet analogue: +1 AP; "-2": +3; "-3": +4.
- Convert d6 numbers per the group rulings (natural 6 -> natural 12, 6+ -> natural 12, 5+ -> 9+, 4+ -> 7+, 3+ -> 5+, 2+ -> 3+, a roll of 1 -> 1-2). WS/BS/S/T/I modifiers double (+1 S from a skill -> +2), but weapon "User +n" strength bonuses do not.
- `basis`: one sentence on which sheet item you modelled it on and why, so the group can review.
- `reviewed`: always false (the group flips it after checking).
