extends Node
class_name Health
## Reusable health component. Attach as a child node to anything that
## can take damage (Player, Enemy, destructible props, future bosses).
## Combat code should only ever talk to this node - never touch HP
## directly on the parent - so damage sources stay swappable.

signal health_changed(current: float, max: float)
signal damaged(amount: float)
signal died

@export var max_health: float = 100.0
@export var invulnerable: bool = false
@export var invulnerability_time: float = 0.0 ## seconds of i-frames applied automatically after every hit

var current_health: float
var _invuln_timer: float = 0.0

func _ready() -> void:
	current_health = max_health

func _process(delta: float) -> void:
	if _invuln_timer > 0.0:
		_invuln_timer -= delta

func is_invulnerable() -> bool:
	return invulnerable or _invuln_timer > 0.0

func take_damage(amount: float) -> void:
	if is_invulnerable() or current_health <= 0.0:
		return
	current_health = max(current_health - amount, 0.0)
	damaged.emit(amount)
	health_changed.emit(current_health, max_health)
	if invulnerability_time > 0.0:
		_invuln_timer = invulnerability_time
	if current_health <= 0.0:
		died.emit()

func start_invulnerability(duration: float) -> void:
	# Manual i-frame trigger for things like a dodge roll, separate from
	# the automatic post-hit i-frames above.
	_invuln_timer = max(_invuln_timer, duration)

func heal(amount: float) -> void:
	if current_health <= 0.0:
		return
	current_health = min(current_health + amount, max_health)
	health_changed.emit(current_health, max_health)

func is_dead() -> bool:
	return current_health <= 0.0

func get_percent() -> float:
	return current_health / max_health if max_health > 0.0 else 0.0
