import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Classifica o `tema` de questões reais do ENEM com `tema` vazio.
 * Apenas admin. Roda em lotes pra evitar timeout.
 *
 * Input: { disciplina?: string, limit?: number (default 30) }
 * Output: { updated: number, skipped: number, total: number, temas: Record<string, number> }
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
    const offset: number = Math.max(0, Number(body.offset ?? 0));

    let q = admin
      .from("questions")
      .select("id,disciplina,enunciado,tema")
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);
    if (!force) q = q.or("tema.is.null,tema.eq.");
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
      "Natureza": ["Biologia","Química","Física","Ecologia"],
      "Ciências Humanas": ["História do Brasil","História Geral","Geografia","Filosofia","Sociologia"],
      "Ciências da Natureza": ["Biologia","Química","Física","Ecologia"],
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

      const prompt = `Você é um especialista em ENEM. Classifique a questão escolhendo APENAS UM tema da LISTA PERMITIDA.\n\nREGRAS IMPORTANTES:\n- NÃO escolha um tema só porque "encaixa mais ou menos". Escolha o tema que REALMENTE descreve o conteúdo central da questão.\n- Se a questão envolve REGRA DE TRÊS, PROPORÇÃO, ESCALA ou comparação de grandezas, use "Razão e Proporção" (NÃO "Funções").\n- Se envolve %, descontos, juros simples → "Porcentagem".\n- "Funções" é APENAS pra questões com função afim, quadrática, exponencial ou logarítmica EXPLÍCITAS (com fórmulas f(x)=...).\n- Use "Geometria Plana" pra áreas/perímetros 2D; "Geometria Espacial" pra volumes 3D.\n- Se o enunciado for muito curto ou genérico e você não tiver certeza, responda exatamente NENHUM (sem aspas).\n\nDISCIPLINA: ${disc}\nTEMAS PERMITIDOS: ${allowed.join(", ")}\n\nENUNCIADO:\n${enunciado}\n\nResponda APENAS com o nome exato do tema escolhido da lista, ou NENHUM. Sem explicações.`;

      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 30,
          }),
        });
        if (!aiRes.ok) { skipped++; continue; }
        const json = await aiRes.json();
        const raw = String(json?.choices?.[0]?.message?.content || "").trim().replace(/^["'`]+|["'`.]+$/g, "");
        if (/^nenhum$/i.test(raw)) { skipped++; continue; }
        // Match case-insensitive contra os permitidos
        const match = allowed.find((t) => t.toLowerCase() === raw.toLowerCase())
          || allowed.find((t) => raw.toLowerCase().includes(t.toLowerCase()))
          || allowed.find((t) => t.toLowerCase().includes(raw.toLowerCase()));
        if (!match) { skipped++; continue; }

        const { error: updErr } = await admin.from("questions").update({ tema: match }).eq("id", row.id);
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