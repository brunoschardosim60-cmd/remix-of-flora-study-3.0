import { useState, useEffect, useCallback } from "react";
import { loadJsonStorage } from "@/lib/storage";

export interface GlobalPostItNote {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isOpen: boolean;
}

const STORAGE_KEY = "flora.globalPostIt";

const DEFAULT_NOTE: GlobalPostItNote = {
  id: "global-1",
  text: "",
  color: "#fef08a", // Amarelo
  x: 100,
  y: 100,
  width: 250,
  height: 250,
  isOpen: false,
};

export function useGlobalPostIt() {
  const [notes, setNotes] = useState<GlobalPostItNote[]>(() => {
    if (typeof window === "undefined") return [DEFAULT_NOTE];
    const saved = loadJsonStorage<GlobalPostItNote[]>(STORAGE_KEY);
    return Array.isArray(saved) && saved.length > 0 ? saved : [DEFAULT_NOTE];
  });
  const [isPipActive, setIsPipActive] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  // Sync with localStorage
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    // Broadcast changes to other tabs (or PiP window)
    const channel = new BroadcastChannel("global-post-it-sync");
    channel.postMessage({ type: "SYNC", notes });
    channel.close();
  }, [notes]);

  // Listen for broadcast changes (from PiP or other tabs)
  useEffect(() => {
    const channel = new BroadcastChannel("global-post-it-sync");
    channel.onmessage = (event) => {
      if (event.data?.type === "SYNC") {
        setNotes((prev) => {
          // Prevent unnecessary state updates if deep equal
          const stringifiedPrev = JSON.stringify(prev);
          const stringifiedNew = JSON.stringify(event.data.notes);
          return stringifiedPrev !== stringifiedNew ? event.data.notes : prev;
        });
      }
    };
    return () => channel.close();
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<GlobalPostItNote>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  }, []);

  const addNote = useCallback(() => {
    const newNote: GlobalPostItNote = {
      ...DEFAULT_NOTE,
      id: crypto.randomUUID(),
      isOpen: true,
      x: Math.random() * 50 + 50,
      y: Math.random() * 50 + 50,
    };
    setNotes((prev) => [...prev, newNote]);
  }, []);

  const removeNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const openInPiP = useCallback(async () => {
    // Fallback helper: opens a normal popup window with the standalone post-it page.
    // Works inside iframes (like the Lovable preview) where the PiP API is blocked.
    const openPopupFallback = () => {
      const popup = window.open(
        "/pip-postit.html",
        "flora-postit",
        "popup=yes,width=320,height=400,left=100,top=100"
      );
      if (!popup) {
        alert(
          "Não foi possível abrir o post-it flutuante. Permita pop-ups deste site nas configurações do navegador."
        );
        return false;
      }
      popup.focus();
      return true;
    };

    // Try the native Document Picture-in-Picture API first
    if ("documentPictureInPicture" in window) {
      try {
        // @ts-ignore - Document Picture-in-Picture API types are not fully standard yet
        const pip = await window.documentPictureInPicture.requestWindow({
          width: 300,
          height: 350,
        });
        setPipWindow(pip);
        setIsPipActive(true);
        pip.addEventListener("pagehide", () => {
          setIsPipActive(false);
          setPipWindow(null);
        });
        return true;
      } catch (error) {
        // Most common: NotAllowedError when running inside an iframe (Lovable preview).
        // Fall back to a normal popup window so the user still gets a floating post-it.
        console.warn("PiP unavailable, falling back to popup window:", error);
        return openPopupFallback();
      }
    }

    return openPopupFallback();
  }, []);

  return {
    notes,
    updateNote,
    addNote,
    removeNote,
    openInPiP,
    isPipActive,
    pipWindow,
  };
}
