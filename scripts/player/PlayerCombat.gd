extends Node
class_name PlayerCombat
## Handles the player's melee and ranged attacks. Kept separate from
## Player.gd so combat can grow (combos, weapon switching, upgrades)
## without bloating the movement controller.

@export var melee_hitbox_path: NodePath
@export var muzzle_path: NodePath
@export var projectile_scene: PackedScene

@export var melee_damage: float = 20.0
@export var melee_active_time: float = 0.15
@export var melee_cooldown: float = 0.5
@export var ranged_damage: float = 15.0
@export var ranged_cooldown: float = 0.4

var _melee_hitbox: Hitbox
var _muzzle: Node3D
var _melee_timer: float = 0.0
var _ranged_timer: float = 0.0

func _ready() -> void:
	if melee_hitbox_path != NodePath():
		_melee_hitbox = get_node(melee_hitbox_path) as Hitbox
		_melee_hitbox.damage = melee_damage
	if muzzle_path != NodePath():
		_muzzle = get_node(muzzle_path) as Node3D

func _process(delta: float) -> void:
	if _melee_timer > 0.0:
		_melee_timer -= delta
	if _ranged_timer > 0.0:
		_ranged_timer -= delta

	if Input.is_action_just_pressed("attack_melee") and _melee_timer <= 0.0:
		_do_melee_attack()
	if Input.is_action_just_pressed("attack_ranged") and _ranged_timer <= 0.0:
		_do_ranged_attack()

func _do_melee_attack() -> void:
	_melee_timer = melee_cooldown
	if not _melee_hitbox:
		return
	_melee_hitbox.active = true
	await get_tree().create_timer(melee_active_time).timeout
	if is_instance_valid(_melee_hitbox):
		_melee_hitbox.active = false

func _do_ranged_attack() -> void:
	_ranged_timer = ranged_cooldown
	if not projectile_scene or not _muzzle:
		return
	var projectile := projectile_scene.instantiate()
	get_tree().current_scene.add_child(projectile)
	projectile.global_transform = _muzzle.global_transform
	if "damage" in projectile:
		projectile.damage = ranged_damage
