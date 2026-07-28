extends Area3D
class_name Chest
## Hidden-chest interactable. Holds a small weighted loot table and
## grants one entry to the player's Inventory the first time it's
## opened, plus an optional lore clue registered with the Codex. Reuse
## this same node for every hidden chest across every level - only the
## loot_table/lore fields change per instance.

signal opened

@export var loot_table: Array = [] # Array[Item]
@export var loot_weights: Array = [] # Array[float], parallel to loot_table
@export var lore_clue_id: String = ""
@export var lore_clue_title: String = ""
@export var lore_clue_text: String = ""

var _opened: bool = false

func _ready() -> void:
	add_to_group("interactable")
	monitoring = false
	monitorable = true

func get_interact_prompt() -> String:
	return "Opened" if _opened else "Open Chest"

func interact(_actor: Node) -> void:
	if _opened:
		return
	_opened = true
	opened.emit()
	if not lore_clue_id.is_empty():
		Codex.register_clue(lore_clue_id, lore_clue_title, lore_clue_text)
	var item: Item = _pick_weighted_item()
	if item:
		Inventory.add_item(item, 1)

func _pick_weighted_item() -> Item:
	if loot_table.is_empty():
		return null
	var total := 0.0
	for w in loot_weights:
		total += w
	if total <= 0.0:
		return loot_table[0]
	var roll := randf() * total
	var running := 0.0
	for i in loot_table.size():
		running += loot_weights[i] if i < loot_weights.size() else 1.0
		if roll <= running:
			return loot_table[i]
	return loot_table[loot_table.size() - 1]
