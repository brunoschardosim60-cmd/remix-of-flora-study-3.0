import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLASSIFIER_VERSION = "enem-tema-v3-json-confidence";

function parseAiJson(raw: string): { tema: string; confidence: number; reason: string } | null {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return {
      tema: String(parsed.tema || "").trim(),
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5))),
      reason: String(parsed.reason || "").trim().slice(0, 500),
    };
  } catch {
    return null;
  }
}

/**
 * Classifica o `tema` de questões reais do ENEM, salvando confiança e motivo.
 * Apenas admin. Roda em lotes pra evitar timeout.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authErr } = await callerClient.auth.getClaims(token);
    if (authErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Apenas admins" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const disciplina: string | undefined = body.disciplina;
    const limit: number = Math.min(100, Math.max(1, Number(body.limit ?? 30)));
    const force: boolean = Boolean(body.force);
    const uncertainOnly: boolean = Boolean(body.uncertainOnly);
    const maxConfidence: number = Math.max(0, Math.min(1, Number(body.maxConfidence ?? 0.7)));
    const offset: number = Math.max(0, Number(body.offset ?? 0));

    let q = admin
      .from("questions")
      .select("id,disciplina,enunciado,tema,tema_confidence")
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);
    if (uncertainOnly) q = q.or(`tema_confidence.is.null,tema_confidence.lte.${maxConfidence}`);
    else if (!force) q = q.or("tema.is.null,tema.eq.");
    if (disciplina) q = q.eq("disciplina", disciplina);
    const { data: rows, error: selErr } = await q;
    if (selErr) throw selErr;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ updated: 0, skipped: 0, total: 0, temas: {} }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const temasPorDisciplina: Record<string, string[]> = {
      "Biologia": ["Citologia","Genética","Ecologia","Evolução","Botânica","Zoologia","Fisiologia Humana","Microbiologia","Bioquímica","Saúde e Doenças","Biotecnologia","Origem da Vida"],
      "Química": ["Química Orgânica","Estequiometria","Soluções","Termoquímica","Eletroquímica","Cinética","Equilíbrio Químico","Ácidos e Bases","Tabela Periódica","Ligações Químicas","Química Ambiental"],
      "Física": ["Mecânica","Termodinâmica","Óptica","Eletromagnetismo","Ondulatória","Hidrostática","Energia","Cinemática","Dinâmica","Física Moderna"],
      "Matemática": ["Funções","Geometria Plana","Geometria Espacial","Geometria Analítica","Trigonometria","Estatística","Probabilidade","Análise Combinatória","Progressões","Logaritmos","Matrizes","Porcentagem","Razão e Proporção"],
      "História": ["Brasil Colônia","Brasil Império","Brasil República","Era Vargas","Ditadura Militar","Idade Antiga","Idade Média","Idade Moderna","Revolução Industrial","Guerras Mundiais","Guerra Fria","América Latina","África","Movimentos Sociais"],
      "Geografia": ["Cartografia","Geopolítica","População","Urbanização","Industrialização","Agropecuária","Clima","Relevo","Hidrografia","Meio Ambiente","Globalização","Brasil Regional"],
      "Filosofia": ["Filosofia Antiga","Filosofia Medieval","Filosofia Moderna","Filosofia Contemporânea","Ética","Política","Estética","Lógica"],
      "Sociologia": ["Trabalho","Cultura","Movimentos Sociais","Cidadania","Indústria Cultural","Estratificação","Sociologia Clássica"],
      "Português": ["Interpretação de Texto","Gramática","Variação Linguística","Figuras de Linguagem","Funções da Linguagem","Gêneros Textuais","Coesão e Coerência","Semântica"],
      "Literatura": ["Barroco","Arcadismo","Romantismo","Realismo","Naturalismo","Parnasianismo","Simbolismo","Modernismo","Literatura Contemporânea"],
      "Linguagens": ["Interpretação de Texto","Gêneros Textuais","Variação Linguística","Literatura","Artes","Educação Física"],
      "Humanas": ["História do Brasil","História Geral","Geografia","Filosofia","Sociologia","Atualidades"],
      "Natureza": ["Citologia","Genética","Ecologia","Evolução","Botânica","Zoologia","Fisiologia Humana","Microbiologia","Bioquímica","Saúde e Doenças","Biotecnologia","Origem da Vida","Química Orgânica","Estequiometria","Soluções","Termoquímica","Eletroquímica","Cinética","Equilíbrio Químico","Ácidos e Bases","Tabela Periódica","Ligações Químicas","Química Ambiental","Mecânica","Termodinâmica","Óptica","Eletromagnetismo","Ondulatória","Hidrostática","Energia","Cinemática","Dinâmica","Física Moderna"],
      "Ciências Humanas": ["Brasil Colônia","Brasil Império","Brasil República","Era Vargas","Ditadura Militar","Idade Antiga","Idade Média","Idade Moderna","Revolução Industrial","Guerras Mundiais","Guerra Fria","América Latina","África","Movimentos Sociais","Cartografia","Geopolítica","População","Urbanização","Industrialização","Agropecuária","Clima","Relevo","Hidrografia","Meio Ambiente","Globalização","Brasil Regional","Filosofia Antiga","Filosofia Medieval","Filosofia Moderna","Filosofia Contemporânea","Ética","Política","Estética","Lógica","Trabalho","Cultura","Cidadania","Indústria Cultural","Estratificação","Sociologia Clássica","Atualidades"],
      "Ciências da Natureza": ["Citologia","Genética","Ecologia","Evolução","Botânica","Zoologia","Fisiologia Humana","Microbiologia","Bioquímica","Saúde e Doenças","Biotecnologia","Origem da Vida","Química Orgânica","Estequiometria","Soluções","Termoquímica","Eletroquímica","Cinética","Equilíbrio Químico","Ácidos e Bases","Tabela Periódica","Ligações Químicas","Química Ambiental","Mecânica","Termodinâmica","Óptica","Eletromagnetismo","Ondulatória","Hidrostática","Energia","Cinemática","Dinâmica","Física Moderna"],
      "Inglês": ["Interpretação de Texto","Vocabulário","Gramática"],
      "Espanhol": ["Interpretación de Texto","Vocabulario","Gramática"],
      "Artes": ["História da Arte","Música","Artes Visuais","Teatro"],
      "Educação Física": ["Esportes","Saúde","Atividade Física","Lutas e Danças"],
    };

    const tally: Record<string, number> = {};
    let updated = 0, skipped = 0;

    // Processa sequencialmente pra não estourar quota
    for (const row of rows) {
      const disc = (row.disciplina || "").trim();
      const allowed = temasPorDisciplina[disc] || [];
      if (allowed.length === 0) { skipped++; continue; }
      const enunciado = String(row.enunciado || "").slice(0, 1800);
      if (!enunciado.trim()) { skipped++; continue; }

      const prompt = `Você é um especialista em ENEM. Classifique a questão escolhendo APENAS UM tema da LISTA PERMITIDA e informe confiança.\n\nREGRAS IMPORTANTES:\n- Escolha o tema central da questão, não uma palavra solta do texto.\n- Nunca deixe sem tema: se estiver incerto, escolha o melhor tema e reduza confidence.\n- Se envolve REGRA DE TRÊS, PROPORÇÃO, ESCALA, taxa, densidade, velocidade média, consumo, rendimento, conversão de unidades ou comparação de grandezas, use "Razão e Proporção" (NÃO "Funções").\n- Se envolve %, descontos, acréscimos ou juros → "Porcentagem".\n- "Funções" é APENAS para função afim, quadrática, exponencial ou logarítmica explícita, fórmula f(x), gráfico de função ou modelagem funcional direta.\n- Use "Geometria Plana" para áreas/perímetros/figuras 2D; "Geometria Espacial" para volume/sólidos 3D.\n- Para Educação Física, use apenas temas corporais/esportivos; não use temas de Física.\n\nDISCIPLINA: ${disc}\nTEMAS PERMITIDOS: ${allowed.join(", ")}\n\nENUNCIADO:\n${enunciado}\n\nResponda SOMENTE JSON válido neste formato:\n{"tema":"um tema exato da lista","confidence":0.0,"reason":"motivo curto"}`;

      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 160,
          }),
        });
        if (!aiRes.ok) { skipped++; continue; }
        const json = await aiRes.json();
        const parsed = parseAiJson(String(json?.choices?.[0]?.message?.content || ""));
        if (!parsed?.tema) { skipped++; continue; }
        // Match case-insensitive contra os permitidos
        const rawTema = parsed.tema.replace(/^["'`]+|["'`.]+$/g, "");
        const match = allowed.find((t) => t.toLowerCase() === rawTema.toLowerCase())
          || allowed.find((t) => rawTema.toLowerCase().includes(t.toLowerCase()))
          || allowed.find((t) => t.toLowerCase().includes(rawTema.toLowerCase()));
        if (!match) { skipped++; continue; }

        const { error: updErr } = await admin.from("questions").update({
          tema: match,
          tema_confidence: parsed.confidence,
          tema_reason: parsed.reason || `Classificada como ${match}`,
          tema_classified_at: new Date().toISOString(),
          tema_classifier_version: CLASSIFIER_VERSION,
        }).eq("id", row.id);
        if (updErr) { skipped++; continue; }
        tally[match] = (tally[match] || 0) + 1;
        updated++;
      } catch (_e) {
        skipped++;
      }
    }

    return new Response(JSON.stringify({ updated, skipped, total: rows.length, temas: tally, nextOffset: offset + rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("classify-question-temas error:", err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});