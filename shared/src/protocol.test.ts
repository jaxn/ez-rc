import { describe, expect, it } from "vitest";
import { parseClientMessage } from "./protocol.js";

describe("parseClientMessage", () => {
  it("accepts a well-formed join", () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: "join", sessionCode: "ABCDE", deviceId: "d", name: "Boat" }),
    );
    expect(msg?.type).toBe("join");
  });

  it("accepts a valid dropMark and rejects an unknown mark type", () => {
    expect(
      parseClientMessage(JSON.stringify({ type: "dropMark", markType: "windward", lat: 1, lng: 2, clientTs: 0 })),
    ).not.toBeNull();
    expect(
      parseClientMessage(JSON.stringify({ type: "dropMark", markType: "gate", lat: 1, lng: 2, clientTs: 0 })),
    ).toBeNull();
  });

  it("rejects positions with non-finite coordinates", () => {
    expect(parseClientMessage(JSON.stringify({ type: "position", lat: "x", lng: 2 }))).toBeNull();
  });

  it("rejects malformed JSON and unknown types", () => {
    expect(parseClientMessage("{not json")).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: "explode" }))).toBeNull();
  });
});
