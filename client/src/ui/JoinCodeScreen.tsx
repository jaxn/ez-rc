/** Code-entry screen for joining an existing race committee. */

import { useState } from "react";
import { useStore } from "../state/store";

interface Props {
  busy: boolean;
  onBack: () => void;
  onJoin: (code: string) => void;
}

export function JoinCodeScreen({ busy, onBack, onJoin }: Props) {
  const error = useStore((s) => s.error);
  const clearError = useStore((s) => s.clearError);
  const [code, setCode] = useState("");

  function submit() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    clearError();
    onJoin(trimmed);
  }

  return (
    <div className="screen join">
      <div className="join-card">
        <button className="back-btn" onClick={onBack} disabled={busy}>
          ← Back
        </button>
        <h1>Join a race</h1>
        <p className="tagline">Enter the code shared by the flag boat.</p>

        <label>
          Session code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. 7QK2P"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={5}
            autoFocus
          />
        </label>

        <button className="primary" disabled={busy || !code.trim()} onClick={submit}>
          {busy ? "Joining…" : "Join"}
        </button>

        {error && <p className="err">{error}</p>}
      </div>
    </div>
  );
}
