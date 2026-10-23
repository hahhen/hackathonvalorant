export interface MinimapCamera {
  zoom: number;
  x: number;
  y: number;
}
export const initialMinimapCamera: MinimapCamera = { zoom: 1, x: 0, y: 0 };
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
export function zoomMinimap(
  camera: MinimapCamera,
  factor: number,
  anchor = { x: 0.5, y: 0.5 },
): MinimapCamera {
  const zoom = clamp(camera.zoom * factor, 1, 4);
  const before = 1024 / camera.zoom,
    after = 1024 / zoom;
  return {
    zoom,
    x: clamp(camera.x + anchor.x * (before - after), 0, 1024 - after),
    y: clamp(camera.y + anchor.y * (before - after), 0, 1024 - after),
  };
}
export function panMinimap(
  camera: MinimapCamera,
  dx: number,
  dy: number,
): MinimapCamera {
  const size = 1024 / camera.zoom;
  return {
    ...camera,
    x: clamp(camera.x - dx * size, 0, 1024 - size),
    y: clamp(camera.y - dy * size, 0, 1024 - size),
  };
}
