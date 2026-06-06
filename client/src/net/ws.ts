/**
 * Singleton WebSocket client: connects, re-joins on reconnect with exponential
 * backoff, and dispatches server messages into the store. Robust to the flaky
 * connectivity expected out on the water.
 */

import type { ClientMessage, MarkType, ServerMessage } from "@ezrc/shared";
import { useStore } from "../state/store";

function wsUrl(): string {
  // Allow override for separately-hosted server; default to same origin /ws.
  const fromEnv = import.meta.env.VITE_WS_URL as string | undefined;
  if (fromEnv) return fromEnv;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws`;
}

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let backoff = 1000;
let wantConnected = false;
let joinInfo: { sessionCode: string; deviceId: string; name: string } | null = null;

function open(): void {
  socket = new WebSocket(wsUrl());
  useStore.getState().setConnStatus("connecting");

  socket.onopen = () => {
    backoff = 1000;
    useStore.getState().setConnStatus("connected");
    if (joinInfo) send({ type: "join", ...joinInfo });
  };

  socket.onmessage = (ev) => {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(ev.data as string) as ServerMessage;
    } catch {
      return;
    }
    useStore.getState().applyServerMessage(msg);
  };

  socket.onclose = () => {
    useStore.getState().setConnStatus("disconnected");
    socket = null;
    if (wantConnected) scheduleReconnect();
  };

  socket.onerror = () => socket?.close();
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (wantConnected) open();
  }, backoff);
  backoff = Math.min(backoff * 2, 15000);
}

/** Connect (or reconnect) and join the given session. */
export function connect(sessionCode: string, deviceId: string, name: string): void {
  joinInfo = { sessionCode, deviceId, name };
  wantConnected = true;
  if (!socket) open();
  else if (socket.readyState === WebSocket.OPEN) send({ type: "join", ...joinInfo });
}

export function disconnect(): void {
  wantConnected = false;
  joinInfo = null;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
}

function send(msg: ClientMessage): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

/* Typed send helpers used by the UI. */

export function sendPosition(p: {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
}): void {
  send({ type: "position", clientTs: Date.now(), ...p });
}

export function sendDropMark(markType: MarkType, lat: number, lng: number): void {
  send({ type: "dropMark", markType, lat, lng, clientTs: Date.now() });
}

export function sendSetWind(directionDeg: number, speedKts?: number): void {
  send({ type: "setWind", directionDeg, speedKts, clientTs: Date.now() });
}

export function sendSetFlagBoat(deviceId: string): void {
  send({ type: "setFlagBoat", deviceId });
}

export function sendRemoveMark(markId: string): void {
  send({ type: "removeMark", markId });
}

export function sendClearCourse(): void {
  send({ type: "clearCourse" });
}
