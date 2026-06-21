# MCP Server Enhancement TODO

## High Priority

- [x] **`get_scene_tree`** — Read a scene's node tree, returning node names, types, properties, and hierarchy.
- [x] **`set_node_properties`** — Modify properties on existing nodes in a scene (position, scale, script, etc.).
- [x] **`attach_script`** — Assign a GDScript file to an existing node in a scene.
- [x] **`create_resource`** — Create .tres resource files with typed properties (e.g., ExitData, ItemData).
- [x] **`edit_project_settings`** — Modify project.godot entries (register autoloads, set input actions, display settings).

## Medium Priority

- [x] **`remove_node`** — Remove a node (and its children) from a scene.
- [x] **`reparent_node`** — Move a node to a different parent within the same scene.
- [x] **`connect_signal`** — Wire a signal from one node to a method on another node in a scene.
- [x] **`get_tile_data`** — Read existing tile cells from a TileMapLayer (complement to `set_cells`).

## Lower Priority

- [x] **`create_tileset`** — Create/configure TileSet resources with atlas sources and custom data layers.
- [x] **`export_project`** — Build/export projects for target platforms using configured presets.
- [x] **`validate_scene`** — Check a scene for common issues (missing scripts, textures, shapes, extreme positions).

## Round 2 — Advanced Features

### High Value

- [x] **`add_to_group`** / **`remove_from_group`** — Manage node group membership in scenes.
- [x] **`instantiate_scene`** — Add a scene as a child instance of another scene (e.g., spawn player in level).
- [x] **`add_animation`** — Add animations with tracks and keyframes to an existing AnimationPlayer.
- [x] **`read_script`** — Read GDScript file contents from a Godot project.

### Medium Value

- [x] **`set_custom_tile_data`** — Set custom data layer values on specific tile cells in a TileMapLayer.
- [x] **`duplicate_node`** — Clone a node within a scene with optional new name and parent.
- [x] **`get_node_properties`** — Read properties from a node (all non-default or specific list).

### Lower Value

- [x] **`create_animation_player`** — Create AnimationPlayer node with pre-configured animations.
- [x] **`manage_autoloads`** — Add, remove, or list autoload singletons in project.godot.
- [x] **`set_collision_layer_mask`** — Set collision layers/masks using layer numbers or raw bitmask.

## Round 3 — Visual Feedback

- [x] **`capture_screenshot`** — Render a scene and capture the viewport as a PNG screenshot for visual feedback.

## Round 4 — Interactive Game Control

- [x] **`run_interactive`** — Run a Godot project with injected TCP input receiver for interactive control.
- [x] **`send_input`** — Send input actions to a running interactive Godot project via TCP.
- [x] **`game_state`** — Query runtime game state (health, score, position, etc.) from autoloads.
- [x] **`game_screenshot`** — Capture a screenshot from a live running game with all runtime state.
- [x] **`list_input_actions`** — List all input actions defined in a project's project.godot.
- [x] **`write_script`** — Write or update a GDScript file in a Godot project.
- [x] **`rename_node`** — Rename a node in a scene while preserving all properties and connections.

## Round 5 — Infrastructure

- [x] **Modular architecture** — Split monolithic index.ts into handlers/, tool-router, tool-definitions, context, types, utils, etc.
- [x] **Automated tests** — 56 vitest integration tests calling handlers against real Godot + bundled fixture project.
- [x] **CI test pipeline** — GitHub Actions job with `chickensoft-games/setup-godot` + `xvfb-run` for headless testing.

## Round 6 — Bug Fixes & Improvements

### Bugs

