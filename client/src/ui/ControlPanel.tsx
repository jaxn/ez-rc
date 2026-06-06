/** Bottom action panel: designate flag boat, drop marks, set wind, course info. */

import { useStore, hasFix } from "../state/store";
import { sendDropMark, sendSetFlagBoat, sendClearCourse } from "../net/ws";
import { courseLeg } from "../state/selectors";
import { formatBearing, formatDistance } from "../geo/math";
import type { MarkType } from "@ezrc/shared";

interface Props {
  onOpenWind: () => void;
}

export function ControlPanel({ onOpenWind }: Props) {
  const deviceId = useStore((s) => s.deviceId);
  const devices = useStore((s) => s.devices);
  const flagBoatId = useStore((s) => s.flagBoatId);
  const marks = useStore((s) => s.marks);

  const self = devices[deviceId];
  const haveFix = hasFix(self);
  const isFlagBoat = flagBoatId === deviceId;
  const leg = courseLeg(marks);

  function drop(type: MarkType) {
    if (!hasFix(self)) return;
    sendDropMark(type, self.lat, self.lng);
  }

  return (
    <div className="control-panel">
      {leg && (
        <div className="course-leg" data-testid="course-leg">
          Course (W↔L): <strong>{formatDistance(leg.distanceM)}</strong> ·{" "}
          {formatBearing(leg.bearing)}
        </div>
      )}

      <div className="btn-row">
        <button
          className={isFlagBoat ? "chip active" : "chip"}
          onClick={() => sendSetFlagBoat(deviceId)}
          disabled={!haveFix}
        >
          ⛵ {isFlagBoat ? "I'm the flag boat" : "Set me as flag boat"}
        </button>
        <button className="chip" onClick={onOpenWind}>
          🧭 Wind
        </button>
      </div>

      <div className="btn-row">
        <button className="mark-btn pin" onClick={() => drop("pin")} disabled={!haveFix}>
          Drop Pin
        </button>
        <button className="mark-btn windward" onClick={() => drop("windward")} disabled={!haveFix}>
          Windward
        </button>
        <button className="mark-btn leeward" onClick={() => drop("leeward")} disabled={!haveFix}>
          Leeward
        </button>
      </div>

      {!haveFix && <div className="panel-hint">Waiting for your GPS fix…</div>}

      {marks.length > 0 && (
        <button className="link-btn" onClick={() => confirmClear()}>
          Clear course
        </button>
      )}
    </div>
  );
}

function confirmClear() {
  if (confirm("Clear all marks and wind for this session?")) sendClearCourse();
}
