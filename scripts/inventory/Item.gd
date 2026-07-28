extends Resource
class_name Item
## Base data for anything that can sit in the inventory: weapons,
## upgrade materials, rare items, key story items found in chests.
## Create new .tres files from this to define each item (see
## resources/items/scrap_metal.tres for an example).

@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""
@export var icon: Texture2D
@export_enum("weapon", "upgrade", "key_item", "material") var item_type: String = "material"
@export var stackable: bool = true
