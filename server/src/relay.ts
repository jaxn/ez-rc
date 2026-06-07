/**
 * WebSocket connection handling: validate incoming messages, mutate session
 * state, persist durable events, and broadcast to the right set of peers.
 */

import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import {
  parseClientMessage,
  type ClientMessage,
  type Mark,
  type ServerMessage,
  type Wind,
} from "@ezrc/shared";
import { appendEvent } from "./eventLog.js";
import {
  buildSnapshot,
  getOrCreateSession,
  isValidSessionCode,
  normalizeCode,
  removeIfEmpty,
  type Session,
} from "./sessions.js";

/** Per-socket context populated once the device has joined a session. */
interface SocketState {
  session: Session;
  deviceId: string;
}

const socketState = new WeakMap<WebSocket, SocketState>();

function send(socket: WebSocket, msg: ServerMessage): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

/** Send to every connection in the session. */
function broadcast(session: Session, msg: ServerMessage): void {
  const data = JSON.stringify(msg);
  for (const conn of session.connections.values()) {
    if (conn.socket.readyState === conn.socket.OPEN) conn.socket.send(data);
  }
}

/** Send to everyone except one device (used for the device's own echoes). */
function broadcastExcept(session: Session, exceptDeviceId: string, msg: ServerMessage): void {
  const data = JSON.stringify(msg);
  for (const conn of session.connections.values()) {
    if (conn.deviceId === exceptDeviceId) continue;
    if (conn.socket.readyState === conn.socket.OPEN) conn.socket.send(data);
  }
}

export function handleConnection(socket: WebSocket): void {
  socket.on("message", (raw) => {
    const msg = parseClientMessage(raw.toString());
    if (!msg) {
      send(socket, { type: "error", code: "bad_message", message: "Malformed message." });
      return;
    }
    void handleMessage(socket, msg);
  });

  socket.on("close", () => handleClose(socket));
  socket.on("error", () => handleClose(socket));
}

async function handleMessage(socket: WebSocket, msg: ClientMessage): Promise<void> {
  // The first message from a socket must be a join.
  if (msg.type === "join") {
    await handleJoin(socket, msg.sessionCode, msg.deviceId, msg.name);
    return;
  }

  const ctx = socketState.get(socket);
  if (!ctx) {
    send(socket, { type: "error", code: "not_joined", message: "Join a session first." });
    return;
  }
  const { session, deviceId } = ctx;

  switch (msg.type) {
    case "position": {
      const existing = session.positions.get(deviceId);
      const position = {
        deviceId,
        name: existing?.name ?? deviceId,
        lat: msg.lat,
        lng: msg.lng,
        accuracy: msg.accuracy,
        heading: msg.heading ?? null,
        speed: msg.speed ?? null,
        ts: Date.now(),
      };
      session.positions.set(deviceId, position);
      // Positions are high-frequency: relay live, do NOT persist.
      broadcastExcept(session, deviceId, { type: "positionUpdate", position });
      break;
    }

    case "setFlagBoat": {
      session.flagBoatId = msg.deviceId;
      await appendEvent(session.code, "flag_boat_set", deviceId, { flagBoatId: msg.deviceId });
      broadcast(session, { type: "flagBoatChanged", flagBoatId: msg.deviceId });
      break;
    }

    case "dropMark": {
      const mark: Mark = {
        id: randomUUID(),
        type: msg.markType,
        lat: msg.lat,
        lng: msg.lng,
        byDeviceId: deviceId,
        ts: Date.now(),
      };
      session.marks.push(mark);
      await appendEvent(session.code, "mark_dropped", deviceId, { ...mark });
      broadcast(session, { type: "markDropped", mark });
      break;
    }

    case "setWind": {
      const wind: Wind = {
        directionDeg: msg.directionDeg,
        speedKts: msg.speedKts,
        byDeviceId: deviceId,
        ts: Date.now(),
      };
      session.wind = wind;
      await appendEvent(session.code, "wind_set", deviceId, { ...wind });
      broadcast(session, { type: "windSet", wind });
      break;
    }

    case "removeMark": {
      const idx = session.marks.findIndex((m) => m.id === msg.markId);
      if (idx !== -1) {
        session.marks.splice(idx, 1);
        await appendEvent(session.code, "mark_removed", deviceId, { markId: msg.markId });
        broadcast(session, { type: "markRemoved", markId: msg.markId });
      }
      break;
    }

    case "clearCourse": {
      session.marks = [];
      session.wind = null;
      await appendEvent(session.code, "course_cleared", deviceId, {});
      broadcast(session, { type: "courseCleared" });
      break;
    }
  }
}

async function handleJoin(
  socket: WebSocket,
  rawCode: string,
  deviceId: string,
  name: string,
): Promise<void> {
  const code = normalizeCode(rawCode);
  if (!isValidSessionCode(code)) {
    send(socket, {
      type: "error",
      code: "bad_code",
      message: "Invalid session code. Codes are 5 characters (A–Z, 2–9).",
    });
    return;
  }

  const { session, created } = getOrCreateSession(code);
  if (created) {
    await appendEvent(session.code, "session_created", deviceId, {});
  }

  // Replace any prior connection for this device (e.g. reconnect).
  session.connections.set(deviceId, { socket, deviceId, name });
  socketState.set(socket, { session, deviceId });

  // Seed/refresh the device's name in the position table so peers see a label
  // even before the first GPS fix arrives.
  const existing = session.positions.get(deviceId);
  if (existing) {
    existing.name = name;
  }

  await appendEvent(session.code, "device_joined", deviceId, { name });

  // Send the joining device the full current state...
  send(socket, { type: "snapshot", selfDeviceId: deviceId, state: buildSnapshot(session) });
  // ...and tell everyone else it arrived.
  broadcastExcept(session, deviceId, { type: "deviceJoined", deviceId, name });
}

function handleClose(socket: WebSocket): void {
  const ctx = socketState.get(socket);
  if (!ctx) return;
  socketState.delete(socket);
  const { session, deviceId } = ctx;

  // Only treat as "left" if this exact socket is still the device's current one
  // (guards against a reconnect having already replaced it).
  const conn = session.connections.get(deviceId);
  if (conn && conn.socket === socket) {
    session.connections.delete(deviceId);
    session.positions.delete(deviceId);
    void appendEvent(session.code, "device_left", deviceId, {});
    broadcast(session, { type: "deviceLeft", deviceId });
    removeIfEmpty(session);
  }
}
