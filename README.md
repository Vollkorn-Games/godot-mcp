<div align="center">

# Godot MCP

**Give your AI assistant full control over the Godot game engine.**

Build scenes, write scripts, run games, send input, capture screenshots, and query live game state — all through natural language.

[![CI](https://github.com/Vollkorn-Games/godot-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Vollkorn-Games/godot-mcp/actions/workflows/ci.yml)
[![MCP Server](https://badge.mcpx.dev?type=server "MCP Server")](https://modelcontextprotocol.io/introduction)
[![MCP 2026-07-28](https://img.shields.io/badge/MCP-2026--07--28_stateless-8A2BE2?style=flat)](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
[![Made with Godot](https://img.shields.io/badge/Godot%204.x-478CBF?style=flat&logo=godot%20engine&logoColor=white)](https://godotengine.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white "TypeScript")](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg "MIT License")](https://opensource.org/licenses/MIT)

</div>

```
                       (((((((             (((((((
                    (((((((((((           (((((((((((
                    (((((((((((((       (((((((((((((
                    (((((((((((((((((((((((((((((((((
     (((((      (((((((((((((((((((((((((((((((((((((((((      (((((
   (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((
  ((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((
    (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((
      (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((
       (((((((((@@@@@@@(((((((((((((((((((((((((@@@@@@@@((((((((((
       ((((((@@@@,,,,,@@@((((((((((((((((((((@@@,,,,,@@@@(((((((((
       (((((@@,,,,,,,,,@@(((((((@@@@@(((((((@@,,,,,,,,,@@@((((((((
       ((((((@@,,,,,,,@@(((((((@@@@@((((((((@@,,,,,,,@@@(((((((((
       (((((((((@@@@@@(((((((((@@@@@(((((((((((@@@@@@((((((((((((
       (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((
       @@@@@@@@@@@@@(((((((((((@@@@@@@@@@@@@@(((((((((((@@@@@@@@@@@@@@
       (((((((( @@@(((((((((((@@(((((((((((@@(((((((((((@@@ ((((((((
       ((((((((( @@(((((((((@@@(((((((((((@@@((((((((((@@ (((((((((
        ((((((((((@@@@@@@@@@@@@@(((((((((((@@@@@@@@@@@@@@((((((((((
         ((((((((((((((((((((((((((((((((((((((((((((((((((((((((
            (((((((((((((((((((((((((((((((((((((((((((((((((
                    (((((((((((((((((((((((((((((((((

          G O D O T    x    M O D E L   C O N T E X T   P R O T O C O L
```

> Fork of [Coding-Solo/godot-mcp](https://github.com/Coding-Solo/godot-mcp), extended with interactive game control, persistent TCP communication, script authoring, automated tests, and more.

## Highlights

- **75 tools** covering the full game-dev loop: projects, scenes, nodes, scripts, resources, tilemaps, animation, settings, exports
- **Interactive play-testing** — run the game, send keyboard/mouse/gamepad input, query live state, wait for signals, capture the viewport
- **Batched test sequences** — keys, waits, screenshots, state snapshots, and signal collection in a single round-trip
- **Stateless MCP `2026-07-28`** on SDK v2 — no handshake for modern clients, cached tool lists, automatic fallback for 2025-era clients
- **Safety controls** — toolset filtering, read-only mode, and per-tool exclusion via environment variables
- **Fully tested** — 184 automated tests against a real headless Godot engine, no mocks

## How It Works

**MCP (Model Context Protocol)** is a standard that lets AI assistants use external tools. Think of it like a USB port — your AI plugs into this server and gains the ability to control Godot.

```
You (natural language) --> AI Assistant --> MCP Server --> Godot Engine
    "Add a player to           |              |              |
     the scene"            interprets     calls tool     creates node
                           your request   add_node()     in .tscn file
```

You talk to your AI assistant normally. When it needs to do something in Godot, it calls one of the 75 tools this server provides. **You don't write any code yourself** — the AI handles that.

## Quickstart

### 1. Install prerequisites

| Requirement                                   | Notes                                                                                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Godot 4.x](https://godotengine.org/download) | Note the full path to the executable (e.g. `/usr/local/bin/godot4`, `C:/Program Files (x86)/Godot/Godot_v4.7-stable_win64.exe`, `/Applications/Godot.app/Contents/MacOS/Godot`) |
| [Node.js 20+](https://nodejs.org/)            | Runs the MCP server                                                                                                                                                             |
| pnpm                                          | `npm install -g pnpm` (or `corepack enable`)                                                                                                                                    |
| An MCP-compatible AI assistant                | See [Supported Clients](#supported-clients)                                                                                                                                     |

### 2. Clone and build

```bash
git clone https://github.com/Vollkorn-Games/godot-mcp.git
cd godot-mcp
pnpm install
pnpm run build
```

Note the **full path** to `build/index.js` — you'll need it below.

### 3. Configure your AI assistant

Every config needs the same two things: the command to start the server (`node` + path to `build/index.js`) and the `GODOT_PATH` environment variable pointing at your Godot executable.

<details>
<summary><strong>Claude Code</strong></summary>

Run this command in your terminal:

```bash
claude mcp add godot -- node /absolute/path/to/godot-mcp/build/index.js
```

Or add to your MCP settings JSON (`~/.claude/settings.json` or project-level `.mcp.json`):

```json
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["/absolute/path/to/godot-mcp/build/index.js"],
      "env": {
        "GODOT_PATH": "/absolute/path/to/godot/executable"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Cline (VS Code)</strong></summary>

Open the Cline MCP settings (Cline sidebar > MCP Servers > Configure) and add:

```json
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["/absolute/path/to/godot-mcp/build/index.js"],
      "env": {
        "GODOT_PATH": "/absolute/path/to/godot/executable"
      },
      "disabled": false
    }
  }
}
```

</details>

<details>
<summary><strong>Cursor</strong></summary>

Go to **Settings** > **Features** > **MCP** > **+ Add New MCP Server**:

- Name: `godot`
- Type: `command`
- Command: `node /absolute/path/to/godot-mcp/build/index.js`

Then set the environment variable `GODOT_PATH` in your system or shell profile.

</details>

<details>
<summary><strong>Other MCP clients (Windsurf, Continue, Open WebUI, LM Studio, ...)</strong></summary>

Any application that supports MCP can use this server. The connection always works the same way:

- **Transport**: stdio (the AI launches the server as a subprocess)
- **Command**: `node /absolute/path/to/godot-mcp/build/index.js`
- **Environment variables**: `GODOT_PATH=/absolute/path/to/godot/executable`

Check your client's documentation for where to add MCP server configs. Look for terms like "MCP", "tools", or "tool servers".

</details>

> [!TIP]
> On Windows, use forward slashes in JSON paths: `"C:/Users/you/godot-mcp/build/index.js"`.

### 4. Test it

Open your AI assistant and try:

> "Use the get_godot_version tool to check if the MCP server is connected."

If it returns a version number, everything is working. Now try:

> "Create a new Godot project at C:/Users/you/my-game with a Node2D main scene."

## Tools

This isn't just "launch editor and read logs". The server can **build an entire game from scratch** — create scenes, add and configure nodes, write GDScript files, wire up signals, set up tilemaps — then **run the game, play it via input commands, and observe the results through screenshots and state queries**.

75 tools across 10 categories:

<details>
<summary><strong>Project & Editor</strong> — launch, run, inspect</summary>

| Tool                | Description                                    |
| ------------------- | ---------------------------------------------- |
| `launch_editor`     | Open the Godot editor for a project            |
| `run_project`       | Run a project in debug mode                    |
| `get_debug_output`  | Get console output/errors (supports filtering) |
| `stop_project`      | Stop a running project                         |
| `get_godot_version` | Get installed Godot version                    |
| `list_projects`     | Find Godot projects in a directory             |
| `get_project_info`  | Analyze project structure                      |

</details>

<details>
<summary><strong>Scene Management</strong> — create, edit, validate scenes</summary>

| Tool                                 | Description                                                          |
| ------------------------------------ | -------------------------------------------------------------------- |
| `create_scene`                       | Create a new scene with a root node type                             |
| `add_node`                           | Add nodes with properties                                            |
| `remove_node`                        | Remove nodes from scenes                                             |
| `rename_node`                        | Rename a node in a scene                                             |
| `reparent_node`                      | Move a node to a different parent                                    |
| `duplicate_node`                     | Duplicate a node (optionally to new parent)                          |
| `instantiate_scene`                  | Add a scene as a child instance                                      |
| `set_node_properties`                | Set properties on nodes                                              |
| `get_node_properties`                | Read node properties as JSON                                         |
| `get_scene_tree`                     | Get full scene tree structure as JSON                                |
| `connect_signal`                     | Wire signals between nodes                                           |
| `add_to_group` / `remove_from_group` | Manage node groups                                                   |
| `save_scene`                         | Save scene (or create variant)                                       |
| `validate_scene`                     | Check for missing scripts, broken refs, etc.                         |
| `batch_operations`                   | Execute multiple scene operations in one Godot process (much faster) |

</details>

<details>
<summary><strong>Scripting</strong> — write, read, validate GDScript</summary>

| Tool              | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `write_script`    | Write or update a GDScript file (auto-creates directories)            |
| `read_script`     | Read GDScript file contents                                           |
| `validate_script` | Check a GDScript file for syntax errors (headless, no runtime needed) |
| `attach_script`   | Attach a script to a node in a scene                                  |

</details>

<details>
<summary><strong>Assets & Resources</strong> — sprites, tilesets, resources</summary>

| Tool                   | Description                                              |
| ---------------------- | -------------------------------------------------------- |
| `load_sprite`          | Load a texture into a Sprite2D node                      |
| `create_resource`      | Create .tres resource files with typed properties        |
| `create_tileset`       | Create TileSet with atlas sources and custom data layers |
| `set_cells`            | Place tiles on a TileMapLayer                            |
| `get_tile_data`        | Read tile data from a TileMapLayer                       |
| `set_custom_tile_data` | Set custom data on tile cells                            |
| `export_mesh_library`  | Export 3D scenes as MeshLibrary for GridMap              |

</details>

<details>
<summary><strong>Animation & Physics</strong> — players, tracks, collision</summary>

| Tool                       | Description                                           |
| -------------------------- | ----------------------------------------------------- |
| `create_animation_player`  | Create AnimationPlayer with pre-configured animations |
| `add_animation`            | Add animations with tracks, keyframes, interpolation  |
| `set_collision_layer_mask` | Set collision layers/masks (layer numbers or bitmask) |

</details>

<details>
<summary><strong>Project Configuration</strong> — settings, autoloads, exports</summary>

| Tool                              | Description                                     |
| --------------------------------- | ----------------------------------------------- |
| `edit_project_settings`           | Edit project.godot (display, input, etc.)       |
| `manage_autoloads`                | Add, remove, or list autoload singletons        |
| `list_input_actions`              | Discover all input actions defined in a project |
| `get_uid` / `update_project_uids` | UID management (Godot 4.4+)                     |
| `export_project`                  | Export for target platform using presets        |

</details>

<details>
<summary><strong>Interactive Game Control</strong> — play and inspect a live game</summary>

| Tool                      | Description                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `run_interactive`         | Start game with injected TCP input receiver                                                              |
| `send_input`              | Send named input actions to the running game (move, jump, attack...)                                     |
| `send_key`                | Send keyboard key events with modifier support (shift, ctrl, alt)                                        |
| `send_mouse_click`        | Send mouse clicks at specific viewport coordinates                                                       |
| `send_mouse_drag`         | Simulate mouse drag operations from point A to B                                                         |
| `game_state`              | Query live game state (HP, score, position, level, etc.)                                                 |
| `call_method`             | Invoke a method on a live node (e.g., `player.take_damage(10)`)                                          |
| `find_nodes`              | Search the runtime scene tree by name pattern and/or type                                                |
| `evaluate_expression`     | Execute arbitrary GDScript expression at runtime and return result                                       |
| `wait_for_signal`         | Block until a signal is emitted (e.g., `animation_finished`)                                             |
| `wait_for_node`           | Block until a node appears in the scene tree                                                             |
| `get_performance_metrics` | Retrieve FPS, draw calls, memory, node count, physics stats                                              |
| `reset_scene`             | Reload the current scene (handy for test loops)                                                          |
| `get_runtime_errors`      | Retrieve runtime errors/warnings with backtraces (Godot 4.5+ Logger API)                                 |
| `send_key_sequence`       | Send key presses and InputMap actions with inline waits, screenshots, state snapshots, and signal events |
| `send_joypad_button`      | Send gamepad button events (A, B, X, Y, shoulders, dpad, start, etc.)                                    |
| `send_joypad_motion`      | Send gamepad analog stick/trigger axis events with float precision                                       |
| `pause_game`              | Pause/unpause game time (MCP receiver stays active for queries)                                          |
| `set_property`            | Set a property on a live node (auto-converts arrays to Vector2/Vector3/Color)                            |
| `execute_script`          | Run multi-line GDScript code blocks at runtime with autoload access                                      |
| `subscribe_signals`       | Subscribe to node signals for async event monitoring                                                     |
| `get_signal_events`       | Retrieve buffered signal events captured since last read                                                 |
| `game_screenshot`         | Capture the live game viewport as PNG                                                                    |
| `run_and_capture`         | Run game for N seconds, capture screenshot, stop                                                         |
| `capture_screenshot`      | Render a scene to PNG (static, no runtime)                                                               |

</details>

<details>
<summary><strong>Static Analysis</strong> — understand scenes and scripts</summary>

| Tool                 | Description                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| `get_scene_insights` | Analyze scene architecture: node types, signals, sub-scenes, groups, depth |
| `get_node_insights`  | Profile a script: methods, signals, dependencies, exports                  |

</details>

<details>
<summary><strong>Testing</strong> — run GUT test suites</summary>

| Tool        | Description                                                |
| ----------- | ---------------------------------------------------------- |
| `run_tests` | Run GUT unit tests headlessly and return pass/fail results |

</details>

<details>
<summary><strong>Asset Library</strong> — search and install addons</summary>

| Tool            | Description                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `search_assets` | Search the Godot Asset Library for addons/templates (read-only network call)                                         |
| `install_asset` | Download an asset (by `assetId` or direct zip URL) and extract it into a project — sha256-verified and zip-slip-safe |

</details>

## Interactive Mode

The standout feature. `run_interactive` injects a TCP server into the running game as a temporary autoload, giving the AI a live, two-way channel to the game:

| You want to...            | Use                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Drive the game**        | `send_input`, `send_key`, `send_mouse_click`, `send_mouse_drag`, `send_joypad_button`, `send_joypad_motion`          |
| **Batch a test run**      | `send_key_sequence` — keys, InputMap actions, waits, screenshots, state snapshots, signal collection in one call     |
| **Inspect live state**    | `game_state`, `find_nodes`, `evaluate_expression`, `execute_script`, `get_performance_metrics`, `get_runtime_errors` |
| **Mutate live state**     | `set_property`, `call_method`                                                                                        |
| **Synchronize on events** | `wait_for_signal`, `wait_for_node`, `subscribe_signals` + `get_signal_events`                                        |
| **See / control time**    | `game_screenshot`, `pause_game`, `reset_scene`                                                                       |

The TCP connection is persistent (single socket reused across commands). Everything is cleaned up automatically when the game stops — the injected autoload is removed and `project.godot` is restored.

### Efficient Testing Patterns

`send_key_sequence` is the primary tool for gameplay testing. It bundles keys, InputMap actions, waits, state snapshots, screenshots, and signal collection into a single round-trip — much faster than calling individual tools in a loop.

**Fast gameplay test (1 round-trip):**

```
send_key_sequence({
  keys: ["1", {"action": "move_right", "hold_ms": 300}, {"state": true}, "o", {"wait": 2000}, {"screenshot": "mid.png"}, "s"],
  collectSignals: [{nodePath: "/root/EventBus", signals: ["task_completed", "score_changed"]}]
})
// Response includes:
//   keys_sent: 4
//   states: [{state: {scene: "Desktop", score: 100}, index: 2}]
//   screenshots: [{path: "mid.png", size: "1024x768", index: 3}]
//   events: [{signal: "score_changed", node: "/root/EventBus", args: [200]}]
```

**Avoid these slower patterns:**

```
// BAD: 3 round-trips for the same result
subscribe_signals({nodePath: "/root/EventBus", signals: ["task_completed"]})
send_key_sequence({keys: ["1", "a", "o", "s"]})
get_signal_events()

// BAD: N round-trips instead of 1
send_key({key: "a"})
game_state()
send_key({key: "b"})
game_screenshot()

// BAD: shell sleeps between inputs — use {"wait": ms} checkpoints instead
send_input({action: "move_right"})
Bash("sleep 2")
send_input({action: "jump"})
game_screenshot()
```

**Prefer structured checks over screenshots.** `game_state`, `evaluate_expression`, and `get_runtime_errors` return text in milliseconds; a screenshot costs a viewport capture, a PNG write, and an image read. Reach for `game_screenshot` only when the visual result itself is what needs verifying (rendering, layout, animation).

**When to use `subscribe_signals` instead:** Only when you need to monitor signals across multiple separate commands (e.g., subscribe once, then issue several unrelated tool calls and check accumulated events later).

## Configuration

All configuration happens through environment variables in your MCP client config:

| Variable            | Description                                                                       |
| ------------------- | --------------------------------------------------------------------------------- |
| `GODOT_PATH`        | Path to Godot executable (overrides auto-detection)                               |
| `DEBUG`             | Set to `"true"` for verbose server logging                                        |
| `MCP_TOOLSETS`      | Comma-separated tool categories to enable (e.g., `"scene,interactive,analysis"`)  |
| `MCP_EXCLUDE_TOOLS` | Comma-separated tool names to exclude (e.g., `"export_project,manage_autoloads"`) |
| `MCP_READ_ONLY`     | Set to `"true"` to block all write operations                                     |

The server tries to auto-detect Godot in common install locations. If it can't find it, set `GODOT_PATH` explicitly.

### Tool filtering

Reduce token overhead and add safety by controlling which tools are exposed. All three filters can be combined:

- **Toolsets** — only expose specific categories: `"MCP_TOOLSETS": "scene,node,script,analysis"`. Available: `process`, `project`, `scene`, `node`, `animation`, `tilemap`, `resource`, `script`, `signal_group`, `uid`, `settings`, `interactive`, `screenshot`, `analysis`, `testing`.
- **Read-only mode** — `"MCP_READ_ONLY": "true"` blocks every tool that creates, modifies, or deletes files or game state, leaving only readers like `get_scene_tree`, `read_script`, `validate_scene`, `game_state`, `find_nodes`.
- **Exclusion** — remove individual tools by name: `"MCP_EXCLUDE_TOOLS": "export_project,manage_autoloads"`.

```json
{
  "godot": {
    "command": "node",
    "args": ["/path/to/godot-mcp/build/index.js"],
    "env": {
      "GODOT_PATH": "/path/to/godot",
      "MCP_TOOLSETS": "scene,node,script,analysis",
      "MCP_READ_ONLY": "true"
    }
  }
}
```

## Supported Clients

MCP is an open standard. Any AI assistant that supports MCP can use this server:

| Client                                                        | MCP Support | Notes                                        |
| ------------------------------------------------------------- | ----------- | -------------------------------------------- |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | Built-in    | First-class MCP support via `claude mcp add` |
| [Cline](https://github.com/cline/cline)                       | Built-in    | VS Code extension, configure in sidebar      |
| [Cursor](https://cursor.sh)                                   | Built-in    | Settings > Features > MCP                    |
| [Windsurf](https://windsurf.com)                              | Built-in    | Settings > MCP                               |
| [Continue](https://continue.dev)                              | Built-in    | config.json MCP section                      |
| [LM Studio](https://lmstudio.ai)                              | Plugin      | Check MCP plugin availability                |

The server speaks the **stateless MCP `2026-07-28` protocol revision** (built on MCP SDK v2): modern clients call tools directly with no `initialize` handshake, and the tool list ships cache hints so clients don't re-fetch it. Older 2025-era clients work too — the server auto-detects the client's protocol era per connection and serves the legacy handshake when needed.

<details>
<summary><strong>Using with local LLMs (LlamaCPP, Ollama, etc.)</strong></summary>

You **don't connect the LLM to the MCP server directly**. Instead, you need an MCP client (an app that speaks the MCP protocol) sitting between your LLM and the MCP server:

```
Your local LLM (LlamaCPP)  -->  MCP Client (e.g., Cline)  -->  Godot MCP Server
   runs on localhost:8080        handles tool calls               controls Godot
```

Here's how to set it up with **LlamaCPP + Cline** (the easiest path):

**1. Start LlamaCPP with a tool-capable model**

```bash
llama-server -m your-model.gguf --port 8080
```

> Use a model that supports function/tool calling (e.g., Qwen 2.5, Mistral, Llama 3.1+). Smaller models may struggle with complex tool use.

**2. Install Cline in VS Code**

Install the [Cline extension](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev) from the VS Code marketplace.

**3. Point Cline to your local LLM**

In Cline settings, configure the API provider:

- **API Provider**: OpenAI Compatible
- **Base URL**: `http://localhost:8080/v1`
- **API Key**: `not-needed` (any non-empty string)
- **Model ID**: the model name your server reports

**4. Add the Godot MCP server to Cline** (see [Quickstart](#3-configure-your-ai-assistant))

**5. Test it**

Ask Cline: _"Use the get_godot_version tool"_ — if it returns a version, the full chain is working.

**Other local LLM setups:**

- **Ollama**: Same as above, but base URL is `http://localhost:11434/v1`
- **LM Studio**: Has built-in MCP support via plugins — check their docs
- **Custom client**: Implement the [MCP client spec](https://modelcontextprotocol.io/introduction) yourself — the server uses stdio transport and doesn't care what LLM is behind the client

</details>

## Architecture

The server uses three execution strategies:

1. **Direct CLI** — Simple operations (launch editor, get version, read files) call Godot CLI commands or manipulate files directly from TypeScript.
2. **Bundled GDScript** — Complex scene operations use `godot_operations.gd`, a comprehensive script that runs via `godot --headless --script` to manipulate scene trees, nodes, and resources through the Godot API.
3. **TCP Input Receiver** — Interactive mode injects `input_receiver.gd` as a temporary autoload that listens on port 9876 for JSON commands (input injection, state queries, viewport capture).

## Troubleshooting

| Problem                         | Solution                                                         |
| ------------------------------- | ---------------------------------------------------------------- |
| "Godot not found"               | Set `GODOT_PATH` env variable to the full path of the executable |
| Tools not showing up            | Restart your AI assistant after adding the MCP config            |
| "Not a valid Godot project"     | Ensure the path you give contains a `project.godot` file         |
| Interactive mode not responding | Check that port 9876 is not in use by another process            |
| Build errors after cloning      | Run `pnpm install` then `pnpm run build`                         |
| Permission errors (macOS/Linux) | Make sure `node` and the Godot binary are executable             |

## Contributing

```bash
pnpm install
pnpm run build
pnpm test           # run all tests (requires Godot installed)
pnpm lint           # eslint
pnpm format:check   # prettier
pnpm typecheck      # tsc --noEmit
```

CI runs all five checks on every push — please run them locally before opening a PR.

## License

MIT — see [LICENSE](LICENSE).
