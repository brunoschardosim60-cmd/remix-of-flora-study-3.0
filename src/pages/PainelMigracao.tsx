import { useState } from "react";
import {
  Eye, EyeOff, Copy, Check, ShieldAlert, Key, Download,
  Loader2, Code2, Database, AlertTriangle, Info,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Embutir código das edge functions no build (sem chamada de rede)
const functionSources = import.meta.glob("/supabase/functions/*/index.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

type TableRow = {
  tablename: string;
  row_count: number;
  column_count: number;
  encrypted_columns: number;
  has_user_id: boolean;
};

type PanelData = {
  project_url: string;
  anon_key: string;
  service_role_key: string;
  secrets: Record<string, string>;
  edge_functions: string[];
  edge_functions_count: number;
  database_tables: TableRow[];
};

const PROJECT_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function mask(v: string) {
  if (!v) return "";
  if (v.length <= 24) return v;
  return `${v.slice(0, 12)}•••••${v.slice(-8)}`;
}

function classifyTable(t: TableRow): "Essencial" | "Histórico" | "Ignorar" {
  const n = t.tablename.toLowerCase();
  if (/log|cache|audit|snapshot|attempt/.test(n)) return "Histórico";
  if (t.row_count === 0) return "Ignorar";
  return "Essencial";
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setOk(true);
        toast.success(label ? `${label} copiado` : "Copiado");
        setTimeout(() => setOk(false), 1400);
      }}
    >
      {ok ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {label && <span className="ml-2">{label}</span>}
    </Button>
  );
}

function SecretRow({ label, value }: { label: string; value: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="font-mono text-xs truncate">
          {value ? (show ? value : mask(value)) : <span className="italic text-muted-foreground">vazio</span>}
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={() => setShow((s) => !s)}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      <CopyButton value={value} />
    </div>
  );
}

function StepCard({
  n, title, icon: Icon, children,
}: { n: number; title: string; icon: any; children: React.ReactNode }) {
  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            {n}
          </div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5" /> {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PainelMigracao() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PanelData | null>(null);

  async function revealAll() {
    setLoading(true);
    try {
      const res = await fetch(`${PROJECT_URL}/functions/v1/painel-migracao`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: "{}",
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = (await res.json()) as PanelData;
      setData(json);
      toast.success("Dados revelados");
    } catch (e) {
      toast.error("Falha ao revelar", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  function copyAll() {
    if (!data) return;
    const lines: string[] = [];
    lines.push("═══ CREDENCIAIS ═══");
    lines.push(`Project URL: ${data.project_url}`);
    lines.push(`Anon Key: ${data.anon_key}`);
    lines.push(`Service Role Key: ${data.service_role_key}`);
    lines.push("");
    lines.push("═══ EDGE FUNCTIONS ═══");
    lines.push(data.edge_functions.join(", "));
    lines.push("");
    lines.push("═══ SECRETS ═══");
    for (const [k, v] of Object.entries(data.secrets)) {
      lines.push(`${k}=${v}`);
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Tudo copiado");
  }

  function downloadEdgeFunctions() {
    const parts: string[] = [];
    for (const [path, src] of Object.entries(functionSources)) {
      const name = path.split("/").slice(-2, -1)[0];
      parts.push(`// ═══ ${name} ═══\n${src}\n`);
    }
    downloadFile("edge-functions.ts", parts.join("\n"));
    toast.success(`${Object.keys(functionSources).length} funções exportadas`);
  }

  function downloadSecrets() {
    if (!data) return;
    const entries = Object.entries(data.secrets)
      .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
      .join("\n");
    const content = `export const SECRETS = {\n${entries}\n} as const;\n\nexport type SecretKey = keyof typeof SECRETS;\n`;
    downloadFile("secrets.ts", content);
    toast.success("secrets.ts baixado");
  }

  const extraSecrets = data
    ? Object.entries(data.secrets).filter(
        ([k]) =>
          !["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"].includes(k),
      )
    : [];

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="font-heading text-3xl font-bold">Painel de Migração</h1>
          <p className="text-sm text-muted-foreground">
            Copie os itens abaixo na ordem e cole na extensão CloneSupa.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="lg" onClick={revealAll} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              Revelar Tudo
            </Button>
            {data && (
              <Button size="lg" variant="outline" onClick={copyAll}>
                <Copy className="h-4 w-4 mr-2" /> Copiar Tudo
              </Button>
            )}
          </div>
        </header>

        <StepCard n={1} title="Credenciais" icon={ShieldAlert}>
          <SecretRow label="Project URL" value={data?.project_url ?? ""} />
          <SecretRow label="Anon Key" value={data?.anon_key ?? ""} />
          <SecretRow label="Service Role Key" value={data?.service_role_key ?? ""} />
          <div className="flex flex-wrap gap-2 pt-1">
            <CopyButton value={data?.project_url ?? ""} label="Copiar Project URL" />
            <CopyButton value={data?.service_role_key ?? ""} label="Copiar Service Role Key" />
          </div>
        </StepCard>

        <StepCard n={2} title="Edge Functions" icon={Code2}>
          {data ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {data.edge_functions.map((f) => (
                  <Badge key={f} variant="secondary">{f}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.edge_functions_count} funções descobertas.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Clique em "Revelar Tudo" para descobrir as funções.</p>
          )}
          <Button variant="outline" onClick={downloadEdgeFunctions}>
            <Download className="h-4 w-4 mr-2" /> Baixar edge-functions.ts
          </Button>
        </StepCard>

        <StepCard n={3} title="Secrets" icon={Key}>
          {data ? (
            extraSecrets.length > 0 ? (
              <div className="space-y-2">
                {extraSecrets.map(([k, v]) => (
                  <SecretRow key={k} label={k} value={v} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma secret extra.</p>
            )
          ) : (
            <p className="text-xs text-muted-foreground">Revele para listar as secrets.</p>
          )}
          <Button variant="outline" onClick={downloadSecrets} disabled={!data}>
            <Download className="h-4 w-4 mr-2" /> Baixar secrets.ts
          </Button>
        </StepCard>

        <StepCard n={4} title="Conferência" icon={Database}>
          {data?.database_tables && data.database_tables.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm">
                <strong>{data.database_tables.length}</strong> tabelas no schema public.
              </div>
              <div className="max-h-80 overflow-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60">
                    <tr>
                      <th className="p-2 text-left">Tabela</th>
                      <th className="p-2 text-right">Linhas</th>
                      <th className="p-2 text-right">Cols</th>
                      <th className="p-2 text-left">Classe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.database_tables.map((t) => {
                      const c = classifyTable(t);
                      return (
                        <tr key={t.tablename} className="border-t border-border">
                          <td className="p-2 font-mono">{t.tablename}</td>
                          <td className="p-2 text-right">{t.row_count}</td>
                          <td className="p-2 text-right">{t.column_count}</td>
                          <td className="p-2">
                            <Badge variant={c === "Essencial" ? "default" : c === "Histórico" ? "secondary" : "outline"}>
                              {c}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Revele para listar as tabelas.</p>
          )}
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong>Aviso sobre senhas:</strong> senhas são copiadas como hash bcrypt.
              Se o JWT secret do destino mudar, sessões antigas caem — mas a senha do usuário continua válida.
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-blue-500/40 bg-blue-500/5 p-3 text-xs">
            <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
            <div>Esta página é temporária. Apague-a após a migração.</div>
          </div>
        </StepCard>
      </div>
    </div>
  );
}