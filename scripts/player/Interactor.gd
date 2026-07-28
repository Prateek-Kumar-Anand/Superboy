extends Area3D
class_name Interactor
## Detects nearby Interactable objects (anything in the "interactable"
## group implementing interact(actor) and, optionally,
## get_interact_prompt()) and lets the player trigger the closest one
## with the "interact" action. Chests, power terminals, and future NPCs
## just need to join the "interactable" group to be reachable - this
## script never needs to know about specific interactable types.

signal interactable_in_range(prompt: String)
signal interactable_out_of_range

var _nearby: Array = []

func _ready() -> void:
	area_entered.connect(_on_entered)
	area_exited.connect(_on_exited)

func _on_entered(node: Node) -> void:
	if node.is_in_group("interactable") and node not in _nearby:
		_nearby.append(node)
		_update_prompt()

func _on_exited(node: Node) -> void:
	if node in _nearby:
		_nearby.erase(node)
		_update_prompt()

func _update_prompt() -> void:
	if _nearby.is_empty():
		interactable_out_of_range.emit()
		return
	var target = _nearby[0]
	var prompt: String = target.get_interact_prompt() if target.has_method("get_interact_prompt") else "Interact"
	interactable_in_range.emit(prompt)

func _process(_delta: float) -> void:
	if _nearby.is_empty():
		return
	if Input.is_action_just_pressed("interact"):
		var target = _nearby[0]
		if target.has_method("interact"):
			target.interact(get_parent())
			_update_prompt()
