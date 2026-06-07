/** Roster of connected boats with distance + bearing from the flag boat. */

import { useState } from "react";
import { useStore } from "../state/store";
import { relativeDevices } from "../state/selectors";
import { sendSetFlagBoat } from "../net/ws";
import { formatBearing, formatDistance } from "../geo/math";

export function DeviceList() {
  const devices = useStore((s) => s.devices);
  const flagBoatId = useStore((s) => s.flagBoatId);
  const selfDeviceId = useStore((s) => s.deviceId);
  const [open, setOpen] = useState(true);

  const rel = relativeDevices(devices, flagBoatId, selfDeviceId);
  const flag = flagBoatId ? devices[flagBoatId] : undefined;
  const count = Object.keys(devices).length;

  return (
    <div className={`device-list ${open ? "open" : "closed"}`}>
      <button className="device-list-toggle" onClick={() => setOpen((o) => !o)}>
        Boats ({count}) {open ? "▾" : "▸"}
      </button>
      {open && (
        <ul>
          {flag && (
            <li className="device flag">
              <span className="dot flag" /> ⛵ {flag.name}{" "}
              {flag.deviceId === selfDeviceId && <em>(you)</em>}
              <span className="rel">flag boat</span>
            </li>
          )}
          {rel.map(({ device, distanceM, bearing }) => (
            <li key={device.deviceId} className="device">
              <span className={`dot ${device.deviceId === selfDeviceId ? "self" : "other"}`} />
              {device.name}
              {device.deviceId === selfDeviceId && <em> (you)</em>}
              <span className="rel">
                {distanceM != null && bearing != null
                  ? `${formatDistance(distanceM)} · ${formatBearing(bearing)}`
                  : flagBoatId
                    ? "—"
                    : "no flag boat"}
              </span>
              {flagBoatId !== device.deviceId && (
                <button
                  className="tiny"
                  title="Make flag boat"
                  onClick={() => sendSetFlagBoat(device.deviceId)}
                >
                  set ⛵
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
