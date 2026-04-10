import { describe, it, expect } from "vitest";
import { ServerContext } from "../../src/context.js";
import { TOOL_DEFINITIONS } from "../../src/tool-definitions.js";
import { OPERATIONS_SCRIPT } from "../setup.js";

function createCtx(opts: {
  toolsets?: string[];
  excludeTools?: string[];
  readOnly?: boolean;
}): ServerContext {
  return new ServerContext(
    {
      debugMode: false,
      toolsets: opts.toolsets,
      excludeTools: opts.excludeTools,
      readOnly: opts.readOnly,
    },
    OPERATIONS_SCRIPT,
  );
}

function getActiveTools(ctx: ServerContext) {
  return TOOL_DEFINITIONS.filter((tool) => {
    if (ctx.toolsets && !ctx.toolsets.has(tool.category)) return false;
    if (ctx.excludeTools.has(tool.name)) return false;
    if (ctx.readOnly && !tool.readOnly) return false;
    return true;
  });
}

describe("Tool filtering", () => {
  describe("tool definitions metadata", () => {
    it("every tool has a category", () => {
      for (const tool of TOOL_DEFINITIONS) {
        expect(tool.category, `${tool.name} missing category`).toBeTruthy();
      }
    });

    it("every tool has a readOnly flag", () => {
      for (const tool of TOOL_DEFINITIONS) {
        expect(
          typeof tool.readOnly,
          `${tool.name} readOnly should be boolean`,
        ).toBe("boolean");
      }
    });

    it("has 73 tools total", () => {
      expect(TOOL_DEFINITIONS).toHaveLength(73);
    });

    it("has 16 categories", () => {
      const categories = new Set(TOOL_DEFINITIONS.map((t) => t.category));
      expect(categories.size).toBe(16);
    });
  });

  describe("toolset filtering", () => {
    it("returns all tools when no filter is set", () => {
      const ctx = createCtx({});
      const tools = getActiveTools(ctx);
      expect(tools).toHaveLength(73);
    });

    it("filters to a single category", () => {
      const ctx = createCtx({ toolsets: ["project"] });
      const tools = getActiveTools(ctx);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.every((t) => t.category === "project")).toBe(true);
      expect(tools.map((t) => t.name)).toContain("get_project_info");
    });

    it("filters to multiple categories", () => {
      const ctx = createCtx({ toolsets: ["project", "analysis"] });
      const tools = getActiveTools(ctx);
      const categories = new Set(tools.map((t) => t.category));
      expect(categories.size).toBe(2);
      expect(categories.has("project")).toBe(true);
      expect(categories.has("analysis")).toBe(true);
    });

    it("returns empty for non-existent category", () => {
      const ctx = createCtx({ toolsets: ["nonexistent"] });
      const tools = getActiveTools(ctx);
      expect(tools).toHaveLength(0);
    });
  });

  describe("tool exclusion", () => {
    it("excludes a specific tool", () => {
      const ctx = createCtx({ excludeTools: ["export_project"] });
      const tools = getActiveTools(ctx);
      expect(tools.find((t) => t.name === "export_project")).toBeUndefined();
      expect(tools.length).toBe(72);
    });

    it("excludes multiple tools", () => {
      const ctx = createCtx({
        excludeTools: ["export_project", "manage_autoloads", "run_tests"],
      });
      const tools = getActiveTools(ctx);
      expect(tools.length).toBe(70);
      const names = tools.map((t) => t.name);
      expect(names).not.toContain("export_project");
      expect(names).not.toContain("manage_autoloads");
      expect(names).not.toContain("run_tests");
    });

    it("ignores non-existent tool names in exclusion", () => {
      const ctx = createCtx({ excludeTools: ["nonexistent_tool"] });
      const tools = getActiveTools(ctx);
      expect(tools).toHaveLength(73);
    });
  });

  describe("read-only mode", () => {
    it("only returns read-only tools", () => {
      const ctx = createCtx({ readOnly: true });
      const tools = getActiveTools(ctx);
      expect(tools.every((t) => t.readOnly)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.length).toBeLessThan(61);
    });

    it("includes known read-only tools", () => {
      const ctx = createCtx({ readOnly: true });
      const names = getActiveTools(ctx).map((t) => t.name);
      expect(names).toContain("get_scene_tree");
      expect(names).toContain("read_script");
      expect(names).toContain("get_project_info");
      expect(names).toContain("run_tests");
    });

    it("excludes known write tools", () => {
      const ctx = createCtx({ readOnly: true });
      const names = getActiveTools(ctx).map((t) => t.name);
      expect(names).not.toContain("create_scene");
      expect(names).not.toContain("write_script");
      expect(names).not.toContain("add_node");
      expect(names).not.toContain("remove_node");
    });
  });

  describe("combined filters", () => {
    it("toolset + read-only", () => {
      const ctx = createCtx({ toolsets: ["interactive"], readOnly: true });
      const tools = getActiveTools(ctx);
      expect(tools.every((t) => t.category === "interactive")).toBe(true);
      expect(tools.every((t) => t.readOnly)).toBe(true);
      const names = tools.map((t) => t.name);
      expect(names).toContain("game_state");
      expect(names).not.toContain("send_input");
    });

    it("toolset + exclusion", () => {
      const ctx = createCtx({
        toolsets: ["scene"],
        excludeTools: ["validate_scene"],
      });
      const tools = getActiveTools(ctx);
      expect(tools.every((t) => t.category === "scene")).toBe(true);
      expect(tools.find((t) => t.name === "validate_scene")).toBeUndefined();
    });

    it("all three combined", () => {
      const ctx = createCtx({
        toolsets: ["interactive"],
        excludeTools: ["game_screenshot"],
        readOnly: true,
      });
      const tools = getActiveTools(ctx);
      expect(tools.every((t) => t.category === "interactive")).toBe(true);
      expect(tools.every((t) => t.readOnly)).toBe(true);
      expect(tools.find((t) => t.name === "game_screenshot")).toBeUndefined();
    });
  });

  describe("ServerContext construction", () => {
    it("sets toolsets from config", () => {
      const ctx = createCtx({ toolsets: ["scene", "node"] });
      expect(ctx.toolsets).toEqual(new Set(["scene", "node"]));
    });

    it("sets excludeTools from config", () => {
      const ctx = createCtx({ excludeTools: ["run_tests"] });
      expect(ctx.excludeTools).toEqual(new Set(["run_tests"]));
    });

    it("sets readOnly from config", () => {
      const ctx = createCtx({ readOnly: true });
      expect(ctx.readOnly).toBe(true);
    });

    it("defaults to no filtering", () => {
      const ctx = createCtx({});
      expect(ctx.toolsets).toBeNull();
      expect(ctx.excludeTools.size).toBe(0);
      expect(ctx.readOnly).toBe(false);
    });
  });
});
