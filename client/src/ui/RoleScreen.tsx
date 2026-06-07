/**
 * Role selection: set up a new course (this device becomes the flag boat) or
 * join an existing race committee as a mark boat / observer.
 */

import { useStore } from "../state/store";

interface Props {
  busy: boolean;
  onCreate: () => void;
  onJoin: () => void;
}

export function RoleScreen({ busy, onCreate, onJoin }: Props) {
  const geoStatus = useStore((s) => s.geoStatus);
  const geoMessage = useStore((s) => s.geoMessage);
  const geoBlocked =
    geoStatus === "denied" || geoStatus === "error" || geoStatus === "unavailable";

  return (
    <div className="screen join">
      <div className="join-card">
        <h1>Choose a role</h1>
        <p className="tagline">How will this device be used?</p>

        <button className="role-card primary-card" disabled={busy} onClick={onCreate}>
          <strong>⛵ Set up a new course</strong>
          <span>This device is the flag boat — the boat end of the start/finish line.</span>
        </button>

        <button className="role-card" disabled={busy} onClick={onJoin}>
          <strong>🚩 Join a race committee</strong>
          <span>Enter a code from the flag boat. You'll be a mark boat or observer.</span>
        </button>

        {busy && <p className="hint">Connecting…</p>}
        {geoBlocked && (
          <p className="err">
            📍 {geoMessage ?? "Location unavailable — enable it so boats can see you."}
          </p>
        )}
      </div>
    </div>
  );
}
