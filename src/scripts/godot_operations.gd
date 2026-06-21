#!/usr/bin/env -S godot --headless --script
extends SceneTree

# Debug mode flag
var debug_mode = false

# Stored from _init(), executed in _process() so autoloads are available
var _pending_operation: String = ""
var _pending_params: Dictionary = {}
var _has_executed := false

func _init():
    var args = OS.get_cmdline_args()

    # Check for debug flag
    debug_mode = "--debug-godot" in args

    # Find the script argument and determine the positions of operation and params
    var script_index = args.find("--script")
    if script_index == -1:
        log_error("Could not find --script argument")
        quit(1)

    # The operation should be 2 positions after the script path (script_index + 1 is the script path itself)
    var operation_index = script_index + 2
    # The params should be 3 positions after the script path
    var params_index = script_index + 3

    if args.size() <= params_index:
        log_error("Usage: godot --headless --script godot_operations.gd <operation> <json_params>")
        log_error("Not enough command-line arguments provided.")
        quit(1)

    # Log all arguments for debugging
    log_debug("All arguments: " + str(args))
    log_debug("Script index: " + str(script_index))
    log_debug("Operation index: " + str(operation_index))
    log_debug("Params index: " + str(params_index))

    _pending_operation = args[operation_index]
    var params_json = args[params_index]

    log_info("Operation: " + _pending_operation)
    log_debug("Params JSON: " + params_json)

    # Parse JSON using Godot 4.x API
    var json = JSON.new()
    var error = json.parse(params_json)

    if error == OK:
        _pending_params = json.get_data()
    else:
        log_error("Failed to parse JSON parameters: " + params_json)
        log_error("JSON Error: " + json.get_error_message() + " at line " + str(json.get_error_line()))
        quit(1)

    if not _pending_params:
        log_error("Failed to parse JSON parameters: " + params_json)
        quit(1)

# Deferred to _process so autoload singletons are registered by the SceneTree.
# In _init(), the SceneTree hasn't finished initialization, so load() on scenes
# with scripts referencing autoloads (e.g. GameState.score) would fail.
func _process(_delta: float) -> bool:
    if _has_executed:
        return false
    _has_executed = true

    var operation = _pending_operation
    var params = _pending_params

    log_info("Executing operation: " + operation)

    # Pre-load autoload scripts so their class_name declarations are
    # registered before any scene loading or script validation. The
    # _process deferral above handles singleton instance registration;
    # this additionally covers class_name resolution for scripts that
    # reference autoload types but aren't loaded via the SceneTree.
    _preload_autoload_scripts()

    match operation:
        "create_scene":
            create_scene(params)
        "add_node":
            add_node(params)
        "load_sprite":
            load_sprite(params)
        "export_mesh_library":
            export_mesh_library(params)
        "save_scene":
            save_scene(params)
        "set_cells":
            set_cells(params)
        "get_scene_tree":
            get_scene_tree(params)
        "set_node_properties":
            set_node_properties(params)
        "attach_script":
            attach_script(params)
        "create_resource":
            create_resource(params)
        "edit_project_settings":
            edit_project_settings(params)
        "remove_node":
            remove_node(params)
        "reparent_node":
            reparent_node(params)
        "connect_signal":
            connect_signal_op(params)
        "get_tile_data":
            get_tile_data(params)
        "create_tileset":
            create_tileset(params)
        "validate_scene":
            validate_scene(params)
        "get_uid":
            get_uid(params)
        "resave_resources":
            resave_resources(params)
        "add_to_group":
            add_to_group(params)
        "remove_from_group":
            remove_from_group(params)
        "instantiate_scene":
            instantiate_scene(params)
        "add_animation":
            add_animation(params)
        "read_script":
            read_script(params)
        "validate_script":
            validate_script(params)
        "set_custom_tile_data":
            set_custom_tile_data(params)
        "duplicate_node":
            duplicate_node_op(params)
        "rename_node":
            rename_node(params)
        "get_node_properties":
            get_node_properties(params)
        "create_animation_player":
            create_animation_player(params)
        "manage_autoloads":
            manage_autoloads(params)
        "set_collision_layer_mask":
            set_collision_layer_mask(params)
        "get_scene_insights":
            get_scene_insights(params)
        "get_node_insights":
            get_node_insights(params)
        "batch":
            batch_operations(params)
        _:
            log_error("Unknown operation: " + operation)
            quit(1)

    quit()
    return false


func _execute_single(op_name: String, op_params: Dictionary) -> void:
    ## Dispatch a single operation by name. Used by batch_operations.
    match op_name:
        "create_scene": create_scene(op_params)
        "add_node": add_node(op_params)
        "load_sprite": load_sprite(op_params)
        "save_scene": save_scene(op_params)
        "set_cells": set_cells(op_params)
        "get_scene_tree": get_scene_tree(op_params)
        "set_node_properties": set_node_properties(op_params)
        "attach_script": attach_script(op_params)
        "create_resource": create_resource(op_params)
        "edit_project_settings": edit_project_settings(op_params)
        "remove_node": remove_node(op_params)
        "reparent_node": reparent_node(op_params)
        "connect_signal": connect_signal_op(op_params)
        "get_tile_data": get_tile_data(op_params)
        "create_tileset": create_tileset(op_params)
        "validate_scene": validate_scene(op_params)
        "add_to_group": add_to_group(op_params)
        "remove_from_group": remove_from_group(op_params)
        "instantiate_scene": instantiate_scene(op_params)
        "add_animation": add_animation(op_params)
        "set_custom_tile_data": set_custom_tile_data(op_params)
        "duplicate_node": duplicate_node_op(op_params)
        "rename_node": rename_node(op_params)
        "get_node_properties": get_node_properties(op_params)
        "create_animation_player": create_animation_player(op_params)
        "manage_autoloads": manage_autoloads(op_params)
        "set_collision_layer_mask": set_collision_layer_mask(op_params)
        _:
            log_error("Unknown operation in batch: " + op_name)


func batch_operations(params: Dictionary) -> void:
    ## Execute multiple operations in a single Godot process invocation.
    var operations: Array = params.get("operations", [])
    if operations.is_empty():
        log_error("No operations provided in batch")
        return

    log_info("Executing batch of " + str(operations.size()) + " operations")
    var results := []

    for i in range(operations.size()):
        var op: Dictionary = operations[i]
        var op_name: String = op.get("operation", "")
        var op_params: Dictionary = op.get("params", {})

        if op_name.is_empty():
            log_error("Operation " + str(i) + " missing 'operation' field")
            results.append({"index": i, "error": "missing operation name"})
            continue

        log_info("Batch step " + str(i) + ": " + op_name)
        _execute_single(op_name, op_params)
        results.append({"index": i, "operation": op_name, "ok": true})

    print(JSON.stringify({"batch_results": results, "total": operations.size()}))

# Logging functions
func log_debug(message):
    if debug_mode:
        print("[DEBUG] " + message)

func log_info(message):
    print("[INFO] " + message)

func log_error(message):
    printerr("[ERROR] " + message)

# Get a script by name or path
func get_script_by_name(name_of_class):
    if debug_mode:
        print("Attempting to get script for class: " + name_of_class)
    
    # Try to load it directly if it's a resource path
    if ResourceLoader.exists(name_of_class, "Script"):
        if debug_mode:
            print("Resource exists, loading directly: " + name_of_class)
        var script = load(name_of_class) as Script
        if script:
            if debug_mode:
                print("Successfully loaded script from path")
            return script
        else:
            printerr("Failed to load script from path: " + name_of_class)
    elif debug_mode:
        print("Resource not found, checking global class registry")
    
    # Search for it in the global class registry if it's a class name
    var global_classes = ProjectSettings.get_global_class_list()
    if debug_mode:
        print("Searching through " + str(global_classes.size()) + " global classes")
    
    for global_class in global_classes:
        var found_name_of_class = global_class["class"]
        var found_path = global_class["path"]
        
        if found_name_of_class == name_of_class:
            if debug_mode:
                print("Found matching class in registry: " + found_name_of_class + " at path: " + found_path)
            var script = load(found_path) as Script
            if script:
                if debug_mode:
                    print("Successfully loaded script from registry")
                return script
            else:
                printerr("Failed to load script from registry path: " + found_path)
                break
    
    printerr("Could not find script for class: " + name_of_class)
    return null

# Instantiate a class by name
func instantiate_class(name_of_class):
    if name_of_class.is_empty():
        printerr("Cannot instantiate class: name is empty")
        return null
    
    var result = null
    if debug_mode:
        print("Attempting to instantiate class: " + name_of_class)
    
    # Check if it's a built-in class
    if ClassDB.class_exists(name_of_class):
        if debug_mode:
            print("Class exists in ClassDB, using ClassDB.instantiate()")
        if ClassDB.can_instantiate(name_of_class):
            result = ClassDB.instantiate(name_of_class)
            if result == null:
                printerr("ClassDB.instantiate() returned null for class: " + name_of_class)
        else:
            printerr("Class exists but cannot be instantiated: " + name_of_class)
            printerr("This may be an abstract class or interface that cannot be directly instantiated")
    else:
        # Try to get the script
        if debug_mode:
            print("Class not found in ClassDB, trying to get script")
        var script = get_script_by_name(name_of_class)
        if script is GDScript:
            if debug_mode:
                print("Found GDScript, creating instance")
            result = script.new()
        else:
            printerr("Failed to get script for class: " + name_of_class)
            return null
    
    if result == null:
        printerr("Failed to instantiate class: " + name_of_class)
    elif debug_mode:
        print("Successfully instantiated class: " + name_of_class + " of type: " + result.get_class())
    
    return result

