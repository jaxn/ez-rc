import { describe, expect, it } from "vitest";
import type { DevicePosition, Mark } from "@ezrc/shared";
import { courseLeg, relativeDevices } from "./selectors";

function pos(deviceId: string, lat: number, lng: number, name = deviceId): DevicePosition {
  return { deviceId, name, lat, lng, ts: 0 };
}

describe("relativeDevices", () => {
  const flag = pos("flag", 36.1, -86.6);
  const north = pos("north", 36.11, -86.6);
  const devices = { flag, north };

  it("excludes the flag boat and reports distance + bearing of others", () => {
    const rel = relativeDevices(devices, "flag", "self");
    expect(rel.map((r) => r.device.deviceId)).toEqual(["north"]);
    expect(rel[0].distanceM).toBeGreaterThan(0);
    expect(rel[0].bearing).toBeCloseTo(0, 0); // due north of the flag
  });

  it("returns null distance/bearing when there is no flag boat", () => {
    const rel = relativeDevices(devices, null, "self");
    expect(rel.every((r) => r.distanceM === null && r.bearing === null)).toBe(true);
  });

  it("sorts self first", () => {
    const withSelf = { ...devices, self: pos("self", 36.105, -86.6) };
    const rel = relativeDevices(withSelf, "flag", "self");
    expect(rel[0].device.deviceId).toBe("self");
  });
});

describe("courseLeg", () => {
  const windward: Mark = { id: "w", type: "windward", lat: 36.12, lng: -86.6, byDeviceId: "x", ts: 1 };
  const leeward: Mark = { id: "l", type: "leeward", lat: 36.1, lng: -86.6, byDeviceId: "x", ts: 2 };

  it("is null until both windward and leeward exist", () => {
    expect(courseLeg([windward])).toBeNull();
    expect(courseLeg([leeward])).toBeNull();
  });

  it("measures the windward-leeward leg when both exist", () => {
    const leg = courseLeg([windward, leeward]);
    expect(leg).not.toBeNull();
    expect(leg!.distanceM).toBeGreaterThan(0);
  });

  it("uses the most recently dropped mark of each type", () => {
    const newerLeeward: Mark = { ...leeward, id: "l2", lat: 36.105 };
    const leg = courseLeg([windward, leeward, newerLeeward]);
    expect(leg!.leeward.id).toBe("l2");
  });
});
