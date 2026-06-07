/**
 * Thin wrappers over Turf for the geospatial math we need.
 * All inputs are [lng, lat] or {lat,lng}; outputs are plain numbers.
 */

import { distance as turfDistance, rhumbBearing } from "@turf/turf";

export interface LatLng {
  lat: number;
  lng: number;
}

const METERS_PER_NM = 1852;

/** Great-circle distance in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  return turfDistance([a.lng, a.lat], [b.lng, b.lat], { units: "meters" });
}

export function metersToNm(m: number): number {
  return m / METERS_PER_NM;
}

/**
 * Compass bearing FROM a TO b, normalized to [0, 360).
 * Rhumb bearing matches how a race committee reads a constant heading.
 */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const raw = rhumbBearing([a.lng, a.lat], [b.lng, b.lat]);
  return (raw + 360) % 360;
}

/** Format a distance for display: meters when short, nautical miles when long. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${metersToNm(meters).toFixed(2)} nm`;
}

/** Format a compass bearing with the nearest cardinal/intercardinal point. */
export function formatBearing(deg: number): string {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round(deg / 45) % 8;
  return `${Math.round(deg)}° ${points[idx]}`;
}
