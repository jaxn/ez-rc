/**
 * Derived values computed from store state: distances/bearings from the flag
 * boat, and the windward/leeward course leg.
 */

import type { DevicePosition, Mark } from "@ezrc/shared";
import { bearingDeg, distanceMeters, type LatLng } from "../geo/math";
import { hasFix } from "./store";

export interface RelativeDevice {
  device: DevicePosition;
  /** Distance from the flag boat in meters (null if no flag boat / no fix). */
  distanceM: number | null;
  /** Compass bearing from the flag boat in degrees (null if unavailable). */
  bearing: number | null;
}

/** Each non-flag-boat device with its distance + bearing from the flag boat. */
export function relativeDevices(
  devices: Record<string, DevicePosition>,
  flagBoatId: string | null,
  selfDeviceId: string,
): RelativeDevice[] {
  const flag = flagBoatId ? devices[flagBoatId] : undefined;
  const flagPos: LatLng | null = hasFix(flag) ? flag : null;

  return Object.values(devices)
    .filter((d) => d.deviceId !== flagBoatId)
    .map((device) => {
      if (!flagPos || !hasFix(device)) {
        return { device, distanceM: null, bearing: null };
      }
      return {
        device,
        distanceM: distanceMeters(flagPos, device),
        bearing: bearingDeg(flagPos, device),
      };
    })
    .sort((a, b) => {
      // Keep self first, then nearest-first.
      if (a.device.deviceId === selfDeviceId) return -1;
      if (b.device.deviceId === selfDeviceId) return 1;
      return (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity);
    });
}

export interface CourseLeg {
  windward: Mark;
  leeward: Mark;
  distanceM: number;
  bearing: number;
}

/** The windward->leeward leg, if both marks exist (uses most recent of each). */
export function courseLeg(marks: Mark[]): CourseLeg | null {
  const windward = lastOfType(marks, "windward");
  const leeward = lastOfType(marks, "leeward");
  if (!windward || !leeward) return null;
  return {
    windward,
    leeward,
    distanceM: distanceMeters(windward, leeward),
    bearing: bearingDeg(leeward, windward),
  };
}

function lastOfType(marks: Mark[], type: Mark["type"]): Mark | undefined {
  for (let i = marks.length - 1; i >= 0; i--) {
    if (marks[i].type === type) return marks[i];
  }
  return undefined;
}
