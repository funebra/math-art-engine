/** Pure image-to-BN configuration logic. Does not alter PlotBN or F-0011 RegistryBN. */
export function buildImageBNConfiguration({
  asset,
  rgba,
  stride = 8,
  maxPoints = 5000,
  startIndex = 9,
  transform = { crop: null, rotationDeg: 0, scale: 1 },
  createdAt = new Date().toISOString(),
  configurationId = crypto.randomUUID(),
}) {
  if (!asset || typeof asset.assetId !== "string" || !asset.assetId) throw new TypeError("asset.assetId is required");
  const width = Number(asset.width), height = Number(asset.height);
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) throw new TypeError("asset dimensions must be positive integers");
  if (!rgba || rgba.length !== width * height * 4) throw new RangeError("rgba length must equal width × height × 4");
  stride = Math.max(1, Math.floor(Number(stride) || 1));
  maxPoints = Math.max(1, Math.floor(Number(maxPoints) || 1));
  startIndex = Math.max(9, Math.floor(Number(startIndex) || 9));

  let step = stride;
  while (Math.ceil(width / step) * Math.ceil(height / step) > maxPoints) step++;
  const points = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const offset = (y * width + x) * 4;
      const alpha = rgba[offset + 3];
      if (alpha === 0) continue;
      points.push({
        bn: `bn${startIndex + points.length}`,
        x,
        y,
        rgba: [rgba[offset], rgba[offset + 1], rgba[offset + 2], alpha],
      });
    }
  }

  return {
    format: "funebra-image-bn-config-v0.1",
    configurationId,
    assetId: asset.assetId,
    source: {
      filename: asset.filename,
      width,
      height,
      contentHash: asset.contentHash,
      importedAt: asset.importedAt,
      provenance: structuredClone(asset.provenance),
    },
    coordinateSpace: "source-image-pixels; origin top-left; x right; y down",
    sample: { requestedStride: stride, effectiveStride: step, maxPoints },
    transform: structuredClone(transform),
    createdAt,
    points,
    nextBNIndex: startIndex + points.length,
  };
}
