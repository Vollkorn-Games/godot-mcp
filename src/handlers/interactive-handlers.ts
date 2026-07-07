import type { ServerContext } from "../context.js";
import type { ToolResponse } from "../types.js";
import {
  normalizeParameters,
  validatePath,
  createErrorResponse,
  killProcess,
  snapshotExitedProcess,
} from "../utils.js";
import { ensureGodotPath } from "../godot-path.js";
import {
  sendTcpCommand,
  cleanupInteractive,
  disconnectTcp,
} from "../tcp-client.js";
import { join, dirname } from "path";
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "fs";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Force windowed mode in project.godot content.
 * Fullscreen (mode=3 or mode=4) blocks TCP communication with the input receiver.
 * We override to windowed (mode=0) so interactive testing works reliably.
 * The original project.godot is restored on cleanup.
 */
export function forceWindowedMode(content: string): string {
  // Replace existing window mode setting (mode=3 fullscreen, mode=4 exclusive fullscreen)
  const modeRegex = /^(display\/window\/size\/mode\s*=\s*)[34]\s*$/m;
  if (modeRegex.test(content)) {
    return content.replace(modeRegex, "$10");
  }
  return content;
}

export async function handleRunInteractive(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  args = normalizeParameters(args);

  if (!args.projectPath) {
    return createErrorResponse("Missing required parameter: projectPath", [
      "Provide the path to the Godot project directory",
    ]);
  }

  const projectFile = join(args.projectPath, "project.godot");
  if (!existsSync(projectFile)) {
    return createErrorResponse(
      `Not a valid Godot project: ${args.projectPath}`,
      ["Ensure the path contains a project.godot file"],
    );
  }

  // Copy input receiver script
  const scriptFilename = ".mcp_input_receiver.gd";
  const scriptDest = join(args.projectPath, scriptFilename);
  const receiverSrc = join(__dirname, "..", "scripts", "input_receiver.gd");
  copyFileSync(receiverSrc, scriptDest);

  // Save original project.godot and inject autoload
  const projectContent = readFileSync(projectFile, "utf-8");
  ctx.interactive.originalProjectGodot = projectContent;
  ctx.interactive.projectPath = args.projectPath;

  let modifiedContent: string;
  if (projectContent.includes("[autoload]")) {
    modifiedContent = projectContent.replace(
      "[autoload]",
      `[autoload]\n\n_McpInputReceiver="*res://${scriptFilename}"`,
    );
  } else {
    modifiedContent =
      projectContent +
      `\n[autoload]\n\n_McpInputReceiver="*res://${scriptFilename}"\n`;
  }

  // Force windowed mode so TCP input works reliably (fullscreen blocks it)
  modifiedContent = forceWindowedMode(modifiedContent);

  writeFileSync(projectFile, modifiedContent);

  // Disconnect any existing TCP connection and kill existing process
  disconnectTcp(ctx);
  if (ctx.activeProcess) {
    await killProcess(ctx.activeProcess.process);
    ctx.activeProcess = null;
  }

  // Drop any leftover snapshot from a previous run.
  ctx.lastExitedProcess = null;

  const godotPath = await ensureGodotPath(ctx);
  if (!godotPath) {
    return createErrorResponse("Could not find a valid Godot executable path", [
      "Ensure Godot is installed correctly",
      "Set GODOT_PATH environment variable",
    ]);
  }

  // Start the game
  const cmdArgs = ["-d", "--path", args.projectPath];
  if (args.scene && validatePath(args.scene)) {
    cmdArgs.push(args.scene);
  }

  const proc = spawn(godotPath, cmdArgs, { stdio: "pipe" });
  const output: string[] = [];
  const errors: string[] = [];

  proc.stdout.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n");
    output.push(...lines);
  });

  proc.stderr.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n");
    errors.push(...lines);
  });

  proc.on("exit", (code) => {
    cleanupInteractive(ctx);
    // Snapshot before clearing activeProcess so get_debug_output can still
    // report what the game printed before it died — especially important
    // for interactive runs where a TCP connection failure looks identical
    // to a crash from the outside.
    snapshotExitedProcess(ctx, proc, code, "exit");
  });

  proc.on("error", () => {
    cleanupInteractive(ctx);
    snapshotExitedProcess(ctx, proc, null, "error");
  });

  ctx.activeProcess = { process: proc, output, errors };

  // Wait a moment for TCP server to start
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    content: [
      {
        type: "text",
        text:
          `Game started in interactive mode with input receiver.\n` +
          `Fast test loop: send_key_sequence batches keys and InputMap actions with inline {"wait"}, {"state"}, {"screenshot"} checkpoints in one call — no shell sleeps or per-input round-trips needed.\n` +
          `Verify with game_state, evaluate_expression, or get_runtime_errors (fast, structured). Use game_screenshot only when visual appearance itself must be checked.\n` +
          `Stop with stop_project.`,
      },
    ],
  };
}

