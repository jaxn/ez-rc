import { describe, expect, it } from "vitest";
import {
  buildSnapshot,
  generateSessionCode,
  getOrCreateSession,
  getSession,
  isValidSessionCode,
  normalizeCode,
  removeIfEmpty,
} from "./sessions.js";

describe("session codes", () => {
  it("generates unambiguous fixed-length codes", () => {
    const code = generateSessionCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);
  });

  it("normalizes user input", () => {
    expect(normalizeCode("  abc12 ")).toBe("ABC12");
  });

  it("accepts only well-formed codes and rejects unsafe input", () => {
    expect(isValidSessionCode(generateSessionCode())).toBe(true);
    expect(isValidSessionCode("ABCDE")).toBe(true);
    expect(isValidSessionCode("ABCD")).toBe(false); // too short
    expect(isValidSessionCode("ABCDEF")).toBe(false); // too long
    expect(isValidSessionCode("ABOI1")).toBe(false); // ambiguous chars not in alphabet
    expect(isValidSessionCode("../..")).toBe(false);
    expect(isValidSessionCode("")).toBe(false);
  });
});

describe("getOrCreateSession", () => {
  it("creates once then returns the same instance", () => {
    const code = generateSessionCode();
    const first = getOrCreateSession(code);
    expect(first.created).toBe(true);
    const second = getOrCreateSession(code);
    expect(second.created).toBe(false);
    expect(second.session).toBe(first.session);
  });

  it("builds a snapshot of live state", () => {
    const code = generateSessionCode();
    const { session } = getOrCreateSession(code);
    session.flagBoatId = "flag";
    session.positions.set("flag", { deviceId: "flag", name: "Flag", lat: 36.1, lng: -86.6, ts: 1 });
    const snap = buildSnapshot(session);
    expect(snap.sessionCode).toBe(code);
    expect(snap.flagBoatId).toBe("flag");
    expect(snap.devices).toHaveLength(1);
  });

  it("removes a session only when empty", () => {
    const code = generateSessionCode();
    const { session } = getOrCreateSession(code);
    session.connections.set("d", { socket: {} as never, deviceId: "d", name: "D" });
    removeIfEmpty(session);
    expect(getSession(code)).toBe(session);
    session.connections.clear();
    removeIfEmpty(session);
    expect(getSession(code)).toBeUndefined();
  });
});
