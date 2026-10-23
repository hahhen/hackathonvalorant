import manifest from "../../public/assets/minimaps/manifest.json";

export type MinimapDefinition = (typeof manifest.maps)[number];
export interface WorldLocation {
  x: number;
  y: number;
}
export interface MinimapCalibration {
  xMultiplier: number;
  yMultiplier: number;
  xScalarToAdd: number;
  yScalarToAdd: number;
}
export interface MinimapPoint extends WorldLocation {
  inBounds: boolean;
}

export const minimaps = manifest.maps;

/** Prefer matchInfo.mapId. UUID and display name are useful for asset selection. */
export function findMinimap(identifier: string): MinimapDefinition | undefined {
  const key = identifier.trim().toLowerCase();
  return minimaps.find((map) =>
    [map.mapUrl, map.uuid, map.name, map.slug].some(
      (value) => value.toLowerCase() === key,
    ),
  );
}

function assertPoint(point: WorldLocation) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError("Minimap coordinates must be finite numbers.");
  }
}

function assertCalibration(map: MinimapCalibration) {
  const values = [
    map.xMultiplier,
    map.yMultiplier,
    map.xScalarToAdd,
    map.yScalarToAdd,
  ];
  if (
    !values.every(Number.isFinite) ||
    map.xMultiplier === 0 ||
    map.yMultiplier === 0
  ) {
    throw new RangeError("This minimap has no usable coordinate calibration.");
  }
}

/** Official JSON world coordinates -> normalized image coordinates, top-left origin. */
export function worldToMinimap(
  location: WorldLocation,
  map: MinimapCalibration,
): MinimapPoint {
  assertPoint(location);
  assertCalibration(map);
  // The game axes cross: world Y drives image X, world X drives image Y.
  const x = location.y * map.xMultiplier + map.xScalarToAdd;
  const y = location.x * map.yMultiplier + map.yScalarToAdd;
  if (!Number.isFinite(x) || !Number.isFinite(y))
    throw new RangeError("Coordinate projection overflow.");
  return { x, y, inBounds: x >= 0 && x <= 1 && y >= 0 && y <= 1 };
}

/** No implicit crop, rotation, axis inversion, clamping or rounding. */
export function worldToMinimapPixels(
  location: WorldLocation,
  map: MinimapCalibration & { width: number; height: number },
  width = map.width,
  height = map.height,
): MinimapPoint {
  if (![width, height].every((value) => Number.isFinite(value) && value > 0)) {
    throw new RangeError(
      "Minimap image dimensions must be positive finite numbers.",
    );
  }
  const point = worldToMinimap(location, map);
  return { x: point.x * width, y: point.y * height, inBounds: point.inBounds };
}

/** Inverse projection, useful for round-trip tests and future map-region editing. */
export function minimapToWorld(
  point: WorldLocation,
  map: MinimapCalibration,
): WorldLocation {
  assertPoint(point);
  assertCalibration(map);
  const x = (point.y - map.yScalarToAdd) / map.yMultiplier;
  const y = (point.x - map.xScalarToAdd) / map.xMultiplier;
  if (!Number.isFinite(x) || !Number.isFinite(y))
    throw new RangeError("Coordinate projection overflow.");
  return { x, y };
}
