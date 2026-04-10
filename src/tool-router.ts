import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "./context.js";
import { logDebug } from "./utils.js";
import { TOOL_DEFINITIONS, type ToolDefinition } from "./tool-definitions.js";
import * as processHandlers from "./handlers/process-handlers.js";
import * as projectHandlers from "./handlers/project-handlers.js";
import * as sceneHandlers from "./handlers/scene-handlers.js";
import * as nodeHandlers from "./handlers/node-handlers.js";
import * as animationHandlers from "./handlers/animation-handlers.js";
import * as tilemapHandlers from "./handlers/tilemap-handlers.js";
import * as resourceHandlers from "./handlers/resource-handlers.js";
import * as scriptHandlers from "./handlers/script-handlers.js";
import * as signalGroupHandlers from "./handlers/signal-group-handlers.js";
import * as uidHandlers from "./handlers/uid-handlers.js";
import * as settingsHandlers from "./handlers/settings-handlers.js";
import * as interactiveHandlers from "./handlers/interactive-handlers.js";
import * as screenshotHandlers from "./handlers/screenshot-handlers.js";
import * as analysisHandlers from "./handlers/analysis-handlers.js";
import * as testHandlers from "./handlers/test-handlers.js";

type HandlerFn = (ctx: ServerContext, args: any) => any;

const HANDLER_MAP: Record<string, HandlerFn> = {
  // Process management
  launch_editor: processHandlers.handleLaunchEditor,
  run_project: processHandlers.handleRunProject,
  stop_project: processHandlers.handleStopProject,
  get_debug_output: processHandlers.handleGetDebugOutput,

  // Project info
  list_projects: projectHandlers.handleListProjects,
  get_project_info: projectHandlers.handleGetProjectInfo,
  get_godot_version: projectHandlers.handleGetGodotVersion,

  // Scene operations
  create_scene: sceneHandlers.handleCreateScene,
  save_scene: sceneHandlers.handleSaveScene,
  get_scene_tree: sceneHandlers.handleGetSceneTree,
  validate_scene: sceneHandlers.handleValidateScene,
  batch_operations: sceneHandlers.handleBatchOperations,

  // Node operations
  add_node: nodeHandlers.handleAddNode,
  remove_node: nodeHandlers.handleRemoveNode,
  reparent_node: nodeHandlers.handleReparentNode,
  duplicate_node: nodeHandlers.handleDuplicateNode,
  rename_node: nodeHandlers.handleRenameNode,
  set_node_properties: nodeHandlers.handleSetNodeProperties,
  get_node_properties: nodeHandlers.handleGetNodeProperties,
  attach_script: nodeHandlers.handleAttachScript,
  set_collision_layer_mask: nodeHandlers.handleSetCollisionLayerMask,

  // Animation
  add_animation: animationHandlers.handleAddAnimation,
  create_animation_player: animationHandlers.handleCreateAnimationPlayer,

  // Tilemap
  set_cells: tilemapHandlers.handleSetCells,
  get_tile_data: tilemapHandlers.handleGetTileData,
  create_tileset: tilemapHandlers.handleCreateTileset,
  set_custom_tile_data: tilemapHandlers.handleSetCustomTileData,

  // Resources
  create_resource: resourceHandlers.handleCreateResource,
  instantiate_scene: resourceHandlers.handleInstantiateScene,
  load_sprite: resourceHandlers.handleLoadSprite,
  export_mesh_library: resourceHandlers.handleExportMeshLibrary,

  // Scripts
  read_script: scriptHandlers.handleReadScript,
  write_script: scriptHandlers.handleWriteScript,
  validate_script: scriptHandlers.handleValidateScript,

  // Signals & groups
  connect_signal: signalGroupHandlers.handleConnectSignal,
  add_to_group: signalGroupHandlers.handleAddToGroup,
  remove_from_group: signalGroupHandlers.handleRemoveFromGroup,

  // UID management
  get_uid: uidHandlers.handleGetUid,
  update_project_uids: uidHandlers.handleUpdateProjectUids,

  // Project settings
  edit_project_settings: settingsHandlers.handleEditProjectSettings,
  manage_autoloads: settingsHandlers.handleManageAutoloads,
  export_project: settingsHandlers.handleExportProject,
  list_input_actions: settingsHandlers.handleListInputActions,

  // Interactive mode
  run_interactive: interactiveHandlers.handleRunInteractive,
  send_input: interactiveHandlers.handleSendInput,
  game_state: interactiveHandlers.handleGameState,
  call_method: interactiveHandlers.handleCallMethod,
  find_nodes: interactiveHandlers.handleFindNodes,
  evaluate_expression: interactiveHandlers.handleEvaluateExpression,
  send_key: interactiveHandlers.handleSendKey,
  send_mouse_click: interactiveHandlers.handleSendMouseClick,
  send_mouse_motion: interactiveHandlers.handleSendMouseMotion,
  send_mouse_drag: interactiveHandlers.handleSendMouseDrag,
  wait_for_signal: interactiveHandlers.handleWaitForSignal,
  wait_for_node: interactiveHandlers.handleWaitForNode,
  get_performance_metrics: interactiveHandlers.handleGetPerformanceMetrics,
  reset_scene: interactiveHandlers.handleResetScene,
  get_runtime_errors: interactiveHandlers.handleGetRuntimeErrors,
  game_screenshot: interactiveHandlers.handleGameScreenshot,
  send_key_sequence: interactiveHandlers.handleSendKeySequence,
  pause_game: interactiveHandlers.handlePauseGame,
  set_property: interactiveHandlers.handleSetProperty,
  execute_script: interactiveHandlers.handleExecuteScript,
  subscribe_signals: interactiveHandlers.handleSubscribeSignals,
  get_signal_events: interactiveHandlers.handleGetSignalEvents,
  send_joypad_button: interactiveHandlers.handleSendJoypadButton,
  send_joypad_motion: interactiveHandlers.handleSendJoypadMotion,

  // Screenshots
  capture_screenshot: screenshotHandlers.handleCaptureScreenshot,
  run_and_capture: screenshotHandlers.handleRunAndCapture,

  // Static analysis
  get_scene_insights: analysisHandlers.handleGetSceneInsights,
  get_node_insights: analysisHandlers.handleGetNodeInsights,

  // Testing
  run_tests: testHandlers.handleRunTests,

  // Meta
  discover_tools: handleDiscoverTools,
};

