/**
 * App-wide constants.
 *
 * Default view: the open water of J. Percy Priest Lake just outside Hamilton
 * Creek (Sailboat) Marina, home of the Percy Priest Yacht Club, near
 * Nashville, TN. The marina sits at ~36.112°N, -86.624°W; this center nudges
 * out onto the open racing area to the southwest.
 *
 * Typical PPYC race courses run 0.5–1.2 nm between the windward-most and
 * leeward-most marks, so the default zoom is chosen to frame roughly a 2 nm
 * span (course + boats) on a phone before any GPS fix arrives.
 */

/** [lng, lat] — MapLibre order. */
export const DEFAULT_CENTER: [number, number] = [-86.627, 36.108];

/** Overview zoom shown before we have a position fix. */
export const DEFAULT_ZOOM = 13.5;

/** Zoom used once we auto-center on the flag boat / our own position. */
export const COURSE_ZOOM = 14;

/** Expected race course leg range (windward-most to leeward-most), in nautical miles. */
export const TYPICAL_COURSE_NM = { min: 0.5, max: 1.2 } as const;
