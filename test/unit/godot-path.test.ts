import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { detectGodotPath } from "../../src/godot-path.js";
import type { ServerContext } from "../../src/context.js";

/**
 * Build a minimal ServerContext shaped exactly enough for detectGodotPath().
 * Real ServerContext requires constructor args we don't need here.
 */
function makeCtx(): ServerContext {
  return {
    godotPath: undefined,
    debugMode: false,
    validatedPaths: new Map<string, boolean>(),
    strictPathValidation: false,
  } as unknown as ServerContext;
}

/**
 * Build a fake "Godot" executable: a shell script that responds to
 * `--version` so `execFileAsync(path, ["--version"])` in isValidGodotPath
 * succeeds. detectGodotPath treats it as a real Godot binary.
 */
function writeFakeGodot(path: string): void {
  writeFileSync(path, "#!/bin/sh\necho 'Godot fake 4.6'\n", { mode: 0o755 });
  chmodSync(path, 0o755);
}

describe("detectGodotPath user-directory glob (Linux)", () => {
  let tmpHome: string;
  let originalHome: string | undefined;
  let originalGodotPath: string | undefined;

  beforeEach(() => {
    originalHome = process.env.HOME;
    originalGodotPath = process.env.GODOT_PATH;
    tmpHome = mkdtempSync(join(tmpdir(), "godot-mcp-home-"));
    process.env.HOME = tmpHome;
    // Make sure stray env doesn't short-circuit detection
    delete process.env.GODOT_PATH;
  });

  afterEach(() => {
    if (originalHome !== undefined) process.env.HOME = originalHome;
    else delete process.env.HOME;
    if (originalGodotPath !== undefined)
      process.env.GODOT_PATH = originalGodotPath;
    rmSync(tmpHome, { recursive: true, force: true });
  });

  it("finds Godot_v4.6-stable_linux.x86_64 in ~/Documents", async () => {
    if (process.platform !== "linux") return;
    const docs = join(tmpHome, "Documents");
    mkdirSync(docs);
    const godot = join(docs, "Godot_v4.6-stable_linux.x86_64");
    writeFakeGodot(godot);

    const ctx = makeCtx();
    await detectGodotPath(ctx);
    expect(ctx.godotPath).toBe(godot);
  });

  it("finds Godot in ~/Downloads", async () => {
    if (process.platform !== "linux") return;
    const dl = join(tmpHome, "Downloads");
    mkdirSync(dl);
    const godot = join(dl, "Godot_v4.4.1-stable_mono_linux.x86_64");
    writeFakeGodot(godot);

    const ctx = makeCtx();
    await detectGodotPath(ctx);
    expect(ctx.godotPath).toBe(godot);
  });

  it("ignores files that don't match the Godot binary pattern", async () => {
    if (process.platform !== "linux") return;
    const docs = join(tmpHome, "Documents");
    mkdirSync(docs);
    // Wrong name shape — should not be picked up
    writeFakeGodot(join(docs, "not_godot.x86_64"));
    writeFakeGodot(join(docs, "godot.txt"));

    const ctx = makeCtx();
    await detectGodotPath(ctx);
    // Falls back to the default path, not our fake files
    expect(ctx.godotPath).not.toContain("not_godot");
    expect(ctx.godotPath).not.toContain("godot.txt");
  });
});
