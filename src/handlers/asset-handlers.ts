import { join } from "path";
import { tmpdir } from "os";
import { existsSync, writeFileSync, rmSync } from "fs";
import { createHash, randomBytes } from "crypto";
import type { ServerContext } from "../context.js";
import type { ToolResponse } from "../types.js";
import {
  normalizeParameters,
  validatePath,
  createErrorResponse,
  logDebug,
} from "../utils.js";
import { executeOperation } from "../godot-executor.js";

/** Default Godot Asset Library REST API base. Overridable via env or the libraryUrl param. */
const DEFAULT_LIBRARY_URL = "https://godotengine.org/asset-library/api";

/** Refuse downloads larger than this to avoid pulling a huge/hostile payload. */
const MAX_DOWNLOAD_BYTES = 200 * 1024 * 1024;

/** Resolve the asset-library API base: explicit param > env override > default. */
function resolveLibraryUrl(args: any): string {
  const url =
    args.libraryUrl ??
    process.env.GODOT_ASSET_LIBRARY_URL ??
    DEFAULT_LIBRARY_URL;
  return String(url).replace(/\/+$/, "");
}

/** fetch() with an abort timeout so a hung server can't stall the tool. */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function handleSearchAssets(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  args = normalizeParameters(args);

  const base = resolveLibraryUrl(args);
  const params = new URLSearchParams();
  if (args.query) params.set("filter", String(args.query));
  if (args.type) params.set("type", String(args.type));
  if (args.category !== undefined && args.category !== null)
    params.set("category", String(args.category));
  if (args.godotVersion) params.set("godot_version", String(args.godotVersion));
  if (args.support) params.set("support", String(args.support));
  params.set("sort", args.sort ? String(args.sort) : "updated");

  let maxResults = Number(args.maxResults ?? 20);
  if (!Number.isFinite(maxResults)) maxResults = 20;
  maxResults = Math.min(100, Math.max(1, Math.trunc(maxResults)));
  params.set("max_results", String(maxResults));

  const page = Math.max(0, Math.trunc(Number(args.page ?? 0)) || 0);
  params.set("page", String(page));

  const url = `${base}/asset?${params.toString()}`;
  logDebug(ctx.debugMode, `Searching assets: ${url}`);

  try {
    const res = await fetchWithTimeout(url, 30_000);
    if (!res.ok) {
      return createErrorResponse(
        `Asset Library returned HTTP ${res.status} (${res.statusText}) for the search request.`,
        [
          "Check the query parameters (type must be any/addon/project; sort must be rating/cost/name/updated)",
          "Verify the libraryUrl is reachable",
        ],
      );
    }

    const data: any = await res.json();
    const results: any[] = Array.isArray(data?.result) ? data.result : [];

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No assets found for the given query.${
              args.query ? ` (filter: "${args.query}")` : ""
            }`,
          },
        ],
      };
    }

    const lines = results.map((a) => {
      const id = a.asset_id ?? a.assetId ?? "?";
      const title = a.title ?? "(untitled)";
      const author = a.author ?? "unknown";
      const cat = a.category ?? "—";
      const gv = a.godot_version ?? "?";
      const cost = a.cost ?? "—";
      const ver = a.version_string ?? a.version ?? "";
      const updated = a.modify_date ? String(a.modify_date).split(" ")[0] : "";
      return `- [${id}] ${title} — by ${author} | ${cat} | Godot ${gv} | ${cost}${
        ver ? ` | v${ver}` : ""
      }${updated ? ` | updated ${updated}` : ""}`;
    });

    const total = data?.total_items ?? results.length;
    const pages = data?.pages ?? 1;
    const footer = `\n\nShowing ${results.length} of ${total} result(s) — page ${
      page + 1
    }/${pages}. Install one with install_asset { projectPath, assetId }.`;

    return {
      content: [
        {
          type: "text",
          text: `## Asset Library results\n\n${lines.join("\n")}${footer}`,
        },
      ],
    };
  } catch (error: any) {
    const msg =
      error?.name === "AbortError"
        ? "The Asset Library search request timed out."
        : `Asset Library search failed: ${error?.message ?? "Unknown error"}`;
    return createErrorResponse(msg, [
      "Check your network connection",
      "Verify the Asset Library is reachable (https://godotengine.org/asset-library)",
      "Pass a libraryUrl to target a mirror or a local server",
    ]);
  }
}

/** Look up an asset's download URL (+ optional hash/title) by id. */
async function resolveAssetDownload(
  ctx: ServerContext,
  base: string,
  assetId: string,
): Promise<{ downloadUrl: string; downloadHash: string; title: string }> {
  const url = `${base}/asset/${encodeURIComponent(assetId)}`;
  logDebug(ctx.debugMode, `Resolving asset ${assetId}: ${url}`);
  const res = await fetchWithTimeout(url, 30_000);
  if (!res.ok) {
    throw new Error(
      `asset lookup returned HTTP ${res.status} (${res.statusText})`,
    );
  }
  const data: any = await res.json();
  const downloadUrl = data?.download_url;
  if (!downloadUrl || typeof downloadUrl !== "string") {
    throw new Error(`asset ${assetId} has no download_url`);
  }
  return {
    downloadUrl,
    downloadHash:
      typeof data?.download_hash === "string" ? data.download_hash : "",
    title: data?.title ?? assetId,
  };
}

