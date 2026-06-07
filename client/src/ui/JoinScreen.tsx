/** Entry screen: pick a name, then create or join a race session. */

import { useEffect, useState } from "react";
import { useStore } from "../state/store";

interface Props {
  onJoin: (sessionCode: string, name: string) => void;
}

export function JoinScreen({ onJoin }: Props) {
  const storedName = useStore((s) => s.name);
  const setName = useStore((s) => s.setName);
  const connStatus = useStore((s) => s.connStatus);

  const [name, setLocalName] = useState(storedName);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  // Reflect store name if it changes (e.g. first load).
  useEffect(() => setLocalName(storedName), [storedName]);

  // Clear the busy flag if the connection drops/fails (otherwise the form would
  // stay disabled until a reload). On success this screen unmounts instead.
  useEffect(() => {
    if (connStatus === "disconnected") setBusy(false);
  }, [connStatus]);

  const connecting = busy || connStatus === "connecting";

  function submit(sessionCode: string) {
    const trimmedName = name.trim() || "Boat";
    const trimmedCode = sessionCode.trim().toUpperCase();
    if (!trimmedCode) return;
    setName(trimmedName);
    setBusy(true);
    onJoin(trimmedCode, trimmedName);
  }

  async function createSession() {
    setBusy(true);
    try {
      const res = await fetch("/api/new-session");
      const { sessionCode } = (await res.json()) as { sessionCode: string };
      setCode(sessionCode);
      submit(sessionCode);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="screen join">
      <div className="join-card">
        <h1>⛵ ez-rc</h1>
        <p className="tagline">Race committee course setting</p>

        <label>
          Your name / boat
          <input
            value={name}
            onChange={(e) => setLocalName(e.target.value)}
            placeholder="e.g. Flag Boat"
            autoComplete="off"
          />
        </label>

        <label>
          Session code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. 7QK2P"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={5}
          />
        </label>

        <button className="primary" disabled={connecting || !code.trim()} onClick={() => submit(code)}>
          {connecting ? "Joining…" : "Join session"}
        </button>

        <div className="or">or</div>

        <button className="secondary" disabled={connecting} onClick={createSession}>
          Create new session
        </button>

        <p className="hint">
          Share the code with other boats so everyone sees the same course.
        </p>
      </div>
    </div>
  );
}
