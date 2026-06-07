/** Modal for entering wind direction (compass heading FROM) and optional speed. */

import { useState } from "react";
import { useStore } from "../state/store";
import { sendSetWind } from "../net/ws";

interface Props {
  onClose: () => void;
}

export function WindDialog({ onClose }: Props) {
  const wind = useStore((s) => s.wind);
  const [dir, setDir] = useState(wind ? String(wind.directionDeg) : "");
  const [speed, setSpeed] = useState(wind?.speedKts != null ? String(wind.speedKts) : "");

  function save() {
    const direction = Number(dir);
    if (!Number.isFinite(direction)) return;
    const normalized = ((direction % 360) + 360) % 360;
    const kts = speed.trim() === "" ? undefined : Number(speed);
    sendSetWind(normalized, Number.isFinite(kts as number) ? kts : undefined);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Set wind</h2>
        <p className="modal-sub">
          Direction the wind is coming FROM. The map rotates so it blows down the screen.
        </p>

        <label>
          Direction (°)
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={360}
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            placeholder="0–360"
            autoFocus
          />
        </label>

        <label>
          Speed (knots, optional)
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
            placeholder="e.g. 12"
          />
        </label>

        <div className="modal-actions">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" onClick={save} disabled={dir.trim() === ""}>
            Set wind
          </button>
        </div>
      </div>
    </div>
  );
}
