import { describe, it, expect, beforeAll } from "vitest";
import {
  handleRunInteractive,
  handleSendInput,
  handleGameState,
  handleGameScreenshot,
  handleCallMethod,
  handleFindNodes,
  handleEvaluateExpression,
  handleSendKey,
  handleSendMouseClick,
  handleSendMouseMotion,
  handleSendMouseDrag,
  handleWaitForSignal,
  handleWaitForNode,
  handleGetPerformanceMetrics,
  handleResetScene,
  handleGetRuntimeErrors,
  handleSendKeySequence,
  handleSendJoypadButton,
  handleSendJoypadMotion,
} from "../../src/handlers/interactive-handlers.js";
import { initContext } from "../setup.js";
import { assertError } from "../helpers.js";
import type { ServerContext } from "../../src/context.js";

describe("Interactive handlers", () => {
  let ctx: ServerContext;

  beforeAll(async () => {
    ctx = await initContext();
  });

  describe("run_interactive", () => {
    it("errors on missing projectPath", async () => {
      const res = await handleRunInteractive(ctx, {});
      assertError(res);
      expect(res.content[0]!.text).toContain("projectPath");
    });

    it("errors on invalid project", async () => {
      const res = await handleRunInteractive(ctx, {
        projectPath: "/nonexistent",
      });
      assertError(res);
      expect(res.content[0]!.text).toContain("Not a valid Godot project");
    });
  });

  describe("send_input", () => {
    it("errors on missing action", async () => {
      const res = await handleSendInput(ctx, {});
      assertError(res);
      expect(res.content[0]!.text).toContain("action");
    });

    it("errors on empty action", async () => {
      const res = await handleSendInput(ctx, { action: "" });
      assertError(res);
    });

    it("errors when no game is running", async () => {
      const res = await handleSendInput(ctx, { action: "move_up" });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("game_state", () => {
    it("errors when no game is running", async () => {
      const res = await handleGameState(ctx);
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("game_screenshot", () => {
    it("errors when no game is running", async () => {
      const res = await handleGameScreenshot(ctx, {});
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("call_method", () => {
    it("errors on missing nodePath", async () => {
      const res = await handleCallMethod(ctx, { method: "get_health" });
      assertError(res);
      expect(res.content[0]!.text).toContain("nodePath");
    });

    it("errors on missing method", async () => {
      const res = await handleCallMethod(ctx, { nodePath: "Player" });
      assertError(res);
      expect(res.content[0]!.text).toContain("method");
    });

    it("errors when no game is running", async () => {
      const res = await handleCallMethod(ctx, {
        nodePath: "Player",
        method: "take_damage",
        args: [10],
      });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("find_nodes", () => {
    it("errors when no game is running", async () => {
      const res = await handleFindNodes(ctx, { pattern: "Enemy*" });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("evaluate_expression", () => {
    it("errors on missing expression", async () => {
      const res = await handleEvaluateExpression(ctx, {});
      assertError(res);
      expect(res.content[0]!.text).toContain("expression");
    });

    it("errors on empty expression", async () => {
      const res = await handleEvaluateExpression(ctx, { expression: "" });
      assertError(res);
    });

    it("errors when no game is running", async () => {
      const res = await handleEvaluateExpression(ctx, {
        expression: "2 + 2",
      });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("send_key", () => {
    it("errors on missing key", async () => {
      const res = await handleSendKey(ctx, {});
      assertError(res);
      expect(res.content[0]!.text).toContain("key");
    });

    it("errors when no game is running", async () => {
      const res = await handleSendKey(ctx, { key: "space" });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("send_mouse_click", () => {
    it("errors on missing coordinates", async () => {
      const res = await handleSendMouseClick(ctx, {});
      assertError(res);
      expect(res.content[0]!.text).toContain("x and y");
    });

    it("errors when no game is running", async () => {
      const res = await handleSendMouseClick(ctx, { x: 100, y: 200 });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("send_mouse_motion", () => {
    it("errors on missing coordinates", async () => {
      const res = await handleSendMouseMotion(ctx, {});
      assertError(res);
      expect(res.content[0]!.text).toContain("x and y");
    });

    it("errors when no game is running", async () => {
      const res = await handleSendMouseMotion(ctx, { x: 100, y: 200 });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("send_mouse_drag", () => {
    it("errors on missing coordinates", async () => {
      const res = await handleSendMouseDrag(ctx, {});
      assertError(res);
      expect(res.content[0]!.text).toContain("fromX");
    });

    it("errors when no game is running", async () => {
      const res = await handleSendMouseDrag(ctx, {
        fromX: 0,
        fromY: 0,
        toX: 100,
        toY: 100,
      });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("wait_for_signal", () => {
    it("errors on missing nodePath", async () => {
      const res = await handleWaitForSignal(ctx, { signal: "died" });
      assertError(res);
      expect(res.content[0]!.text).toContain("nodePath");
    });

    it("errors on missing signal", async () => {
      const res = await handleWaitForSignal(ctx, { nodePath: "Player" });
      assertError(res);
      expect(res.content[0]!.text).toContain("signal");
    });

    it("errors when no game is running", async () => {
      const res = await handleWaitForSignal(ctx, {
        nodePath: "Player",
        signal: "died",
        timeout: 1,
      });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("wait_for_node", () => {
    it("errors on missing nodePath", async () => {
      const res = await handleWaitForNode(ctx, {});
      assertError(res);
      expect(res.content[0]!.text).toContain("nodePath");
    });

    it("errors when no game is running", async () => {
      const res = await handleWaitForNode(ctx, {
        nodePath: "Player/Sword",
        timeout: 1,
      });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("get_performance_metrics", () => {
    it("errors when no game is running", async () => {
      const res = await handleGetPerformanceMetrics(ctx, {});
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("reset_scene", () => {
    it("errors when no game is running", async () => {
      const res = await handleResetScene(ctx);
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("get_runtime_errors", () => {
    it("errors when no game is running", async () => {
      const res = await handleGetRuntimeErrors(ctx, {});
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("send_key_sequence", () => {
    it("errors on missing keys", async () => {
      const res = await handleSendKeySequence(ctx, {});
      assertError(res);
      expect(res.content[0]!.text).toContain("keys");
    });

    it("errors on non-array keys", async () => {
      const res = await handleSendKeySequence(ctx, { keys: "abc" });
      assertError(res);
      expect(res.content[0]!.text).toContain("keys");
    });

    it("errors when no game is running", async () => {
      const res = await handleSendKeySequence(ctx, { keys: ["a", "b"] });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });

    it("errors when no game is running (with collectSignals)", async () => {
      const res = await handleSendKeySequence(ctx, {
        keys: ["a"],
        collectSignals: [
          { nodePath: "/root/EventBus", signals: ["task_completed"] },
        ],
      });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });

    it("errors when no game is running (with screenshot checkpoint)", async () => {
      const res = await handleSendKeySequence(ctx, {
        keys: ["a", { screenshot: "/tmp/test.png" }],
      });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });

    it("errors when no game is running (with action items)", async () => {
      const res = await handleSendKeySequence(ctx, {
        keys: [
          { action: "test_action" },
          { action: "test_action", hold_ms: 100 },
          { action: "test_action", holdMs: 100 },
        ],
      });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("send_joypad_button", () => {
    it("errors on missing button", async () => {
      const res = await handleSendJoypadButton(ctx, {});
      assertError(res);
      expect(res.content[0]!.text).toContain("button");
    });

    it("errors when no game is running", async () => {
      const res = await handleSendJoypadButton(ctx, { button: "a" });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });

  describe("send_joypad_motion", () => {
    it("errors on missing axis", async () => {
      const res = await handleSendJoypadMotion(ctx, { value: 0.5 });
      assertError(res);
      expect(res.content[0]!.text).toContain("axis");
    });

    it("errors on missing value", async () => {
      const res = await handleSendJoypadMotion(ctx, { axis: "left_x" });
      assertError(res);
      expect(res.content[0]!.text).toContain("value");
    });

    it("errors when no game is running", async () => {
      const res = await handleSendJoypadMotion(ctx, {
        axis: "left_x",
        value: 0.75,
      });
      assertError(res);
      expect(res.content[0]!.text).toContain("run_interactive");
    });
  });
});
