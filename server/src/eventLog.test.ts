import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import type { EventLogEntry } from "@ezrc/shared";
import { appendEvent, readSession } from "./eventLog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../data");
const code = `VITEST${Math.floor(Math.random() * 1e6)}`;
const logFile = path.join(dataDir, `events-${code}.jsonl`);

// A separate code whose log already exists on disk before this process appends —
// simulating a server restart against an existing session log.
const seededCode = `VITSEED${Math.floor(Math.random() * 1e6)}`;
const seededFile = path.join(dataDir, `events-${seededCode}.jsonl`);

afterAll(async () => {
  await rm(logFile, { force: true });
  await rm(seededFile, { force: true });
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

  it("resumes seq from the existing log instead of restarting at 1", async () => {
    // Pre-seed a log on disk (as if written before a restart), then append.
    await mkdir(dataDir, { recursive: true });
    const seed: EventLogEntry[] = [1, 2, 3].map((seq) => ({
      seq,
      sessionCode: seededCode,
      eventType: "mark_dropped",
      serverTs: seq,
      byDeviceId: "a",
      payload: {},
    }));
    await writeFile(seededFile, seed.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");

    const entry = await appendEvent(seededCode, "wind_set", "b", {});
    expect(entry.seq).toBe(4);
    const all = await readSession(seededCode);
    expect(all.map((e) => e.seq)).toEqual([1, 2, 3, 4]);
  });
});
