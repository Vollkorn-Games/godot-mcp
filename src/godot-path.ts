import { existsSync, readdirSync, statSync } from "fs";
import { join, normalize } from "path";
import { promisify } from "util";
import { execFile } from "child_process";
import type { ServerContext } from "./context.js";
import { logDebug } from "./utils.js";

const execFileAsync = promisify(execFile);

/**
 * Match files like Godot_v4.6-stable_linux.x86_64, Godot_v4.2.1-stable_linux.x86_64,
 * Godot_v4.4-stable_mono_linux.x86_64, godot-4.6.0-linux, etc.
 *
 * Users who download Godot from godotengine.org and unzip into a Documents
 * or Downloads folder end up with a filename like this — none of the
 * canonical /usr/bin paths find it. Matched on Linux and macOS user-dir
 * scans below.
 */
const GODOT_BINARY_REGEX = /^[Gg]odot[-_].*linux.*\.x86_64$/;
const GODOT_APP_REGEX = /^[Gg]odot.*\.app$/;

/**
 * Scan a directory (non-recursive) for files whose name matches a
 * Godot-binary pattern. Returns absolute paths to every match. Silently
 * returns [] if the directory doesn't exist or isn't readable — auto-
 * detection is best-effort and shouldn't crash if $HOME isn't set.
 */
function findGodotBinariesIn(dir: string, regex: RegExp): string[] {
  try {
    if (!existsSync(dir)) return [];
    const entries = readdirSync(dir);
    const matches: string[] = [];
    for (const entry of entries) {
      if (!regex.test(entry)) continue;
      const full = join(dir, entry);
      try {
        const stat = statSync(full);
        // Plain files on Linux; .app bundles on macOS are directories.
        if (stat.isFile() || stat.isDirectory()) matches.push(full);
      } catch {
        // Permission error or broken symlink — skip silently
      }
    }
    return matches;
  } catch {
    return [];
  }
}

export function isValidGodotPathSync(
  path: string,
  debugMode: boolean,
): boolean {
  try {
    logDebug(debugMode, `Quick-validating Godot path: ${path}`);
    return path === "godot" || existsSync(path);
  } catch (error) {
    logDebug(debugMode, `Invalid Godot path: ${path}, error: ${String(error)}`);
    return false;
  }
}

export async function isValidGodotPath(
  ctx: ServerContext,
  path: string,
): Promise<boolean> {
  if (ctx.validatedPaths.has(path)) {
    return ctx.validatedPaths.get(path)!;
  }

  try {
    logDebug(ctx.debugMode, `Validating Godot path: ${path}`);

    if (path !== "godot" && !existsSync(path)) {
      logDebug(ctx.debugMode, `Path does not exist: ${path}`);
      ctx.validatedPaths.set(path, false);
      return false;
    }

    await execFileAsync(path, ["--version"]);

    logDebug(ctx.debugMode, `Valid Godot path: ${path}`);
    ctx.validatedPaths.set(path, true);
    return true;
  } catch (error) {
    logDebug(
      ctx.debugMode,
      `Invalid Godot path: ${path}, error: ${String(error)}`,
    );
    ctx.validatedPaths.set(path, false);
    return false;
  }
}

