import { useState, useEffect, useCallback, useRef } from "react";

const IDLE_TIMEOUT_MINUTES = 5;
const STORAGE_KEY = "flora.presence.lastActive";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night"; // 23:00 to 04:59
}

export function usePresence() {
  const [isIdle, setIsIdle] = useState(false);
  const [minutesAway, setMinutesAway] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay());
  
  const lastActiveAt = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load last active time from storage on mount
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const lastTime = parseInt(stored, 10);
      const diffMs = Date.now() - lastTime;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins >= IDLE_TIMEOUT_MINUTES) {
        setMinutesAway(diffMins);
        setIsIdle(true);
      }
      lastActiveAt.current = lastTime;
    }
  }, []);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    const diffMs = now - lastActiveAt.current;
    const diffMins = Math.floor(diffMs / 60000);

    // If user was idle and came back, dispatch an event
    if (isIdle || diffMins >= IDLE_TIMEOUT_MINUTES) {
      setMinutesAway(diffMins);
      // We keep isIdle true for a moment so components can react to "came back" state
      // But we update the timestamp
      window.dispatchEvent(new CustomEvent("flora-presence-return", { detail: { minutesAway: diffMins } }));
      setIsIdle(false);
    } else {
      setMinutesAway(0);
    }

    lastActiveAt.current = now;
    window.localStorage.setItem(STORAGE_KEY, now.toString());

    // Reset idle timer
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, IDLE_TIMEOUT_MINUTES * 60 * 1000);

  }, [isIdle]);

  // Setup event listeners
  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const throttledActivity = () => {
      // Throttle activity updates to once per 10 seconds to avoid spam
      const now = Date.now();
      if (now - lastActiveAt.current > 10000) {
        handleActivity();
      }
    };

    events.forEach((e) => window.addEventListener(e, throttledActivity, { passive: true }));
    
    // Initial setup
    handleActivity();

    // Check time of day periodically
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay());
    }, 60000 * 5); // every 5 minutes

    return () => {
      events.forEach((e) => window.removeEventListener(e, throttledActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(interval);
    };
  }, [handleActivity]);

  return {
    isIdle,
    minutesAway,
    timeOfDay,
    lastActiveAt: lastActiveAt.current,
  };
}