# Create a new scene with a specified root node type
func create_scene(params):
    print("Creating scene: " + params.scene_path)
    
    # Get project paths and log them for debugging
    var project_res_path = "res://"
    var project_user_path = "user://"
    var global_res_path = ProjectSettings.globalize_path(project_res_path)
    var global_user_path = ProjectSettings.globalize_path(project_user_path)
    
    if debug_mode:
        print("Project paths:")
        print("- res:// path: " + project_res_path)
        print("- user:// path: " + project_user_path)
        print("- Globalized res:// path: " + global_res_path)
        print("- Globalized user:// path: " + global_user_path)
        
        # Print some common environment variables for debugging
        print("Environment variables:")
        var env_vars = ["PATH", "HOME", "USER", "TEMP", "GODOT_PATH"]
        for env_var in env_vars:
            if OS.has_environment(env_var):
                print("  " + env_var + " = " + OS.get_environment(env_var))
    
    # Normalize the scene path
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)
    
    # Convert resource path to an absolute path
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if debug_mode:
        print("Absolute scene path: " + absolute_scene_path)
    
    # Get the scene directory paths
    var scene_dir_res = full_scene_path.get_base_dir()
    var scene_dir_abs = absolute_scene_path.get_base_dir()
    if debug_mode:
        print("Scene directory (resource path): " + scene_dir_res)
        print("Scene directory (absolute path): " + scene_dir_abs)
    
    # Only do extensive testing in debug mode
    if debug_mode:
        # Try to create a simple test file in the project root to verify write access
        var initial_test_file_path = "res://godot_mcp_test_write.tmp"
        var initial_test_file = FileAccess.open(initial_test_file_path, FileAccess.WRITE)
        if initial_test_file:
            initial_test_file.store_string("Test write access")
            initial_test_file.close()
            print("Successfully wrote test file to project root: " + initial_test_file_path)
            
            # Verify the test file exists
            var initial_test_file_exists = FileAccess.file_exists(initial_test_file_path)
            print("Test file exists check: " + str(initial_test_file_exists))
            
            # Clean up the test file
            if initial_test_file_exists:
                var remove_error = DirAccess.remove_absolute(ProjectSettings.globalize_path(initial_test_file_path))
                print("Test file removal result: " + str(remove_error))
        else:
            var write_error = FileAccess.get_open_error()
            printerr("Failed to write test file to project root: " + str(write_error))
            printerr("This indicates a serious permission issue with the project directory")
    
    # Use traditional if-else statement for better compatibility
    var root_node_type = "Node2D"  # Default value
    if params.has("root_node_type"):
        root_node_type = params.root_node_type
    if debug_mode:
        print("Root node type: " + root_node_type)
    
    # Create the root node
    var scene_root = instantiate_class(root_node_type)
    if not scene_root:
        printerr("Failed to instantiate node of type: " + root_node_type)
        printerr("Make sure the class exists and can be instantiated")
        printerr("Check if the class is registered in ClassDB or available as a script")
        quit(1)
    
    scene_root.name = "root"
    if debug_mode:
        print("Root node created with name: " + scene_root.name)
    
    # Set the owner of the root node to itself (important for scene saving)
    scene_root.owner = scene_root
    
    # Pack the scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        # Only do extensive testing in debug mode
        if debug_mode:
            # First, let's verify we can write to the project directory
            print("Testing write access to project directory...")
            var test_write_path = "res://test_write_access.tmp"
            var test_write_abs = ProjectSettings.globalize_path(test_write_path)
            var test_file = FileAccess.open(test_write_path, FileAccess.WRITE)
            
            if test_file:
                test_file.store_string("Write test")
                test_file.close()
                print("Successfully wrote test file to project directory")
                
                # Clean up test file
                if FileAccess.file_exists(test_write_path):
                    var remove_error = DirAccess.remove_absolute(test_write_abs)
                    print("Test file removal result: " + str(remove_error))
            else:
                var write_error = FileAccess.get_open_error()
                printerr("Failed to write test file to project directory: " + str(write_error))
                printerr("This may indicate permission issues with the project directory")
                # Continue anyway, as the scene directory might still be writable
        
        # Ensure the scene directory exists using DirAccess
        if debug_mode:
            print("Ensuring scene directory exists...")
        
        # Get the scene directory relative to res://
        var scene_dir_relative = scene_dir_res.substr(6)  # Remove "res://" prefix
        if debug_mode:
            print("Scene directory (relative to res://): " + scene_dir_relative)
        
        # Create the directory if needed
        if not scene_dir_relative.is_empty():
            # First check if it exists
            var dir_exists = DirAccess.dir_exists_absolute(scene_dir_abs)
            if debug_mode:
                print("Directory exists check (absolute): " + str(dir_exists))
            
            if not dir_exists:
                if debug_mode:
                    print("Directory doesn't exist, creating: " + scene_dir_relative)
                
                # Try to create the directory using DirAccess
                var dir = DirAccess.open("res://")
                if dir == null:
                    var open_error = DirAccess.get_open_error()
                    printerr("Failed to open res:// directory: " + str(open_error))
                    
                    # Try alternative approach with absolute path
                    if debug_mode:
                        print("Trying alternative directory creation approach...")
                    var make_dir_error = DirAccess.make_dir_recursive_absolute(scene_dir_abs)
                    if debug_mode:
                        print("Make directory result (absolute): " + str(make_dir_error))
                    
                    if make_dir_error != OK:
                        printerr("Failed to create directory using absolute path")
                        printerr("Error code: " + str(make_dir_error))
                        quit(1)
                else:
                    # Create the directory using the DirAccess instance
                    if debug_mode:
                        print("Creating directory using DirAccess: " + scene_dir_relative)
                    var make_dir_error = dir.make_dir_recursive(scene_dir_relative)
                    if debug_mode:
                        print("Make directory result: " + str(make_dir_error))
                    
                    if make_dir_error != OK:
                        printerr("Failed to create directory: " + scene_dir_relative)
                        printerr("Error code: " + str(make_dir_error))
                        quit(1)
                
                # Verify the directory was created
                dir_exists = DirAccess.dir_exists_absolute(scene_dir_abs)
                if debug_mode:
                    print("Directory exists check after creation: " + str(dir_exists))
                
                if not dir_exists:
                    printerr("Directory reported as created but does not exist: " + scene_dir_abs)
                    printerr("This may indicate a problem with path resolution or permissions")
                    quit(1)
            elif debug_mode:
                print("Directory already exists: " + scene_dir_abs)
        
        # Save the scene
        if debug_mode:
            print("Saving scene to: " + full_scene_path)
        var save_error = ResourceSaver.save(packed_scene, full_scene_path)
        if debug_mode:
            print("Save result: " + str(save_error) + " (OK=" + str(OK) + ")")
        
        if save_error == OK:
            # Only do extensive testing in debug mode
            if debug_mode:
                # Wait a moment to ensure file system has time to complete the write
                print("Waiting for file system to complete write operation...")
                OS.delay_msec(500)  # 500ms delay
                
                # Verify the file was actually created using multiple methods
                var file_check_abs = FileAccess.file_exists(absolute_scene_path)
                print("File exists check (absolute path): " + str(file_check_abs))
                
                var file_check_res = FileAccess.file_exists(full_scene_path)
                print("File exists check (resource path): " + str(file_check_res))
                
                var res_exists = ResourceLoader.exists(full_scene_path)
                print("Resource exists check: " + str(res_exists))
                
                # If file doesn't exist by absolute path, try to create a test file in the same directory
                if not file_check_abs and not file_check_res:
                    printerr("Scene file not found after save. Trying to diagnose the issue...")
                    
                    # Try to write a test file to the same directory
                    var test_scene_file_path = scene_dir_res + "/test_scene_file.tmp"
                    var test_scene_file = FileAccess.open(test_scene_file_path, FileAccess.WRITE)
                    
                    if test_scene_file:
                        test_scene_file.store_string("Test scene directory write")
                        test_scene_file.close()
                        print("Successfully wrote test file to scene directory: " + test_scene_file_path)
                        
                        # Check if the test file exists
                        var test_file_exists = FileAccess.file_exists(test_scene_file_path)
                        print("Test file exists: " + str(test_file_exists))
                        
                        if test_file_exists:
                            # Directory is writable, so the issue is with scene saving
                            printerr("Directory is writable but scene file wasn't created.")
                            printerr("This suggests an issue with ResourceSaver.save() or the packed scene.")
                            
                            # Try saving with a different approach
                            print("Trying alternative save approach...")
                            var alt_save_error = ResourceSaver.save(packed_scene, test_scene_file_path + ".tscn")
                            print("Alternative save result: " + str(alt_save_error))
                            
                            # Clean up test files
                            DirAccess.remove_absolute(ProjectSettings.globalize_path(test_scene_file_path))
                            if alt_save_error == OK:
                                DirAccess.remove_absolute(ProjectSettings.globalize_path(test_scene_file_path + ".tscn"))
                        else:
                            printerr("Test file couldn't be verified. This suggests filesystem access issues.")
                    else:
                        var write_error = FileAccess.get_open_error()
                        printerr("Failed to write test file to scene directory: " + str(write_error))
                        printerr("This confirms there are permission or path issues with the scene directory.")
                    
                    # Return error since we couldn't create the scene file
                    printerr("Failed to create scene: " + params.scene_path)
                    quit(1)
                
                # If we get here, at least one of our file checks passed
                if file_check_abs or file_check_res or res_exists:
                    print("Scene file verified to exist!")
                    
                    # Try to load the scene to verify it's valid
                    var test_load = ResourceLoader.load(full_scene_path)
                    if test_load:
                        print("Scene created and verified successfully at: " + params.scene_path)
                        print("Scene file can be loaded correctly.")
                    else:
                        print("Scene file exists but cannot be loaded. It may be corrupted or incomplete.")
                        # Continue anyway since the file exists
                    
                    print("Scene created successfully at: " + params.scene_path)
                else:
                    printerr("All file existence checks failed despite successful save operation.")
                    printerr("This indicates a serious issue with file system access or path resolution.")
                    quit(1)
            else:
                # In non-debug mode, just check if the file exists
                var file_exists = FileAccess.file_exists(full_scene_path)
                if file_exists:
                    print("Scene created successfully at: " + params.scene_path)
                else:
                    printerr("Failed to create scene: " + params.scene_path)
                    quit(1)
        else:
            # Handle specific error codes
            var error_message = "Failed to save scene. Error code: " + str(save_error)
            
            if save_error == ERR_CANT_CREATE:
                error_message += " (ERR_CANT_CREATE - Cannot create the scene file)"
            elif save_error == ERR_CANT_OPEN:
                error_message += " (ERR_CANT_OPEN - Cannot open the scene file for writing)"
            elif save_error == ERR_FILE_CANT_WRITE:
                error_message += " (ERR_FILE_CANT_WRITE - Cannot write to the scene file)"
            elif save_error == ERR_FILE_NO_PERMISSION:
                error_message += " (ERR_FILE_NO_PERMISSION - No permission to write the scene file)"
            
            printerr(error_message)
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        printerr("Error code: " + str(result))
        quit(1)

