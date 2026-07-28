extends Area3D
class_name Pickup
## Simple world pickup that adds an Item to the global Inventory when
## the player walks through it. Hidden chests (Phase 3) can reuse this
## same node - just swap the mesh/collision and drop in different Items.

@export var item: Item
@export var amount: int = 1

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func _on_body_entered(body: Node) -> void:
	if body is Player and item:
		Inventory.add_item(item, amount)
		queue_free()
