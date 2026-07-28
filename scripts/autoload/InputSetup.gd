extends Node
## InputSetup (autoload)
## Registers every custom input action in code instead of relying on
## hand-edited InputMap entries in project.godot. This keeps controls
## easy to read and extend - add a new line here when a new ability
## (block, sprint-attack, item wheel, etc.) needs its own binding.

func _ready() -> void:
	_add_key_action("move_forward", [KEY_W])
	_add_key_action("move_back", [KEY_S])
	_add_key_action("move_left", [KEY_A])
	_add_key_action("move_right", [KEY_D])
	_add_key_action("run", [KEY_SHIFT])
	_add_key_action("jump", [KEY_SPACE])
	_add_key_action("dodge", [KEY_CTRL])
	_add_key_action("interact", [KEY_E])
	_add_key_action("pause", [KEY_ESCAPE])
	_add_mouse_action("attack_melee", MOUSE_BUTTON_LEFT)
	_add_mouse_action("attack_ranged", MOUSE_BUTTON_RIGHT)

func _add_key_action(action_name: String, keys: Array) -> void:
	if InputMap.has_action(action_name):
		return
	InputMap.add_action(action_name)
	for key in keys:
		var event := InputEventKey.new()
		event.physical_keycode = key
		InputMap.action_add_event(action_name, event)

func _add_mouse_action(action_name: String, button_index: int) -> void:
	if InputMap.has_action(action_name):
		return
	InputMap.add_action(action_name)
	var event := InputEventMouseButton.new()
	event.button_index = button_index
	InputMap.action_add_event(action_name, event)
