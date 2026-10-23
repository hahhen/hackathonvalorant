import {
  worldToMinimap,
  type MinimapDefinition,
  type WorldLocation,
} from "./minimap";
import type { MatchEvent, Round } from "@/types/match";

/** Keep the plant location, not the planter's later snapshot position. */
export function snapshotObjective(round: Round, event: MatchEvent) {
  if (event.objectiveLocation) return event.objectiveLocation;
  const plant = round.events.find((item) => item.type === "plant");
  if (!plant || event.timeMs < plant.timeMs) return undefined;
  if (
    (plant.coordinateSpace ?? "mock-normalized") !==
    (event.coordinateSpace ?? "mock-normalized")
  )
    return undefined;
  return (
    plant.objectiveLocation ??
    plant.positions.find((position) => position.playerId === plant.actorId)
  );
}

/** Mock percentages are already image-relative; world coordinates swap axes. */
export function projectInspectorPoint(
  location: WorldLocation,
  space: MatchEvent["coordinateSpace"],
  map: MinimapDefinition,
) {
  if (space === "world") return worldToMinimap(location, map);
  if (!Number.isFinite(location.x) || !Number.isFinite(location.y)) {
    throw new Error("Invalid snapshot location");
  }
  const x = location.x / 100;
  const y = location.y / 100;
  return { x, y, inBounds: x >= 0 && x <= 1 && y >= 0 && y <= 1 };
}

/** World heading assumes (cos θ, sin θ); apply the same linear projection. */
export function projectInspectorHeading(
  radians: number | undefined,
  space: MatchEvent["coordinateSpace"],
  map: MinimapDefinition,
) {
  if (radians === undefined || !Number.isFinite(radians)) return undefined;
  if (space !== "world") return radians;
  return Math.atan2(
    Math.cos(radians) * map.yMultiplier * map.height,
    Math.sin(radians) * map.xMultiplier * map.width,
  );
}