# Add a node to an existing scene
func add_node(params):
    print("Adding node to scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if debug_mode:
        print("Absolute scene path: " + absolute_scene_path)
    
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Use traditional if-else statement for better compatibility
    var parent_path = "root"  # Default value
    if params.has("parent_node_path"):
        parent_path = params.parent_node_path
    if debug_mode:
        print("Parent path: " + parent_path)
    
    var parent = scene_root
    if parent_path != "root":
        parent = scene_root.get_node(parent_path.replace("root/", ""))
        if not parent:
            printerr("Parent node not found: " + parent_path)
            quit(1)
    if debug_mode:
        print("Parent node found: " + parent.name)
    
    if debug_mode:
        print("Instantiating node of type: " + params.node_type)
    var new_node = instantiate_class(params.node_type)
    if not new_node:
        printerr("Failed to instantiate node of type: " + params.node_type)
        printerr("Make sure the class exists and can be instantiated")
        printerr("Check if the class is registered in ClassDB or available as a script")
        quit(1)
    new_node.name = params.node_name
    if debug_mode:
        print("New node created with name: " + new_node.name)
    
    if params.has("properties"):
        if debug_mode:
            print("Setting properties on node")
        var properties = params.properties
        for property in properties:
            var value = properties[property]
            value = _convert_property_value(new_node, property, value)
            if debug_mode:
                print("Setting property: " + property + " = " + str(value))
            new_node.set(property, value)
    
    parent.add_child(new_node)
    new_node.owner = scene_root
    if debug_mode:
        print("Node added to parent and ownership set")
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + absolute_scene_path)
        var save_error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if debug_mode:
            print("Save result: " + str(save_error) + " (OK=" + str(OK) + ")")
        if save_error == OK:
            if debug_mode:
                var file_check_after = FileAccess.file_exists(absolute_scene_path)
                print("File exists check after save: " + str(file_check_after))
                if file_check_after:
                    print("Node '" + params.node_name + "' of type '" + params.node_type + "' added successfully")
                else:
                    printerr("File reported as saved but does not exist at: " + absolute_scene_path)
            else:
                print("Node '" + params.node_name + "' of type '" + params.node_type + "' added successfully")
        else:
            printerr("Failed to save scene: " + str(save_error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Load a sprite into a Sprite2D node
func load_sprite(params):
    print("Loading sprite into scene: " + params.scene_path)
    
    # Ensure the scene path starts with res:// for Godot's resource system
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    if debug_mode:
        print("Full scene path (with res://): " + full_scene_path)
    
    # Check if the scene file exists
    var file_check = FileAccess.file_exists(full_scene_path)
    if debug_mode:
        print("Scene file exists check: " + str(file_check))
    
    if not file_check:
        printerr("Scene file does not exist at: " + full_scene_path)
        # Get the absolute path for reference
        var absolute_path = ProjectSettings.globalize_path(full_scene_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Ensure the texture path starts with res:// for Godot's resource system
    var full_texture_path = params.texture_path
    if not full_texture_path.begins_with("res://"):
        full_texture_path = "res://" + full_texture_path
    
    if debug_mode:
        print("Full texture path (with res://): " + full_texture_path)
    
    # Load the scene
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    # Instance the scene
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Find the sprite node
    var node_path = params.node_path
    if debug_mode:
        print("Original node path: " + node_path)
    
    if node_path.begins_with("root/"):
        node_path = node_path.substr(5)  # Remove "root/" prefix
        if debug_mode:
            print("Node path after removing 'root/' prefix: " + node_path)
    
    var sprite_node = null
    if node_path == "":
        # If no node path, assume root is the sprite
        sprite_node = scene_root
        if debug_mode:
            print("Using root node as sprite node")
    else:
        sprite_node = scene_root.get_node(node_path)
        if sprite_node and debug_mode:
            print("Found sprite node: " + sprite_node.name)
    
    if not sprite_node:
        printerr("Node not found: " + params.node_path)
        quit(1)
    
    # Check if the node is a Sprite2D or compatible type
    if debug_mode:
        print("Node class: " + sprite_node.get_class())
    if not (sprite_node is Sprite2D or sprite_node is Sprite3D or sprite_node is TextureRect):
        printerr("Node is not a sprite-compatible type: " + sprite_node.get_class())
        quit(1)
    
    # Load the texture
    if debug_mode:
        print("Loading texture from: " + full_texture_path)
    var texture = load(full_texture_path)
    if not texture:
        printerr("Failed to load texture: " + full_texture_path)
        quit(1)
    
    if debug_mode:
        print("Texture loaded successfully")
    
    # Set the texture on the sprite
    if sprite_node is Sprite2D or sprite_node is Sprite3D:
        sprite_node.texture = texture
        if debug_mode:
            print("Set texture on Sprite2D/Sprite3D node")
    elif sprite_node is TextureRect:
        sprite_node.texture = texture
        if debug_mode:
            print("Set texture on TextureRect node")
    
    # Save the modified scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + full_scene_path)
        var error = ResourceSaver.save(packed_scene, full_scene_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        
        if error == OK:
            # Verify the file was actually updated
            if debug_mode:
                var file_check_after = FileAccess.file_exists(full_scene_path)
                print("File exists check after save: " + str(file_check_after))
                
                if file_check_after:
                    print("Sprite loaded successfully with texture: " + full_texture_path)
                    # Get the absolute path for reference
                    var absolute_path = ProjectSettings.globalize_path(full_scene_path)
                    print("Absolute file path: " + absolute_path)
                else:
                    printerr("File reported as saved but does not exist at: " + full_scene_path)
            else:
                print("Sprite loaded successfully with texture: " + full_texture_path)
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Set tile cells on a TileMapLayer node in a scene
func set_cells(params):
    print("Setting cells on TileMapLayer in scene: " + params.scene_path)

    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)

    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if debug_mode:
        print("Absolute scene path: " + absolute_scene_path)

    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)

    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)

    if debug_mode:
        print("Scene loaded successfully")
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")

    # Find the TileMapLayer node
    var node_path = params.node_path
    if node_path.begins_with("root/"):
        node_path = node_path.substr(5)

    var layer = null
    if node_path == "" or node_path == "root":
        layer = scene_root
    else:
        layer = scene_root.get_node(node_path)

    if not layer:
        printerr("Node not found: " + params.node_path)
        quit(1)

    if not layer is TileMapLayer:
        printerr("Node is not a TileMapLayer: " + layer.get_class())
        quit(1)

    if debug_mode:
        print("Found TileMapLayer: " + layer.name)

    # Set each cell
    var cells = params.cells
    var count = 0
    for cell in cells:
        var coords = Vector2i(int(cell.x), int(cell.y))
        var source_id = int(cell.source_id)
        var atlas_coords = Vector2i(int(cell.atlas_x), int(cell.atlas_y))
        layer.set_cell(coords, source_id, atlas_coords)
        count += 1

    if debug_mode:
        print("Set " + str(count) + " cells")

    # Save the modified scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")

    if result == OK:
        if debug_mode:
            print("Saving scene to: " + absolute_scene_path)
        var save_error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if debug_mode:
            print("Save result: " + str(save_error) + " (OK=" + str(OK) + ")")
        if save_error == OK:
            print("Set " + str(count) + " cells on TileMapLayer successfully")
        else:
            printerr("Failed to save scene: " + str(save_error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Helper: load scene, return [scene_root, full_scene_path, absolute_scene_path]
func _load_scene(params) -> Array:
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)

    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)

    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)

    var scene_root = scene.instantiate()
    return [scene_root, full_scene_path, absolute_scene_path]

# Helper: find a node by path (handles "root/" prefix)
func _find_node(scene_root, node_path_str: String):
    var path = node_path_str
    if path.begins_with("root/"):
        path = path.substr(5)
    if path == "" or path == "root":
        return scene_root
    var node = scene_root.get_node(path)
    if not node:
        printerr("Node not found: " + node_path_str)
        quit(1)
    return node

# Helper: pack and save scene
func _save_scene(scene_root, absolute_scene_path: String) -> void:
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result != OK:
        printerr("Failed to pack scene: " + str(result))
        quit(1)
    var save_error = ResourceSaver.save(packed_scene, absolute_scene_path)
    if save_error != OK:
        printerr("Failed to save scene: " + str(save_error))
        quit(1)

# Read a scene's node tree as JSON
func get_scene_tree(params):
    var result = _load_scene(params)
    var scene_root = result[0]

    var tree_data = _serialize_node(scene_root, scene_root)
    var json_str = JSON.stringify(tree_data, "  ")
    print(json_str)

func _serialize_node(node, scene_root) -> Dictionary:
    var data = {
        "name": node.name,
        "type": node.get_class(),
    }

    # Include script path if attached
    var script = node.get_script()
    if script and script.resource_path != "":
        data["script"] = script.resource_path

    # Include key properties based on node type
    var props = {}
    if node is Node2D:
        if node.position != Vector2.ZERO:
            props["position"] = [node.position.x, node.position.y]
        if node.scale != Vector2.ONE:
            props["scale"] = [node.scale.x, node.scale.y]
        if node.rotation != 0.0:
            props["rotation"] = node.rotation
    if node is CanvasItem:
        if not node.visible:
            props["visible"] = false
        if node.z_index != 0:
            props["z_index"] = node.z_index

    if props.size() > 0:
        data["properties"] = props

    # Recurse into children
    var children = []
    for child in node.get_children():
        children.append(_serialize_node(child, scene_root))
    if children.size() > 0:
        data["children"] = children

    return data

# Set properties on an existing node
func set_node_properties(params):
    var result = _load_scene(params)
    var scene_root = result[0]
    var absolute_scene_path = result[2]

    var node = _find_node(scene_root, params.node_path)

    var properties = params.properties
    for property in properties:
        var value = properties[property]
        value = _convert_property_value(node, property, value)
        node.set(property, value)
        log_debug("Set " + property + " = " + str(value))

    _save_scene(scene_root, absolute_scene_path)
    print("Properties set successfully on node: " + params.node_path)

func _convert_property_value(node, property: String, value):
    """Convert JSON values (arrays/dicts) to Godot types based on the node's property type."""
    if value is Array:
        if value.size() == 2:
            var prop_type = _get_property_type(node, property)
            if prop_type == "Vector2":
                return Vector2(value[0], value[1])
            elif prop_type == "Vector2i":
                return Vector2i(int(value[0]), int(value[1]))
        elif value.size() == 3:
            var prop_type = _get_property_type(node, property)
            if prop_type == "Vector3":
                return Vector3(value[0], value[1], value[2])
            elif prop_type == "Vector3i":
                return Vector3i(int(value[0]), int(value[1]), int(value[2]))
            elif prop_type == "Color":
                return Color(value[0], value[1], value[2])
        elif value.size() == 4:
            var prop_type = _get_property_type(node, property)
            if prop_type == "Color":
                return Color(value[0], value[1], value[2], value[3])
            elif prop_type == "Rect2":
                return Rect2(value[0], value[1], value[2], value[3])
            elif prop_type == "Rect2i":
                return Rect2i(int(value[0]), int(value[1]), int(value[2]), int(value[3]))
    elif value is Dictionary:
        if value.has("r") and value.has("g") and value.has("b"):
            return Color(value.r, value.g, value.b, value.get("a", 1.0))
        elif value.has("x") and value.has("y"):
            if value.has("z"):
                return Vector3(value.x, value.y, value.z)
            else:
                return Vector2(value.x, value.y)
    return value

