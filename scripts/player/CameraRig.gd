extends Node3D
class_name CameraRig
## Third-person follow camera. Follows the target's position every
## physics frame; mouse motion rotates this node (yaw) and the
## SpringArm3D (pitch) independently of the target's own facing, so the
## player can look around freely while the character turns to face
## movement. SpringArm3D handles wall collision avoidance automatically.

@export var target_path: NodePath
@export var mouse_sensitivity: float = 0.0025
@export var min_pitch_deg: float = -60.0
@export var max_pitch_deg: float = 70.0

@onready var _spring_arm: SpringArm3D = $SpringArm3D
@onready var _target: Node3D = get_node(target_path) as Node3D

var _pitch: float = 0.0

func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	if _target:
		global_position = _target.global_position

func _physics_process(_delta: float) -> void:
	if _target:
		global_position = _target.global_position

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		var motion := event as InputEventMouseMotion
		rotate_y(-motion.relative.x * mouse_sensitivity)
		_pitch = clamp(
			_pitch - motion.relative.y * mouse_sensitivity,
			deg_to_rad(min_pitch_deg),
			deg_to_rad(max_pitch_deg)
		)
		_spring_arm.rotation.x = _pitch

	if event.is_action_pressed("pause"):
		if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		else:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func get_forward_direction() -> Vector3:
	# Flattened (yaw-only) forward direction, used by Player.gd so
	# movement stays camera-relative but always on the ground plane.
	return -global_transform.basis.z