export async function handleSendInput(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  if (!args?.action) {
    return createErrorResponse("Missing required parameter: action", [
      'Provide the input action name (e.g., "move_up")',
    ]);
  }

  try {
    const response = await sendTcpCommand(ctx, {
      type: "input",
      action: args.action,
      pressed: args.pressed !== false,
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response),
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleGameState(
  ctx: ServerContext,
): Promise<ToolResponse> {
  try {
    const response = await sendTcpCommand(ctx, { type: "get_state" });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleCallMethod(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  if (!args?.node_path && !args?.nodePath) {
    return createErrorResponse("Missing required parameter: nodePath", [
      'Provide the path to the target node (e.g., "Player")',
    ]);
  }
  if (!args?.method) {
    return createErrorResponse("Missing required parameter: method", [
      'Provide the method name to call (e.g., "take_damage")',
    ]);
  }

  try {
    const response = await sendTcpCommand(ctx, {
      type: "call_method",
      node_path: args.node_path ?? args.nodePath,
      method: args.method,
      args: args.args ?? [],
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleEvaluateExpression(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  if (!args?.expression) {
    return createErrorResponse("Missing required parameter: expression", [
      'Provide a GDScript expression to evaluate (e.g., "get_tree().current_scene.name")',
    ]);
  }

  try {
    const response = await sendTcpCommand(ctx, {
      type: "evaluate_expression",
      expression: args.expression,
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleFindNodes(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  try {
    const command: Record<string, unknown> = { type: "find_nodes" };
    if (args?.pattern) command.pattern = args.pattern;
    if (args?.type_filter ?? args?.typeFilter)
      command.type_filter = args.type_filter ?? args.typeFilter;

    const response = await sendTcpCommand(ctx, command);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleSendKey(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  if (!args?.key) {
    return createErrorResponse("Missing required parameter: key", [
      'Provide the key name (e.g., "space", "a", "escape")',
    ]);
  }

  try {
    const response = await sendTcpCommand(ctx, {
      type: "send_key",
      key: args.key,
      pressed: args.pressed !== false,
      shift: args.shift ?? false,
      ctrl: args.ctrl ?? false,
      alt: args.alt ?? false,
      meta: args.meta ?? false,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleSendMouseClick(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  if (args?.x == null || args?.y == null) {
    return createErrorResponse("Missing required parameters: x and y", [
      "Provide the x and y coordinates for the mouse click",
    ]);
  }

  try {
    const response = await sendTcpCommand(ctx, {
      type: "send_mouse_click",
      x: args.x,
      y: args.y,
      button: args.button ?? "left",
      double_click: args.doubleClick ?? args.double_click ?? false,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleSendMouseMotion(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  if (args?.x == null || args?.y == null) {
    return createErrorResponse("Missing required parameters: x and y", [
      "Provide the x and y coordinates for the mouse position",
    ]);
  }

  try {
    const response = await sendTcpCommand(ctx, {
      type: "send_mouse_motion",
      x: args.x,
      y: args.y,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleSendMouseDrag(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  if (args?.fromX == null && args?.from_x == null) {
    return createErrorResponse(
      "Missing required parameters: fromX, fromY, toX, toY",
      ["Provide start and end coordinates for the drag"],
    );
  }

  try {
    const response = await sendTcpCommand(ctx, {
      type: "send_mouse_drag",
      from_x: args.fromX ?? args.from_x,
      from_y: args.fromY ?? args.from_y,
      to_x: args.toX ?? args.to_x,
      to_y: args.toY ?? args.to_y,
      steps: args.steps ?? 10,
      button: args.button ?? "left",
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleWaitForSignal(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  if (!args?.node_path && !args?.nodePath) {
    return createErrorResponse("Missing required parameter: nodePath", [
      'Provide the path to the node (e.g., "Player")',
    ]);
  }
  if (!args?.signal) {
    return createErrorResponse("Missing required parameter: signal", [
      'Provide the signal name (e.g., "died", "health_changed")',
    ]);
  }

  try {
    const response = await sendTcpCommand(
      ctx,
      {
        type: "wait_for_signal",
        node_path: args.node_path ?? args.nodePath,
        signal: args.signal,
        timeout: args.timeout ?? 5.0,
      },
      (args.timeout ?? 5.0) * 1000 + 2000,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleWaitForNode(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  if (!args?.node_path && !args?.nodePath) {
    return createErrorResponse("Missing required parameter: nodePath", [
      'Provide the node path to wait for (e.g., "Player/Sword")',
    ]);
  }

  try {
    const response = await sendTcpCommand(
      ctx,
      {
        type: "wait_for_node",
        node_path: args.node_path ?? args.nodePath,
        timeout: args.timeout ?? 5.0,
      },
      (args.timeout ?? 5.0) * 1000 + 2000,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleGetPerformanceMetrics(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  try {
    const command: Record<string, unknown> = {
      type: "get_performance_metrics",
    };
    if (args?.metrics) command.metrics = args.metrics;

    const response = await sendTcpCommand(ctx, command);
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleResetScene(
  ctx: ServerContext,
): Promise<ToolResponse> {
  try {
    const response = await sendTcpCommand(ctx, { type: "reset_scene" });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleGetRuntimeErrors(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  try {
    const command: Record<string, unknown> = { type: "get_runtime_errors" };
    if (args?.clear === false) command.clear = false;

    const response = await sendTcpCommand(ctx, command);
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    // If the TCP receiver is gone but we did capture output before the
    // process died, point the caller at get_debug_output rather than
    // leaving them stranded with a bare connection error.
    const solutions: string[] = [
      "Ensure the game is running via run_interactive",
    ];
    if (ctx.lastExitedProcess) {
      solutions.push(
        "The game appears to have exited — call get_debug_output for captured stdout/stderr from the run",
      );
    }
    solutions.push("This tool requires Godot 4.5+ (Logger API)");
    return createErrorResponse(msg, solutions);
  }
}

export async function handleGameScreenshot(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  const outputPath =
    args?.outputPath ??
    (ctx.interactive.projectPath
      ? join(ctx.interactive.projectPath, "screenshots", "capture.png")
      : "capture.png");

  try {
    const response = await sendTcpCommand(ctx, {
      type: "screenshot",
      output_path: outputPath,
    });

    if ((response as any).ok) {
      return {
        content: [
          {
            type: "text",
            text: `Screenshot captured from running game.\nSaved to: ${outputPath}\nSize: ${(response as any).size}`,
          },
        ],
      };
    }

    return createErrorResponse(
      `Screenshot failed: ${(response as any).error}`,
      [],
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleSendKeySequence(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  if (!args?.keys || !Array.isArray(args.keys)) {
    return createErrorResponse("Missing required parameter: keys", [
      'Provide an array of key names, action objects, and/or wait objects (e.g., ["a", {"action": "jump"}, {"wait": 500}])',
    ]);
  }

  try {
    const delayMs = Number(args.delayMs ?? args.delay_ms ?? 50);

    // Normalize action items: accept both holdMs and hold_ms
    const keys = args.keys.map((k: unknown) => {
      if (typeof k === "object" && k !== null && "action" in k) {
        const item = k as Record<string, unknown>;
        const holdMs = item.hold_ms ?? item.holdMs;
        return holdMs !== undefined ? { ...item, hold_ms: holdMs } : item;
      }
      return k;
    });

    // Estimate timeout from sequence content
    const estimatedMs = keys.reduce((acc: number, k: unknown) => {
      if (typeof k === "object" && k !== null) {
        if ("wait" in k) return acc + (k as { wait: number }).wait;
        if ("screenshot" in k) return acc + 500; // screenshot takes ~500ms
        if ("state" in k) return acc + 50; // state snapshot is fast
        if ("action" in k)
          return acc + ((k as { hold_ms?: number }).hold_ms ?? 0) + delayMs;
      }
      return acc + delayMs;
    }, 0);
    const command: Record<string, unknown> = {
      type: "send_key_sequence",
      keys,
      delay_ms: delayMs,
    };

    // Pass through signal collection config
    const collectSignals = args.collectSignals ?? args.collect_signals;
    if (collectSignals && Array.isArray(collectSignals)) {
      command.collect_signals = collectSignals.map(
        (s: { nodePath?: string; node_path?: string; signals: string[] }) => ({
          node_path: s.nodePath ?? s.node_path,
          signals: s.signals,
        }),
      );
    }

    const response = await sendTcpCommand(
      ctx,
      command,
      Math.max((estimatedMs as number) + 5000, 10000),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handlePauseGame(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  try {
    const response = await sendTcpCommand(ctx, {
      type: "pause_game",
      paused: args?.paused !== false,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleSetProperty(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  if (!args?.node_path && !args?.nodePath) {
    return createErrorResponse("Missing required parameter: nodePath", [
      'Provide the path to the target node (e.g., "Player")',
    ]);
  }
  if (!args?.property) {
    return createErrorResponse("Missing required parameter: property", [
      'Provide the property name (e.g., "score", "position")',
    ]);
  }
  if (args?.value === undefined) {
    return createErrorResponse("Missing required parameter: value", [
      "Provide the value to set",
    ]);
  }

  try {
    const response = await sendTcpCommand(ctx, {
      type: "set_property",
      node_path: args.node_path ?? args.nodePath,
      property: args.property,
      value: args.value,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleExecuteScript(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  if (!args?.code) {
    return createErrorResponse("Missing required parameter: code", [
      'Provide GDScript code to execute (e.g., "var p = $Player\\nreturn p.position")',
    ]);
  }

  try {
    const response = await sendTcpCommand(
      ctx,
      {
        type: "execute_script",
        code: args.code,
      },
      15000,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleSendJoypadButton(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  if (!args?.button) {
    return createErrorResponse("Missing required parameter: button", [
      'Provide the joypad button name (e.g., "a", "b", "x", "y", "lb", "rb", "dpad_up", "start")',
    ]);
  }

  try {
    const response = await sendTcpCommand(ctx, {
      type: "send_joypad_button",
      button: args.button,
      pressed: args.pressed !== false,
      device: args.device ?? 0,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleSendJoypadMotion(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  if (!args?.axis) {
    return createErrorResponse("Missing required parameter: axis", [
      'Provide the joypad axis name (e.g., "left_x", "left_y", "right_x", "right_y", "trigger_left", "trigger_right")',
    ]);
  }
  if (args?.value === undefined) {
    return createErrorResponse("Missing required parameter: value", [
      "Provide the axis value as a float (-1.0 to 1.0 for sticks, 0.0 to 1.0 for triggers)",
    ]);
  }

  try {
    const response = await sendTcpCommand(ctx, {
      type: "send_joypad_motion",
      axis: args.axis,
      value: args.value,
      device: args.device ?? 0,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleSubscribeSignals(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  if (!args?.node_path && !args?.nodePath) {
    return createErrorResponse("Missing required parameter: nodePath", [
      'Provide the path to the node (e.g., "Player", "/root/EventBus")',
    ]);
  }
  if (
    !args?.signals ||
    !Array.isArray(args.signals) ||
    args.signals.length === 0
  ) {
    return createErrorResponse("Missing required parameter: signals", [
      'Provide an array of signal names (e.g., ["died", "health_changed"])',
    ]);
  }

  try {
    const response = await sendTcpCommand(ctx, {
      type: "subscribe_signals",
      node_path: args.node_path ?? args.nodePath,
      signals: args.signals,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}

export async function handleGetSignalEvents(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  try {
    const command: Record<string, unknown> = { type: "get_signal_events" };
    if (args?.clear === false) command.clear = false;

    const response = await sendTcpCommand(ctx, command);
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(msg, [
      "Ensure the game is running via run_interactive",
    ]);
  }
}