export async function detectGodotPath(ctx: ServerContext): Promise<void> {
  if (ctx.godotPath && (await isValidGodotPath(ctx, ctx.godotPath))) {
    logDebug(ctx.debugMode, `Using existing Godot path: ${ctx.godotPath}`);
    return;
  }

  if (process.env.GODOT_PATH) {
    const normalizedPath = normalize(process.env.GODOT_PATH);
    logDebug(
      ctx.debugMode,
      `Checking GODOT_PATH environment variable: ${normalizedPath}`,
    );
    if (await isValidGodotPath(ctx, normalizedPath)) {
      ctx.godotPath = normalizedPath;
      logDebug(
        ctx.debugMode,
        `Using Godot path from environment: ${ctx.godotPath}`,
      );
      return;
    } else {
      logDebug(ctx.debugMode, `GODOT_PATH environment variable is invalid`);
    }
  }

  const osPlatform = process.platform;
  logDebug(
    ctx.debugMode,
    `Auto-detecting Godot path for platform: ${osPlatform}`,
  );

  const possiblePaths: string[] = ["godot"];
  const home = process.env.HOME ?? "";

  if (osPlatform === "darwin") {
    possiblePaths.push(
      "/Applications/Godot.app/Contents/MacOS/Godot",
      "/Applications/Godot_4.app/Contents/MacOS/Godot",
      `${home}/Applications/Godot.app/Contents/MacOS/Godot`,
      `${home}/Applications/Godot_4.app/Contents/MacOS/Godot`,
      `${home}/Library/Application Support/Steam/steamapps/common/Godot Engine/Godot.app/Contents/MacOS/Godot`,
    );
    // Also scan common download/unzip locations for Godot*.app bundles
    if (home) {
      for (const dir of [
        `${home}/Applications`,
        `${home}/Downloads`,
        `${home}/Documents`,
      ]) {
        for (const app of findGodotBinariesIn(dir, GODOT_APP_REGEX)) {
          possiblePaths.push(`${app}/Contents/MacOS/Godot`);
        }
      }
    }
  } else if (osPlatform === "win32") {
    possiblePaths.push(
      "C:\\Program Files\\Godot\\Godot.exe",
      "C:\\Program Files (x86)\\Godot\\Godot.exe",
      "C:\\Program Files\\Godot_4\\Godot.exe",
      "C:\\Program Files (x86)\\Godot_4\\Godot.exe",
      `${process.env.USERPROFILE}\\Godot\\Godot.exe`,
    );
  } else if (osPlatform === "linux") {
    possiblePaths.push(
      "/usr/bin/godot",
      "/usr/local/bin/godot",
      "/snap/bin/godot",
      "/usr/bin/godot4",
      "/usr/local/bin/godot4",
      `${home}/.local/bin/godot`,
      `${home}/.local/bin/godot4`,
    );
    // Many users download the Linux Godot zip from godotengine.org and
    // unzip it directly into Documents/Downloads/home. The resulting file
    // is named Godot_v<ver>-stable_linux.x86_64 — not on PATH, not in
    // /usr/bin. Glob those directories so the MCP "just works" without
    // requiring GODOT_PATH for the typical download-and-unzip workflow.
    if (home) {
      for (const dir of [
        home,
        `${home}/Documents`,
        `${home}/Downloads`,
        `${home}/Applications`,
        `${home}/.local/share`,
      ]) {
        possiblePaths.push(...findGodotBinariesIn(dir, GODOT_BINARY_REGEX));
      }
    }
  }

  for (const path of possiblePaths) {
    const normalizedPath = normalize(path);
    if (await isValidGodotPath(ctx, normalizedPath)) {
      ctx.godotPath = normalizedPath;
      logDebug(ctx.debugMode, `Found Godot at: ${normalizedPath}`);
      return;
    }
  }

  logDebug(
    ctx.debugMode,
    `Warning: Could not find Godot in common locations for ${osPlatform}`,
  );
  console.error(
    `[SERVER] Could not find Godot in common locations for ${osPlatform}`,
  );
  console.error(
    `[SERVER] Set GODOT_PATH=/path/to/godot environment variable or pass { godotPath: '/path/to/godot' } in the config to specify the correct path.`,
  );

  if (ctx.strictPathValidation) {
    throw new Error(
      `Could not find a valid Godot executable. Set GODOT_PATH or provide a valid path in config.`,
    );
  } else {
    if (osPlatform === "win32") {
      ctx.godotPath = normalize("C:\\Program Files\\Godot\\Godot.exe");
    } else if (osPlatform === "darwin") {
      ctx.godotPath = normalize("/Applications/Godot.app/Contents/MacOS/Godot");
    } else {
      ctx.godotPath = normalize("/usr/bin/godot");
    }

    logDebug(
      ctx.debugMode,
      `Using default path: ${ctx.godotPath}, but this may not work.`,
    );
    console.error(
      `[SERVER] Using default path: ${ctx.godotPath}, but this may not work.`,
    );
    console.error(
      `[SERVER] This fallback behavior will be removed in a future version. Set strictPathValidation: true to opt-in to the new behavior.`,
    );
  }
}

export async function setGodotPath(
  ctx: ServerContext,
  customPath: string,
): Promise<boolean> {
  if (!customPath) {
    return false;
  }

  const normalizedPath = normalize(customPath);
  if (await isValidGodotPath(ctx, normalizedPath)) {
    ctx.godotPath = normalizedPath;
    logDebug(ctx.debugMode, `Godot path set to: ${normalizedPath}`);
    return true;
  }

  logDebug(
    ctx.debugMode,
    `Failed to set invalid Godot path: ${normalizedPath}`,
  );
  return false;
}

export async function ensureGodotPath(
  ctx: ServerContext,
): Promise<string | null> {
  if (!ctx.godotPath) {
    await detectGodotPath(ctx);
  }
  return ctx.godotPath;
}
