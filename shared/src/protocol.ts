/**
 * WebSocket wire protocol. JSON messages, discriminated on `type`.
 * Imported by both client and server so the format can never drift.
 */

import type { DevicePosition, Mark, MarkType, SessionSnapshot, Wind } from "./model.js";

/* ------------------------------------------------------------------ */
/* Client -> Server                                                    */
/* ------------------------------------------------------------------ */

export interface JoinMsg {
  type: "join";
  sessionCode: string;
  deviceId: string;
  name: string;
}

export interface PositionMsg {
  type: "position";
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  clientTs: number;
}

export interface SetFlagBoatMsg {
  type: "setFlagBoat";
  /** Device to designate as the flag boat (origin of the start/finish line). */
  deviceId: string;
}

export interface DropMarkMsg {
  type: "dropMark";
  markType: MarkType;
  lat: number;
  lng: number;
  clientTs: number;
}

export interface SetWindMsg {
  type: "setWind";
  /** Compass heading the wind blows FROM, in degrees. */
  directionDeg: number;
  speedKts?: number;
  clientTs: number;
}

export interface RemoveMarkMsg {
  type: "removeMark";
  markId: string;
}

export interface ClearCourseMsg {
  type: "clearCourse";
}

export type ClientMessage =
  | JoinMsg
  | PositionMsg
  | SetFlagBoatMsg
  | DropMarkMsg
  | SetWindMsg
  | RemoveMarkMsg
  | ClearCourseMsg;

/* ------------------------------------------------------------------ */
/* Server -> Client                                                    */
/* ------------------------------------------------------------------ */

export interface SnapshotMsg {
  type: "snapshot";
  /** The device's own id, echoed back so it knows which device it is. */
  selfDeviceId: string;
  state: SessionSnapshot;
}

export interface DeviceJoinedMsg {
  type: "deviceJoined";
  deviceId: string;
  name: string;
}

export interface DeviceLeftMsg {
  type: "deviceLeft";
  deviceId: string;
}

export interface PositionUpdateMsg {
  type: "positionUpdate";
  position: DevicePosition;
}

export interface FlagBoatChangedMsg {
  type: "flagBoatChanged";
  flagBoatId: string | null;
}

export interface MarkDroppedMsg {
  type: "markDropped";
  mark: Mark;
}

export interface MarkRemovedMsg {
  type: "markRemoved";
  markId: string;
}

export interface CourseClearedMsg {
  type: "courseCleared";
}

export interface WindSetMsg {
  type: "windSet";
  wind: Wind;
}

export interface ErrorMsg {
  type: "error";
  code: string;
  message: string;
}

export type ServerMessage =
  | SnapshotMsg
  | DeviceJoinedMsg
  | DeviceLeftMsg
  | PositionUpdateMsg
  | FlagBoatChangedMsg
  | MarkDroppedMsg
  | MarkRemovedMsg
  | CourseClearedMsg
  | WindSetMsg
  | ErrorMsg;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const MARK_TYPES: readonly MarkType[] = ["pin", "windward", "leeward"];

/** Parse + minimally validate an incoming client message. Returns null if invalid. */
export function parseClientMessage(raw: string): ClientMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null || !("type" in data)) return null;
  const msg = data as { type: unknown };

  switch (msg.type) {
    case "join": {
      const m = data as JoinMsg;
      return typeof m.sessionCode === "string" &&
        typeof m.deviceId === "string" &&
        typeof m.name === "string"
        ? m
        : null;
    }
    case "position": {
      const m = data as PositionMsg;
      return (
        isFiniteNum(m.lat) &&
        isFiniteNum(m.lng) &&
        isFiniteNum(m.clientTs) &&
        isOptionalFiniteNum(m.accuracy) &&
        isNullableFiniteNum(m.heading) &&
        isNullableFiniteNum(m.speed)
      )
        ? m
        : null;
    }
    case "setFlagBoat": {
      const m = data as SetFlagBoatMsg;
      return typeof m.deviceId === "string" ? m : null;
    }
    case "dropMark": {
      const m = data as DropMarkMsg;
      return MARK_TYPES.includes(m.markType) &&
        isFiniteNum(m.lat) &&
        isFiniteNum(m.lng) &&
        isFiniteNum(m.clientTs)
        ? m
        : null;
    }
    case "setWind": {
      const m = data as SetWindMsg;
      return isFiniteNum(m.directionDeg) &&
        isFiniteNum(m.clientTs) &&
        isOptionalFiniteNum(m.speedKts)
        ? m
        : null;
    }
    case "removeMark": {
      const m = data as RemoveMarkMsg;
      return typeof m.markId === "string" ? m : null;
    }
    case "clearCourse":
      return { type: "clearCourse" };
    default:
      return null;
  }
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Finite number, or absent. */
function isOptionalFiniteNum(v: unknown): boolean {
  return v === undefined || isFiniteNum(v);
}

/** Finite number, or absent, or explicitly null (e.g. heading/speed with no reading). */
function isNullableFiniteNum(v: unknown): boolean {
  return v === undefined || v === null || isFiniteNum(v);
}
