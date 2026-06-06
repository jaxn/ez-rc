/** The live course view: map plus overlay panels. */

import { useState } from "react";
import { useStore } from "../state/store";
import { MapView } from "../map/MapView";
import { ControlPanel } from "./ControlPanel";
import { DeviceList } from "./DeviceList";
import { WindDialog } from "./WindDialog";
import { formatBearing } from "../geo/math";

export function MapScreen() {
  const sessionCode = useStore((s) => s.sessionCode);
  const connStatus = useStore((s) => s.connStatus);
  const geoStatus = useStore((s) => s.geoStatus);
  const geoMessage = useStore((s) => s.geoMessage);
  const wind = useStore((s) => s.wind);

  const [windOpen, setWindOpen] = useState(false);

  return (
    <div className="screen map-screen">
      <MapView />

      {/* Top bar: wind at the top, just as the map is oriented. */}
      <header className="topbar">
        <div className="wind-readout">
          {wind ? (
            <>
              <span className="wind-arrow" aria-hidden>
                ↓
              </span>
              <span className="wind-text">
                Wind {formatBearing(wind.directionDeg)}
                {wind.speedKts != null ? ` · ${wind.speedKts} kts` : ""}
              </span>
            </>
          ) : (
            <span className="wind-text muted">Wind not set — north up</span>
          )}
        </div>
        <div className="session-chip">{sessionCode}</div>
      </header>

      {/* Connection / location status */}
      {(connStatus !== "connected" || geoStatus !== "active") && (
        <div className="status-banner">
          {connStatus !== "connected" && <span>● {connStatus}</span>}
          {geoStatus !== "active" && (
            <span>📍 {geoMessage ?? geoStatus}</span>
          )}
        </div>
      )}

      <DeviceList />
      <ControlPanel onOpenWind={() => setWindOpen(true)} />
      {windOpen && <WindDialog onClose={() => setWindOpen(false)} />}
    </div>
  );
}
