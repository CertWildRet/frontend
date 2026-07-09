import {
  SPECTRAL_CHART,
  SPECTRAL_CHART_AREA,
  SPECTRAL_CHART_LINE,
  type SpectralLinearGradient,
} from "./spectral";

function SpectralLinearGradientDef({
  id,
  gradient,
}: {
  id: string;
  gradient: SpectralLinearGradient;
}) {
  return (
    <linearGradient id={id} x1={gradient.x1} y1={gradient.y1} x2={gradient.x2} y2={gradient.y2}>
      {gradient.stops.map((stop) => (
        <stop
          key={stop.offset}
          offset={stop.offset}
          stopColor={stop.color}
          stopOpacity={stop.opacity}
        />
      ))}
    </linearGradient>
  );
}

/** SVG <defs> pair for a spectral line + area chart. Pass unique ids per chart instance. */
export function SpectralChartDefs({
  lineId,
  areaId,
}: {
  lineId: string;
  areaId: string;
}) {
  return (
    <>
      <SpectralLinearGradientDef id={lineId} gradient={SPECTRAL_CHART_LINE} />
      <SpectralLinearGradientDef id={areaId} gradient={SPECTRAL_CHART_AREA} />
    </>
  );
}

export { SPECTRAL_CHART };
