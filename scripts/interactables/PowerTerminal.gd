extends Area3D
class_name PowerTerminal
## One switch in a power-rerouting puzzle. Interact to activate it;
## link a group of these to a PowerDoor's required_terminals to gate
## progress until all of them are on - matches the Abandoned Africa
## City "power-rerouting puzzle" from the GDD.

signal activated

var is_activated: bool = false

func _ready() -> void:
	add_to_group("interactable")
	monitoring = false
	monitorable = true

func get_interact_prompt() -> String:
	return "Powered" if is_activated else "Activate Terminal"

func interact(_actor: Node) -> void:
	if is_activated:
		return
	is_activated = true
	activated.emit()
