import type * as net from "net";
import type { ChildProcess } from "child_process";

export interface GodotProcess {
  process: ChildProcess;
  output: string[];
  errors: string[];
}

export interface GodotServerConfig {
  godotPath?: string;
  debugMode?: boolean;
  godotDebugMode?: boolean;
  strictPathValidation?: boolean;
  toolsets?: string[];
  excludeTools?: string[];
  readOnly?: boolean;
}

export type OperationParams = Record<string, any>;

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolResponse {
  content: { type: string; text: string }[];
  isError?: boolean;
}

export interface TcpState {
  socket: net.Socket | null;
  buffer: string;
  pendingResolve: ((value: Record<string, unknown>) => void) | null;
  pendingReject: ((reason: Error) => void) | null;
}

export interface InteractiveState {
  projectPath: string | null;
  originalProjectGodot: string | null;
}
