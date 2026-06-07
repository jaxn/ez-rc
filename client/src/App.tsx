/**
 * App shell + onboarding flow:
 *   Welcome → (request permissions) → Role → (create | join) → Map.
 * Owns the geolocation watch + throttled position uploads once started.
 */

import { useEffect, useRef, useState } from "react";
import { hasFix, useStore } from "./state/store";
import { startWatch, type GeoFix } from "./geo/geolocation";
import { requestNotificationPermission } from "./geo/permissions";
import { connect, sendPosition, sendSetFlagBoat } from "./net/ws";
import { WelcomeScreen } from "./ui/WelcomeScreen";
import { RoleScreen } from "./ui/RoleScreen";
import { JoinCodeScreen } from "./ui/JoinCodeScreen";
import { MapScreen } from "./ui/MapScreen";

const POSITION_MIN_INTERVAL_MS = 1000;

export function App() {
  const sessionCode = useStore((s) => s.sessionCode);
  const connStatus = useStore((s) => s.connStatus);
  const deviceId = useStore((s) => s.deviceId);
  const setGeoStatus = useStore((s) => s.setGeoStatus);
  const setSelfPosition = useStore((s) => s.setSelfPosition);
  const setName = useStore((s) => s.setName);

  const [started, setStarted] = useState(false);
  const [step, setStep] = useState<"role" | "join">("role");
  const [submitting, setSubmitting] = useState(false);
  const wantFlagBoatRef = useRef(false);
  const lastSentRef = useRef(0);

  const joined = sessionCode !== null;
  const connecting = submitting || connStatus === "connecting";

  // Watch location once the user taps "Get started". Reads the current name
  // from the store so renaming on create/join doesn't restart the watch.
  useEffect(() => {
    if (!started) return;

    const onFix = (fix: GeoFix) => {
      setSelfPosition({
        deviceId,
        name: useStore.getState().name || "Boat",
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

    return startWatch({ onFix, onStatus: setGeoStatus });
  }, [started, deviceId, setGeoStatus, setSelfPosition]);

  // After joining the session we just created, claim the flag-boat role.
  useEffect(() => {
    if (joined && wantFlagBoatRef.current) {
      wantFlagBoatRef.current = false;
      sendSetFlagBoat(deviceId);
    }
  }, [joined, deviceId]);

  // Flush our latest known position whenever the socket (re)connects, so a fix
  // acquired before connecting still reaches the server (and peers' snapshots).
  useEffect(() => {
    if (connStatus !== "connected") return;
    const self = useStore.getState().devices[deviceId];
    if (hasFix(self)) {
      sendPosition({
        lat: self.lat,
        lng: self.lng,
        accuracy: self.accuracy,
        heading: self.heading,
        speed: self.speed,
      });
    }
  }, [connStatus, deviceId]);

  // Re-enable onboarding buttons if a connection attempt fails or is rejected.
  const error = useStore((s) => s.error);
  useEffect(() => {
    if (connStatus === "disconnected" || error) setSubmitting(false);
  }, [connStatus, error]);

  function handleGetStarted() {
    void requestNotificationPermission();
    setStarted(true); // starting the watch triggers the location permission prompt
    setStep("role");
  }

  async function createCourse() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/new-session");
      const { sessionCode: code } = (await res.json()) as { sessionCode: string };
      wantFlagBoatRef.current = true;
      const name = "Flag Boat";
      setName(name);
      connect(code, deviceId, name);
    } catch {
      setSubmitting(false);
    }
  }

  function joinCourse(code: string) {
    const name = `Boat-${deviceId.slice(0, 4).toUpperCase()}`;
    setName(name);
    setSubmitting(true);
    connect(code, deviceId, name);
  }

  if (!started) return <WelcomeScreen onGetStarted={handleGetStarted} />;
  if (!joined) {
    if (step === "role") {
      return <RoleScreen busy={connecting} onCreate={createCourse} onJoin={() => setStep("join")} />;
    }
    return (
      <JoinCodeScreen busy={connecting} onBack={() => setStep("role")} onJoin={joinCourse} />
    );
  }
  return <MapScreen />;
}
