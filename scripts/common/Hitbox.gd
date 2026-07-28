extends Area3D
class_name Hitbox
## Represents an active damage source: a sword swing, a bullet, a claw
## swipe, a boss slam. Enable it briefly during an attack (see
## PlayerCombat.gd / Enemy.gd), or leave it always-on for
## contact-damage enemies. Off by default so nothing deals damage
## before an attack script explicitly turns it on.

@export var damage: float = 10.0
@export var knockback: float = 0.0
@export var active: bool = false:
	set(value):
		active = value
		monitoring = value
		monitorable = value

func _ready() -> void:
	monitoring = active
	monitorable = active
