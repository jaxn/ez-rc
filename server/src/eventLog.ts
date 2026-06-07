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

/** Per-session monotonic sequence counters (recovered lazily from disk). */
const seqCounters = new Map<string, number>();

/**
 * Per-session append queue. Chaining each append onto the previous one
 * serializes both seq assignment and the file write, so on-disk order always
 * matches seq order even when several events arrive in the same tick.
 */
const appendQueues = new Map<string, Promise<unknown>>();

async function loadMaxSeq(sessionCode: string): Promise<number> {
  if (!seqCounters.has(sessionCode)) {
    const existing = await readSession(sessionCode);
    seqCounters.set(
      sessionCode,
      existing.reduce((max, e) => Math.max(max, e.seq), 0),
    );
  }
  return seqCounters.get(sessionCode) ?? 0;
}

function logPath(sessionCode: string): string {
  // Session codes are restricted to a safe alphabet, but sanitize defensively.
  const safe = sessionCode.replace(/[^A-Za-z0-9_-]/g, "");
  return path.join(DATA_DIR, `events-${safe}.jsonl`);
}

/** Append one durable event and return the written entry. */
export function appendEvent(
  sessionCode: string,
  eventType: EventType,
  byDeviceId: string | null,
  payload: Record<string, unknown>,
): Promise<EventLogEntry> {
  const prev = appendQueues.get(sessionCode) ?? Promise.resolve();
  const task = prev.then(async () => {
    await mkdir(DATA_DIR, { recursive: true });
    const seq = (await loadMaxSeq(sessionCode)) + 1;
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
  });
  // Keep the chain alive regardless of this task's outcome.
  appendQueues.set(
    sessionCode,
    task.then(
      () => {},
      () => {},
    ),
  );
  return task;
}

/** Read back all log entries for a session, ordered by seq, for replay/analysis. */
export async function readSession(sessionCode: string): Promise<EventLogEntry[]> {
  try {
    const raw = await readFile(logPath(sessionCode), "utf8");
    return raw
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as EventLogEntry)
      .sort((a, b) => a.seq - b.seq);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}
