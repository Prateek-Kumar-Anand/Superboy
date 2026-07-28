extends Node
## GameManager (autoload)
## Thin global coordinator. Keep this small - it's a lookup point for
## "who is the player" and coarse game state, not a place for gameplay
## logic. Missions, save/load, and level transitions can build on top of
## this later without every other system needing to change.

var player: Player
var current_location: String = "Test Arena"

func register_player(p: Player) -> void:
	player = p

func is_player_alive() -> bool:
	return player != null and not player.health.is_dead()
