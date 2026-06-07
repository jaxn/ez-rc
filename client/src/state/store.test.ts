import { beforeEach, describe, expect, it } from "vitest";
import type { Mark, ServerMessage, Wind } from "@ezrc/shared";
import { hasFix, useStore } from "./store";

const apply = (msg: ServerMessage) => useStore.getState().applyServerMessage(msg);

const mark: Mark = { id: "m1", type: "windward", lat: 36.12, lng: -86.6, byDeviceId: "a", ts: 1 };
const wind: Wind = { directionDeg: 270, speedKts: 12, byDeviceId: "a", ts: 2 };

beforeEach(() => {
  useStore.setState({ devices: {}, marks: [], wind: null, flagBoatId: null });
});

describe("applyServerMessage", () => {
  it("hydrates from a snapshot", () => {
    apply({
      type: "snapshot",
      selfDeviceId: "me",
      state: {
        sessionCode: "ABCDE",
        devices: [{ deviceId: "a", name: "A", lat: 36.1, lng: -86.6, ts: 1 }],
        marks: [mark],
        wind,
        flagBoatId: "a",
      },
    });
    const s = useStore.getState();
    expect(s.sessionCode).toBe("ABCDE");
    expect(s.devices["a"].name).toBe("A");
    expect(s.marks).toHaveLength(1);
    expect(s.flagBoatId).toBe("a");
  });

  it("applies position updates and mark drops, and clears the course", () => {
    apply({
      type: "positionUpdate",
      position: { deviceId: "b", name: "B", lat: 36.1, lng: -86.6, ts: 3 },
    });
    expect(useStore.getState().devices["b"].lat).toBe(36.1);

    apply({ type: "markDropped", mark });
    apply({ type: "windSet", wind });
    expect(useStore.getState().marks).toHaveLength(1);
    expect(useStore.getState().wind?.directionDeg).toBe(270);

    apply({ type: "courseCleared" });
    expect(useStore.getState().marks).toHaveLength(0);
    expect(useStore.getState().wind).toBeNull();
  });

  it("preserves a locally-tracked self position the server doesn't have yet", () => {
    useStore
      .getState()
      .setSelfPosition({ deviceId: "me", name: "Me", lat: 36.1, lng: -86.6, ts: 5 });
    apply({
      type: "snapshot",
      selfDeviceId: "me",
      state: { sessionCode: "ABCDE", devices: [], marks: [], wind: null, flagBoatId: null },
    });
    expect(useStore.getState().devices["me"]?.lat).toBe(36.1);
  });

  it("removes a device that left", () => {
    apply({ type: "deviceJoined", deviceId: "c", name: "C" });
    expect(useStore.getState().devices["c"]).toBeTruthy();
    apply({ type: "deviceLeft", deviceId: "c" });
    expect(useStore.getState().devices["c"]).toBeUndefined();
  });
});

describe("hasFix", () => {
  it("rejects placeholder NaN positions", () => {
    expect(hasFix({ deviceId: "x", name: "x", lat: NaN, lng: NaN, ts: 0 })).toBe(false);
    expect(hasFix({ deviceId: "x", name: "x", lat: 36.1, lng: -86.6, ts: 0 })).toBe(true);
    expect(hasFix(undefined)).toBe(false);
  });
});
