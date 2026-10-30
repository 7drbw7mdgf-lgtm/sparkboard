// Lines share the SVG overlay at layer 2; HTML items can be raised above it.
export const CONNECTION_LAYER = 2;
const isLine = (item) => ['path', 'line', 'connector'].includes(item.type);
export const objectLayer = (item) => item.z ?? (item.type === 'frame' ? -10 : 0);
export function paintOrder(objects) {
  return objects.slice().sort((a, b) => {
    const lineA = isLine(a),
      lineB = isLine(b);
    const layerA = lineA ? CONNECTION_LAYER : objectLayer(a),
      layerB = lineB ? CONNECTION_LAYER : objectLayer(b);
    return (
      layerA - layerB ||
      (lineA && lineB ? objectLayer(a) - objectLayer(b) : Number(lineB) - Number(lineA))
    );
  });
}
