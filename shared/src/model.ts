/**
 * Core domain types shared between the client and the server.
 *
 * Coordinates are always real-world WGS84 latitude/longitude in decimal degrees.
 * We never transmit screen/pixel coordinates — the map handles rotation locally.
 */

export type MarkType = "pin" | "windward" | "leeward";

/** A buoy dropped on the course. */
export interface Mark {
  id: string;
  type: MarkType;
  lat: number;
  lng: number;
  /** Device that dropped it. */
  byDeviceId: string;
  /** Server-authoritative timestamp (epoch ms). */
  ts: number;
}

/**
 * Wind reading. `directionDeg` is the compass heading the wind blows FROM
 * (standard sailing convention: 270 = a westerly). Speed is in knots.
 */
export interface Wind {
  directionDeg: number;
  speedKts?: number;
  byDeviceId: string;
  ts: number;
}

/** Live position of a connected device. */
export interface DevicePosition {
  deviceId: string;
  name: string;
  lat: number;
  lng: number;
  /** GPS accuracy radius in meters. */
  accuracy?: number;
  /** Direction of travel in degrees, if the device reports it. */
  heading?: number | null;
  /** Speed over ground in m/s, if reported. */
  speed?: number | null;
  /** Last update (epoch ms). */
  ts: number;
}

/** Full snapshot of a session's current state, sent to a joining device. */
export interface SessionSnapshot {
  sessionCode: string;
  devices: DevicePosition[];
  marks: Mark[];
  wind: Wind | null;
  flagBoatId: string | null;
}

/** Event types recorded in the durable, replayable per-session log. */
export type EventType =
  | "session_created"
  | "device_joined"
  | "device_left"
  | "flag_boat_set"
  | "mark_dropped"
  | "wind_set"
  | "mark_removed"
  | "course_cleared";

/** A single append-only log line. Replaying these in `seq` order rebuilds state. */
export interface EventLogEntry {
  seq: number;
  sessionCode: string;
  eventType: EventType;
  /** Server-authoritative timestamp (epoch ms). */
  serverTs: number;
  byDeviceId: string | null;
  payload: Record<string, unknown>;
}
