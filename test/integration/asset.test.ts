import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import type { Server } from "http";
import type { AddressInfo } from "net";
import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { initContext, FIXTURE_PATH } from "../setup.js";
import { TestCleanup, assertSuccess, assertError } from "../helpers.js";
import {
  handleSearchAssets,
  handleInstallAsset,
} from "../../src/handlers/asset-handlers.js";
import { makeZip } from "../zip-util.js";
import type { ServerContext } from "../../src/context.js";

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

// A normal asset: contents wrapped in a single "<repo>-<sha>/" folder, as the
// Asset Library serves them. A malicious asset that tries to escape the project.
const addonZip = makeZip([
  {
    name: "sample-addon-main/addons/sample/plugin.cfg",
    data: '[plugin]\nname="Sample"\n',
  },
  { name: "sample-addon-main/addons/sample/sample.gd", data: "extends Node\n" },
]);
const evilZip = makeZip([{ name: "../escape.txt", data: "pwned" }]);
const addonHash = sha256(addonZip);
const evilHash = sha256(evilZip);

describe("Asset Library handlers", () => {
  let ctx: ServerContext;
  let server: Server;
  let base: string;
  const cleanup = new TestCleanup();

  beforeAll(async () => {
    ctx = await initContext();

    server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      const json = (obj: unknown) => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(obj));
      };

      switch (url.pathname) {
        case "/asset": {
          const filter = url.searchParams.get("filter");
          if (filter === "boom") {
            res.writeHead(503);
            res.end("error");
            return;
          }
          if (filter === "nonexistent") {
            json({ result: [], total_items: 0, page: 0, pages: 0 });
            return;
          }
          json({
            result: [
              {
                asset_id: "42",
                title: "Sample Addon",
                author: "tester",
                category: "Tools",
                godot_version: "4.7",
                cost: "MIT",
                version_string: "1.0",
                modify_date: "2026-06-20 10:00:00",
              },
            ],
            total_items: 1,
            page: 0,
            pages: 1,
          });
          return;
        }
        case "/asset/42":
          json({
            asset_id: "42",
            title: "Sample Addon",
            download_url: `${base}/download/addon.zip`,
            download_hash: addonHash,
            version_string: "1.0",
          });
          return;
        case "/asset/77": // advertises the wrong hash
          json({
            asset_id: "77",
            title: "Bad Hash",
            download_url: `${base}/download/addon.zip`,
            download_hash: "0".repeat(64),
          });
          return;
        case "/asset/99": // points at the malicious archive
          json({
            asset_id: "99",
            title: "Evil",
            download_url: `${base}/download/evil.zip`,
            download_hash: evilHash,
          });
          return;
        case "/download/addon.zip":
          res.writeHead(200, { "content-type": "application/zip" });
          res.end(addonZip);
          return;
        case "/download/evil.zip":
          res.writeHead(200, { "content-type": "application/zip" });
          res.end(evilZip);
          return;
        default:
          res.writeHead(404);
          res.end("not found");
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    cleanup.run();
    server.close();
  });

  // ---- search_assets ----

  it("search_assets lists results with asset ids", async () => {
    const text = assertSuccess(
      await handleSearchAssets(ctx, { query: "sample", libraryUrl: base }),
    );
    expect(text).toContain("[42]");
    expect(text).toContain("Sample Addon");
  });

  it("search_assets handles an empty result set", async () => {
    const text = assertSuccess(
      await handleSearchAssets(ctx, { query: "nonexistent", libraryUrl: base }),
    );
    expect(text).toContain("No assets found");
  });

  it("search_assets surfaces HTTP errors", async () => {
    assertError(
      await handleSearchAssets(ctx, { query: "boom", libraryUrl: base }),
    );
  });

  it("search_assets handles network failure", async () => {
    assertError(
      await handleSearchAssets(ctx, {
        query: "x",
        libraryUrl: "http://127.0.0.1:1",
      }),
    );
  });

  // ---- install_asset ----

  it("install_asset downloads and extracts, stripping the wrapper folder", async () => {
    const sub = "installed_assets";
    cleanup.track(sub);
    assertSuccess(
      await handleInstallAsset(ctx, {
        projectPath: FIXTURE_PATH,
        assetId: "42",
        libraryUrl: base,
        subdirectory: sub,
      }),
    );
    expect(
      existsSync(join(FIXTURE_PATH, sub, "addons/sample/plugin.cfg")),
    ).toBe(true);
    expect(
      readFileSync(join(FIXTURE_PATH, sub, "addons/sample/sample.gd"), "utf8"),
    ).toContain("extends Node");
  });

  it("install_asset keeps the wrapper folder when stripTopLevel is false", async () => {
    const sub = "installed_nostrip";
    cleanup.track(sub);
    assertSuccess(
      await handleInstallAsset(ctx, {
        projectPath: FIXTURE_PATH,
        assetId: "42",
        libraryUrl: base,
        subdirectory: sub,
        stripTopLevel: false,
      }),
    );
    expect(
      existsSync(
        join(FIXTURE_PATH, sub, "sample-addon-main/addons/sample/plugin.cfg"),
      ),
    ).toBe(true);
  });

  it("install_asset accepts a direct downloadUrl", async () => {
    const sub = "installed_direct";
    cleanup.track(sub);
    assertSuccess(
      await handleInstallAsset(ctx, {
        projectPath: FIXTURE_PATH,
        downloadUrl: `${base}/download/addon.zip`,
        subdirectory: sub,
      }),
    );
    expect(
      existsSync(join(FIXTURE_PATH, sub, "addons/sample/plugin.cfg")),
    ).toBe(true);
  });

  it("install_asset rejects a hash mismatch without writing files", async () => {
    const sub = "installed_badhash";
    cleanup.track(sub);
    const text = assertError(
      await handleInstallAsset(ctx, {
        projectPath: FIXTURE_PATH,
        assetId: "77",
        libraryUrl: base,
        subdirectory: sub,
      }),
    );
    expect(text).toContain("hash mismatch");
    expect(existsSync(join(FIXTURE_PATH, sub))).toBe(false);
  });

  it("install_asset rejects path traversal (zip-slip)", async () => {
    cleanup.track("../escape.txt"); // defensive cleanup if the guard regresses
    const escapePath = join(FIXTURE_PATH, "..", "escape.txt");
    assertError(
      await handleInstallAsset(ctx, {
        projectPath: FIXTURE_PATH,
        assetId: "99",
        libraryUrl: base,
        stripTopLevel: false,
      }),
    );
    expect(existsSync(escapePath)).toBe(false);
  });

  it("install_asset requires projectPath", async () => {
    assertError(
      await handleInstallAsset(ctx, { assetId: "42", libraryUrl: base }),
    );
  });

  it("install_asset requires an asset source", async () => {
    assertError(
      await handleInstallAsset(ctx, {
        projectPath: FIXTURE_PATH,
        libraryUrl: base,
      }),
    );
  });

  it("install_asset rejects an unsafe projectPath", async () => {
    assertError(
      await handleInstallAsset(ctx, {
        projectPath: "../etc",
        assetId: "42",
        libraryUrl: base,
      }),
    );
  });
});