- [x] **Race condition in `run_project` / `stop_project`** — `ctx.activeProcess.process.kill()` now awaits process exit via `killProcess()` helper before spawning a new one. (Upstream [#70](https://github.com/Coding-Solo/godot-mcp/issues/70))

### Already Fixed (upstream still open)

- [x] **JSON parsing errors on Windows** — Fixed by using `execFileAsync` (no shell, args as array) instead of `execAsync`. (Upstream [#49](https://github.com/Coding-Solo/godot-mcp/issues/49), [#20](https://github.com/Coding-Solo/godot-mcp/issues/20))
- [x] **False success on `add_node` / `create_scene`** — Same root cause as JSON parsing; `execFileAsync` fix resolves this. (Upstream [#55](https://github.com/Coding-Solo/godot-mcp/issues/55))
- [x] **Path traversal / RCE vulnerability** — `validatePath()` prevents escaping project directory. (Upstream [#64](https://github.com/Coding-Solo/godot-mcp/issues/64))
- [x] **Interactive game control** — `send_input`, `run_interactive`, `game_state`, `game_screenshot` tools. (Upstream [#68](https://github.com/Coding-Solo/godot-mcp/issues/68))
- [x] **Script binding & runtime tree** — `attach_script`, `game_state`, `edit_project_settings` cover these needs. (Upstream [#57](https://github.com/Coding-Solo/godot-mcp/issues/57))

## Round 7 — Runtime Introspection (extend existing TCP protocol)

Inspired by upstream [PR #72](https://github.com/Coding-Solo/godot-mcp/pull/72). Rather than adding a separate WebSocket bridge, extend our existing `input_receiver.gd` TCP protocol to support these commands.

### High Value

- [x] **`call_method`** — Invoke a method on a live node by path (e.g., `player.take_damage(10)`). Powerful for testing game logic at runtime.
- [x] **`evaluate_expression`** — Execute arbitrary GDScript expression at runtime and return the result. Useful for debugging and one-off queries.
- [x] **`find_nodes`** — Search the live runtime scene tree by name/type pattern. Useful for verifying spawned entities, finding nodes dynamically.

### Medium Value

- [x] **`send_key` / `send_mouse_click` / `send_mouse_drag`** — Granular input simulation (keyboard keys, mouse clicks at coordinates, drag operations). Our `send_input` only supports named actions.
- [x] **`wait_for_signal` / `wait_for_node`** — Block until a signal is emitted or a node appears in the tree. Useful for sequencing test steps.
- [x] **`get_performance_metrics`** — Retrieve FPS, draw calls, memory usage, etc. via `Performance` singleton. Useful for optimization workflows.

### Lower Value

- [x] **`reset_scene`** — Reload the current scene at runtime. Niche but handy for test loops.

## Round 8 — Static Analysis

- [x] **`get_scene_insights`** — Analyze a scene's architecture: signal flows, dependency mapping, component relationships, behavioral patterns. Gives the AI deeper understanding than raw node trees. (Upstream [PR #52](https://github.com/Coding-Solo/godot-mcp/pull/52))
- [x] **`get_node_insights`** — Behavioral profiling of scripts: method call classification, signal emission tracking, dependency extraction via preload/load/ClassDB. (Upstream [PR #52](https://github.com/Coding-Solo/godot-mcp/pull/52))

## Round 9 — Testing & Infrastructure

- [x] **`run_tests` (GUT support)** — Run GUT (Godot Unit Test) tests via headless Godot and return structured results. Lets the AI write game logic, run tests, and iterate. (Upstream [#29](https://github.com/Coding-Solo/godot-mcp/issues/29))
- [x] **Drop `fs-extra` dependency** — Build script now uses Node.js built-in `fs` and auto-discovers `*.gd` files instead of hardcoding each one.

## Round 10 — Godot 4.5 / 4.6 Features

Leverage new engine APIs from [Godot 4.5](https://godotengine.org/releases/4.5/) (Sep 2025) and [Godot 4.6](https://godotengine.org/releases/4.6/) (Jan 2026).

### High Value

- [x] **`get_runtime_errors`** — Hook into Godot 4.5's [`Logger`](https://docs.godotengine.org/en/4.5/tutorials/scripting/logging.html) class to capture GDScript errors, warnings, and script backtraces from the running game via TCP. Currently the AI is blind to runtime errors unless it reads debug output. Requires extending `input_receiver.gd` with a custom Logger that buffers messages.
- ~~**`get_objectdb_snapshot`**~~ — Dropped. Godot 4.6's [ObjectDB profiler](https://docs.godotengine.org/en/stable/tutorials/scripting/debug/objectdb_profiler.html) is debugger-UI-only with no GDScript API. Cannot enumerate live objects by type from scripts. Basic object/node/resource counts are already available via `get_performance_metrics`.
- ~~**`diff_objectdb_snapshots`**~~ — Dropped. Depends on `get_objectdb_snapshot` which has no scripting API.

### Medium Value

- ~~**`bake_shaders`**~~ — Dropped. Shader baking is an export preset option, not a standalone CLI flag. Already covered by `export_project` when the preset has shader baking enabled.

## Round 11 — Tool Filtering & Safety

Inspired by [github/github-mcp-server](https://github.com/github/github-mcp-server).

- [x] **Toolset filtering** — Enable/disable tool categories via `MCP_TOOLSETS` env var (e.g., `"scene,interactive,analysis"`). Reduces token overhead for users who only need a subset of tools.
- [x] **Read-only mode** — `MCP_READ_ONLY=true` blocks all write/mutating tools. Only read-only tools (get_scene_tree, read_script, game_state, run_tests, etc.) are exposed.
- [x] **Tool exclusion lists** — `MCP_EXCLUDE_TOOLS` env var to exclude specific tools by name (e.g., `"export_project,manage_autoloads"`).
- [x] **Tool metadata** — Every tool now has `category` and `readOnly` fields for programmatic filtering.

## Round 12 — Developer Experience

Tools discovered during real game development (building a CSD-style task management game in Godot 4.6).

### Interactive

- [x] **`send_key_sequence`** — Send a batch of key presses with inter-key delays and explicit waits, all processed server-side. Much faster than calling `send_key` repeatedly.
- [x] **`pause_game`** — Pause/unpause the game tree. MCP receiver stays active for state queries, screenshots, and property changes while paused.
- [x] **`set_property`** — Set a property on a live node at runtime. Auto-converts JSON arrays to Vector2/Vector3/Color based on the existing property type.
- [x] **`execute_script`** — Run multi-line GDScript code blocks at runtime (variables, loops, control flow). Unlike `evaluate_expression` which only handles single expressions. Autoload singletons are available as variables.
- [x] **`subscribe_signals`** / **`get_signal_events`** — Subscribe to signals on any node and retrieve buffered emissions later. Useful for monitoring game events (score changes, deaths, level transitions) without polling.

### Headless

- [x] **`validate_script`** — Check a GDScript file for syntax errors without running the project. Uses Godot's parser in headless mode.

### Future Considerations

- [ ] **Multi-instance support** — Run multiple Godot processes with IDs (e.g., "server", "client1", "client2") for multiplayer testing. (Upstream [PR #56](https://github.com/Coding-Solo/godot-mcp/pull/56))
- [ ] **Publish to NPM** — Make the fork installable via `npx` / `pnpm dlx`. (Upstream [#61](https://github.com/Coding-Solo/godot-mcp/issues/61))

## Round 13 — Asset Library Integration

The editor's Asset Store browser is just a client to a public REST API, so the search/download/install flow can be automated headlessly. (Targets the legacy Asset Library API, which is documented and scriptable; the new closed-beta Asset Store has no public API yet. The `libraryUrl` param keeps the source swappable.)

- [x] **`search_assets`** — Search the Godot Asset Library REST API for addons/templates (read-only, network).
- [x] **`install_asset`** — Download an asset by `assetId` (sha256-verified) or a direct zip URL and extract it into a project via Godot's `ZIPReader`. Strips the wrapping folder and rejects path-traversal (zip-slip) entries; enforces a download/extraction size cap.
