/**
 * App shell: shows the join screen until connected, then the live map with
 * control overlays. Owns the geolocation watch + throttled position uploads.
 */

import { useEffect, useRef } from "react";
import { useStore } from "./state/store";
import { startWatch, type GeoFix } from "./geo/geolocation";
import { connect, sendPosition } from "./net/ws";
import { JoinScreen } from "./ui/JoinScreen";
import { MapScreen } from "./ui/MapScreen";

const POSITION_MIN_INTERVAL_MS = 1000;

export function App() {
  const sessionCode = useStore((s) => s.sessionCode);
  const deviceId = useStore((s) => s.deviceId);
  const setGeoStatus = useStore((s) => s.setGeoStatus);
  const setSelfPosition = useStore((s) => s.setSelfPosition);
  const name = useStore((s) => s.name);

  const lastSentRef = useRef(0);
  const joined = sessionCode !== null;

  // Once joined, watch geolocation and stream throttled positions.
  useEffect(() => {
    if (!joined) return;

    const onFix = (fix: GeoFix) => {
      // Update our own marker immediately for a responsive map.
      setSelfPosition({
        deviceId,
        name: name || "me",
        lat: fix.lat,
        lng: fix.lng,
        accuracy: fix.accuracy,
        heading: fix.heading,
        speed: fix.speed,
        ts: Date.now(),
      });
      const now = Date.now();
      if (now - lastSentRef.current >= POSITION_MIN_INTERVAL_MS) {
        lastSentRef.current = now;
        sendPosition({
          lat: fix.lat,
          lng: fix.lng,
          accuracy: fix.accuracy,
          heading: fix.heading,
          speed: fix.speed,
        });
      }
    };

    const stop = startWatch({ onFix, onStatus: setGeoStatus });
    return stop;
  }, [joined, deviceId, name, setGeoStatus, setSelfPosition]);

  if (!joined) {
    return <JoinScreen onJoin={(code, n) => connect(code, deviceId, n)} />;
  }
  return <MapScreen />;
}
