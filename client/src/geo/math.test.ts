import { describe, expect, it } from "vitest";
import {
  bearingDeg,
  distanceMeters,
  formatBearing,
  formatDistance,
  metersToNm,
} from "./math";

describe("distanceMeters", () => {
  it("is ~0 for identical points", () => {
    const p = { lat: 36.108, lng: -86.627 };
    expect(distanceMeters(p, p)).toBeCloseTo(0, 5);
  });

  it("matches ~1 nm for a known short hop", () => {
    // 1 nm north of a point ≈ 1/60 degree of latitude.
    const a = { lat: 36.1, lng: -86.6 };
    const b = { lat: 36.1 + 1 / 60, lng: -86.6 };
    expect(metersToNm(distanceMeters(a, b))).toBeCloseTo(1, 1);
  });
});

describe("bearingDeg", () => {
  const origin = { lat: 36.1, lng: -86.6 };
  it("reads ~0° due north", () => {
    expect(bearingDeg(origin, { lat: 36.2, lng: -86.6 })).toBeCloseTo(0, 0);
  });
  it("reads ~90° due east", () => {
    expect(bearingDeg(origin, { lat: 36.1, lng: -86.5 })).toBeCloseTo(90, 0);
  });
  it("reads ~270° due west and stays in [0,360)", () => {
    const b = bearingDeg(origin, { lat: 36.1, lng: -86.7 });
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
    expect(b).toBeCloseTo(270, 0);
  });
});

describe("formatting", () => {
  it("shows meters under 1km and nm above", () => {
    expect(formatDistance(500)).toBe("500 m");
    expect(formatDistance(1852)).toBe("1.00 nm");
  });
  it("labels cardinal points", () => {
    expect(formatBearing(0)).toBe("0° N");
    expect(formatBearing(90)).toBe("90° E");
    expect(formatBearing(270)).toBe("270° W");
  });
});
