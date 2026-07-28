extends Enemy
class_name Octopa
## First boss encounter: extends the base Enemy chase/attack state
## machine (IDLE/CHASE/ATTACK/DEAD) rather than duplicating it, and
## adds an attack-pattern cycle across multiple hitboxes plus a single
## phase transition at half health. Later bosses (Leila, Warrhentus,
## Sealduckhehachi, the final AI) can follow this same shape: override
## _do_attack() for their own pattern, connect to health.health_changed
## for phase logic.

@export var left_arm_path: NodePath
@export var right_arm_path: NodePath
@export var phase_2_health_percent: float = 0.5
@export var phase_2_speed_multiplier: float = 1.4
@export var phase_2_cooldown_multiplier: float = 0.6

var _arms: Array = []
var _attack_index: int = 0
var _in_phase_2: bool = false

func _ready() -> void:
	super._ready()
	if left_arm_path != NodePath():
		_arms.append(get_node(left_arm_path))
	if right_arm_path != NodePath():
		_arms.append(get_node(right_arm_path))
	# The base class's AttackHitbox doubles as this boss's third
	# ("slam") attack, so all three patterns share one cycle.
	_arms.append(attack_hitbox)
	health.health_changed.connect(_on_health_changed)

func _on_health_changed(current: float, max_value: float) -> void:
	if _in_phase_2 or max_value <= 0.0:
		return
	if current / max_value <= phase_2_health_percent:
		_enter_phase_2()

func _enter_phase_2() -> void:
	_in_phase_2 = true
	move_speed *= phase_2_speed_multiplier
	attack_cooldown *= phase_2_cooldown_multiplier
	print("Octopa enters phase 2")

func _do_attack() -> void:
	if _arms.is_empty():
		super._do_attack()
		return
	var hitbox: Hitbox = _arms[_attack_index % _arms.size()]
	_attack_index += 1
	hitbox.active = true
	await get_tree().create_timer(0.2).timeout
	if is_instance_valid(hitbox):
		hitbox.active = false
