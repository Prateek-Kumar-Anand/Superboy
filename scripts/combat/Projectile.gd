extends Area3D
class_name Projectile
## Simple forward-flying projectile for ranged weapons. Spawned by
## PlayerCombat.gd (and, later, ranged enemy/boss attacks) already
## facing the right direction - it just flies straight until it hits
## something or times out.

@export var speed: float = 30.0
@export var damage: float = 15.0
@export var lifetime: float = 3.0

var _life_timer: float = 0.0

func _ready() -> void:
	area_entered.connect(_on_area_entered)
	body_entered.connect(_on_body_entered)

func _physics_process(delta: float) -> void:
	position += -transform.basis.z * speed * delta
	_life_timer += delta
	if _life_timer >= lifetime:
		queue_free()

func _on_area_entered(area: Area3D) -> void:
	if area is Hurtbox:
		(area as Hurtbox).apply_damage(damage)
		queue_free()

func _on_body_entered(_body: Node) -> void:
	# Hit a wall/floor/other solid body - just despawn.
	queue_free()
