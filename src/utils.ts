import { join, basename } from "path";
import { existsSync, readdirSync } from "fs";
import type { ChildProcess } from "child_process";
import type { OperationParams, ToolResponse } from "./types.js";

export const PARAMETER_MAPPINGS: Record<string, string> = {
  project_path: "projectPath",
  scene_path: "scenePath",
  root_node_type: "rootNodeType",
  parent_node_path: "parentNodePath",
  node_type: "nodeType",
  node_name: "nodeName",
  texture_path: "texturePath",
  node_path: "nodePath",
  output_path: "outputPath",
  mesh_item_names: "meshItemNames",
  new_path: "newPath",
  file_path: "filePath",
  directory: "directory",
  recursive: "recursive",
  scene: "scene",
  child_scene_path: "childScenePath",
  animation_name: "animationName",
  script_path: "scriptPath",
  custom_data: "customData",
  new_name: "newName",
  collision_layer: "collisionLayer",
  collision_mask: "collisionMask",
  wait_frames: "waitFrames",
};

export const REVERSE_PARAMETER_MAPPINGS: Record<string, string> = {};
for (const [snakeCase, camelCase] of Object.entries(PARAMETER_MAPPINGS)) {
  REVERSE_PARAMETER_MAPPINGS[camelCase] = snakeCase;
}

export function logDebug(debugMode: boolean, message: string): void {
  if (debugMode) {
    console.error(`[DEBUG] ${message}`);
  }
}

/** Kill a child process and wait for it to exit (with a timeout fallback). */
export function killProcess(
  proc: ChildProcess,
  timeoutMs = 3000,
): Promise<void> {
  return new Promise((resolve) => {
    if (!proc.pid || proc.exitCode !== null) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      resolve();
    }, timeoutMs);
    proc.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    proc.kill();
  });
}

export function createErrorResponse(
  message: string,
  possibleSolutions: string[] = [],
): ToolResponse {
  console.error(`[SERVER] Error response: ${message}`);
  if (possibleSolutions.length > 0) {
    console.error(
      `[SERVER] Possible solutions: ${possibleSolutions.join(", ")}`,
    );
  }

  const response: ToolResponse = {
    content: [
      {
        type: "text",
        text: message,
      },
    ],
    isError: true,
  };

  if (possibleSolutions.length > 0) {
    response.content.push({
      type: "text",
      text: "Possible solutions:\n- " + possibleSolutions.join("\n- "),
    });
  }

  return response;
}

export function validatePath(path: string): boolean {
  if (!path || path.includes("..")) {
    return false;
  }
  return true;
}

export function normalizeParameters(params: OperationParams): OperationParams {
  const result: OperationParams = {};

  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      let normalizedKey = key;

      if (key.includes("_") && PARAMETER_MAPPINGS[key]) {
        normalizedKey = PARAMETER_MAPPINGS[key];
      }

      if (
        typeof params[key] === "object" &&
        params[key] !== null &&
        !Array.isArray(params[key])
      ) {
        result[normalizedKey] = normalizeParameters(
          params[key] as OperationParams,
        );
      } else {
        result[normalizedKey] = params[key];
      }
    }
  }

  return result;
}

export function convertCamelToSnakeCase(
  params: OperationParams,
): OperationParams {
  const result: OperationParams = {};

  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const snakeKey =
        REVERSE_PARAMETER_MAPPINGS[key] ??
        key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

      if (
        typeof params[key] === "object" &&
        params[key] !== null &&
        !Array.isArray(params[key])
      ) {
        result[snakeKey] = convertCamelToSnakeCase(
          params[key] as OperationParams,
        );
      } else {
        result[snakeKey] = params[key];
      }
    }
  }

  return result;
}

/**
 * Filter out harmless Godot exit-time warnings from stderr.
 * Godot emits resource leak warnings and ObjectDB cleanup messages on exit
 * that are not actual operation failures.
 */
export function filterGodotStderr(stderr: string): string {
  return stderr
    .split("\n")
    .filter(
      (line) =>
        !line.includes("RIDs of type") &&
        !line.includes("RID allocations of type") &&
        !line.includes("ObjectDB instances leaked") &&
        !line.includes("resources still in use at exit") &&
        !line.includes("_free_rids") &&
        !line.includes("cleanup (core/object/object.cpp") &&
        !line.includes("clear (core/io/resource.cpp"),
    )
    .join("\n")
    .trim();
}

