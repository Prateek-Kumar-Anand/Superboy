extends Node
## Codex (autoload)
## Tracks discovered lore/story clues found in chests, terminals, and
## future side missions. No UI screen yet - this just records entries
## and emits a signal so a Codex menu can be built later without
## changing how clues get discovered and registered.

signal clue_discovered(id: String, title: String)

var _clues: Dictionary = {} # id -> {title, text}

func register_clue(id: String, title: String, text: String) -> void:
	if _clues.has(id):
		return
	_clues[id] = {"title": title, "text": text}
	clue_discovered.emit(id, title)
	print("Codex entry unlocked: ", title)

func has_clue(id: String) -> bool:
	return _clues.has(id)

func get_all_clues() -> Dictionary:
	return _clues
