extends Area3D
class_name Hurtbox
## Represents a damageable region. Point health_path at the owning
## entity's Health node. Any Hitbox that overlaps this area (and whose
## layer is included in this area's collision_mask) applies its damage
## automatically - see the collision layer table in README.md.

@export var health_path: NodePath
var _health: Health

func _ready() -> void:
	if health_path != NodePath():
		_health = get_node(health_path) as Health
	area_entered.connect(_on_area_entered)

func _on_area_entered(area: Area3D) -> void:
	if area is Hitbox:
		apply_damage((area as Hitbox).damage)

func apply_damage(amount: float) -> void:
	if _health:
		_health.take_damage(amount)