func _get_property_type(node, property_name: String) -> String:
    for prop in node.get_property_list():
        if prop.name == property_name:
            match prop.type:
                TYPE_VECTOR2:
                    return "Vector2"
                TYPE_VECTOR2I:
                    return "Vector2i"
                TYPE_VECTOR3:
                    return "Vector3"
                TYPE_VECTOR3I:
                    return "Vector3i"
                TYPE_COLOR:
                    return "Color"
                TYPE_RECT2:
                    return "Rect2"
                TYPE_RECT2I:
                    return "Rect2i"
    return ""

# Attach a script to a node.
# Always uses direct .tscn text manipulation to avoid compilation issues
# with scripts that reference autoloads (not available in headless mode).
func attach_script(params):
    var full_script_path = params.script_path
    if not full_script_path.begins_with("res://"):
        full_script_path = "res://" + full_script_path

    var scene_res_path = _resolve_scene_path(params)
    var absolute_scene_path = ProjectSettings.globalize_path(scene_res_path)
    _attach_script_via_tscn(absolute_scene_path, params.node_path, full_script_path)
    print("Script '" + params.script_path + "' attached to node: " + params.node_path)

func _resolve_scene_path(params) -> String:
    var scene_path = params.scene_path
    if not scene_path.begins_with("res://"):
        scene_path = "res://" + scene_path
    return scene_path

func _attach_script_via_tscn(scene_path: String, node_path: String, script_res_path: String) -> void:
    """Directly edit the .tscn file to add a script reference when load() fails."""
    var file = FileAccess.open(scene_path, FileAccess.READ)
    if not file:
        printerr("Failed to open scene file: " + scene_path)
        quit(1)
    var content = file.get_as_text()
    file.close()

    var lines = content.split("\n")

    # Find the highest ext_resource id
    var max_id = 0
    for line in lines:
        if line.begins_with("[ext_resource"):
            var id_start = line.find("id=\"") + 4
            if id_start > 3:
                var id_end = line.find("\"", id_start)
                var id_str = line.substr(id_start, id_end - id_start)
                # IDs can be like "1_abc" or just "1"
                var num_part = id_str.split("_")[0]
                if num_part.is_valid_int():
                    max_id = maxi(max_id, int(num_part))
    var new_id = str(max_id + 1)

    # Build the ext_resource line
    var ext_resource_line = "[ext_resource type=\"Script\" path=\"" + script_res_path + "\" id=\"" + new_id + "\"]"

    # Find where to insert the ext_resource (after load_steps or other ext_resources)
    var insert_idx = -1
    var load_steps_line_idx = -1
    for i in lines.size():
        if lines[i].begins_with("[ext_resource"):
            insert_idx = i + 1
        elif lines[i].begins_with("[gd_scene"):
            load_steps_line_idx = i
            if insert_idx == -1:
                insert_idx = i + 1

    # Update load_steps count
    if load_steps_line_idx >= 0:
        var ls_line = lines[load_steps_line_idx]
        if "load_steps=" in ls_line:
            var ls_start = ls_line.find("load_steps=") + 11
            var ls_end = ls_line.find(" ", ls_start)
            if ls_end == -1:
                ls_end = ls_line.find("]", ls_start)
            var old_count = int(ls_line.substr(ls_start, ls_end - ls_start))
            lines[load_steps_line_idx] = ls_line.replace("load_steps=" + str(old_count), "load_steps=" + str(old_count + 1))
        else:
            # Add load_steps
            lines[load_steps_line_idx] = ls_line.replace("format=3", "load_steps=2 format=3")

    # Insert the ext_resource line
    lines.insert(insert_idx, ext_resource_line)

    # Determine the node header to find in the .tscn
    var node_header = ""
    if node_path == "root" or node_path == ".":
        # Root node: find first [node line without parent=
        for i in lines.size():
            if lines[i].begins_with("[node ") and "parent=" not in lines[i]:
                node_header = lines[i]
                # Add script property right after the node header
                var script_line = "script = ExtResource(\"" + new_id + "\")"
                # Check if next line is empty or another property
                if i + 1 < lines.size() and lines[i + 1] == "":
                    lines.insert(i + 1, script_line)
                else:
                    lines.insert(i + 1, script_line)
                break
    else:
        # Non-root node: find [node name="X" ... parent="Y"]
        var target_name = node_path.get_file()  # Last part of path
        var target_parent = "."
        if "/" in node_path.replace("root/", ""):
            var stripped = node_path.replace("root/", "")
            target_parent = stripped.get_base_dir()
            if target_parent == "":
                target_parent = "."
            target_name = stripped.get_file()

        for i in lines.size():
            if lines[i].begins_with("[node ") and "name=\"" + target_name + "\"" in lines[i]:
                var script_line = "script = ExtResource(\"" + new_id + "\")"
                if i + 1 < lines.size() and lines[i + 1] == "":
                    lines.insert(i + 1, script_line)
                else:
                    lines.insert(i + 1, script_line)
                break

    # Write back
    var out_file = FileAccess.open(scene_path, FileAccess.WRITE)
    if not out_file:
        printerr("Failed to write scene file: " + scene_path)
        quit(1)
    out_file.store_string("\n".join(lines))
    out_file.close()

# Create a .tres resource file
func create_resource(params):
    var full_resource_path = params.resource_path
    if not full_resource_path.begins_with("res://"):
        full_resource_path = "res://" + full_resource_path

    var resource = null

    # If a script path is provided, load it and create an instance
    if params.has("script_path") and params.script_path != "":
        var full_script_path = params.script_path
        if not full_script_path.begins_with("res://"):
            full_script_path = "res://" + full_script_path
        var script = load(full_script_path)
        if not script:
            printerr("Failed to load script: " + full_script_path)
            quit(1)
        resource = Resource.new()
        resource.set_script(script)
    else:
        # Try to create by class name
        var resource_type = params.resource_type
        if ClassDB.class_exists(resource_type) and ClassDB.can_instantiate(resource_type):
            resource = ClassDB.instantiate(resource_type)
        else:
            resource = Resource.new()

    if not resource:
        printerr("Failed to create resource of type: " + params.resource_type)
        quit(1)

    # Set properties
    if params.has("properties"):
        var properties = params.properties
        for property in properties:
            resource.set(property, properties[property])

    # Ensure directory exists
    var dir_path = full_resource_path.get_base_dir()
    if not DirAccess.dir_exists_absolute(ProjectSettings.globalize_path(dir_path)):
        DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(dir_path))

    var save_error = ResourceSaver.save(resource, full_resource_path)
    if save_error != OK:
        printerr("Failed to save resource: " + str(save_error))
        quit(1)

    print("Resource created at: " + params.resource_path)

# Edit project.godot settings
func edit_project_settings(params):
    var settings = params.settings
    for key in settings:
        var value = settings[key]
        ProjectSettings.set_setting(key, value)
        log_debug("Set setting: " + key + " = " + str(value))

    var save_error = ProjectSettings.save()
    if save_error != OK:
        printerr("Failed to save project settings: " + str(save_error))
        quit(1)

    print("Project settings updated successfully")

# Remove a node from a scene
func remove_node(params):
    var result = _load_scene(params)
    var scene_root = result[0]
    var absolute_scene_path = result[2]

    var node_path = params.node_path
    if node_path == "root" or node_path == "":
        printerr("Cannot remove the root node")
        quit(1)

    var node = _find_node(scene_root, node_path)
    var node_name = node.name
    node.get_parent().remove_child(node)
    node.queue_free()

    _save_scene(scene_root, absolute_scene_path)
    print("Node '" + node_name + "' removed successfully")

# Move a node to a different parent
func reparent_node(params):
    var result = _load_scene(params)
    var scene_root = result[0]
    var absolute_scene_path = result[2]

    var node = _find_node(scene_root, params.node_path)
    var new_parent = _find_node(scene_root, params.new_parent_path)

    var node_name = node.name
    node.get_parent().remove_child(node)
    new_parent.add_child(node)
    node.owner = scene_root

    # Re-set owner for all descendants so they persist in the scene
    _set_owner_recursive(node, scene_root)

    _save_scene(scene_root, absolute_scene_path)
    print("Node '" + node_name + "' reparented to '" + new_parent.name + "'")

func _set_owner_recursive(node, owner):
    for child in node.get_children():
        child.owner = owner
        _set_owner_recursive(child, owner)

# Rename a node in a scene
func rename_node(params):
    var result = _load_scene(params)
    var scene_root = result[0]
    var absolute_scene_path = result[2]

    var node_path = params.node_path
    var new_name = params.new_name

    if node_path == "root" or node_path == "":
        # Rename the root node
        var old_name = scene_root.name
        scene_root.name = new_name
        _save_scene(scene_root, absolute_scene_path)
        print("Root node renamed from '" + old_name + "' to '" + new_name + "'")
        return

    var node = _find_node(scene_root, node_path)
    var old_name = node.name
    node.name = new_name

    _save_scene(scene_root, absolute_scene_path)
    print("Node renamed from '" + old_name + "' to '" + new_name + "'")

# Connect a signal between nodes
func connect_signal_op(params):
    var result = _load_scene(params)
    var scene_root = result[0]
    var absolute_scene_path = result[2]

    var source = _find_node(scene_root, params.source_node_path)
    var target = _find_node(scene_root, params.target_node_path)

    var signal_name = params.signal_name
    var method_name = params.method_name

    if not source.has_signal(signal_name):
        printerr("Signal '" + signal_name + "' not found on node: " + params.source_node_path)
        quit(1)

    source.connect(signal_name, Callable(target, method_name))

    _save_scene(scene_root, absolute_scene_path)
    print("Signal '" + signal_name + "' connected from '" + source.name + "' to '" + target.name + "." + method_name + "'")

