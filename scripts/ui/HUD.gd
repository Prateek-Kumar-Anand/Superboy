extends CanvasLayer
class_name HUD
## Player HUD: health bar, a simple inventory strip, and an interact
## prompt. Subscribes to the Player's Health node, the global
## Inventory autoload, and the Player's Interactor rather than polling
## every frame. The inventory row is label-based for now - swap for
## icon slots once item art exists.

@export var player_health_path: NodePath
@export var interactor_path: NodePath

@onready var _health_bar: ProgressBar = $Control/HealthBar
@onready var _health_label: Label = $Control/HealthBar/HealthLabel
@onready var _inventory_row: HBoxContainer = $Control/InventoryRow
@onready var _interact_prompt: Label = $Control/InteractPrompt
@onready var _objective_label: Label = $Control/ObjectiveLabel
@onready var _mission_complete_label: Label = $Control/MissionCompleteLabel
@onready var _death_overlay: Control = $Control/DeathOverlay

var _health: Health

func _ready() -> void:
	if player_health_path != NodePath():
		_health = get_node(player_health_path) as Health
	if _health:
		_health.health_changed.connect(_on_health_changed)
		_health.died.connect(_on_player_died)
		_on_health_changed(_health.current_health, _health.max_health)

	MissionManager.objective_updated.connect(_on_objective_updated)
	MissionManager.mission_complete.connect(_on_mission_complete)
	_mission_complete_label.visible = false
	_death_overlay.visible = false

	if interactor_path != NodePath():
		var interactor := get_node(interactor_path) as Interactor
		if interactor:
			interactor.interactable_in_range.connect(_on_interactable_in_range)
			interactor.interactable_out_of_range.connect(_on_interactable_out_of_range)
	_interact_prompt.visible = false

	Inventory.inventory_changed.connect(_on_inventory_changed)
	_on_inventory_changed()

func _on_health_changed(current: float, max_value: float) -> void:
	_health_bar.max_value = max_value
	_health_bar.value = current
	_health_label.text = "%d / %d" % [int(current), int(max_value)]

func _on_inventory_changed() -> void:
	for child in _inventory_row.get_children():
		child.queue_free()
	for entry in Inventory.get_all_items():
		var item: Item = entry["item"]
		var count: int = entry["count"]
		var slot := Label.new()
		slot.text = "%s x%d" % [item.display_name, count]
		_inventory_row.add_child(slot)

func _on_interactable_in_range(prompt: String) -> void:
	_interact_prompt.text = "[E] " + prompt
	_interact_prompt.visible = true

func _on_interactable_out_of_range() -> void:
	_interact_prompt.visible = false

func _on_objective_updated(text: String) -> void:
	_objective_label.text = "Objective: " + text

func _on_mission_complete() -> void:
	_objective_label.visible = false
	_mission_complete_label.visible = true

func _on_player_died() -> void:
	_death_overlay.visible = true
	await get_tree().create_timer(2.0).timeout
	_death_overlay.visible = false
