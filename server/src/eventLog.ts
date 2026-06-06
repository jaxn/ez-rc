/**
 * Append-only JSONL event log, one file per session: data/events-<code>.jsonl.
 * This is the durable, replayable record used to reconstruct courses later.
 * Only meaningful course events are logged (not high-frequency position pings).
 */

import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { EventLogEntry, EventType } from "@ezrc/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");

/** Per-session monotonic sequence counters (in-memory; recovered lazily on read). */
const seqCounters = new Map<string, number>();

function logPath(sessionCode: string): string {
  // Session codes are restricted to a safe alphabet, but sanitize defensively.
  const safe = sessionCode.replace(/[^A-Za-z0-9_-]/g, "");
  return path.join(DATA_DIR, `events-${safe}.jsonl`);
}

/** Append one durable event and return the written entry. */
export async function appendEvent(
  sessionCode: string,
  eventType: EventType,
  byDeviceId: string | null,
  payload: Record<string, unknown>,
): Promise<EventLogEntry> {
  await mkdir(DATA_DIR, { recursive: true });
  const seq = (seqCounters.get(sessionCode) ?? 0) + 1;
  seqCounters.set(sessionCode, seq);

  const entry: EventLogEntry = {
    seq,
    sessionCode,
    eventType,
    serverTs: Date.now(),
    byDeviceId,
    payload,
  };
  await appendFile(logPath(sessionCode), JSON.stringify(entry) + "\n", "utf8");
  return entry;
}

/** Read back all log entries for a session, in order, for replay/analysis. */
export async function readSession(sessionCode: string): Promise<EventLogEntry[]> {
  try {
    const raw = await readFile(logPath(sessionCode), "utf8");
    return raw
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as EventLogEntry);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}
