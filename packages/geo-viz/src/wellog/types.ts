import type { CurveType } from '../domain-tokens';

/**
 * Well log curve type, from the domain vocabulary in
 * docs/architecture/overview.md (ГК → GR, КС → RS, ПС → SP, ИК → IL,
 * ТК → TK, КНД → KND, каверномер → CAL, расходометрия → FLOW).
 *
 * It is an alias of `@kapgeo/ui`'s `CurveType` on purpose: the default colour
 * of a curve is `domainTokens.curves[type]`, so the two sets must not drift.
 * A curve that has no token type carries an explicit `color`.
 */
export type LogType = CurveType;

/**
 * Curve samples as two parallel arrays.
 *
 * The package contract allowed an interleaved `[depth0, value0, depth1, ...]`
 * array as well; this package settled on the pair because it is unambiguous,
 * it lets the backend stream the two typed arrays independently, and slicing a
 * depth window needs no index arithmetic. `depths` must be ascending (top =
 * shallow); `values` may contain `NaN` for gaps.
 */
export type CurveSamples = {
  depths: ArrayLike<number>;
  values: ArrayLike<number>;
};

/** Horizontal scale of one curve inside its track. */
export type CurveScale = {
  min: number;
  max: number;
  /** Logarithmic horizontal scale (resistivity). `min` must be > 0. */
  log?: boolean;
};

export type CurveSpec = {
  id: string;
  name: string;
  type: LogType;
  /** Measurement unit shown in the header and the hover readout, e.g. `µR/h`. */
  unit: string;
  /** Overrides the default colour for `type`. */
  color?: string;
  data: CurveSamples;
  scale: CurveScale;
};

export type TrackSpec = {
  id: string;
  title: string;
  /** Track width in CSS pixels. Default 140. */
  width?: number;
  curves: CurveSpec[];
  /** Draw the value/depth grid. Default true. */
  grid?: boolean;
  intervals?: IntervalSpec[];
  subtitle?: string;
  editable?: boolean;
};

/** Display geometry only; geological operations belong to the host application. */
export type IntervalSpec = {
  id: string;
  from: number;
  to: number;
  label: string;
  fill: string;
  pattern?: 'dots' | 'lines' | 'diagonal';
  selected?: boolean;
  preview?: boolean;
};

export type TrackInteraction = {
  trackId: string;
  depth: number;
};

/** Depth window in metres, `[from, to]`, `from` shallower than `to`. */
export type DepthRange = [from: number, to: number];

export type WellLogProps = {
  tracks: TrackSpec[];
  /**
   * Visible depth window. When `onDepthRangeChange` is given the component is
   * controlled (it only reports the window it would like to show); otherwise
   * this is the initial window and zoom/pan are kept in internal state.
   */
  depthRange: DepthRange;
  /** Total height in CSS pixels. Default 480. */
  height?: number;
  className?: string;
  onDepthRangeChange?: (range: DepthRange) => void;
  bounds?: DepthRange;
  interactionMode?: 'select' | 'pan' | 'range' | 'boundary';
  onTrackSelect?: (event: TrackInteraction) => void;
  onRangeSelect?: (trackId: string, range: DepthRange) => void;
  onBoundaryChange?: (trackId: string, intervalId: string, edge: 'from' | 'to', depth: number) => void;
  onTrackHeaderClick?: (trackId: string) => void;
  labels?: { axis: string; depthAxis: string; unit: string; track: string };
};