function handleDiscoverTools(ctx: ServerContext, args: any) {
  const tools = getActiveTools(ctx);
  const category = args?.category as string | undefined;

  if (category) {
    const filtered = tools.filter((t) => t.category === category);
    if (filtered.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No tools found in category "${category}". Available categories: ${[...new Set(tools.map((t) => t.category))].join(", ")}`,
          },
        ],
        isError: true,
      };
    }
    const summary = filtered.map(
      (t) =>
        `- **${t.name}**${t.readOnly ? " (read-only)" : ""}${t.destructive ? " (destructive)" : ""}: ${t.description}`,
    );
    return {
      content: [
        {
          type: "text",
          text: `## ${category} tools (${filtered.length})\n\n${summary.join("\n")}`,
        },
      ],
    };
  }

  // No category — return category overview
  const categories: Record<string, number> = {};
  for (const tool of tools) {
    categories[tool.category] = (categories[tool.category] ?? 0) + 1;
  }
  const lines = Object.entries(categories)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, count]) => `- **${cat}**: ${count} tools`);
  return {
    content: [
      {
        type: "text",
        text: `## Available tool categories (${tools.length} total)\n\n${lines.join("\n")}\n\nCall discover_tools with a category to see tool details.`,
      },
    ],
  };
}

function getActiveTools(ctx: ServerContext): ToolDefinition[] {
  return TOOL_DEFINITIONS.filter((tool) => {
    if (ctx.toolsets && !ctx.toolsets.has(tool.category)) return false;
    if (ctx.excludeTools.has(tool.name)) return false;
    if (ctx.readOnly && !tool.readOnly) return false;
    return true;
  });
}

/** Convert internal ToolDefinition to MCP Tool format with annotations. */
function toMcpTool(tool: ToolDefinition): Record<string, unknown> {
  const mcpTool: Record<string, unknown> = {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: {
      title: tool.name.replace(/_/g, " "),
      readOnlyHint: tool.readOnly,
      destructiveHint: tool.destructive ?? false,
      idempotentHint: tool.readOnly,
      openWorldHint: false,
    },
  };
  if (tool.outputSchema) {
    mcpTool.outputSchema = tool.outputSchema;
  }
  return mcpTool;
}

export function setupToolHandlers(server: Server, ctx: ServerContext): void {
  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: getActiveTools(ctx).map(toMcpTool),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    logDebug(ctx.debugMode, `Handling tool request: ${toolName}`);

    const handler = HANDLER_MAP[toolName];
    if (!handler) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
    }

    // Verify the tool passes filtering (not excluded/read-only/toolset-filtered)
    const activeTool = getActiveTools(ctx).find((t) => t.name === toolName);
    if (!activeTool) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Tool "${toolName}" is not available with current configuration`,
      );
    }

    return await handler(ctx, request.params.arguments);
  });
}