export function isGodot44OrLater(version: string): boolean {
  const match = /^(\d+)\.(\d+)/.exec(version);
  if (match?.[1] && match[2]) {
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    return major > 4 || (major === 4 && minor >= 4);
  }
  return false;
}

export function getProjectStructure(
  projectPath: string,
  debugMode: boolean,
): any {
  try {
    const entries = readdirSync(projectPath, { withFileTypes: true });

    const structure: any = {
      scenes: [],
      scripts: [],
      assets: [],
      other: [],
    };

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirName = entry.name.toLowerCase();

        if (dirName.startsWith(".")) {
          continue;
        }

        if (dirName === "scenes" || dirName.includes("scene")) {
          structure.scenes.push(entry.name);
        } else if (dirName === "scripts" || dirName.includes("script")) {
          structure.scripts.push(entry.name);
        } else if (
          dirName === "assets" ||
          dirName === "textures" ||
          dirName === "models" ||
          dirName === "sounds" ||
          dirName === "music"
        ) {
          structure.assets.push(entry.name);
        } else {
          structure.other.push(entry.name);
        }
      }
    }

    return structure;
  } catch (error) {
    logDebug(debugMode, `Error getting project structure: ${String(error)}`);
    return { error: "Failed to get project structure" };
  }
}

export function getProjectStructureAsync(
  projectPath: string,
  debugMode: boolean,
): Promise<any> {
  return new Promise((resolve) => {
    try {
      const structure = {
        scenes: 0,
        scripts: 0,
        assets: 0,
        other: 0,
      };

      const scanDirectory = (currentPath: string) => {
        const entries = readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const entryPath = join(currentPath, entry.name);

          if (entry.name.startsWith(".")) {
            continue;
          }

          if (entry.isDirectory()) {
            scanDirectory(entryPath);
          } else if (entry.isFile()) {
            const ext = entry.name.split(".").pop()?.toLowerCase();

            if (ext === "tscn") {
              structure.scenes++;
            } else if (ext === "gd" || ext === "gdscript" || ext === "cs") {
              structure.scripts++;
            } else if (
              [
                "png",
                "jpg",
                "jpeg",
                "webp",
                "svg",
                "ttf",
                "wav",
                "mp3",
                "ogg",
              ].includes(ext ?? "")
            ) {
              structure.assets++;
            } else {
              structure.other++;
            }
          }
        }
      };

      scanDirectory(projectPath);
      resolve(structure);
    } catch (error) {
      logDebug(
        debugMode,
        `Error getting project structure asynchronously: ${String(error)}`,
      );
      resolve({
        error: "Failed to get project structure",
        scenes: 0,
        scripts: 0,
        assets: 0,
        other: 0,
      });
    }
  });
}

export function findGodotProjects(
  directory: string,
  recursive: boolean,
  debugMode: boolean,
): { path: string; name: string }[] {
  const projects: { path: string; name: string }[] = [];

  try {
    const projectFile = join(directory, "project.godot");
    if (existsSync(projectFile)) {
      projects.push({
        path: directory,
        name: basename(directory),
      });
    }

    if (!recursive) {
      const entries = readdirSync(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subdir = join(directory, entry.name);
          const projectFile = join(subdir, "project.godot");
          if (existsSync(projectFile)) {
            projects.push({
              path: subdir,
              name: entry.name,
            });
          }
        }
      }
    } else {
      const entries = readdirSync(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subdir = join(directory, entry.name);
          if (entry.name.startsWith(".")) {
            continue;
          }
          const projectFile = join(subdir, "project.godot");
          if (existsSync(projectFile)) {
            projects.push({
              path: subdir,
              name: entry.name,
            });
          } else {
            const subProjects = findGodotProjects(subdir, true, debugMode);
            projects.push(...subProjects);
          }
        }
      }
    }
  } catch (error) {
    logDebug(
      debugMode,
      `Error searching directory ${directory}: ${String(error)}`,
    );
  }

  return projects;
}
