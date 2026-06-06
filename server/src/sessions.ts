/**
 * In-memory registry of active race sessions ("rooms").
 * Live state (positions, marks, wind, flag boat) lives here; durable events
 * are written separately to the JSONL event log.
 */

import type { WebSocket } from "ws";
import type { DevicePosition, Mark, SessionSnapshot, Wind } from "@ezrc/shared";

/** Unambiguous alphabet (no 0/O/1/I) for human-shareable codes. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;

export interface Connection {
  socket: WebSocket;
  deviceId: string;
  name: string;
}

export interface Session {
  code: string;
  /** deviceId -> live connection. A device replacing a stale socket overwrites. */
  connections: Map<string, Connection>;
  /** deviceId -> last known position. */
  positions: Map<string, DevicePosition>;
  marks: Mark[];
  wind: Wind | null;
  flagBoatId: string | null;
  createdAt: number;
}

const sessions = new Map<string, Session>();

export function generateSessionCode(): string {
  let code: string;
  do {
    code = Array.from(
      { length: CODE_LENGTH },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join("");
  } while (sessions.has(code));
  return code;
}

/** Normalize a user-entered code to our canonical form. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Get an existing session, or create one with the given (normalized) code. */
export function getOrCreateSession(code: string): { session: Session; created: boolean } {
  const existing = sessions.get(code);
  if (existing) return { session: existing, created: false };
  const session: Session = {
    code,
    connections: new Map(),
    positions: new Map(),
    marks: [],
    wind: null,
    flagBoatId: null,
    createdAt: Date.now(),
  };
  sessions.set(code, session);
  return { session, created: true };
}

export function getSession(code: string): Session | undefined {
  return sessions.get(code);
}

/** Drop a session once nobody is connected, freeing memory. */
export function removeIfEmpty(session: Session): void {
  if (session.connections.size === 0) {
    sessions.delete(session.code);
  }
}

export function buildSnapshot(session: Session): SessionSnapshot {
  return {
    sessionCode: session.code,
    devices: [...session.positions.values()],
    marks: session.marks,
    wind: session.wind,
    flagBoatId: session.flagBoatId,
  };
}
