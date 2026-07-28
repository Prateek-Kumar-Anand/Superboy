extends CharacterBody3D
class_name Player
## Core third-person movement controller: walk, run, jump, dodge.
## Combat lives in PlayerCombat.gd, health in the Health component -
## this script only owns movement so each system stays easy to extend
## on its own (new movement abilities won't touch combat code, etc).

@export var walk_speed: float = 4.0
@export var run_speed: float = 8.0
@export var jump_velocity: float = 8.0
@export var acceleration: float = 20.0
@export var friction: float = 20.0
@export var dodge_speed: float = 14.0
@export var dodge_duration: float = 0.25
@export var dodge_cooldown: float = 0.6
@export var dodge_invuln_time: float = 0.2
@export var camera_rig_path: NodePath

@onready var health: Health = $Health
@onready var camera_rig: CameraRig = get_node(camera_rig_path) as CameraRig

@export var respawn_delay: float = 2.0

var _gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var _dodge_timer: float = 0.0
var _dodge_cooldown_timer: float = 0.0
var _dodge_direction: Vector3 = Vector3.ZERO
var _spawn_position: Vector3

enum State { LOCOMOTION, DODGE, DEAD }
var _state: State = State.LOCOMOTION

func _ready() -> void:
	_spawn_position = global_position
	health.died.connect(_on_died)
	GameManager.register_player(self)

func _physics_process(delta: float) -> void:
	if _state == State.DEAD:
		return

	if not is_on_floor():
		velocity.y -= _gravity * delta

	if _dodge_cooldown_timer > 0.0:
		_dodge_cooldown_timer -= delta

	match _state:
		State.LOCOMOTION:
			_handle_locomotion(delta)
		State.DODGE:
			_handle_dodge(delta)

	move_and_slide()

func _handle_locomotion(delta: float) -> void:
	var input_dir := Vector2(
		Input.get_action_strength("move_right") - Input.get_action_strength("move_left"),
		Input.get_action_strength("move_back") - Input.get_action_strength("move_forward")
	)
	if input_dir.length() > 1.0:
		input_dir = input_dir.normalized()

	var cam_forward := camera_rig.get_forward_direction() if camera_rig else -global_transform.basis.z
	cam_forward.y = 0.0
	cam_forward = cam_forward.normalized()
	var cam_right := cam_forward.cross(Vector3.UP)

	var move_dir := cam_forward * -input_dir.y + cam_right * input_dir.x
	if move_dir.length() > 1.0:
		move_dir = move_dir.normalized()

	var is_running := Input.is_action_pressed("run") and move_dir.length() > 0.0
	var target_speed := run_speed if is_running else walk_speed
	var target_velocity := move_dir * target_speed

	if move_dir.length() > 0.0:
		velocity.x = move_toward(velocity.x, target_velocity.x, acceleration * delta)
		velocity.z = move_toward(velocity.z, target_velocity.z, acceleration * delta)
		look_at(global_position + move_dir, Vector3.UP)
	else:
		velocity.x = move_toward(velocity.x, 0.0, friction * delta)
		velocity.z = move_toward(velocity.z, 0.0, friction * delta)

	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = jump_velocity

	if Input.is_action_just_pressed("dodge") and _dodge_cooldown_timer <= 0.0:
		_start_dodge(move_dir)

func _start_dodge(move_dir: Vector3) -> void:
	_state = State.DODGE
	_dodge_timer = dodge_duration
	_dodge_cooldown_timer = dodge_cooldown
	_dodge_direction = move_dir if move_dir.length() > 0.0 else -global_transform.basis.z
	health.start_invulnerability(dodge_invuln_time)

func _handle_dodge(delta: float) -> void:
	velocity.x = _dodge_direction.x * dodge_speed
	velocity.z = _dodge_direction.z * dodge_speed
	_dodge_timer -= delta
	if _dodge_timer <= 0.0:
		_state = State.LOCOMOTION

func _on_died() -> void:
	_state = State.DEAD
	velocity = Vector3.ZERO
	await get_tree().create_timer(respawn_delay).timeout
	_respawn()

func _respawn() -> void:
	global_position = _spawn_position
	health.current_health = health.max_health
	health.health_changed.emit(health.current_health, health.max_health)
	_state = State.LOCOMOTION
