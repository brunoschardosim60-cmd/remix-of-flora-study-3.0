import { useState, useEffect } from "react";
import { toast } from "sonner";

/**
 * OfflineManager — componente silencioso.
 * Não renderiza nenhuma UI no dashboard.
 * Apenas monitora a conexão e notifica o usuário via toast.
 */
export function OfflineManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Conexão restaurada!");
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Sem conexão. Verifique sua internet.");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sem UI — só funcional
  return null;
}
