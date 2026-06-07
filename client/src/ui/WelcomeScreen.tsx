/**
 * Landing screen: app title + description and a single "Get started" button.
 * (Placeholder branding until the design system lands.) Get started kicks off
 * the device-permission requests.
 */

interface Props {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: Props) {
  return (
    <div className="screen join">
      <div className="join-card">
        <h1>⛵ ez-rc</h1>
        <p className="tagline">Race committee course setting</p>
        <p className="welcome-desc">
          Set a square course with your crew across multiple boats. Share live
          positions, drop marks, and keep the course lined up to the wind — all
          from your phone, out on the water.
        </p>
        <button className="primary" onClick={onGetStarted}>
          Get started
        </button>
        <p className="hint">
          We'll ask for location and notification access so boats can see each
          other in real time.
        </p>
      </div>
    </div>
  );
}
