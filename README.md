# The Last Human — Phase 1 Prototype

A Godot 4 (GDScript) vertical-slice scaffold: third-person movement,
camera, melee + ranged combat, health, basic robot enemy AI, a simple
test arena, and a health/inventory HUD. Built so bosses, upgrades, and
missions can be layered on without restructuring what's here.

## Requirements
- Godot 4.3+ (Forward+ renderer)

## Opening the project
1. Open Godot, choose "Import", and select this folder's `project.godot`.
2. Press F5 (or the Play button) — it runs `scenes/main/TestArena.tscn`.
3. On first open, Godot will auto-generate resource UIDs for the hand-written
   scene/script files — this is normal and only happens once.

## Controls
| Action | Key/Button |
|---|---|
| Move | W A S D |
| Run | Shift |
| Jump | Space |
| Dodge roll | Ctrl |
| Melee attack | Left mouse button |
| Ranged attack | Right mouse button |
| Look around | Mouse motion |
| Free/capture mouse cursor | Esc |

Everything above is registered in code by `scripts/autoload/InputSetup.gd`
rather than hand-edited in `project.godot` — add new actions there.

## Folder structure
```
scenes/
  main/TestArena.tscn      — playable test level (floor, walls, spawns)
  player/Player.tscn        — player body + combat + camera reference
  player/CameraRig.tscn     — third-person spring-arm camera
  enemy/Enemy.tscn          — basic chase/attack robot
  weapons/Projectile.tscn   — ranged attack projectile
  ui/HUD.tscn               — health bar + inventory row
  inventory/Pickup.tscn     — world item pickup (chests can reuse this)
scripts/
  autoload/    — InputSetup, GameManager (global singletons)
  player/      — Player.gd (movement), PlayerCombat.gd, CameraRig.gd
  enemy/       — Enemy.gd (state machine AI)
  common/      — Health.gd, Hitbox.gd, Hurtbox.gd (shared by player/enemy/future bosses)
  combat/      — Projectile.gd
  inventory/   — Item.gd, Inventory.gd, Pickup.gd
  ui/          — HUD.gd
resources/items/ — Item .tres data files (add new items here)
```

## Architecture notes

**Component-based combat.** `Health`, `Hitbox`, and `Hurtbox` are small
reusable nodes, not baked into Player/Enemy scripts. Any future boss or
destructible object gets damage handling just by adding these three
nodes — no shared base class required.

**State machines, not spaghetti.** Both `Player.gd`
(LOCOMOTION/DODGE/DEAD) and `Enemy.gd` (IDLE/CHASE/ATTACK/DEAD) use a
plain enum + match block. Bosses can copy this pattern with more states
(phase transitions, telegraphed attacks) without touching the base
Enemy script.

**Collision layers** (named in Project Settings → Layer Names, and in
`project.godot`'s `[layer_names]` section):

| Layer | Name | Used by |
|---|---|---|
| 1 | World | Ground, walls |
| 2 | Player Body | Player's CharacterBody3D |
| 3 | Enemy Body | Enemy's CharacterBody3D |
| 4 | Player Hitbox | Melee hitbox + projectile |
| 5 | Enemy Hitbox | Enemy attack hitbox |
| 6 | Player Hurtbox | Player's damage-receiving area |
| 7 | Enemy Hurtbox | Enemy's damage-receiving area |

**Cross-node references use exported NodePaths**, wired at the scene
level (e.g. `Player.camera_rig_path`, `Enemy.player_path`), assuming a
flat sibling layout under a common level root — see `TestArena.tscn`
for the convention every new level should follow.

**Inventory is already wired end-to-end.** The `Pickup` in the test
arena hands the player a "Scrap Metal" `Item` on contact, and the HUD
updates live off `Inventory.inventory_changed` — hidden chests in
Phase 3 are the same node with a different mesh/trigger.

## Known placeholders to replace later
- Capsule meshes for Player/Enemy → real character models + animations
- Box meshes for ground/walls → real level geometry
- Label-based inventory row in the HUD → icon-based item slots
- Direct-line enemy chase → `NavigationAgent3D` once levels have obstacles
- `look_at()`-based turning → blended turn animations

## Phase 5 — QA pass
Ran an automated pass over every scene/script (NodePath wiring, `$child`
references, collision layer/mask matrix) — no broken references found.
Since this environment can't launch the Godot editor itself, manual
playtesting is still needed; check these first:
- `RubbleRamp` slope alignment (approximate — nudge in-editor if the
  player doesn't smoothly walk up onto `RubblePlatform`)
- Combat feel/damage numbers, attack cooldowns, dodge i-frame timing
- Octopa's phase-2 trigger and attack cycle (left/right/slam)
1. Tune movement/combat feel (acceleration, attack timing, i-frames)
2. Add a real animated character + attack animations
3. ~~Add the power-rerouting puzzle and hidden chest~~ done in Phase 2 below
4. ~~Give Octopa its own scene extending the Enemy pattern with phases~~ done in Phase 2 below

## Phase 2 additions

**Interact system.** `Player/Interactor` (Area3D, range 2.5m) detects
anything in the `"interactable"` group and lets `E` trigger the
closest one. Any node that implements `interact(actor)` (and,
optionally, `get_interact_prompt()`) works automatically - Chest and
PowerTerminal both use this, and the HUD shows a `[E] ...` prompt via
`Interactor`'s signals. New interactables never need to touch
Interactor.gd itself.

**Hidden chests** (`scripts/interactables/Chest.gd` /
`scenes/interactables/Chest.tscn`). Weighted loot table
(`loot_table` + parallel `loot_weights`) grants an `Item` to
`Inventory` on open; an optional `lore_clue_id/title/text` also
registers a story clue with the new `Codex` autoload. `TestArena.tscn`
has one loot chest and one lore chest as examples.

**Power-rerouting puzzle** (`PowerTerminal.gd` + `PowerDoor.gd`).
Each `PowerTerminal` is a simple on/off interactable; a `PowerDoor`
watches a list of terminal NodePaths (`required_terminals`) and
unlocks (tweens open, drops its collision) once all of them are
activated. See the `PuzzleCluster` group in `TestArena.tscn` for a
two-terminal example gating a reward chest.

**Upgrade hook** (`scripts/player/PlayerUpgrades.gd`). Watches
`Inventory` for `item_type == "upgrade"` items, applies a flat
melee/ranged damage bonus to `PlayerCombat` once, then consumes the
item. The "Damage Core" in the loot chest demonstrates this end to
end - swap the flat bonus for a real upgrade-tree UI later.

**Codex autoload** (`scripts/autoload/Codex.gd`). Tracks discovered
lore clue ids/titles/text and emits `clue_discovered` - no UI screen
yet, entries just print to console. Build a Codex menu against this
signal when you're ready.

**Octopa boss** (`scripts/enemy/bosses/Octopa.gd` /
`scenes/enemy/bosses/Octopa.tscn`). `extends Enemy` and reuses its
whole IDLE/CHASE/ATTACK/DEAD state machine - it only overrides
`_do_attack()` to cycle across three hitboxes (left arm, right arm,
and the base class's hitbox reused as a slam) and adds one phase
transition at 50% health (faster movement + shorter attack cooldown).
Future bosses (Leila, Warrhentus, Sealduckhehachi, the final AI)
should follow the same pattern rather than duplicating Enemy.gd.
