/**
 * High-accuracy geolocation tracking via watchPosition.
 * Requires a secure context (https, or http://localhost in dev).
 */

export type GeoStatus = "idle" | "prompting" | "active" | "denied" | "unavailable" | "error";

export interface GeoFix {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
}

interface WatchHandlers {
  onFix: (fix: GeoFix) => void;
  onStatus: (status: GeoStatus, message?: string) => void;
}

/**
 * Start watching position. Returns a stop() function.
 * Caller is responsible for throttling outbound network sends.
 */
export function startWatch({ onFix, onStatus }: WatchHandlers): () => void {
  if (!("geolocation" in navigator)) {
    onStatus("unavailable", "Geolocation is not supported on this device.");
    return () => {};
  }
  if (!window.isSecureContext) {
    onStatus(
      "error",
      "Location needs a secure context (HTTPS). Use https:// or localhost.",
    );
    return () => {};
  }

  onStatus("prompting");
  // Track the last reported status so we only notify on transitions — and so a
  // successful fix clears a previous transient error (common out on the water).
  let lastStatus: GeoStatus = "prompting";
  const report = (status: GeoStatus, message?: string) => {
    if (status !== lastStatus) {
      lastStatus = status;
      onStatus(status, message);
    }
  };

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      report("active");
      onFix({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
        speed: Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
      });
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        report("denied", "Location permission denied. Enable it to share your position.");
      } else {
        report("error", err.message || "Could not get location.");
      }
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
  );

  return () => navigator.geolocation.clearWatch(watchId);
}
