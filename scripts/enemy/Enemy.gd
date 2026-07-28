extends CharacterBody3D
class_name Enemy
## Basic robot enemy AI: detects the player within a radius, closes the
## distance, and attacks in melee range. Intentionally simple - this is
## the base every future enemy (elites, and eventually bosses like
## Octopa or Leila) can extend or compose new behavior on top of.
## Swap _chase() for a NavigationAgent3D once levels have real
## obstacles; the IDLE/CHASE/ATTACK state machine won't need to change.

@export var move_speed: float = 3.0
@export var deceleration: float = 20.0
@export var detection_radius: float = 12.0
@export var attack_range: float = 2.0
@export var attack_damage: float = 10.0
@export var attack_cooldown: float = 1.2
@export var player_path: NodePath
@export var objective_id_on_death: String = ""

@onready var health: Health = $Health
@onready var attack_hitbox: Hitbox = $AttackHitbox

var _player: Node3D
var _attack_timer: float = 0.0
var _gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")

enum State { IDLE, CHASE, ATTACK, DEAD }
var _state: State = State.IDLE

func _ready() -> void:
	if player_path != NodePath():
		_player = get_node(player_path)
	health.died.connect(_on_died)
	attack_hitbox.damage = attack_damage

func _physics_process(delta: float) -> void:
	if _state == State.DEAD:
		return
	if not is_on_floor():
		velocity.y -= _gravity * delta

	if _attack_timer > 0.0:
		_attack_timer -= delta

	if _player:
		_update_state()

	match _state:
		State.CHASE:
			_chase()
		State.ATTACK:
			_attack(delta)
		_:
			velocity.x = move_toward(velocity.x, 0.0, deceleration * delta)
			velocity.z = move_toward(velocity.z, 0.0, deceleration * delta)

	move_and_slide()

func _update_state() -> void:
	var distance := global_position.distance_to(_player.global_position)
	if distance <= attack_range:
		_state = State.ATTACK
	elif distance <= detection_radius:
		_state = State.CHASE
	else:
		_state = State.IDLE

func _chase() -> void:
	var direction := _player.global_position - global_position
	direction.y = 0.0
	direction = direction.normalized()
	velocity.x = direction.x * move_speed
	velocity.z = direction.z * move_speed
	if direction.length() > 0.0:
		look_at(global_position + direction, Vector3.UP)

func _attack(delta: float) -> void:
	velocity.x = move_toward(velocity.x, 0.0, deceleration * delta)
	velocity.z = move_toward(velocity.z, 0.0, deceleration * delta)
	var face_dir := _player.global_position - global_position
	face_dir.y = 0.0
	if face_dir.length() > 0.0:
		look_at(global_position + face_dir.normalized(), Vector3.UP)
	if _attack_timer <= 0.0:
		_attack_timer = attack_cooldown
		_do_attack()

func _do_attack() -> void:
	attack_hitbox.active = true
	await get_tree().create_timer(0.2).timeout
	if is_instance_valid(attack_hitbox):
		attack_hitbox.active = false

func _on_died() -> void:
	_state = State.DEAD
	velocity = Vector3.ZERO
	set_physics_process(false)
	if not objective_id_on_death.is_empty():
		MissionManager.complete_objective(objective_id_on_death)
	# Placeholder death feedback - swap for animation/VFX/loot drop later.
	var tween := create_tween()
	tween.tween_property(self, "scale", Vector3.ZERO, 0.4)
	tween.tween_callback(queue_free)
