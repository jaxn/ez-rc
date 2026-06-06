import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { appendEvent, readSession } from "./eventLog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const code = `VITEST${Math.floor(Math.random() * 1e6)}`;
const logFile = path.resolve(__dirname, `../../data/events-${code}.jsonl`);

afterAll(async () => {
  await rm(logFile, { force: true });
});

describe("event log", () => {
  it("appends ordered, timestamped entries and reads them back", async () => {
    await appendEvent(code, "session_created", "a", {});
    await appendEvent(code, "mark_dropped", "a", { type: "windward" });
    await appendEvent(code, "wind_set", "b", { directionDeg: 270 });

    const entries = await readSession(code);
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(entries[1].eventType).toBe("mark_dropped");
    expect(entries[2].payload.directionDeg).toBe(270);
    expect(entries[0].serverTs).toBeGreaterThan(0);
  });

  it("returns an empty array for an unknown session", async () => {
    expect(await readSession("NOPE_UNKNOWN")).toEqual([]);
  });
});