export async function handleInstallAsset(
  ctx: ServerContext,
  args: any,
): Promise<ToolResponse> {
  args = normalizeParameters(args);

  if (!args.projectPath) {
    return createErrorResponse("Missing required parameter: projectPath", [
      "Provide projectPath plus either assetId or downloadUrl",
    ]);
  }
  if (!args.assetId && !args.downloadUrl) {
    return createErrorResponse("Missing asset source", [
      "Provide assetId (looked up via the Asset Library) or a direct downloadUrl",
      "Use search_assets to find an assetId",
    ]);
  }
  if (!validatePath(args.projectPath)) {
    return createErrorResponse("Invalid projectPath", [
      'Provide a valid path without ".."',
    ]);
  }
  if (args.subdirectory && !validatePath(String(args.subdirectory))) {
    return createErrorResponse("Invalid subdirectory", [
      'Provide a project-relative directory without ".."',
    ]);
  }

  const projectFile = join(args.projectPath, "project.godot");
  if (!existsSync(projectFile)) {
    return createErrorResponse(
      `Not a valid Godot project: ${args.projectPath}`,
      ["Ensure the path contains a project.godot file"],
    );
  }

  const base = resolveLibraryUrl(args);
  let zipPath: string | null = null;

  try {
    // 1. Resolve the download URL (+ hash for verification).
    let downloadUrl: string;
    let downloadHash = "";
    let title = "asset";
    if (args.downloadUrl) {
      downloadUrl = String(args.downloadUrl);
    } else {
      const resolved = await resolveAssetDownload(
        ctx,
        base,
        String(args.assetId),
      );
      downloadUrl = resolved.downloadUrl;
      downloadHash = resolved.downloadHash;
      title = resolved.title;
    }

    if (!/^https?:\/\//i.test(downloadUrl)) {
      return createErrorResponse(
        `Refusing to download non-HTTP URL: ${downloadUrl}`,
        ["downloadUrl must be an http(s) URL"],
      );
    }

    // 2. Download the archive.
    logDebug(ctx.debugMode, `Downloading asset from ${downloadUrl}`);
    const res = await fetchWithTimeout(downloadUrl, 120_000);
    if (!res.ok) {
      return createErrorResponse(
        `Download failed: HTTP ${res.status} (${res.statusText}) from ${downloadUrl}`,
        ["Verify the asset is still available", "Try again later"],
      );
    }
    const contentLength = Number(res.headers.get("content-length") ?? 0);
    if (contentLength > MAX_DOWNLOAD_BYTES) {
      return createErrorResponse(
        `Asset is too large (${contentLength} bytes; limit ${MAX_DOWNLOAD_BYTES}).`,
        ["Install this asset manually if you trust it"],
      );
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_DOWNLOAD_BYTES) {
      return createErrorResponse(
        `Asset is too large (${buf.byteLength} bytes; limit ${MAX_DOWNLOAD_BYTES}).`,
        ["Install this asset manually if you trust it"],
      );
    }

    // 3. Verify integrity when the library advertised a sha256 hash.
    const verifyHash = args.verifyHash !== false;
    if (verifyHash && downloadHash) {
      const actual = createHash("sha256").update(buf).digest("hex");
      if (actual.toLowerCase() !== downloadHash.toLowerCase()) {
        return createErrorResponse(
          `Download hash mismatch for "${title}" — expected ${downloadHash}, got ${actual}.`,
          [
            "The download may be corrupted or tampered with; aborting install",
            "Pass verifyHash: false to skip this check (not recommended)",
          ],
        );
      }
    }

    // 4. Persist to a temp file and hand extraction to Godot's ZIPReader.
    zipPath = join(
      tmpdir(),
      `godot-mcp-asset-${randomBytes(8).toString("hex")}.zip`,
    );
    writeFileSync(zipPath, buf);

    const opParams: any = {
      zipPath,
      stripTopLevel: args.stripTopLevel !== false,
    };
    if (args.subdirectory) opParams.subdirectory = String(args.subdirectory);

    const { stdout, stderr } = await executeOperation(
      ctx,
      "install_asset",
      opParams,
      args.projectPath,
    );

    if (
      stderr.includes("Failed to") ||
      stderr.includes("ASSET_INSTALL_ERROR")
    ) {
      return createErrorResponse(`Failed to install asset: ${stderr.trim()}`, [
        "The archive may be malformed or contain unsafe paths",
        "Check that the project directory is writable",
      ]);
    }

    // Parse the JSON summary the op prints, if present.
    let installed: string[] = [];
    for (const line of stdout.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("{")) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed.installed)) {
          installed = parsed.installed;
          break;
        }
      } catch {
        /* not the summary line */
      }
    }

    const where = args.subdirectory
      ? `res://${args.subdirectory}`
      : "the project root";
    const fileList =
      installed.length > 0
        ? `\n\nInstalled ${installed.length} file(s):\n${installed
            .slice(0, 50)
            .map((f) => `- ${f}`)
            .join(
              "\n",
            )}${installed.length > 50 ? `\n…and ${installed.length - 50} more` : ""}`
        : "";

    return {
      content: [
        {
          type: "text",
          text: `Installed "${title}" into ${where}. Resources are imported the next time the project is opened or run.${fileList}\n\nOutput: ${stdout.trim()}`,
        },
      ],
    };
  } catch (error: any) {
    const msg =
      error?.name === "AbortError"
        ? "The asset download timed out."
        : `Failed to install asset: ${error?.message ?? "Unknown error"}`;
    return createErrorResponse(msg, [
      "Check your network connection and the asset source",
      "Ensure Godot is installed correctly and the project is writable",
    ]);
  } finally {
    if (zipPath && existsSync(zipPath)) {
      try {
        rmSync(zipPath);
      } catch {
        /* best-effort temp cleanup */
      }
    }
  }
}
