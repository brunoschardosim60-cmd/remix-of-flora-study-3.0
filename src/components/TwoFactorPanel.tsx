/**
 * TwoFactorPanel — habilita/desabilita TOTP (2FA) via Supabase Auth MFA.
 * Mostra QR code para escanear no Google Authenticator / Authy e valida código de 6 dígitos.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, ShieldCheck, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Factor { id: string; status: string; friendly_name?: string | null; }

export function TwoFactorPanel() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const loadFactors = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = (data?.totp ?? []) as Factor[];
      setFactors(totp.filter((f) => f.status === "verified"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFactors(); }, []);

  const startEnroll = async () => {
    setEnrolling(true);
    try {
      // Limpa factors não verificados antes
      const { data: list } = await supabase.auth.mfa.listFactors();
      const pending = (list?.totp ?? []).filter((f: any) => f.status !== "verified");
      for (const p of pending) await supabase.auth.mfa.unenroll({ factorId: p.id });

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `StudyFlow ${new Date().toLocaleDateString("pt-BR")}`,
      });
      if (error) throw error;
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (e: any) {
      toast.error("Erro ao iniciar 2FA: " + (e?.message ?? ""));
    } finally {
      setEnrolling(false);
    }
  };

  const verifyEnroll = async () => {
    if (!factorId || code.length !== 6) return;
    setVerifying(true);
    try {
      const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId, challengeId: ch.id, code,
      });
      if (vErr) throw vErr;
      toast.success("2FA ativado!");
      setQr(null); setSecret(null); setFactorId(null); setCode("");
      await loadFactors();
    } catch (e: any) {
      toast.error("Código inválido: " + (e?.message ?? ""));
    } finally {
      setVerifying(false);
    }
  };

  const disable = async (id: string) => {
    if (!confirm("Desativar 2FA? Sua conta ficará menos protegida.")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) { toast.error(error.message); return; }
    toast.success("2FA desativado.");
    await loadFactors();
  };

  const cancelEnroll = async () => {
    if (factorId) await supabase.auth.mfa.unenroll({ factorId });
    setQr(null); setSecret(null); setFactorId(null); setCode("");
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
      <h2 className="font-heading font-semibold text-base flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" /> Autenticação em dois fatores (2FA)
      </h2>
      <p className="text-xs text-muted-foreground">
        Adicione uma camada extra de segurança usando um app autenticador (Google Authenticator, Authy, 1Password).
      </p>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
        </div>
      ) : factors.length > 0 ? (
        <div className="space-y-2">
          {factors.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <div>
                  <p className="font-medium">{f.friendly_name || "App autenticador"}</p>
                  <p className="text-xs text-muted-foreground">Ativo</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => disable(f.id)} className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : qr ? (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-lg inline-block">
            <img src={qr} alt="QR Code 2FA" className="w-48 h-48" />
          </div>
          {secret && (
            <p className="text-xs text-muted-foreground break-all">
              Ou insira manualmente: <code className="font-mono">{secret}</code>
            </p>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Código de 6 dígitos do app</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              className="font-mono text-center text-lg tracking-widest"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={verifyEnroll} disabled={code.length !== 6 || verifying} className="flex-1">
              {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar e ativar
            </Button>
            <Button variant="outline" onClick={cancelEnroll}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button onClick={startEnroll} disabled={enrolling} size="sm">
          {enrolling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Shield className="w-4 h-4 mr-2" /> Ativar 2FA
        </Button>
      )}
    </section>
  );
}