import test from "node:test";
import assert from "node:assert/strict";
import { buildImageBNConfiguration } from "./google_photos_bn_core.mjs";

const asset = {
  assetId: "asset_test",
  filename: "sample.png",
  width: 4,
  height: 3,
  contentHash: "sha256:test",
  importedAt: "2026-10-20T00:00:00.000Z",
  provenance: { source: "google-photos-picker", pickerMediaItemId: "picked-1", sessionId: "session-1" },
};

test("builds sequential ImageBN IDs without changing the source asset", () => {
  const rgba = new Uint8ClampedArray(4 * 3 * 4).fill(255);
  const before = structuredClone(asset);
  const config = buildImageBNConfiguration({ asset, rgba, stride: 1, maxPoints: 20 });
  assert.equal(config.points.length, 12);
  assert.equal(config.points[0].bn, "bn9");
  assert.equal(config.points.at(-1).bn, "bn20");
  assert.equal(config.points[0].x, 0);
  assert.equal(config.points[0].y, 0);
  assert.equal(config.assetId, asset.assetId);
  assert.deepEqual(asset, before);
});

test("caps dense samples and skips transparent pixels", () => {
  const rgba = new Uint8ClampedArray(4 * 3 * 4).fill(255);
  rgba[3] = 0;
  const config = buildImageBNConfiguration({ asset, rgba, stride: 1, maxPoints: 4 });
  assert.ok(config.points.length <= 4);
  assert.ok(config.sample.effectiveStride > 1);
  assert.equal(config.points.some(p => p.x === 0 && p.y === 0), false);
  assert.equal(config.nextBNIndex, 9 + config.points.length);
});

test("rejects malformed pixel buffers", () => {
  assert.throws(() => buildImageBNConfiguration({ asset, rgba: [0, 0], stride: 1 }), /rgba length/);
});