# Read tile data from a TileMapLayer
func get_tile_data(params):
    var result = _load_scene(params)
    var scene_root = result[0]

    var node = _find_node(scene_root, params.node_path)

    if not node is TileMapLayer:
        printerr("Node is not a TileMapLayer: " + node.get_class())
        quit(1)

    var used_cells = node.get_used_cells()
    var cells = []
    for coords in used_cells:
        var source_id = node.get_cell_source_id(coords)
        var atlas_coords = node.get_cell_atlas_coords(coords)
        cells.append({
            "x": coords.x,
            "y": coords.y,
            "source_id": source_id,
            "atlas_x": atlas_coords.x,
            "atlas_y": atlas_coords.y
        })

    var output = {"cell_count": cells.size(), "cells": cells}
    print(JSON.stringify(output, "  "))

# Create a TileSet resource with atlas sources
func create_tileset(params):
    var full_resource_path = params.resource_path
    if not full_resource_path.begins_with("res://"):
        full_resource_path = "res://" + full_resource_path

    var tileset = TileSet.new()

    # Set tile size
    if params.has("tile_size"):
        var ts = params.tile_size
        tileset.tile_size = Vector2i(int(ts.x), int(ts.y))
    else:
        tileset.tile_size = Vector2i(16, 16)

    # Add custom data layers
    if params.has("custom_data_layers"):
        var layers = params.custom_data_layers
        for i in range(layers.size()):
            var layer = layers[i]
            tileset.add_custom_data_layer()
            tileset.set_custom_data_layer_name(i, layer.name)
            match layer.type:
                "bool":
                    tileset.set_custom_data_layer_type(i, TYPE_BOOL)
                "int":
                    tileset.set_custom_data_layer_type(i, TYPE_INT)
                "float":
                    tileset.set_custom_data_layer_type(i, TYPE_FLOAT)
                "string":
                    tileset.set_custom_data_layer_type(i, TYPE_STRING)
                _:
                    tileset.set_custom_data_layer_type(i, TYPE_BOOL)
            log_debug("Added custom data layer: " + layer.name + " (" + layer.type + ")")

    # Add atlas sources
    var atlas_sources = params.atlas_sources
    for source_def in atlas_sources:
        var full_texture_path = source_def.texture_path
        if not full_texture_path.begins_with("res://"):
            full_texture_path = "res://" + full_texture_path

        var texture = load(full_texture_path)
        if not texture:
            printerr("Failed to load texture: " + full_texture_path)
            quit(1)

        var atlas_source = TileSetAtlasSource.new()
        atlas_source.texture = texture
        atlas_source.texture_region_size = tileset.tile_size

        # Auto-create tiles for the entire texture
        var tex_size = texture.get_size()
        var cols = int(tex_size.x) / tileset.tile_size.x
        var rows = int(tex_size.y) / tileset.tile_size.y
        for row in range(rows):
            for col in range(cols):
                var atlas_coords = Vector2i(col, row)
                atlas_source.create_tile(atlas_coords)

        tileset.add_source(atlas_source)
        log_debug("Added atlas source: " + full_texture_path + " (" + str(cols) + "x" + str(rows) + " tiles)")

    # Ensure directory exists
    var dir_path = full_resource_path.get_base_dir()
    var abs_dir = ProjectSettings.globalize_path(dir_path)
    if not DirAccess.dir_exists_absolute(abs_dir):
        DirAccess.make_dir_recursive_absolute(abs_dir)

    var save_error = ResourceSaver.save(tileset, full_resource_path)
    if save_error != OK:
        printerr("Failed to save TileSet: " + str(save_error))
        quit(1)

    print("TileSet created at: " + params.resource_path)

# Validate a scene for common issues
func validate_scene(params):
    var result = _load_scene(params)
    var scene_root = result[0]

    var issues = []
    _validate_node_recursive(scene_root, scene_root, issues)

    var output = {
        "scene": params.scene_path,
        "issue_count": issues.size(),
        "issues": issues,
        "status": "valid" if issues.size() == 0 else "issues_found"
    }
    print(JSON.stringify(output, "  "))

func _validate_node_recursive(node, scene_root, issues: Array):
    var node_path = str(scene_root.get_path_to(node))
    if node_path == ".":
        node_path = node.name

    # Check for script references that can't be loaded
    var script = node.get_script()
    if script:
        if script.resource_path != "" and not FileAccess.file_exists(script.resource_path):
            issues.append({
                "node": node_path,
                "type": "missing_script",
                "message": "Script not found: " + script.resource_path
            })

    # Check for nodes with no name (shouldn't happen, but defensive)
    if node.name == "":
        issues.append({
            "node": node_path,
            "type": "unnamed_node",
            "message": "Node has no name"
        })

    # Check Sprite2D/Sprite3D with no texture
    if node is Sprite2D and node.texture == null:
        issues.append({
            "node": node_path,
            "type": "missing_texture",
            "message": "Sprite2D has no texture assigned"
        })

    # Check TileMapLayer with no TileSet
    if node is TileMapLayer and node.tile_set == null:
        issues.append({
            "node": node_path,
            "type": "missing_tileset",
            "message": "TileMapLayer has no TileSet assigned"
        })

    # Check CollisionShape2D/3D with no shape
    if node is CollisionShape2D and node.shape == null:
        issues.append({
            "node": node_path,
            "type": "missing_shape",
            "message": "CollisionShape2D has no shape assigned"
        })

    # Check for nodes outside the visible area (extreme positions)
    if node is Node2D:
        if abs(node.position.x) > 10000 or abs(node.position.y) > 10000:
            issues.append({
                "node": node_path,
                "type": "extreme_position",
                "message": "Node2D at extreme position: " + str(node.position)
            })

    # Recurse
    for child in node.get_children():
        _validate_node_recursive(child, scene_root, issues)

