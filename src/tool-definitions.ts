export interface ToolDefinition {
  name: string;
  category: string;
  readOnly: boolean;
  /** Tool may perform destructive/irreversible changes (e.g. remove_node, stop_project). */
  destructive?: boolean;
  /** Tool produces the same result when called repeatedly with the same arguments. */
  idempotent?: boolean;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "launch_editor",
    category: "process",
    readOnly: false,
    description:
      "Launch the Godot editor GUI for a project. Does not run the game — use run_project or run_interactive for that.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
      },
      required: ["projectPath"],
    },
  },
  {
    name: "run_project",
    category: "process",
    readOnly: false,
    description:
      "Run the Godot project non-interactively and capture console output. No input, screenshots, or state queries — use run_interactive for those.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scene: {
          type: "string",
          description: "Optional: Specific scene to run",
        },
      },
      required: ["projectPath"],
    },
  },
  {
    name: "get_debug_output",
    category: "process",
    readOnly: true,
    description:
      "Get console output (stdout/stderr) from a running Godot project. Supports errors_only and tail filters. For structured errors with stack traces, use get_runtime_errors.",
    inputSchema: {
      type: "object",
      properties: {
        errorsOnly: {
          type: "boolean",
          description:
            "If true, only return error/warning lines (default: false)",
        },
        tail: {
          type: "number",
          description:
            "Only return the last N lines of output/errors (default: all)",
        },
      },
      required: [],
    },
  },
  {
    name: "stop_project",
    category: "process",
    readOnly: false,
    destructive: true,
    description:
      "Stop the currently running Godot project. Does not affect the editor launched via launch_editor.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_godot_version",
    category: "project",
    readOnly: true,
    description: "Get the installed Godot version",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "list_projects",
    category: "project",
    readOnly: true,
    description: "List Godot projects in a directory",
    inputSchema: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description: "Directory to search for Godot projects",
        },
        recursive: {
          type: "boolean",
          description: "Whether to search recursively (default: false)",
        },
      },
      required: ["directory"],
    },
  },
  {
    name: "get_project_info",
    category: "project",
    readOnly: true,
    description: "Retrieve metadata about a Godot project",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
      },
      required: ["projectPath"],
    },
  },
  {
    name: "create_scene",
    category: "scene",
    readOnly: false,
    description:
      "Create a new Godot scene (.tscn) file with a root node. Specify rootNodeType (e.g., 'Node2D', 'Node3D', 'Control'; defaults to 'Node2D').",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description:
            "Path where the scene file will be saved (relative to project)",
        },
        rootNodeType: {
          type: "string",
          description: "Type of the root node (e.g., Node2D, Node3D)",
        },
      },
      required: ["projectPath", "scenePath"],
    },
  },
  {
    name: "add_node",
    category: "node",
    readOnly: false,
    description:
      "Add a child node to a scene file on disk. Defaults to root if parentNodePath is omitted. For sub-scene instances, use instantiate_scene.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        parentNodePath: {
          type: "string",
          description:
            'Path to the parent node (e.g., "root" or "root/Player")',
        },
        nodeType: {
          type: "string",
          description: "Type of node to add (e.g., Sprite2D, CollisionShape2D)",
        },
        nodeName: {
          type: "string",
          description: "Name for the new node",
        },
        properties: {
          type: "object",
          description: "Optional properties to set on the node",
        },
      },
      required: ["projectPath", "scenePath", "nodeType", "nodeName"],
    },
  },
  {
    name: "load_sprite",
    category: "resource",
    readOnly: false,
    description: "Load a sprite into a Sprite2D node",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        nodePath: {
          type: "string",
          description:
            'Path to the Sprite2D node (e.g., "root/Player/Sprite2D")',
        },
        texturePath: {
          type: "string",
          description: "Path to the texture file (relative to project)",
        },
      },
      required: ["projectPath", "scenePath", "nodePath", "texturePath"],
    },
  },
  {
    name: "export_mesh_library",
    category: "resource",
    readOnly: false,
    description: "Export a scene as a MeshLibrary resource",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (.tscn) to export",
        },
        outputPath: {
          type: "string",
          description: "Path where the mesh library (.res) will be saved",
        },
        meshItemNames: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional: Names of specific mesh items to include (defaults to all)",
        },
      },
      required: ["projectPath", "scenePath", "outputPath"],
    },
  },
  {
    name: "save_scene",
    category: "scene",
    readOnly: false,
    description:
      "Save a scene file, optionally to a new path via newPath (creating a copy). Most editing tools save automatically; use this primarily for saving copies.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        newPath: {
          type: "string",
          description:
            "Optional: New path to save the scene to (for creating variants)",
        },
      },
      required: ["projectPath", "scenePath"],
    },
  },
  {
    name: "set_cells",
    category: "tilemap",
    readOnly: false,
    description: "Set tile cells on a TileMapLayer node in a scene",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        nodePath: {
          type: "string",
          description:
            'Path to the TileMapLayer node (e.g., "root/TileMapLayer")',
        },
        cells: {
          type: "array",
          items: {
            type: "object",
            properties: {
              x: { type: "integer", description: "Cell X coordinate" },
              y: { type: "integer", description: "Cell Y coordinate" },
              sourceId: { type: "integer", description: "TileSet source ID" },
              atlasX: { type: "integer", description: "Atlas X coordinate" },
              atlasY: { type: "integer", description: "Atlas Y coordinate" },
            },
            required: ["x", "y", "sourceId", "atlasX", "atlasY"],
          },
          description: "Array of cells to set on the TileMapLayer",
        },
      },
      required: ["projectPath", "scenePath", "nodePath", "cells"],
    },
  },
  {
    name: "get_scene_tree",
    category: "scene",
    readOnly: true,
    description:
      "Read a scene's node tree from a .tscn file on disk as JSON (names, types, properties, hierarchy). No running game required. For architecture analysis, use get_scene_insights.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
      },
      required: ["projectPath", "scenePath"],
    },
  },
  {
    name: "set_node_properties",
    category: "node",
    readOnly: false,
    description:
      "Set properties on a node in a saved scene file (.tscn) on disk permanently. For live runtime changes, use set_property instead.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        nodePath: {
          type: "string",
          description:
            'Path to the node (e.g., "root" or "root/Player/Sprite2D")',
        },
        properties: {
          type: "object",
          description:
            'Properties to set on the node (e.g., {"position": [100, 200], "scale": [2, 2]})',
        },
      },
      required: ["projectPath", "scenePath", "nodePath", "properties"],
    },
  },
  {
    name: "attach_script",
    category: "node",
    readOnly: false,
    description: "Attach a GDScript file to an existing node in a scene",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        nodePath: {
          type: "string",
          description: 'Path to the node (e.g., "root" or "root/Player")',
        },
        scriptPath: {
          type: "string",
          description:
            'Path to the GDScript file (relative to project, e.g., "scripts/player.gd")',
        },
      },
      required: ["projectPath", "scenePath", "nodePath", "scriptPath"],
    },
  },
  {
    name: "create_resource",
    category: "resource",
    readOnly: false,
    description: "Create a .tres resource file with typed properties",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        resourcePath: {
          type: "string",
          description:
            "Path where the .tres file will be saved (relative to project)",
        },
        resourceType: {
          type: "string",
          description:
            'Type of resource (e.g., "Resource") or path to a script with class_name',
        },
        scriptPath: {
          type: "string",
          description:
            "Optional: Path to a GDScript that defines the resource class",
        },
        properties: {
          type: "object",
          description: "Properties to set on the resource",
        },
      },
      required: ["projectPath", "resourcePath", "resourceType"],
    },
  },
  {
    name: "edit_project_settings",
    category: "settings",
    readOnly: false,
    description:
      "Modify project.godot settings (input actions, display, rendering, physics, etc.). For autoload singletons, prefer manage_autoloads.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        settings: {
          type: "object",
          description:
            'Settings to set, keyed by section/key path (e.g., {"autoload/GameState": "*res://scripts/autoload/game_state.gd", "display/window/size/viewport_width": 480})',
        },
      },
      required: ["projectPath", "settings"],
    },
  },
  {
    name: "remove_node",
    category: "node",
    readOnly: false,
    destructive: true,
    description: "Remove a node (and its children) from a scene",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        nodePath: {
          type: "string",
          description: 'Path to the node to remove (e.g., "root/OldNode")',
        },
      },
      required: ["projectPath", "scenePath", "nodePath"],
    },
  },
  {
    name: "reparent_node",
    category: "node",
    readOnly: false,
    description: "Move a node to a different parent within the same scene",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        nodePath: {
          type: "string",
          description: 'Path to the node to move (e.g., "root/Child")',
        },
        newParentPath: {
          type: "string",
          description: 'Path to the new parent node (e.g., "root/NewParent")',
        },
      },
      required: ["projectPath", "scenePath", "nodePath", "newParentPath"],
    },
  },
  {
    name: "connect_signal",
    category: "signal_group",
    readOnly: false,
    description:
      "Connect a signal from one node to a method on another node in a scene file (.tscn) on disk. For runtime signal monitoring, use subscribe_signals or send_key_sequence.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        sourceNodePath: {
          type: "string",
          description:
            'Path to the node emitting the signal (e.g., "root/Button")',
        },
        signalName: {
          type: "string",
          description: 'Name of the signal (e.g., "pressed")',
        },
        targetNodePath: {
          type: "string",
          description: 'Path to the node receiving the signal (e.g., "root")',
        },
        methodName: {
          type: "string",
          description:
            'Name of the method to call (e.g., "_on_button_pressed")',
        },
      },
      required: [
        "projectPath",
        "scenePath",
        "sourceNodePath",
        "signalName",
        "targetNodePath",
        "methodName",
      ],
    },
  },
  {
    name: "get_tile_data",
    category: "tilemap",
    readOnly: true,
    description: "Read existing tile cells from a TileMapLayer node in a scene",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        nodePath: {
          type: "string",
          description:
            'Path to the TileMapLayer node (e.g., "root/TileMapLayer")',
        },
      },
      required: ["projectPath", "scenePath", "nodePath"],
    },
  },
  {
    name: "create_tileset",
    category: "tilemap",
    readOnly: false,
    description:
      "Create a TileSet resource with atlas sources from texture files",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        resourcePath: {
          type: "string",
          description:
            "Path where the .tres file will be saved (relative to project)",
        },
        tileSize: {
          type: "object",
          properties: {
            x: {
              type: "integer",
              description: "Tile width in pixels (default: 16)",
            },
            y: {
              type: "integer",
              description: "Tile height in pixels (default: 16)",
            },
          },
          description: "Tile size in pixels (default: 16x16)",
        },
        atlasSources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              texturePath: {
                type: "string",
                description: "Path to the texture file (relative to project)",
              },
            },
            required: ["texturePath"],
          },
          description: "Array of atlas sources to add to the TileSet",
        },
        customDataLayers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: 'Layer name (e.g., "passable")',
              },
              type: {
                type: "string",
                description:
                  'Data type (e.g., "bool", "int", "float", "string")',
              },
            },
            required: ["name", "type"],
          },
          description: "Optional custom data layers to add to the TileSet",
        },
      },
      required: ["projectPath", "resourcePath", "atlasSources"],
    },
  },
  {
    name: "export_project",
    category: "settings",
    readOnly: false,
    description:
      "Export a Godot project for a target platform using a configured export preset",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        preset: {
          type: "string",
          description:
            "Name of the export preset (as defined in export_presets.cfg)",
        },
        outputPath: {
          type: "string",
          description: 'Path for the exported file (e.g., "build/game.exe")',
        },
        debug: {
          type: "boolean",
          description: "Export in debug mode (default: false)",
        },
      },
      required: ["projectPath", "preset", "outputPath"],
    },
  },
  {
    name: "validate_scene",
    category: "scene",
    readOnly: true,
    description:
      "Validate a scene for common issues (missing scripts, broken references, orphan nodes)",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
      },
      required: ["projectPath", "scenePath"],
    },
  },
  {
    name: "batch_operations",
    category: "scene",
    readOnly: false,
    description:
      "Execute multiple scene operations in a single Godot process invocation. Much faster than individual tool calls since each spawns a separate process. Use for 3+ operations.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        operations: {
          type: "array",
          description:
            "Array of operations to execute sequentially in one process",
          items: {
            type: "object",
            properties: {
              operation: {
                type: "string",
                description:
                  'The operation name (e.g., "add_node", "set_node_properties", "attach_script", "connect_signal")',
              },
              params: {
                type: "object",
                description:
                  "Parameters for the operation (same as the individual tool, minus projectPath)",
              },
            },
            required: ["operation", "params"],
          },
        },
      },
      required: ["projectPath", "operations"],
    },
  },
  {
    name: "get_uid",
    category: "uid",
    readOnly: true,
    description:
      "Get the UID for a specific file in a Godot project (for Godot 4.4+)",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        filePath: {
          type: "string",
          description:
            "Path to the file (relative to project) for which to get the UID",
        },
      },
      required: ["projectPath", "filePath"],
    },
  },
  {
    name: "update_project_uids",
    category: "uid",
    readOnly: false,
    description:
      "Update UID references in a Godot project by resaving resources (for Godot 4.4+)",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
      },
      required: ["projectPath"],
    },
  },
  {
    name: "add_to_group",
    category: "signal_group",
    readOnly: false,
    description: "Add a node to one or more groups in a scene",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        nodePath: {
          type: "string",
          description: "Path to the node (e.g., 'root/Player')",
        },
        groups: {
          type: "array",
          items: { type: "string" },
          description: "Array of group names to add the node to",
        },
      },
      required: ["projectPath", "scenePath", "nodePath", "groups"],
    },
  },
  {
    name: "remove_from_group",
    category: "signal_group",
    readOnly: false,
    destructive: true,
    description: "Remove a node from one or more groups in a scene",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        nodePath: {
          type: "string",
          description: "Path to the node (e.g., 'root/Player')",
        },
        groups: {
          type: "array",
          items: { type: "string" },
          description: "Array of group names to remove the node from",
        },
      },
      required: ["projectPath", "scenePath", "nodePath", "groups"],
    },
  },
  {
    name: "instantiate_scene",
    category: "resource",
    readOnly: false,
    description:
      "Add a scene as a child instance of another scene (e.g., spawn a player scene inside a level)",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the parent scene file (relative to project)",
        },
        childScenePath: {
          type: "string",
          description: "Path to the scene to instantiate (relative to project)",
        },
        parentNodePath: {
          type: "string",
          description:
            "Path to the parent node within the scene (default: root)",
        },
        nodeName: {
          type: "string",
          description: "Custom name for the instanced node",
        },
        position: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            z: { type: "number" },
          },
          description: "Position for the instanced node",
        },
      },
      required: ["projectPath", "scenePath", "childScenePath"],
    },
  },
  {
    name: "add_animation",
    category: "animation",
    readOnly: false,
    description:
      "Add an animation with tracks and keyframes to an existing AnimationPlayer node. To create the AnimationPlayer itself, use create_animation_player first.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        nodePath: {
          type: "string",
          description: "Path to the AnimationPlayer node",
        },
        animationName: {
          type: "string",
          description: "Name of the animation to create",
        },
        length: {
          type: "number",
          description: "Animation length in seconds (default: 1.0)",
        },
        loop: {
          type: "boolean",
          description: "Whether the animation should loop (default: false)",
        },
        tracks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Node path and property (e.g., 'Sprite2D:frame')",
              },
              type: {
                type: "string",
                enum: ["value", "method", "bezier"],
                description: "Track type (default: value)",
              },
              interpolation: {
                type: "string",
                enum: ["nearest", "linear", "cubic"],
              },
              keyframes: {
                type: "array",
                items: {
                  type: "object",
                  properties: { time: { type: "number" }, value: {} },
                  required: ["time", "value"],
                },
              },
            },
            required: ["path"],
          },
          description: "Animation tracks with keyframes",
        },
      },
      required: ["projectPath", "scenePath", "nodePath", "animationName"],
    },
  },
  {
    name: "read_script",
    category: "script",
    readOnly: true,
    description:
      "Read the contents of a GDScript file from a Godot project. Returns the full source code as text.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scriptPath: {
          type: "string",
          description: "Path to the script file (relative to project)",
        },
      },
      required: ["projectPath", "scriptPath"],
    },
  },
  {
    name: "write_script",
    category: "script",
    readOnly: false,
    description:
      "Write or overwrite a GDScript file in a Godot project. Creates parent directories if needed. Use validate_script afterward to check for syntax errors.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scriptPath: {
          type: "string",
          description:
            'Path to the script file (relative to project, e.g., "scripts/player.gd")',
        },
        content: {
          type: "string",
          description: "The GDScript source code to write",
        },
      },
      required: ["projectPath", "scriptPath", "content"],
    },
  },
  {
    name: "set_custom_tile_data",
    category: "tilemap",
    readOnly: false,
    description:
      "Set custom data layer values on specific tile cells in a TileMapLayer",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        nodePath: {
          type: "string",
          description: "Path to the TileMapLayer node",
        },
        cells: {
          type: "array",
          items: {
            type: "object",
            properties: {
              x: { type: "integer" },
              y: { type: "integer" },
              customData: {
                type: "object",
                description:
                  "Key-value pairs of custom data layer name to value",
              },
            },
            required: ["x", "y", "customData"],
          },
          description: "Array of cells with custom data to set",
        },
      },
      required: ["projectPath", "scenePath", "nodePath", "cells"],
    },
  },
  {
    name: "duplicate_node",
    category: "node",
    readOnly: false,
    description:
      "Duplicate a node within a scene, optionally with a new name or different parent",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        nodePath: {
          type: "string",
          description: "Path to the node to duplicate",
        },
        newName: {
          type: "string",
          description: "Name for the duplicated node",
        },
        parentNodePath: {
          type: "string",
          description:
            "Path to parent for the duplicate (default: same parent as original)",
        },
      },
      required: ["projectPath", "scenePath", "nodePath"],
    },
  },
  {
    name: "rename_node",
    category: "node",
    readOnly: false,
    description:
      "Rename a node in a scene file. Updates the node's name while keeping all properties, children, and connections intact.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        nodePath: {
          type: "string",
          description: 'Path to the node to rename (e.g., "root/OldName")',
        },
        newName: {
          type: "string",
          description: "The new name for the node",
        },
      },
      required: ["projectPath", "scenePath", "nodePath", "newName"],
    },
  },
  {
    name: "get_node_properties",
    category: "node",
    readOnly: true,
    description:
      "Read properties from a node in a saved scene file (.tscn) on disk. Returns all non-default properties, or specific ones if listed. For runtime properties, use evaluate_expression.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        nodePath: { type: "string", description: "Path to the node" },
        properties: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional: specific property names to read (default: all)",
        },
      },
      required: ["projectPath", "scenePath", "nodePath"],
    },
  },
  {
    name: "create_animation_player",
    category: "animation",
    readOnly: false,
    description:
      "Create an AnimationPlayer node in a scene with optional pre-configured animations. To add animations to an existing player, use add_animation.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        parentNodePath: {
          type: "string",
          description: "Path to the parent node (default: root)",
        },
        nodeName: {
          type: "string",
          description:
            "Name for the AnimationPlayer (default: 'AnimationPlayer')",
        },
        animations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              length: { type: "number" },
              loop: { type: "boolean" },
              tracks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    path: { type: "string" },
                    keyframes: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          time: { type: "number" },
                          value: {},
                        },
                        required: ["time", "value"],
                      },
                    },
                  },
                  required: ["path"],
                },
              },
            },
            required: ["name"],
          },
          description: "Animations to create with the player",
        },
      },
      required: ["projectPath", "scenePath"],
    },
  },
  {
    name: "manage_autoloads",
    category: "settings",
    readOnly: false,
    description: "Add, remove, or list autoload singletons in project.godot",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        action: {
          type: "string",
          enum: ["add", "remove", "list"],
          description: "Action to perform",
        },
        name: {
          type: "string",
          description: "Autoload name (required for add/remove)",
        },
        scriptPath: {
          type: "string",
          description:
            "Path to the script (required for add, relative to project)",
        },
      },
      required: ["projectPath", "action"],
    },
  },
  {
    name: "set_collision_layer_mask",
    category: "node",
    readOnly: false,
    description:
      "Set collision layer and/or mask on a physics node. Accepts layer numbers (1-32) as array or raw bitmask.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description: "Path to the scene file (relative to project)",
        },
        nodePath: {
          type: "string",
          description: "Path to the physics node",
        },
        collisionLayer: {
          description: "Array of layer numbers [1,2,3] or raw bitmask integer",
        },
        collisionMask: {
          description: "Array of mask numbers [1,2,3] or raw bitmask integer",
        },
      },
      required: ["projectPath", "scenePath", "nodePath"],
    },
  },
  {
    name: "capture_screenshot",
    category: "screenshot",
    readOnly: true,
    description:
      "Render a scene file statically and save the viewport as a PNG. No running game needed. For live game captures, use game_screenshot or run_and_capture. Requires a display server.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scenePath: {
          type: "string",
          description:
            'Path to the scene file to capture (relative to project, e.g., "scenes/main.tscn"). If omitted, captures the project\'s main scene.',
        },
        outputPath: {
          type: "string",
          description:
            'Path where the screenshot PNG will be saved. Defaults to "<projectPath>/screenshots/capture.png".',
        },
        width: {
          type: "number",
          description:
            "Override viewport width in pixels. Both width and height must be specified together.",
        },
        height: {
          type: "number",
          description:
            "Override viewport height in pixels. Both width and height must be specified together.",
        },
        waitFrames: {
          type: "number",
          description:
            "Number of frames to wait before capturing (default: 3). Increase for scenes with loading animations or particle effects.",
        },
      },
      required: ["projectPath"],
    },
  },
  {
    name: "run_and_capture",
    category: "screenshot",
    readOnly: true,
    description:
      "Run the project for a duration, capture a screenshot, then stop. Runs the full game (unlike capture_screenshot) without needing run_interactive (unlike game_screenshot). Requires a display server.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scene: {
          type: "string",
          description: "Optional: Specific scene to run",
        },
        duration: {
          type: "number",
          description:
            "How long to run the game in seconds before capturing (default: 3)",
        },
        outputPath: {
          type: "string",
          description:
            'Path where the screenshot PNG will be saved. Defaults to "<projectPath>/screenshots/capture.png".',
        },
      },
      required: ["projectPath"],
    },
  },
  {
    name: "send_input",
    category: "interactive",
    readOnly: false,
    description:
      "Send a Godot InputMap action (e.g., 'move_up', 'jump') to a running interactive project. For raw keyboard keys, use send_key or send_key_sequence. Requires run_interactive.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description:
            'The input action name (e.g., "move_up", "move_left", "restart")',
        },
        pressed: {
          type: "boolean",
          description:
            "Whether the action is pressed (true) or released (false). Default: true. For simple actions, just send pressed=true — the game handles it as a single press.",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "list_input_actions",
    category: "settings",
    readOnly: true,
    description:
      "List all input actions defined in a project's project.godot (the InputMap). Useful before using send_input. No running game required.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
      },
      required: ["projectPath"],
    },
  },
  {
    name: "run_interactive",
    category: "interactive",
    readOnly: false,
    description:
      "Run a Godot project with MCP input receiver injected. Enables send_input, screenshots, and state queries via TCP. Use instead of run_project for interactive testing.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory",
        },
        scene: {
          type: "string",
          description: "Optional: Specific scene to run",
        },
      },
      required: ["projectPath"],
    },
  },
  {
    name: "game_state",
    category: "interactive",
    readOnly: true,
    description:
      'Get current game state (health, score, position, etc.) from autoloads. For inline state captures during input, use send_key_sequence with {"state": true}. Requires run_interactive.',
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "call_method",
    category: "interactive",
    readOnly: false,
    description:
      'Invoke a method on a live node in a running interactive Godot project. Resolves the node by path relative to the current scene (e.g., "Player", "World/Enemies/Boss") and calls the named method with optional arguments. Returns the serialized result. The project must be running via run_interactive.',
    inputSchema: {
      type: "object",
      properties: {
        nodePath: {
          type: "string",
          description:
            'Path to the target node relative to the current scene root (e.g., "Player", "UI/HealthBar"). Also accepts absolute paths like "/root/GameState".',
        },
        method: {
          type: "string",
          description:
            'The method name to call on the node (e.g., "take_damage", "get_health", "set_position").',
        },
        args: {
          type: "array",
          description:
            "Arguments to pass to the method. Default: [] (no arguments).",
          items: {},
        },
      },
      required: ["nodePath", "method"],
    },
  },
  {
    name: "find_nodes",
    category: "interactive",
    readOnly: true,
    description:
      "Search the live runtime scene tree by name pattern and/or type, including dynamically spawned nodes. For static .tscn analysis, use get_scene_tree. Requires run_interactive.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description:
            'Glob-style name pattern to match (e.g., "Enemy*", "*Spawn*"). Default: "*" (all nodes).',
        },
        typeFilter: {
          type: "string",
          description:
            'Filter by Godot class name (e.g., "CharacterBody2D", "Area2D", "Sprite2D"). Uses is_class() so subclasses match too.',
        },
      },
      required: [],
    },
  },
  {
    name: "evaluate_expression",
    category: "interactive",
    readOnly: true,
    description:
      'Execute an arbitrary GDScript expression at runtime and return the result. The expression runs in the context of the current scene (e.g., "get_tree().current_scene.name", "Vector2(1,2).length()"). Useful for debugging, querying state, and one-off calculations. The project must be running via run_interactive.',
    inputSchema: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description:
            'The GDScript expression to evaluate (e.g., "get_tree().current_scene.name", "$Player.position", "2 + 2").',
        },
      },
      required: ["expression"],
    },
  },
  {
    name: "game_screenshot",
    category: "interactive",
    readOnly: true,
    description:
      'Capture a screenshot from a running interactive project showing live game state. For inline captures during input, use send_key_sequence with {"screenshot": "path"}. Requires run_interactive.',
    inputSchema: {
      type: "object",
      properties: {
        outputPath: {
          type: "string",
          description:
            "Path where the screenshot PNG will be saved. Defaults to project screenshots/capture.png.",
        },
      },
      required: [],
    },
  },
  {
    name: "send_key",
    category: "interactive",
    readOnly: false,
    description:
      'Send a single keyboard key event to a running interactive Godot project. Supports any key name recognized by Godot (e.g., "space", "a", "escape", "f1") and modifier keys. For sending multiple keys, prefer send_key_sequence — it processes all keys server-side in one round-trip with optional state/screenshot checkpoints. The project must be running via run_interactive.',
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description:
            'The key name (e.g., "space", "a", "escape", "enter", "f1", "up", "down").',
        },
        pressed: {
          type: "boolean",
          description:
            "Whether the key is pressed (true) or released (false). Default: true.",
        },
        shift: {
          type: "boolean",
          description: "Hold Shift modifier. Default: false.",
        },
        ctrl: {
          type: "boolean",
          description: "Hold Ctrl modifier. Default: false.",
        },
        alt: {
          type: "boolean",
          description: "Hold Alt modifier. Default: false.",
        },
        meta: {
          type: "boolean",
          description: "Hold Meta/Windows/Command modifier. Default: false.",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "send_mouse_click",
    category: "interactive",
    readOnly: false,
    description:
      "Send a mouse click (press+release) at specific coordinates. For cursor movement, use send_mouse_motion. For dragging, use send_mouse_drag. Requires run_interactive.",
    inputSchema: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "X coordinate in viewport pixels.",
        },
        y: {
          type: "number",
          description: "Y coordinate in viewport pixels.",
        },
        button: {
          type: "string",
          enum: ["left", "right", "middle"],
          description: 'Mouse button to click. Default: "left".',
        },
        doubleClick: {
          type: "boolean",
          description: "Whether this is a double click. Default: false.",
        },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "send_mouse_motion",
    category: "interactive",
    readOnly: false,
    description:
      "Move the mouse cursor to specific coordinates without clicking. Use for hover effects, aiming, and cursor tracking. Requires run_interactive.",
    inputSchema: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "X coordinate in viewport pixels.",
        },
        y: {
          type: "number",
          description: "Y coordinate in viewport pixels.",
        },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "send_mouse_drag",
    category: "interactive",
    readOnly: false,
    description:
      "Send a mouse drag (press, move, release) from one position to another. For simple clicks, use send_mouse_click. Requires run_interactive.",
    inputSchema: {
      type: "object",
      properties: {
        fromX: {
          type: "number",
          description: "Starting X coordinate.",
        },
        fromY: {
          type: "number",
          description: "Starting Y coordinate.",
        },
        toX: {
          type: "number",
          description: "Ending X coordinate.",
        },
        toY: {
          type: "number",
          description: "Ending Y coordinate.",
        },
        steps: {
          type: "integer",
          description:
            "Number of intermediate motion events (default: 10). Higher = smoother drag.",
        },
        button: {
          type: "string",
          enum: ["left", "right", "middle"],
          description: 'Mouse button for the drag. Default: "left".',
        },
      },
      required: ["fromX", "fromY", "toX", "toY"],
    },
  },
  {
    name: "wait_for_signal",
    category: "interactive",
    readOnly: true,
    description:
      'Block until a signal is emitted on a node in the running game. Useful for sequencing test steps (e.g., wait for "animation_finished" or "died"). Returns whether the signal was received or the wait timed out. The project must be running via run_interactive.',
    inputSchema: {
      type: "object",
      properties: {
        nodePath: {
          type: "string",
          description:
            'Path to the node emitting the signal (e.g., "Player", "AnimationPlayer").',
        },
        signal: {
          type: "string",
          description:
            'Name of the signal to wait for (e.g., "died", "animation_finished").',
        },
        timeout: {
          type: "number",
          description:
            "Maximum seconds to wait before timing out (default: 5).",
        },
      },
      required: ["nodePath", "signal"],
    },
  },
  {
    name: "wait_for_node",
    category: "interactive",
    readOnly: true,
    description:
      'Block until a node appears in the scene tree. Useful for waiting on dynamically spawned nodes (e.g., wait for "Player/Sword" to appear after equip). Returns whether the node was found or the wait timed out. The project must be running via run_interactive.',
    inputSchema: {
      type: "object",
      properties: {
        nodePath: {
          type: "string",
          description:
            'Path to the node to wait for (e.g., "Player/Sword", "Enemies/Boss").',
        },
        timeout: {
          type: "number",
          description:
            "Maximum seconds to wait before timing out (default: 5).",
        },
      },
      required: ["nodePath"],
    },
  },
  {
    name: "get_performance_metrics",
    category: "interactive",
    readOnly: true,
    description:
      "Retrieve performance metrics (FPS, draw calls, memory, node count, etc.) from a running project. Optionally filter to specific metrics. Requires run_interactive.",
    inputSchema: {
      type: "object",
      properties: {
        metrics: {
          type: "array",
          items: { type: "string" },
          description:
            'Optional list of specific metrics to return (e.g., ["fps", "draw_calls", "node_count"]). Default: all metrics.',
        },
      },
      required: [],
    },
  },
  {
    name: "reset_scene",
    category: "interactive",
    readOnly: false,
    destructive: true,
    description:
      "Reload the current scene in a running interactive Godot project. Useful for resetting game state during test loops. The project must be running via run_interactive.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_runtime_errors",
    category: "interactive",
    readOnly: true,
    description:
      "Retrieve runtime errors, warnings, and backtraces since the last call. Returns structured entries with error type, source, and stack traces. Requires Godot 4.5+ and run_interactive.",
    inputSchema: {
      type: "object",
      properties: {
        clear: {
          type: "boolean",
          description:
            "Whether to clear the error buffer after reading (default: true). Set to false to peek without consuming.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_scene_insights",
    category: "analysis",
    readOnly: true,
    description:
      "Analyze a scene's architecture: type distribution, signals, sub-scenes, scripts, groups, and tree depth. Runs headless (no game needed).",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory.",
        },
        scenePath: {
          type: "string",
          description:
            'Path to the scene file (relative to project, e.g., "scenes/main.tscn").',
        },
      },
      required: ["projectPath", "scenePath"],
    },
  },
  {
    name: "get_node_insights",
    category: "analysis",
    readOnly: true,
    description:
      "Analyze a GDScript file: classify methods, identify signals, map dependencies, and list exports. Takes a scriptPath, not a nodePath. Runs headless (no game needed).",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory.",
        },
        scriptPath: {
          type: "string",
          description:
            'Path to the GDScript file (relative to project, e.g., "scripts/player.gd").',
        },
      },
      required: ["projectPath", "scriptPath"],
    },
  },
  {
    name: "run_tests",
    category: "testing",
    readOnly: true,
    description:
      "Run GUT (Godot Unit Testing) tests via headless Godot. Requires GUT installed (addons/gut/). Returns pass/fail summary and console output.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory.",
        },
        testDir: {
          type: "string",
          description:
            "Test directory (relative to project or res:// path). Default: from .gutconfig.json or res://test.",
        },
        testScript: {
          type: "string",
          description:
            "Specific test script to run (e.g., 'test_player.gd'). Omit to run all tests.",
        },
        testMethod: {
          type: "string",
          description:
            "Specific test method to run (e.g., 'test_health_decreases'). Most useful with testScript.",
        },
        includeSubdirs: {
          type: "boolean",
          description:
            "Search subdirectories for test scripts (default: true).",
        },
        configPath: {
          type: "string",
          description:
            "Path to .gutconfig.json (relative to project or res:// path). Uses GUT defaults if omitted.",
        },
        logLevel: {
          type: "integer",
          description:
            "GUT log verbosity: 0 (errors only) to 3 (everything). Default: GUT's default.",
        },
        timeout: {
          type: "number",
          description:
            "Maximum time in seconds to wait for tests to complete (default: 120).",
        },
      },
      required: ["projectPath"],
    },
  },

  // ── New interactive tools ───────────────────────────────────────────

  {
    name: "send_key_sequence",
    category: "interactive",
    readOnly: false,
    description:
      'Primary gameplay testing tool. Sends multiple keys in one round-trip with inline checkpoints: collectSignals for signal events, {"state": true} for state snapshots, {"screenshot": "path"} for captures. Requires run_interactive.',
    inputSchema: {
      type: "object",
      properties: {
        keys: {
          type: "array",
          description:
            'Array of key names or control objects. Strings are key names (e.g., "a", "enter", "space"). Objects: {"wait": 500} inserts a delay in ms, {"screenshot": "/path/to/file.png"} captures a screenshot at that point, {"state": true} captures a game state snapshot. Example: ["1", "a", {"state": true}, "o", {"wait": 2000}, {"screenshot": "/tmp/mid.png"}, "s"]',
          items: {},
        },
        delayMs: {
          type: "number",
          description:
            "Default delay in milliseconds between each key press (default: 50). Individual waits in the keys array override this.",
        },
        collectSignals: {
          type: "array",
          description:
            "Subscribe to signals during the sequence and return captured events in the response. Each entry specifies a node and its signals to monitor.",
          items: {
            type: "object",
            properties: {
              nodePath: {
                type: "string",
                description:
                  'Path to the node emitting signals (e.g., "/root/EventBus", "Player").',
              },
              signals: {
                type: "array",
                description:
                  'Signal names to subscribe to (e.g., ["task_completed", "died"]).',
                items: { type: "string" },
              },
            },
            required: ["nodePath", "signals"],
          },
        },
      },
      required: ["keys"],
    },
  },

  {
    name: "send_joypad_button",
    category: "interactive",
    readOnly: false,
    description:
      "Send a gamepad button event (A, B, X, Y, shoulders, dpad, start, etc.) to a running project. For input actions, prefer send_input. Requires run_interactive.",
    inputSchema: {
      type: "object",
      properties: {
        button: {
          type: "string",
          description:
            'The gamepad button name. Standard buttons: "a", "b", "x", "y", "lb"/"left_shoulder", "rb"/"right_shoulder", "lt"/"left_stick", "rt"/"right_stick", "dpad_up", "dpad_down", "dpad_left", "dpad_right", "start", "back"/"select", "guide". Additional: "misc1", "paddle1"-"paddle4", "touchpad".',
        },
        pressed: {
          type: "boolean",
          description:
            "Whether the button is pressed (true) or released (false). Default: true.",
        },
        device: {
          type: "integer",
          description:
            "Controller device index (default: 0). Use for multi-controller testing.",
        },
      },
      required: ["button"],
    },
  },

  {
    name: "send_joypad_motion",
    category: "interactive",
    readOnly: false,
    description:
      "Send a gamepad analog stick or trigger axis event. Simulates analog input with float precision. For input actions, prefer send_input. Requires run_interactive.",
    inputSchema: {
      type: "object",
      properties: {
        axis: {
          type: "string",
          description:
            'The axis name: "left_x", "left_y" (left stick), "right_x", "right_y" (right stick), "trigger_left", "trigger_right" (analog triggers).',
        },
        value: {
          type: "number",
          description:
            "Axis value. Sticks: -1.0 to 1.0 (left/up = negative, right/down = positive). Triggers: 0.0 to 1.0.",
        },
        device: {
          type: "integer",
          description:
            "Controller device index (default: 0). Use for multi-controller testing.",
        },
      },
      required: ["axis", "value"],
    },
  },

  {
    name: "pause_game",
    category: "interactive",
    readOnly: false,
    description:
      "Pause or unpause a running project. MCP receiver stays active for screenshots, state queries, and property changes while paused. Requires run_interactive.",
    inputSchema: {
      type: "object",
      properties: {
        paused: {
          type: "boolean",
          description:
            "Whether to pause (true) or unpause (false) the game. Default: true.",
        },
      },
      required: [],
    },
  },

  {
    name: "set_property",
    category: "interactive",
    readOnly: false,
    description:
      "Set a property on a live node at runtime. Changes are immediate but NOT saved to disk — use set_node_properties for permanent changes. Requires run_interactive.",
    inputSchema: {
      type: "object",
      properties: {
        nodePath: {
          type: "string",
          description:
            'Path to the target node relative to current scene root (e.g., "Player", "UI/HealthBar"). Also accepts absolute paths like "/root/GameManager".',
        },
        property: {
          type: "string",
          description:
            'The property name to set (e.g., "score", "position", "health").',
        },
        value: {
          description:
            "The value to set. Supports numbers, strings, booleans, arrays (for Vector2/Vector3), and dictionaries.",
        },
      },
      required: ["nodePath", "property", "value"],
    },
  },

  {
    name: "validate_script",
    category: "script",
    readOnly: true,
    description:
      "Validate a GDScript file for syntax errors using Godot's parser in headless mode. No running game needed.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Godot project directory.",
        },
        scriptPath: {
          type: "string",
          description:
            'Path to the GDScript file to validate (relative to project, e.g., "scripts/player.gd").',
        },
      },
      required: ["projectPath", "scriptPath"],
    },
  },

  {
    name: "execute_script",
    category: "interactive",
    readOnly: false,
    description:
      "Execute a multi-line GDScript block at runtime in the current scene context. Unlike evaluate_expression, supports variables, loops, and control flow. Requires run_interactive.",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description:
            'The GDScript code to execute. Runs as a function body in the context of the current scene. Use "return x" to return a value. Example: "var p = $Player\\nreturn p.position"',
        },
      },
      required: ["code"],
    },
  },

  {
    name: "subscribe_signals",
    category: "interactive",
    readOnly: false,
    description:
      "Subscribe to signals on a node for persistent monitoring. Retrieve with get_signal_events. For single-sequence monitoring, prefer send_key_sequence with collectSignals. Requires run_interactive.",
    inputSchema: {
      type: "object",
      properties: {
        nodePath: {
          type: "string",
          description:
            'Path to the node to subscribe to (e.g., "Player", "/root/EventBus").',
        },
        signals: {
          type: "array",
          description:
            'Array of signal names to subscribe to (e.g., ["died", "health_changed"]).',
          items: { type: "string" },
        },
      },
      required: ["nodePath", "signals"],
    },
  },

  {
    name: "get_signal_events",
    category: "interactive",
    readOnly: true,
    description:
      "Retrieve buffered signal events from subscribe_signals. Returns signal name, arguments, and timestamp; clears buffer by default. Requires run_interactive.",
    inputSchema: {
      type: "object",
      properties: {
        clear: {
          type: "boolean",
          description:
            "Whether to clear the event buffer after reading (default: true). Set to false to peek without consuming.",
        },
      },
      required: [],
    },
  },
  {
    name: "discover_tools",
    category: "meta",
    readOnly: true,
    description:
      "List available tools by category. Categories: process, project, scene, node, animation, tilemap, resource, script, signal_group, uid, settings, interactive, screenshot, analysis, testing, meta.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description:
            "Filter by category name (e.g. 'scene', 'node', 'interactive'). Omit to list all categories with tool counts.",
        },
      },
      required: [],
    },
  },
];
