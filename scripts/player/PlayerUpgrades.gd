extends Node
class_name PlayerUpgrades
## Applies "upgrade" type items to the player's combat stats the
## moment they land in the inventory, then consumes them. This is the
## first hook for the upgrade tree described in the GDD - swap the
## flat bonuses below for a real upgrade-tree UI once there's more
## than one tier of upgrade.

@export var combat_path: NodePath
@export var melee_damage_bonus: float = 10.0
@export var ranged_damage_bonus: float = 5.0

var _combat: PlayerCombat
var _applied_ids: Dictionary = {}

func _ready() -> void:
	if combat_path != NodePath():
		_combat = get_node(combat_path) as PlayerCombat
	Inventory.inventory_changed.connect(_on_inventory_changed)

func _on_inventory_changed() -> void:
	for entry in Inventory.get_all_items():
		var item: Item = entry["item"]
		if item.item_type == "upgrade" and not _applied_ids.has(item.id) and Inventory.get_count(item.id) > 0:
			_apply_upgrade(item)

func _apply_upgrade(item: Item) -> void:
	_applied_ids[item.id] = true
	if _combat:
		_combat.melee_damage += melee_damage_bonus
		_combat.ranged_damage += ranged_damage_bonus
	Inventory.remove_item(item.id, Inventory.get_count(item.id))
	print("Upgrade applied: ", item.display_name)
