extends Node
## MissionManager (autoload)
## Tracks an ordered list of objectives for the current vertical slice
## and shows the active one via a signal. Any interactable/enemy can
## complete an objective by id (see Enemy.objective_id_on_death and
## PowerDoor.objective_id) without knowing about this script directly.

signal objective_updated(text: String)
signal mission_complete

var _objectives: Array = [
	{"id": "vault", "text": "Power the vault terminals", "complete": false},
	{"id": "boss", "text": "Defeat Octopa", "complete": false},
]

func _ready() -> void:
	_emit_current()

func complete_objective(id: String) -> void:
	for o in _objectives:
		if o["id"] == id and not o["complete"]:
			o["complete"] = true
			_emit_current()
			return

func _emit_current() -> void:
	for o in _objectives:
		if not o["complete"]:
			objective_updated.emit(o["text"])
			return
	mission_complete.emit()
