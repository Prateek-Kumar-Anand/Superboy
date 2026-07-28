extends StaticBody3D
class_name PowerDoor
## Locked door/vault that opens once every terminal listed in
## required_terminals has been activated. Swap the tween-based lift
## below for a real slide/rise animation once art exists - the unlock
## logic itself won't need to change.

@export var required_terminals: Array = [] # Array[NodePath]
@export var open_height: float = 4.0
@export var open_duration: float = 0.6
@export var objective_id: String = ""

var _terminals: Array = []
var _unlocked: bool = false

func _ready() -> void:
	for path in required_terminals:
		var terminal := get_node(path) as PowerTerminal
		if terminal:
			_terminals.append(terminal)
			terminal.activated.connect(_check_unlock)

func _check_unlock() -> void:
	if _unlocked or _terminals.is_empty():
		return
	for terminal in _terminals:
		if not terminal.is_activated:
			return
	_unlock()

func _unlock() -> void:
	_unlocked = true
	collision_layer = 0
	collision_mask = 0
	var tween := create_tween()
	tween.tween_property(self, "position:y", position.y + open_height, open_duration)
	if not objective_id.is_empty():
		MissionManager.complete_objective(objective_id)
