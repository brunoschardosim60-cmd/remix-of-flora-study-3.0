/**
 * useFeriados — feriados nacionais BR via Brasil API (pública, sem chave).
 * Cache em localStorage por ano. Usado pra evitar agendar revisão em feriado.
 */
import { useEffect, useState } from "react";

type Feriado = { date: string; name: string; type: string };
const CACHE_KEY = (year: number) => `feriados_br_${year}`;

export function useFeriados(year: number = new Date().getFullYear()) {
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY(year));
        if (cached) {
          if (mounted) { setFeriados(JSON.parse(cached)); setLoading(false); }
          return;
        }
        const r = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
        if (!r.ok) throw new Error(`brasilapi ${r.status}`);
        const data: Feriado[] = await r.json();
        localStorage.setItem(CACHE_KEY(year), JSON.stringify(data));
        if (mounted) setFeriados(data);
      } catch {
        if (mounted) setFeriados([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [year]);

  const isFeriado = (date: string | Date): Feriado | null => {
    const s = typeof date === "string" ? date : date.toISOString().split("T")[0];
    return feriados.find((f) => f.date === s) ?? null;
  };

  return { feriados, isFeriado, loading };
}