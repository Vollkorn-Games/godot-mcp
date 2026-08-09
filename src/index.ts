#!/usr/bin/env node
/**
 * Godot MCP Server
 *
 * This MCP server provides tools for interacting with the Godot game engine.
 * It enables AI assistants to launch the Godot editor, run Godot projects,
 * capture debug output, and control project execution.
 */

import { fileURLToPath } from "url";
import { join, dirname, normalize } from "path";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { Server } from "@modelcontextprotocol/server";
import type { GodotServerConfig } from "./types.js";
import { ServerContext } from "./context.js";
import {
  detectGodotPath,
  isValidGodotPath,
  isValidGodotPathSync,
} from "./godot-path.js";
import { logDebug } from "./utils.js";
import { setupToolHandlers } from "./tool-router.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main(config?: GodotServerConfig) {
  // Merge environment variables into config (config values take precedence)
  const mergedConfig: GodotServerConfig = { ...config };
  if (!mergedConfig.toolsets && process.env.MCP_TOOLSETS) {
    mergedConfig.toolsets = process.env.MCP_TOOLSETS.split(",").map((s) =>
      s.trim(),
    );
  }
  if (!mergedConfig.excludeTools && process.env.MCP_EXCLUDE_TOOLS) {
    mergedConfig.excludeTools = process.env.MCP_EXCLUDE_TOOLS.split(",").map(
      (s) => s.trim(),
    );
  }
  if (mergedConfig.readOnly == null && process.env.MCP_READ_ONLY === "true") {
    mergedConfig.readOnly = true;
  }

  const operationsScriptPath = join(
    __dirname,
    "scripts",
    "godot_operations.gd",
  );
  const ctx = new ServerContext(mergedConfig, operationsScriptPath);

  if (ctx.debugMode) {
    console.error(`[DEBUG] Operations script path: ${operationsScriptPath}`);
  }

  if (ctx.toolsets) {
    console.error(
      `[SERVER] Toolset filter active: ${[...ctx.toolsets].join(", ")}`,
    );
  }
  if (ctx.excludeTools.size > 0) {
    console.error(
      `[SERVER] Excluded tools: ${[...ctx.excludeTools].join(", ")}`,
    );
  }
  if (ctx.readOnly) {
    console.error("[SERVER] Read-only mode enabled");
  }

  // Handle initial godot path from config
  if (config?.godotPath) {
    const normalizedPath = normalize(config.godotPath);
    ctx.godotPath = normalizedPath;
    logDebug(ctx.debugMode, `Custom Godot path provided: ${ctx.godotPath}`);

    if (!isValidGodotPathSync(ctx.godotPath, ctx.debugMode)) {
      console.warn(
        `[SERVER] Invalid custom Godot path provided: ${ctx.godotPath}`,
      );
      ctx.godotPath = null;
    }
  }

  // Detect Godot path and start
  await detectGodotPath(ctx);

  if (!ctx.godotPath) {
    console.error("[SERVER] Failed to find a valid Godot executable path");
    console.error(
      "[SERVER] Please set GODOT_PATH environment variable or provide a valid path",
    );
    process.exit(1);
  }

  const isValid = await isValidGodotPath(ctx, ctx.godotPath);

  if (!isValid) {
    if (ctx.strictPathValidation) {
      console.error(`[SERVER] Invalid Godot path: ${ctx.godotPath}`);
      console.error(
        "[SERVER] Please set a valid GODOT_PATH environment variable or provide a valid path",
      );
      process.exit(1);
    } else {
      console.error(
        `[SERVER] Warning: Using potentially invalid Godot path: ${ctx.godotPath}`,
      );
      console.error(
        "[SERVER] This may cause issues when executing Godot commands",
      );
      console.error(
        "[SERVER] This fallback behavior will be removed in a future version. Set strictPathValidation: true to opt-in to the new behavior.",
      );
    }
  }

  console.error(`[SERVER] Using Godot at: ${ctx.godotPath}`);

  // Serve over stdio. The factory pattern is the 2026-07-28 stateless core:
  // modern clients skip the initialize handshake and carry their identity in
  // each request's _meta envelope; 2025-era clients still get the legacy
  // handshake from the same factory.
  const handle = serveStdio(
    () => {
      const server = new Server(
        { name: "godot-mcp", version: "0.1.0" },
        {
          capabilities: { tools: {} },
          // The tool list is fixed for the process lifetime, so 2026-era
          // clients may cache tools/list instead of re-fetching it.
          cacheHints: {
            "tools/list": { ttlMs: 3_600_000, cacheScope: "private" },
          },
        },
      );
      setupToolHandlers(server, ctx);
      return server;
    },
    { onerror: (error) => console.error("[MCP Error]", error) },
  );

  // Cleanup on exit
  process.on("SIGINT", () => {
    logDebug(ctx.debugMode, "Cleaning up resources");
    if (ctx.activeProcess) {
      logDebug(ctx.debugMode, "Killing active Godot process");
      ctx.activeProcess.process.kill();
      ctx.activeProcess = null;
    }
    void handle.close().then(() => {
      process.exit(0);
    });
  });

  console.error(
    "Godot MCP server running on stdio (MCP 2026-07-28, stateless)",
  );
}

main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  console.error("Failed to run server:", errorMessage);
  process.exit(1);
});
