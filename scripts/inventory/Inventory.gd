extends Node
## Inventory (autoload)
## Global inventory. Tracks collected items (from chests, drops, quest
## rewards) as simple id -> count pairs, plus the full Item resources
## for anything that needs display data (icon, name, type). The
## weapon/upgrade system planned for later phases builds on top of this.

signal inventory_changed

var _counts: Dictionary = {} # item_id -> int
var _known_items: Dictionary = {} # item_id -> Item

func add_item(item: Item, amount: int = 1) -> void:
	_known_items[item.id] = item
	_counts[item.id] = _counts.get(item.id, 0) + amount
	inventory_changed.emit()

func remove_item(item_id: String, amount: int = 1) -> void:
	if not _counts.has(item_id):
		return
	_counts[item_id] = max(_counts[item_id] - amount, 0)
	if _counts[item_id] == 0:
		_counts.erase(item_id)
	inventory_changed.emit()

func get_count(item_id: String) -> int:
	return _counts.get(item_id, 0)

func get_all_items() -> Array:
	var result: Array = []
	for id in _counts.keys():
		result.append({
			"item": _known_items[id],
			"count": _counts[id],
		})
	return result