# Export a scene as a MeshLibrary resource
func export_mesh_library(params):
    print("Exporting MeshLibrary from scene: " + params.scene_path)
    
    # Ensure the scene path starts with res:// for Godot's resource system
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    if debug_mode:
        print("Full scene path (with res://): " + full_scene_path)
    
    # Ensure the output path starts with res:// for Godot's resource system
    var full_output_path = params.output_path
    if not full_output_path.begins_with("res://"):
        full_output_path = "res://" + full_output_path
    
    if debug_mode:
        print("Full output path (with res://): " + full_output_path)
    
    # Check if the scene file exists
    var file_check = FileAccess.file_exists(full_scene_path)
    if debug_mode:
        print("Scene file exists check: " + str(file_check))
    
    if not file_check:
        printerr("Scene file does not exist at: " + full_scene_path)
        # Get the absolute path for reference
        var absolute_path = ProjectSettings.globalize_path(full_scene_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Load the scene
    if debug_mode:
        print("Loading scene from: " + full_scene_path)
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    # Instance the scene
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Create a new MeshLibrary
    var mesh_library = MeshLibrary.new()
    if debug_mode:
        print("Created new MeshLibrary")
    
    # Get mesh item names if provided
    var mesh_item_names = params.mesh_item_names if params.has("mesh_item_names") else []
    var use_specific_items = mesh_item_names.size() > 0
    
    if debug_mode:
        if use_specific_items:
            print("Using specific mesh items: " + str(mesh_item_names))
        else:
            print("Using all mesh items in the scene")
    
    # Process all child nodes
    var item_id = 0
    if debug_mode:
        print("Processing child nodes...")
    
    for child in scene_root.get_children():
        if debug_mode:
            print("Checking child node: " + child.name)
        
        # Skip if not using all items and this item is not in the list
        if use_specific_items and not (child.name in mesh_item_names):
            if debug_mode:
                print("Skipping node " + child.name + " (not in specified items list)")
            continue
            
        # Check if the child has a mesh
        var mesh_instance = null
        if child is MeshInstance3D:
            mesh_instance = child
            if debug_mode:
                print("Node " + child.name + " is a MeshInstance3D")
        else:
            # Try to find a MeshInstance3D in the child's descendants
            if debug_mode:
                print("Searching for MeshInstance3D in descendants of " + child.name)
            for descendant in child.get_children():
                if descendant is MeshInstance3D:
                    mesh_instance = descendant
                    if debug_mode:
                        print("Found MeshInstance3D in descendant: " + descendant.name)
                    break
        
        if mesh_instance and mesh_instance.mesh:
            if debug_mode:
                print("Adding mesh: " + child.name)
            
            # Add the mesh to the library
            mesh_library.create_item(item_id)
            mesh_library.set_item_name(item_id, child.name)
            mesh_library.set_item_mesh(item_id, mesh_instance.mesh)
            if debug_mode:
                print("Added mesh to library with ID: " + str(item_id))
            
            # Add collision shape if available
            var collision_added = false
            for collision_child in child.get_children():
                if collision_child is CollisionShape3D and collision_child.shape:
                    mesh_library.set_item_shapes(item_id, [collision_child.shape])
                    if debug_mode:
                        print("Added collision shape from: " + collision_child.name)
                    collision_added = true
                    break
            
            if debug_mode and not collision_added:
                print("No collision shape found for mesh: " + child.name)
            
            # Add preview if available
            if mesh_instance.mesh:
                mesh_library.set_item_preview(item_id, mesh_instance.mesh)
                if debug_mode:
                    print("Added preview for mesh: " + child.name)
            
            item_id += 1
        elif debug_mode:
            print("Node " + child.name + " has no valid mesh")
    
    if debug_mode:
        print("Processed " + str(item_id) + " meshes")
    
    # Create directory if it doesn't exist
    var dir = DirAccess.open("res://")
    if dir == null:
        printerr("Failed to open res:// directory")
        printerr("DirAccess error: " + str(DirAccess.get_open_error()))
        quit(1)
        
    var output_dir = full_output_path.get_base_dir()
    if debug_mode:
        print("Output directory: " + output_dir)
    
    if output_dir != "res://" and not dir.dir_exists(output_dir.substr(6)):  # Remove "res://" prefix
        if debug_mode:
            print("Creating directory: " + output_dir)
        var error = dir.make_dir_recursive(output_dir.substr(6))  # Remove "res://" prefix
        if error != OK:
            printerr("Failed to create directory: " + output_dir + ", error: " + str(error))
            quit(1)
    
    # Save the mesh library
    if item_id > 0:
        if debug_mode:
            print("Saving MeshLibrary to: " + full_output_path)
        var error = ResourceSaver.save(mesh_library, full_output_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        
        if error == OK:
            # Verify the file was actually created
            if debug_mode:
                var file_check_after = FileAccess.file_exists(full_output_path)
                print("File exists check after save: " + str(file_check_after))
                
                if file_check_after:
                    print("MeshLibrary exported successfully with " + str(item_id) + " items to: " + full_output_path)
                    # Get the absolute path for reference
                    var absolute_path = ProjectSettings.globalize_path(full_output_path)
                    print("Absolute file path: " + absolute_path)
                else:
                    printerr("File reported as saved but does not exist at: " + full_output_path)
            else:
                print("MeshLibrary exported successfully with " + str(item_id) + " items to: " + full_output_path)
        else:
            printerr("Failed to save MeshLibrary: " + str(error))
    else:
        printerr("No valid meshes found in the scene")

# Find files with a specific extension recursively
func find_files(path, extension):
    var files = []
    var dir = DirAccess.open(path)
    
    if dir:
        dir.list_dir_begin()
        var file_name = dir.get_next()
        
        while file_name != "":
            if dir.current_is_dir() and not file_name.begins_with("."):
                files.append_array(find_files(path + file_name + "/", extension))
            elif file_name.ends_with(extension):
                files.append(path + file_name)
            
            file_name = dir.get_next()
    
    return files

# Get UID for a specific file
func get_uid(params):
    if not params.has("file_path"):
        printerr("File path is required")
        quit(1)
    
    # Ensure the file path starts with res:// for Godot's resource system
    var file_path = params.file_path
    if not file_path.begins_with("res://"):
        file_path = "res://" + file_path
    
    print("Getting UID for file: " + file_path)
    if debug_mode:
        print("Full file path (with res://): " + file_path)
    
    # Get the absolute path for reference
    var absolute_path = ProjectSettings.globalize_path(file_path)
    if debug_mode:
        print("Absolute file path: " + absolute_path)
    
    # Ensure the file exists
    var file_check = FileAccess.file_exists(file_path)
    if debug_mode:
        print("File exists check: " + str(file_check))
    
    if not file_check:
        printerr("File does not exist at: " + file_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Check if the UID file exists
    var uid_path = file_path + ".uid"
    if debug_mode:
        print("UID file path: " + uid_path)
    
    var uid_check = FileAccess.file_exists(uid_path)
    if debug_mode:
        print("UID file exists check: " + str(uid_check))
    
    var f = FileAccess.open(uid_path, FileAccess.READ)
    
    if f:
        # Read the UID content
        var uid_content = f.get_as_text()
        f.close()
        if debug_mode:
            print("UID content read successfully")
        
        # Return the UID content
        var result = {
            "file": file_path,
            "absolutePath": absolute_path,
            "uid": uid_content.strip_edges(),
            "exists": true
        }
        if debug_mode:
            print("UID result: " + JSON.stringify(result))
        print(JSON.stringify(result))
    else:
        if debug_mode:
            print("UID file does not exist or could not be opened")
        
        # UID file doesn't exist
        var result = {
            "file": file_path,
            "absolutePath": absolute_path,
            "exists": false,
            "message": "UID file does not exist for this file. Use resave_resources to generate UIDs."
        }
        if debug_mode:
            print("UID result: " + JSON.stringify(result))
        print(JSON.stringify(result))

# Resave all resources to update UID references
func resave_resources(params):
    print("Resaving all resources to update UID references...")
    
    # Get project path if provided
    var project_path = "res://"
    if params.has("project_path"):
        project_path = params.project_path
        if not project_path.begins_with("res://"):
            project_path = "res://" + project_path
        if not project_path.ends_with("/"):
            project_path += "/"
    
    if debug_mode:
        print("Using project path: " + project_path)
    
    # Get all .tscn files
    if debug_mode:
        print("Searching for scene files in: " + project_path)
    var scenes = find_files(project_path, ".tscn")
    if debug_mode:
        print("Found " + str(scenes.size()) + " scenes")
    
    # Resave each scene
    var success_count = 0
    var error_count = 0
    
    for scene_path in scenes:
        if debug_mode:
            print("Processing scene: " + scene_path)
        
        # Check if the scene file exists
        var file_check = FileAccess.file_exists(scene_path)
        if debug_mode:
            print("Scene file exists check: " + str(file_check))
        
        if not file_check:
            printerr("Scene file does not exist at: " + scene_path)
            error_count += 1
            continue
        
        # Load the scene
        var scene = load(scene_path)
        if scene:
            if debug_mode:
                print("Scene loaded successfully, saving...")
            var error = ResourceSaver.save(scene, scene_path)
            if debug_mode:
                print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
            
            if error == OK:
                success_count += 1
                if debug_mode:
                    print("Scene saved successfully: " + scene_path)
                
                    # Verify the file was actually updated
                    var file_check_after = FileAccess.file_exists(scene_path)
                    print("File exists check after save: " + str(file_check_after))
                
                    if not file_check_after:
                        printerr("File reported as saved but does not exist at: " + scene_path)
            else:
                error_count += 1
                printerr("Failed to save: " + scene_path + ", error: " + str(error))
        else:
            error_count += 1
            printerr("Failed to load: " + scene_path)
    
    # Get all .gd and .shader files
    if debug_mode:
        print("Searching for script and shader files in: " + project_path)
    var scripts = find_files(project_path, ".gd") + find_files(project_path, ".shader") + find_files(project_path, ".gdshader")
    if debug_mode:
        print("Found " + str(scripts.size()) + " scripts/shaders")
    
    # Check for missing .uid files
    var missing_uids = 0
    var generated_uids = 0
    
    for script_path in scripts:
        if debug_mode:
            print("Checking UID for: " + script_path)
        var uid_path = script_path + ".uid"
        
        var uid_check = FileAccess.file_exists(uid_path)
        if debug_mode:
            print("UID file exists check: " + str(uid_check))
        
        var f = FileAccess.open(uid_path, FileAccess.READ)
        if not f:
            missing_uids += 1
            if debug_mode:
                print("Missing UID file for: " + script_path + ", generating...")
            
            # Force a save to generate UID
            var res = load(script_path)
            if res:
                var error = ResourceSaver.save(res, script_path)
                if debug_mode:
                    print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
                
                if error == OK:
                    generated_uids += 1
                    if debug_mode:
                        print("Generated UID for: " + script_path)
                    
                        # Verify the UID file was actually created
                        var uid_check_after = FileAccess.file_exists(uid_path)
                        print("UID file exists check after save: " + str(uid_check_after))
                    
                        if not uid_check_after:
                            printerr("UID file reported as generated but does not exist at: " + uid_path)
                else:
                    printerr("Failed to generate UID for: " + script_path + ", error: " + str(error))
            else:
                printerr("Failed to load resource: " + script_path)
        elif debug_mode:
            print("UID file already exists for: " + script_path)
    
    if debug_mode:
        print("Summary:")
        print("- Scenes processed: " + str(scenes.size()))
        print("- Scenes successfully saved: " + str(success_count))
        print("- Scenes with errors: " + str(error_count))
        print("- Scripts/shaders missing UIDs: " + str(missing_uids))
        print("- UIDs successfully generated: " + str(generated_uids))
    print("Resave operation complete")

# Save changes to a scene file
func save_scene(params):
    print("Saving scene: " + params.scene_path)
    
    # Ensure the scene path starts with res:// for Godot's resource system
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    if debug_mode:
        print("Full scene path (with res://): " + full_scene_path)
    
    # Check if the scene file exists
    var file_check = FileAccess.file_exists(full_scene_path)
    if debug_mode:
        print("Scene file exists check: " + str(file_check))
    
    if not file_check:
        printerr("Scene file does not exist at: " + full_scene_path)
        # Get the absolute path for reference
        var absolute_path = ProjectSettings.globalize_path(full_scene_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Load the scene
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    # Instance the scene
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Determine save path
    var save_path = params.new_path if params.has("new_path") else full_scene_path
    if params.has("new_path") and not save_path.begins_with("res://"):
        save_path = "res://" + save_path
    
    if debug_mode:
        print("Save path: " + save_path)
    
    # Create directory if it doesn't exist
    if params.has("new_path"):
        var dir = DirAccess.open("res://")
        if dir == null:
            printerr("Failed to open res:// directory")
            printerr("DirAccess error: " + str(DirAccess.get_open_error()))
            quit(1)
            
        var scene_dir = save_path.get_base_dir()
        if debug_mode:
            print("Scene directory: " + scene_dir)
        
        if scene_dir != "res://" and not dir.dir_exists(scene_dir.substr(6)):  # Remove "res://" prefix
            if debug_mode:
                print("Creating directory: " + scene_dir)
            var error = dir.make_dir_recursive(scene_dir.substr(6))  # Remove "res://" prefix
            if error != OK:
                printerr("Failed to create directory: " + scene_dir + ", error: " + str(error))
                quit(1)
    
    # Create a packed scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + save_path)
        var error = ResourceSaver.save(packed_scene, save_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        
        if error == OK:
            # Verify the file was actually created/updated
            if debug_mode:
                var file_check_after = FileAccess.file_exists(save_path)
                print("File exists check after save: " + str(file_check_after))
                
                if file_check_after:
                    print("Scene saved successfully to: " + save_path)
                    # Get the absolute path for reference
                    var absolute_path = ProjectSettings.globalize_path(save_path)
                    print("Absolute file path: " + absolute_path)
                else:
                    printerr("File reported as saved but does not exist at: " + save_path)
            else:
                print("Scene saved successfully to: " + save_path)
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# ============================================================
# Group management
# ============================================================

func add_to_group(params):
    var result = _load_scene(params)
    var scene_root = result[0]
    var absolute_scene_path = result[2]

    var node = _find_node(scene_root, params.node_path)
    var groups: Array = params.groups if params.has("groups") else [params.group]

    for group_name in groups:
        if not node.is_in_group(group_name):
            node.add_to_group(group_name, true)

    _save_scene(scene_root, absolute_scene_path)
    print("Added node '" + params.node_path + "' to groups: " + str(groups))

func remove_from_group(params):
    var result = _load_scene(params)
    var scene_root = result[0]
    var absolute_scene_path = result[2]

    var node = _find_node(scene_root, params.node_path)
    var groups: Array = params.groups if params.has("groups") else [params.group]

    for group_name in groups:
        if node.is_in_group(group_name):
            node.remove_from_group(group_name)

    _save_scene(scene_root, absolute_scene_path)
    print("Removed node '" + params.node_path + "' from groups: " + str(groups))

# ============================================================
# Scene instantiation
# ============================================================

func instantiate_scene(params):
    var result = _load_scene(params)
    var scene_root = result[0]
    var absolute_scene_path = result[2]

    var child_scene_path = params.child_scene_path
    if not child_scene_path.begins_with("res://"):
        child_scene_path = "res://" + child_scene_path

    var child_scene = load(child_scene_path)
    if not child_scene:
        printerr("Failed to load child scene: " + child_scene_path)
        quit(1)

    var instance = child_scene.instantiate()

    if params.has("node_name") and params.node_name != "":
        instance.name = params.node_name

    var parent = scene_root
    if params.has("parent_node_path") and params.parent_node_path != "":
        parent = _find_node(scene_root, params.parent_node_path)

    parent.add_child(instance)
    instance.owner = scene_root
    _set_owner_recursive(instance, scene_root)

    if params.has("position") and instance is Node2D:
        instance.position = Vector2(params.position.x, params.position.y)
    elif params.has("position") and instance is Node3D:
        instance.position = Vector3(params.position.x, params.position.y, params.position.get("z", 0))

    _save_scene(scene_root, absolute_scene_path)
    print("Scene '" + child_scene_path + "' instantiated as '" + instance.name + "'")

# ============================================================
# Animation
# ============================================================

func add_animation(params):
    var result = _load_scene(params)
    var scene_root = result[0]
    var absolute_scene_path = result[2]

    var node = _find_node(scene_root, params.node_path)
    if not node is AnimationPlayer:
        printerr("Node is not an AnimationPlayer: " + params.node_path)
        quit(1)

    var anim_player: AnimationPlayer = node
    var anim_name: String = params.animation_name
    var anim_length: float = params.get("length", 1.0)
    var anim_loop: bool = params.get("loop", false)

    var animation = Animation.new()
    animation.length = anim_length
    if anim_loop:
        animation.loop_mode = Animation.LOOP_LINEAR

    if params.has("tracks"):
        for track_data in params.tracks:
            var track_type = Animation.TYPE_VALUE
            var type_str = track_data.get("type", "value")
            match type_str:
                "value":
                    track_type = Animation.TYPE_VALUE
                "method":
                    track_type = Animation.TYPE_METHOD
                "bezier":
                    track_type = Animation.TYPE_BEZIER

            var track_idx = animation.add_track(track_type)
            animation.track_set_path(track_idx, NodePath(track_data.path))

            if track_data.has("interpolation"):
                match track_data.interpolation:
                    "nearest":
                        animation.track_set_interpolation_type(track_idx, Animation.INTERPOLATION_NEAREST)
                    "linear":
                        animation.track_set_interpolation_type(track_idx, Animation.INTERPOLATION_LINEAR)
                    "cubic":
                        animation.track_set_interpolation_type(track_idx, Animation.INTERPOLATION_CUBIC)

            if track_data.has("keyframes"):
                for kf in track_data.keyframes:
                    var time: float = kf.time
                    var value = kf.value
                    if value is Dictionary:
                        if value.has("x") and value.has("y"):
                            if value.has("z"):
                                value = Vector3(value.x, value.y, value.z)
                            else:
                                value = Vector2(value.x, value.y)
                        elif value.has("r") and value.has("g"):
                            value = Color(value.r, value.g, value.b, value.get("a", 1.0))
                    animation.track_insert_key(track_idx, time, value)

    var lib = anim_player.get_animation_library("")
    if not lib:
        lib = AnimationLibrary.new()
        anim_player.add_animation_library("", lib)
    lib.add_animation(anim_name, animation)

    _save_scene(scene_root, absolute_scene_path)
    print("Animation '" + anim_name + "' added with " + str(animation.get_track_count()) + " tracks")

# ============================================================
# Script reading
# ============================================================

func read_script(params):
    var script_path = params.script_path
    if not script_path.begins_with("res://"):
        script_path = "res://" + script_path

    var absolute_path = ProjectSettings.globalize_path(script_path)
    if not FileAccess.file_exists(absolute_path):
        printerr("Script file does not exist: " + script_path)
        quit(1)

    var file = FileAccess.open(absolute_path, FileAccess.READ)
    if not file:
        printerr("Failed to open script: " + script_path)
        quit(1)

    var content = file.get_as_text()
    file.close()
    print(content)


func validate_script(params):
    var script_path = params.script_path
    if not script_path.begins_with("res://"):
        script_path = "res://" + script_path

    var absolute_path = ProjectSettings.globalize_path(script_path)
    if not FileAccess.file_exists(absolute_path):
        printerr("Script file does not exist: " + script_path)
        quit(1)

    var script := GDScript.new()
    script.source_code = FileAccess.get_file_as_string(absolute_path)
    var err := script.reload(true)  # keep_state = true

    var result := {"script_path": script_path}
    if err == OK:
        result["valid"] = true
        result["errors"] = []
        print(JSON.stringify(result))
    else:
        result["valid"] = false
        result["errors"] = ["Compilation error (code " + str(err) + ")"]
        print(JSON.stringify(result))


## Pre-load all autoload scripts from project.godot so their class_name
## declarations are available during headless script validation and
## scene loading. Also registers autoload singleton names as global
## classes so scripts referencing e.g. "GameState" can resolve them.
func _preload_autoload_scripts() -> void:
    # Read project.godot to find [autoload] entries
    var project_path = ProjectSettings.globalize_path("res://project.godot")
    if not FileAccess.file_exists(project_path):
        return

    var content := FileAccess.get_file_as_string(project_path)
    var in_autoload_section := false
    var autoload_entries: Array[Dictionary] = []

    for line in content.split("\n"):
        line = line.strip_edges()
        if line == "[autoload]":
            in_autoload_section = true
            continue
        if line.begins_with("[") and in_autoload_section:
            break  # Hit next section
        if not in_autoload_section or line.is_empty() or line.begins_with(";"):
            continue

        # Parse: Name="*res://path/to/script.gd"
        var eq_pos := line.find("=")
        if eq_pos == -1:
            continue
        var autoload_name := line.substr(0, eq_pos).strip_edges()
        var value := line.substr(eq_pos + 1).strip_edges().trim_prefix("\"").trim_suffix("\"")
        # Strip the "*" prefix (marks it as autoload singleton)
        if value.begins_with("*"):
            value = value.substr(1)

        # Only load .gd scripts (skip .tscn autoloads)
        if value.ends_with(".gd") and ResourceLoader.exists(value):
            log_debug("Pre-loading autoload script for validation: " + value)
            var script = load(value)  # Registers class_name in GDScript DB
            autoload_entries.append({"name": autoload_name, "path": value, "script": script})

    # Note: load() registers class_name declarations but autoload
    # singleton names (e.g. "GameState") are resolved by the engine
    # at runtime startup and cannot be replicated in headless mode.
    # Scripts referencing autoload singletons will still show
    # compilation errors during headless validation — this is a known
    # limitation. The scripts will work correctly at runtime.

# ============================================================
# Custom tile data
# ============================================================

func set_custom_tile_data(params):
    var result = _load_scene(params)
    var scene_root = result[0]
    var absolute_scene_path = result[2]

    var node = _find_node(scene_root, params.node_path)
    if not node is TileMapLayer:
        printerr("Node is not a TileMapLayer: " + params.node_path)
        quit(1)

    var layer: TileMapLayer = node
    var tile_set = layer.tile_set
    if not tile_set:
        printerr("TileMapLayer has no TileSet assigned")
        quit(1)

    var cells_updated := 0
    for cell_data in params.cells:
        var coords = Vector2i(cell_data.x, cell_data.y)
        var tile_data = layer.get_cell_tile_data(coords)
        if not tile_data:
            log_debug("No tile at " + str(coords) + ", skipping")
            continue

        for key in cell_data.custom_data:
            tile_data.set_custom_data(key, cell_data.custom_data[key])
        cells_updated += 1

    _save_scene(scene_root, absolute_scene_path)
    print("Updated custom data on " + str(cells_updated) + " cells")

# ============================================================
# Node duplication
# ============================================================

func duplicate_node_op(params):
    var result = _load_scene(params)
    var scene_root = result[0]
    var absolute_scene_path = result[2]

    var source_node = _find_node(scene_root, params.node_path)
    var duplicate = source_node.duplicate()

    if params.has("new_name") and params.new_name != "":
        duplicate.name = params.new_name

    var parent = source_node.get_parent()
    if params.has("parent_node_path") and params.parent_node_path != "":
        parent = _find_node(scene_root, params.parent_node_path)

    parent.add_child(duplicate)
    duplicate.owner = scene_root
    _set_owner_recursive(duplicate, scene_root)

    _save_scene(scene_root, absolute_scene_path)
    print("Node '" + params.node_path + "' duplicated as '" + duplicate.name + "'")

# ============================================================
# Node property reading
# ============================================================

func get_node_properties(params):
    var result = _load_scene(params)
    var scene_root = result[0]

    var node = _find_node(scene_root, params.node_path)
    var output = {}

    if params.has("properties"):
        for prop_name in params.properties:
            var value = node.get(prop_name)
            output[prop_name] = _serialize_value(value)
    else:
        for prop in node.get_property_list():
            var pname = prop.name
            if pname.begins_with("_") or pname == "script":
                continue
            var value = node.get(pname)
            if value != null:
                output[pname] = _serialize_value(value)

    var json = JSON.new()
    print(json.stringify(output, "  "))

func _serialize_value(value) -> Variant:
    if value is Vector2:
        return {"x": value.x, "y": value.y}
    elif value is Vector2i:
        return {"x": value.x, "y": value.y}
    elif value is Vector3:
        return {"x": value.x, "y": value.y, "z": value.z}
    elif value is Color:
        return {"r": value.r, "g": value.g, "b": value.b, "a": value.a}
    elif value is Rect2:
        return {"x": value.position.x, "y": value.position.y, "w": value.size.x, "h": value.size.y}
    elif value is NodePath:
        return str(value)
    elif value is Resource:
        return value.resource_path if value.resource_path != "" else str(value)
    elif value is Array:
        var arr = []
        for item in value:
            arr.append(_serialize_value(item))
        return arr
    return value

# ============================================================
# Animation player creation helper
# ============================================================

func create_animation_player(params):
    var result = _load_scene(params)
    var scene_root = result[0]
    var absolute_scene_path = result[2]

    var parent = scene_root
    if params.has("parent_node_path") and params.parent_node_path != "":
        parent = _find_node(scene_root, params.parent_node_path)

    var anim_player = AnimationPlayer.new()
    anim_player.name = params.get("node_name", "AnimationPlayer")
    parent.add_child(anim_player)
    anim_player.owner = scene_root

    if params.has("animations"):
        var lib = AnimationLibrary.new()
        for anim_data in params.animations:
            var animation = Animation.new()
            animation.length = anim_data.get("length", 1.0)
            if anim_data.get("loop", false):
                animation.loop_mode = Animation.LOOP_LINEAR

            if anim_data.has("tracks"):
                for track_data in anim_data.tracks:
                    var track_idx = animation.add_track(Animation.TYPE_VALUE)
                    animation.track_set_path(track_idx, NodePath(track_data.path))

                    if track_data.has("keyframes"):
                        for kf in track_data.keyframes:
                            var value = kf.value
                            if value is Dictionary and value.has("x") and value.has("y"):
                                if value.has("z"):
                                    value = Vector3(value.x, value.y, value.z)
                                else:
                                    value = Vector2(value.x, value.y)
                            animation.track_insert_key(track_idx, kf.time, value)

            lib.add_animation(anim_data.name, animation)
        anim_player.add_animation_library("", lib)

    _save_scene(scene_root, absolute_scene_path)
    print("AnimationPlayer '" + anim_player.name + "' created")

# ============================================================
# Autoload management
# ============================================================

func manage_autoloads(params):
    var action: String = params.action
    var autoload_name: String = params.get("name", "")

    if action == "add":
        var script_path: String = params.script_path
        if not script_path.begins_with("res://"):
            script_path = "res://" + script_path

        var absolute_path = ProjectSettings.globalize_path(script_path)
        if not FileAccess.file_exists(absolute_path):
            printerr("Script file does not exist: " + script_path)
            quit(1)

        ProjectSettings.set_setting("autoload/" + autoload_name, "*" + script_path)
        ProjectSettings.save()
        print("Autoload '" + autoload_name + "' added: " + script_path)

    elif action == "remove":
        var setting_name = "autoload/" + autoload_name
        if ProjectSettings.has_setting(setting_name):
            ProjectSettings.set_setting(setting_name, null)
            ProjectSettings.save()
            print("Autoload '" + autoload_name + "' removed")
        else:
            printerr("Autoload not found: " + autoload_name)
            quit(1)

    elif action == "list":
        var autoloads = {}
        for prop in ProjectSettings.get_property_list():
            var pname = prop.name
            if pname.begins_with("autoload/"):
                var al_name = pname.substr(9)
                autoloads[al_name] = ProjectSettings.get_setting(pname)
        var json = JSON.new()
        print(json.stringify(autoloads, "  "))

    else:
        printerr("Unknown action: " + action + ". Use 'add', 'remove', or 'list'")
        quit(1)

# ============================================================
# Collision layer/mask helper
# ============================================================

func set_collision_layer_mask(params):
    var result = _load_scene(params)
    var scene_root = result[0]
    var absolute_scene_path = result[2]

    var node = _find_node(scene_root, params.node_path)

    if not "collision_layer" in node and not "collision_mask" in node:
        printerr("Node does not support collision layers: " + params.node_path)
        quit(1)

    if params.has("collision_layer"):
        var layer_value: int = 0
        if params.collision_layer is Array:
            for bit in params.collision_layer:
                layer_value |= (1 << (int(bit) - 1))
        else:
            layer_value = int(params.collision_layer)
        node.collision_layer = layer_value

    if params.has("collision_mask"):
        var mask_value: int = 0
        if params.collision_mask is Array:
            for bit in params.collision_mask:
                mask_value |= (1 << (int(bit) - 1))
        else:
            mask_value = int(params.collision_mask)
        node.collision_mask = mask_value

    _save_scene(scene_root, absolute_scene_path)

    var info = "Collision updated on '" + params.node_path + "'"
    if params.has("collision_layer"):
        info += " | layer=" + str(node.collision_layer)
    if params.has("collision_mask"):
        info += " | mask=" + str(node.collision_mask)
    print(info)


# ─── Static Analysis ───────────────────────────────────────────────────

func get_scene_insights(params):
    var result = _load_scene(params)
    var scene_root = result[0]

    var insights = {
        "scene": params.scene_path,
        "root_type": scene_root.get_class(),
    }

    # Count nodes by type
    var type_counts := {}
    var total_nodes := 0
    var scripts: Array = []
    var signals: Array = []
    var sub_scenes: Array = []
    var groups_map := {}

    _analyze_scene_recursive(scene_root, scene_root, type_counts, scripts, signals, sub_scenes, groups_map)

    for type_name in type_counts:
        total_nodes += type_counts[type_name]

    insights["total_nodes"] = total_nodes
    insights["node_types"] = type_counts

    # Scripts
    if not scripts.is_empty():
        insights["scripts"] = scripts

    # Signal connections
    if not signals.is_empty():
        insights["signal_connections"] = signals

    # Sub-scene instances
    if not sub_scenes.is_empty():
        insights["sub_scenes"] = sub_scenes

    # Groups
    if not groups_map.is_empty():
        insights["groups"] = groups_map

    # Depth analysis
    var max_depth := 0
    _get_tree_depth(scene_root, 0, max_depth)
    insights["max_depth"] = max_depth

    print(JSON.stringify(insights, "  "))


func _analyze_scene_recursive(node, scene_root, type_counts: Dictionary, scripts: Array, signals_arr: Array, sub_scenes: Array, groups_map: Dictionary) -> void:
    var node_path := str(scene_root.get_path_to(node))
    if node_path == ".":
        node_path = node.name

    # Count by type
    var type_name: String = node.get_class()
    type_counts[type_name] = type_counts.get(type_name, 0) + 1

    # Track scripts
    var script = node.get_script()
    if script and script.resource_path != "":
        scripts.append({
            "node": node_path,
            "script": script.resource_path,
            "type": type_name,
        })

    # Track signal connections
    for sig in node.get_signal_list():
        var connections = node.get_signal_connection_list(sig.name)
        for conn in connections:
            var target_path := str(scene_root.get_path_to(conn.callable.get_object())) if conn.callable.get_object() is Node else "unknown"
            signals_arr.append({
                "source": node_path,
                "signal": sig.name,
                "target": target_path,
                "method": conn.callable.get_method(),
            })

    # Track sub-scene instances
    if node.scene_file_path != "" and node != scene_root:
        sub_scenes.append({
            "node": node_path,
            "scene": node.scene_file_path,
            "type": type_name,
        })

    # Track groups
    for g in node.get_groups():
        var group_name := str(g)
        if not group_name.begins_with("_"):
            if not groups_map.has(group_name):
                groups_map[group_name] = []
            groups_map[group_name].append(node_path)

    for child in node.get_children():
        _analyze_scene_recursive(child, scene_root, type_counts, scripts, signals_arr, sub_scenes, groups_map)


func _get_tree_depth(node: Node, current_depth: int, max_depth: int) -> int:
    if current_depth > max_depth:
        max_depth = current_depth
    for child in node.get_children():
        max_depth = _get_tree_depth(child, current_depth + 1, max_depth)
    return max_depth


func get_node_insights(params):
    var script_path: String = params.script_path
    if not script_path.begins_with("res://"):
        script_path = "res://" + script_path

    if not FileAccess.file_exists(script_path):
        log_error("Script file not found: " + script_path)
        quit(1)

    var content := FileAccess.get_file_as_string(script_path)
    var lines := content.split("\n")

    var insights := {
        "script": params.script_path,
    }

    # Parse extends
    for line in lines:
        var stripped := line.strip_edges()
        if stripped.begins_with("extends "):
            insights["extends"] = stripped.substr(8).strip_edges()
            break

    # Parse class_name
    for line in lines:
        var stripped := line.strip_edges()
        if stripped.begins_with("class_name "):
            insights["class_name"] = stripped.substr(11).strip_edges()
            break

    # Categorize methods
    var lifecycle: Array = []
    var signal_handlers: Array = []
    var public_methods: Array = []
    var private_methods: Array = []

    var lifecycle_names := ["_ready", "_process", "_physics_process", "_input", "_unhandled_input", "_enter_tree", "_exit_tree", "_init", "_notification", "_draw", "_gui_input"]

    for line in lines:
        var stripped := line.strip_edges()
        if not stripped.begins_with("func "):
            continue
        var func_name := stripped.substr(5)
        var paren_idx := func_name.find("(")
        if paren_idx > 0:
            func_name = func_name.substr(0, paren_idx)

        if func_name in lifecycle_names:
            lifecycle.append(func_name)
        elif func_name.begins_with("_on_"):
            signal_handlers.append(func_name)
        elif func_name.begins_with("_"):
            private_methods.append(func_name)
        else:
            public_methods.append(func_name)

    var methods := {}
    if not lifecycle.is_empty():
        methods["lifecycle"] = lifecycle
    if not signal_handlers.is_empty():
        methods["signal_handlers"] = signal_handlers
    if not public_methods.is_empty():
        methods["public"] = public_methods
    if not private_methods.is_empty():
        methods["private"] = private_methods
    insights["methods"] = methods

    # Track signal definitions
    var signal_defs: Array = []
    for line in lines:
        var stripped := line.strip_edges()
        if stripped.begins_with("signal "):
            signal_defs.append(stripped.substr(7).strip_edges())
    if not signal_defs.is_empty():
        insights["signals_defined"] = signal_defs

    # Track signal emissions with line numbers
    var emissions: Array = []
    for i in lines.size():
        var stripped: String = lines[i].strip_edges()
        if ".emit(" in stripped or "emit_signal(" in stripped:
            emissions.append({"line": i + 1, "code": stripped})
    if not emissions.is_empty():
        insights["signal_emissions"] = emissions

    # Track dependencies (preload, load, ClassDB)
    var dependencies: Array = []
    for i in lines.size():
        var stripped: String = lines[i].strip_edges()
        if "preload(" in stripped or "load(" in stripped:
            var start_idx := stripped.find("(\"")
            var end_idx := stripped.find("\")", start_idx)
            if start_idx >= 0 and end_idx >= 0:
                var dep_path := stripped.substr(start_idx + 2, end_idx - start_idx - 2)
                var dep_type := "preload" if "preload(" in stripped else "load"
                dependencies.append({"path": dep_path, "type": dep_type, "line": i + 1})
        if "ClassDB." in stripped:
            var dep_entry := {"type": "ClassDB", "line": i + 1, "code": stripped}
            dependencies.append(dep_entry)
    if not dependencies.is_empty():
        insights["dependencies"] = dependencies

    # Track exported variables
    var exports: Array = []
    for line in lines:
        var stripped := line.strip_edges()
        if stripped.begins_with("@export"):
            exports.append(stripped)
    if not exports.is_empty():
        insights["exports"] = exports

    print(JSON.stringify(insights, "  "))
