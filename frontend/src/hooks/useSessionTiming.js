import { useEffect, useRef, useState } from "react";
import { PLAIN_SESSION_WAIT_LABELS } from "./appStateUtils";

export default function useSessionTiming({ loading, sessionLoading, sessionsLoading }) {
  const [elapsed, setElapsed] = useState(0);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const timerRef = useRef(null);
  const sessionTimerRef = useRef(null);

  useEffect(() => {
    if (loading) {
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    } else {
      window.clearInterval(timerRef.current);
    }
    return () => window.clearInterval(timerRef.current);
  }, [loading]);

  useEffect(() => {
    if (sessionLoading || sessionsLoading) {
      setSessionElapsed(0);
      sessionTimerRef.current = window.setInterval(() => setSessionElapsed((seconds) => seconds + 1), 1000);
    } else {
      window.clearInterval(sessionTimerRef.current);
    }
    return () => window.clearInterval(sessionTimerRef.current);
  }, [sessionLoading, sessionsLoading]);

  function loadingText() {
    if (elapsed < 3) return "Generating...";
    if (elapsed < 8) return `Generating... (${elapsed}s)`;
    return `Waking up server... (${elapsed}s)`;
  }

  function sessionWaitText(label) {
    if (PLAIN_SESSION_WAIT_LABELS.has(label)) return label;
    if (sessionElapsed < 3) return label;
    if (sessionElapsed < 8) return `${label} (${sessionElapsed}s)`;
    return `Waking up server... (${sessionElapsed}s)`;
  }

  return {
    elapsed,
    sessionElapsed,
    loadingText,
    sessionWaitText,
  };
}
