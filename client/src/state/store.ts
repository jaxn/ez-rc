/**
 * Global app state (Zustand). The map and all panels render from here.
 * Server messages are folded in via applyServerMessage().
 */

import { create } from "zustand";
import type {
  DevicePosition,
  Mark,
  ServerMessage,
  Wind,
} from "@ezrc/shared";
import type { GeoStatus } from "../geo/geolocation";

export type ConnStatus = "disconnected" | "connecting" | "connected";

/** Stable per-device identity, persisted so reconnects keep the same id. */
function loadDeviceId(): string {
  const KEY = "ezrc.deviceId";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

function loadName(): string {
  return localStorage.getItem("ezrc.name") ?? "";
}

interface AppState {
  // identity / session
  deviceId: string;
  name: string;
  sessionCode: string | null;

  // connection
  connStatus: ConnStatus;
  geoStatus: GeoStatus;
  geoMessage?: string;

  // live data (devices keyed by deviceId)
  devices: Record<string, DevicePosition>;
  marks: Mark[];
  wind: Wind | null;
  flagBoatId: string | null;

  // actions
  setName: (name: string) => void;
  setSessionCode: (code: string | null) => void;
  setConnStatus: (s: ConnStatus) => void;
  setGeoStatus: (s: GeoStatus, message?: string) => void;
  setSelfPosition: (pos: DevicePosition) => void;
  applyServerMessage: (msg: ServerMessage) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  deviceId: loadDeviceId(),
  name: loadName(),
  sessionCode: null,
  connStatus: "disconnected",
  geoStatus: "idle",
  devices: {},
  marks: [],
  wind: null,
  flagBoatId: null,

  setName: (name) => {
    localStorage.setItem("ezrc.name", name);
    set({ name });
  },
  setSessionCode: (sessionCode) => set({ sessionCode }),
  setConnStatus: (connStatus) => set({ connStatus }),
  setGeoStatus: (geoStatus, geoMessage) => set({ geoStatus, geoMessage }),

  setSelfPosition: (pos) =>
    set((state) => ({ devices: { ...state.devices, [pos.deviceId]: pos } })),

  applyServerMessage: (msg) => {
    switch (msg.type) {
      case "snapshot": {
        const devices: Record<string, DevicePosition> = {};
        for (const d of msg.state.devices) devices[d.deviceId] = d;
        set({
          devices,
          marks: msg.state.marks,
          wind: msg.state.wind,
          flagBoatId: msg.state.flagBoatId,
          sessionCode: msg.state.sessionCode,
        });
        break;
      }
      case "deviceJoined": {
        // Placeholder entry (no position yet) so it shows in the roster.
        if (!get().devices[msg.deviceId]) {
          set((state) => ({
            devices: {
              ...state.devices,
              [msg.deviceId]: {
                deviceId: msg.deviceId,
                name: msg.name,
                lat: NaN,
                lng: NaN,
                ts: Date.now(),
              },
            },
          }));
        }
        break;
      }
      case "deviceLeft": {
        set((state) => {
          const devices = { ...state.devices };
          delete devices[msg.deviceId];
          return { devices };
        });
        break;
      }
      case "positionUpdate":
        set((state) => ({
          devices: { ...state.devices, [msg.position.deviceId]: msg.position },
        }));
        break;
      case "flagBoatChanged":
        set({ flagBoatId: msg.flagBoatId });
        break;
      case "markDropped":
        set((state) => ({ marks: [...state.marks, msg.mark] }));
        break;
      case "markRemoved":
        set((state) => ({ marks: state.marks.filter((m) => m.id !== msg.markId) }));
        break;
      case "courseCleared":
        set({ marks: [], wind: null });
        break;
      case "windSet":
        set({ wind: msg.wind });
        break;
      case "error":
        console.warn("server error", msg.code, msg.message);
        break;
    }
  },

  reset: () =>
    set({
      sessionCode: null,
      connStatus: "disconnected",
      devices: {},
      marks: [],
      wind: null,
      flagBoatId: null,
    }),
}));

/** Convenience selector: has a real position fix (not a NaN placeholder). */
export function hasFix(d: DevicePosition | undefined): d is DevicePosition {
  return !!d && Number.isFinite(d.lat) && Number.isFinite(d.lng);
}
