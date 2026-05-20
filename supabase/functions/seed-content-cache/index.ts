import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { callLovable, parseAIJSON } from "../_shared/providers.ts";
import { LESSON_SYSTEM_PROMPT, buildLessonPrompt } from "../_shared/prompts_aulas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normCacheStr(s: string): string {
  return (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function buildCacheKey(parts: Record<string, string>): string {
  return Object.entries(parts).map(([k, v]) => `${k}:${normCacheStr(v)}`).join("|");
}

// Tópicos populares pré-definidos
const POPULAR_TOPICS: Array<{ materia: string; tema: string }> = [
  // Matemática
  { materia: "Matemática", tema: "Porcentagem" },
  { materia: "Matemática", tema: "Regra de Três" },
  { materia: "Matemática", tema: "Função do 1º Grau" },
  { materia: "Matemática", tema: "Função Quadrática" },
  { materia: "Matemática", tema: "Razão e Proporção" },
  { materia: "Matemática", tema: "Juros Simples e Compostos" },
  { materia: "Matemática", tema: "Probabilidade" },
  { materia: "Matemática", tema: "Análise Combinatória" },
  { materia: "Matemática", tema: "Estatística - Média, Mediana e Moda" },
  { materia: "Matemática", tema: "Geometria Plana - Áreas" },
  { materia: "Matemática", tema: "Geometria Espacial - Volumes" },
  { materia: "Matemática", tema: "Trigonometria no Triângulo Retângulo" },
  { materia: "Matemática", tema: "Logaritmos" },
  { materia: "Matemática", tema: "Progressão Aritmética e Geométrica" },
  // Português
  { materia: "Português", tema: "Crase" },
  { materia: "Português", tema: "Concordância Verbal e Nominal" },
  { materia: "Português", tema: "Interpretação de Texto" },
  { materia: "Português", tema: "Regência Verbal" },
  { materia: "Português", tema: "Figuras de Linguagem" },
  { materia: "Português", tema: "Funções da Linguagem" },
  { materia: "Português", tema: "Pontuação" },
  { materia: "Português", tema: "Classes Gramaticais" },
  { materia: "Português", tema: "Coesão e Coerência" },
  // Redação
  { materia: "Redação", tema: "Estrutura da Redação ENEM" },
  { materia: "Redação", tema: "Como Fazer uma Boa Introdução" },
  { materia: "Redação", tema: "Como Fazer uma Boa Conclusão (Proposta de Intervenção)" },
  { materia: "Redação", tema: "Repertórios Sociocultural Coringa" },
  { materia: "Redação", tema: "Competência 2 - Repertório Produtivo" },
  { materia: "Redação", tema: "Competência 4 - Conectivos e Coesão" },
  // História
  { materia: "História", tema: "Revolução Francesa" },
  { materia: "História", tema: "Guerra Fria" },
  { materia: "História", tema: "Era Vargas" },
  { materia: "História", tema: "Revolução Industrial" },
  { materia: "História", tema: "Ditadura Militar no Brasil" },
  { materia: "História", tema: "Idade Média e Feudalismo" },
  { materia: "História", tema: "Brasil Colônia" },
  // Biologia
  { materia: "Biologia", tema: "Mitose e Meiose" },
  { materia: "Biologia", tema: "Genética Básica - Leis de Mendel" },
  { materia: "Biologia", tema: "Ecologia - Cadeia Alimentar" },
  { materia: "Biologia", tema: "Citologia - Organelas" },
  { materia: "Biologia", tema: "Evolução" },
  { materia: "Biologia", tema: "Sistema Imunológico" },
  { materia: "Biologia", tema: "Vírus e Bactérias" },
  // Física
  { materia: "Física", tema: "Cinemática - MRU e MRUV" },
  { materia: "Física", tema: "Leis de Newton" },
  { materia: "Física", tema: "Trabalho e Energia" },
  { materia: "Física", tema: "Eletrodinâmica - Circuitos" },
  { materia: "Física", tema: "Termologia - Calorimetria" },
  { materia: "Física", tema: "Ondulatória" },
  { materia: "Física", tema: "Óptica Geométrica" },
  // Química
  { materia: "Química", tema: "Tabela Periódica" },
  { materia: "Química", tema: "Ligações Químicas" },
  { materia: "Química", tema: "Estequiometria" },
  { materia: "Química", tema: "Soluções e Concentração" },
  { materia: "Química", tema: "Ácidos e Bases" },
  { materia: "Química", tema: "Química Orgânica - Funções" },
  { materia: "Química", tema: "Termoquímica" },
  // Geografia
  { materia: "Geografia", tema: "Globalização" },
  { materia: "Geografia", tema: "Climas do Brasil" },
  { materia: "Geografia", tema: "Urbanização e Problemas Urbanos" },
  { materia: "Geografia", tema: "Geopolítica Mundial" },
  { materia: "Geografia", tema: "Hidrografia do Brasil" },
  { materia: "Geografia", tema: "Crise Ambiental e Sustentabilidade" },
  // Filosofia/Sociologia
  { materia: "Filosofia", tema: "Filósofos Pré-Socráticos" },
  { materia: "Filosofia", tema: "Ética e Moral" },
  { materia: "Sociologia", tema: "Sociologia Clássica - Marx, Weber, Durkheim" },
  { materia: "Sociologia", tema: "Movimentos Sociais" },
];

// Conceitos visuais didáticos por matéria (curados, ~30 itens)
const VISUAL_CONCEPTS: Array<{ materia: string; concept: string; context: string; style?: string }> = [
  // Biologia
  { materia: "Biologia", concept: "Estrutura do DNA - dupla hélice", context: "Mostrar pares de bases, açúcar e fosfato com legendas", style: "scientific" },
  { materia: "Biologia", concept: "Mitose - 4 fases", context: "Prófase, metáfase, anáfase, telófase em sequência", style: "diagram" },
  { materia: "Biologia", concept: "Meiose vs Mitose comparação", context: "Quadro comparativo lado a lado", style: "diagram" },
  { materia: "Biologia", concept: "Célula animal - organelas", context: "Núcleo, mitocôndria, ribossomo, retículo, Golgi com legendas", style: "scientific" },
  { materia: "Biologia", concept: "Célula vegetal - organelas", context: "Cloroplasto, parede celular, vacúolo, núcleo", style: "scientific" },
  { materia: "Biologia", concept: "Cadeia alimentar - níveis tróficos", context: "Produtor, consumidor primário, secundário, decompositor", style: "educational" },
  { materia: "Biologia", concept: "Bactéria - estrutura básica", context: "Membrana, parede, flagelo, nucleoide, ribossomo", style: "scientific" },
  { materia: "Biologia", concept: "Vírus - estrutura HIV", context: "Capsídeo, envelope, RNA, glicoproteínas", style: "scientific" },
  // Química
  { materia: "Química", concept: "Tabela periódica - blocos s, p, d, f", context: "Tabela colorida por bloco eletrônico", style: "diagram" },
  { materia: "Química", concept: "Ligação iônica - NaCl", context: "Transferência de elétron Na para Cl, formação do cristal", style: "scientific" },
  { materia: "Química", concept: "Ligação covalente - H2O", context: "Compartilhamento de elétrons na molécula de água", style: "scientific" },
  { materia: "Química", concept: "Modelo atômico de Bohr", context: "Núcleo central com órbitas eletrônicas numeradas", style: "diagram" },
  // Física
  { materia: "Física", concept: "Leis de Newton - 1ª lei inércia", context: "Carro freando, passageiro continuando movimento", style: "educational" },
  { materia: "Física", concept: "Circuito elétrico simples", context: "Pilha, fio, resistor, lâmpada, esquema com símbolos", style: "diagram" },
  { materia: "Física", concept: "MRUV - gráfico velocidade x tempo", context: "Reta inclinada, área = espaço percorrido", style: "diagram" },
  { materia: "Física", concept: "Decomposição de vetores", context: "Vetor decomposto em componentes x e y, plano cartesiano", style: "diagram" },
  { materia: "Física", concept: "Espectro eletromagnético", context: "Faixas de rádio, micro-ondas, visível, raio-X, gama", style: "scientific" },
  // Matemática
  { materia: "Matemática", concept: "Função quadrática - parábola", context: "Gráfico com vértice, raízes, eixo de simetria, plano cartesiano", style: "diagram" },
  { materia: "Matemática", concept: "Função exponencial - gráfico", context: "Curvas crescente e decrescente, intersecção em (0,1)", style: "diagram" },
  { materia: "Matemática", concept: "Trigonometria - círculo trigonométrico", context: "Seno, cosseno, tangente nos quadrantes", style: "diagram" },
  { materia: "Matemática", concept: "Teorema de Pitágoras", context: "Triângulo retângulo com quadrados nos lados, a²+b²=c²", style: "diagram" },
  { materia: "Matemática", concept: "Geometria espacial - sólidos", context: "Cubo, esfera, cilindro, cone, pirâmide com fórmulas", style: "diagram" },
  // Geografia
  { materia: "Geografia", concept: "Tipos de clima do Brasil", context: "Mapa do Brasil colorido por tipo climático", style: "educational" },
  { materia: "Geografia", concept: "Movimentos da Terra", context: "Rotação e translação com inclinação do eixo, estações", style: "scientific" },
  { materia: "Geografia", concept: "Placas tectônicas - mapa", context: "Mapa-múndi com placas principais e tipos de borda", style: "scientific" },
  // História
  { materia: "História", concept: "Pirâmide social feudal", context: "Rei, nobreza, clero, servos, hierarquia visual", style: "educational" },
  { materia: "História", concept: "Guerra Fria - mapa de blocos", context: "Mundo dividido OTAN x Pacto de Varsóvia", style: "educational" },
  // Português
  { materia: "Português", concept: "Análise sintática - termos da oração", context: "Frase decomposta em sujeito, predicado, complementos", style: "diagram" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth: precisa ser admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Apenas admins" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    // kind: "lesson" (padrão) | "questions" | "images"
    const kind: "lesson" | "questions" | "images" = body.kind || "lesson";
    const mode: "rapida" | "completa" | "masterclass" = body.mode || "completa";
    const level: "enem" | "concurso" | "basico" = body.level || "enem";
    const onlyMissing: boolean = body.onlyMissing !== false; // default true
    const customTopics = Array.isArray(body.topics) ? body.topics : null;
    const topics = customTopics?.length ? customTopics : POPULAR_TOPICS;

    const results: any[] = [];
    let okCount = 0, skipCount = 0, errCount = 0;

    // ─── KIND: QUESTIONS — popular cache com questões reais do banco ────────
    if (kind === "questions") {
      for (const t of topics) {
        const materia = t.materia || "Geral";
        const tema = t.tema || "";
        const cacheKey = buildCacheKey({ k: "questions", materia, tema });

        if (onlyMissing) {
          const { data: exists } = await supabase
            .from("content_cache").select("id").eq("cache_key", cacheKey).maybeSingle();
          if (exists?.id) { skipCount++; results.push({ materia, tema, status: "skip" }); continue; }
        }

        try {
          // Busca questões relacionadas: ENEM (questions) por disciplina/tema, ou concurso_questions
          const sourceTable = level === "concurso" ? "concurso_questions" : "questions";
          const disciplinaCol = level === "concurso" ? "disciplina" : "disciplina";
          // tenta match por disciplina (ilike) e tema (ilike)
          const { data: matches } = await supabase
            .from(sourceTable)
            .select("id, enunciado, alternativas, correta, explicacao, tema, " + disciplinaCol)
            .ilike(disciplinaCol, `%${materia}%`)
            .ilike("tema", `%${tema}%`)
            .limit(8);

          let pool = matches || [];
          if (pool.length === 0) {
            // fallback: só por disciplina
            const { data: fb } = await supabase
              .from(sourceTable)
              .select("id, enunciado, alternativas, correta, explicacao, tema, " + disciplinaCol)
              .ilike(disciplinaCol, `%${materia}%`)
              .limit(5);
            pool = fb || [];
          }

          if (pool.length === 0) {
            errCount++;
            results.push({ materia, tema, status: "error", error: "Nenhuma questão encontrada no banco" });
            continue;
          }

          // Normaliza para formato do bloco: { pergunta, alternativas, correta(idx), explicacao }
          const normalized = pool.slice(0, 5).map((q: any) => {
            const alts: string[] = Array.isArray(q.alternativas) ? q.alternativas.map((a: any) => typeof a === "string" ? a : (a?.texto || a?.text || JSON.stringify(a))) : [];
            const corretaLetter = String(q.correta || "").trim().toUpperCase();
            const idxFromLetter = ["A", "B", "C", "D", "E"].indexOf(corretaLetter);
            const correta = idxFromLetter >= 0 ? idxFromLetter : 0;
            return {
              id: q.id,
              pergunta: q.enunciado || "",
              alternativas: alts,
              correta,
              explicacao: q.explicacao || "",
              fonte: level === "concurso" ? "Banco concurso" : "ENEM",
            };
          }).filter(q => q.alternativas.length >= 4 && q.pergunta);

          if (normalized.length === 0) {
            errCount++;
            results.push({ materia, tema, status: "error", error: "Questões inválidas (formato)" });
            continue;
          }

          await supabase.from("content_cache").upsert({
            cache_key: cacheKey,
            tipo: "questions",
            materia, tema,
            dificuldade: "medio",
            estilo: "real",
            objetivo: level,
            payload: { questions: normalized },
            hits: 0,
          }, { onConflict: "cache_key" });

          okCount++;
          results.push({ materia, tema, status: "ok", count: normalized.length });
        } catch (e: any) {
          errCount++;
          results.push({ materia, tema, status: "error", error: String(e?.message || e) });
        }
      }

      return new Response(JSON.stringify({
        ok: true, kind, level,
        total: topics.length, created: okCount, skipped: skipCount, errors: errCount, results,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── KIND: IMAGES — salva catálogo de conceitos visuais por matéria ─────
    // Não chama API de imagem aqui (URLs OpenAI expiram). Apenas registra
    // catálogo curado que o flora-engine consulta antes de pedir imagem nova.
    if (kind === "images") {
      const byMateria = new Map<string, typeof VISUAL_CONCEPTS>();
      for (const c of VISUAL_CONCEPTS) {
        if (!byMateria.has(c.materia)) byMateria.set(c.materia, []);
        byMateria.get(c.materia)!.push(c);
      }
      for (const [materia, concepts] of byMateria.entries()) {
        const cacheKey = buildCacheKey({ k: "image_catalog", materia });
        if (onlyMissing) {
          const { data: exists } = await supabase
            .from("content_cache").select("id").eq("cache_key", cacheKey).maybeSingle();
          if (exists?.id) { skipCount++; results.push({ materia, status: "skip", count: concepts.length }); continue; }
        }
        try {
          await supabase.from("content_cache").upsert({
            cache_key: cacheKey,
            tipo: "image_catalog",
            materia, tema: "",
            dificuldade: "medio",
            estilo: "didatico",
            objetivo: level,
            payload: { concepts },
            hits: 0,
          }, { onConflict: "cache_key" });
          okCount++;
          results.push({ materia, status: "ok", count: concepts.length });
        } catch (e: any) {
          errCount++;
          results.push({ materia, status: "error", error: String(e?.message || e) });
        }
      }
      return new Response(JSON.stringify({
        ok: true, kind, level,
        total: byMateria.size, created: okCount, skipped: skipCount, errors: errCount, results,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── KIND: LESSON (default) — comportamento original ────────────────────
    for (const t of topics) {
      const materia = t.materia || "Geral";
      const tema = t.tema || "";
      const cacheKey = buildCacheKey({
        k: "lesson",
        materia,
        tema,
        level,
        style: "normal",
        mode,
      });

      // skip se já existe
      if (onlyMissing) {
        const { data: exists } = await supabase
          .from("content_cache")
          .select("id")
          .eq("cache_key", cacheKey)
          .maybeSingle();
        if (exists?.id) { skipCount++; results.push({ materia, tema, status: "skip" }); continue; }
      }

      try {
        const userPrompt = buildLessonPrompt("", materia, tema, level, "normal", mode);
        const tokensCap = mode === "masterclass" ? 8000 : mode === "rapida" ? 2200 : 4500;
        const raw = await callLovable({
          messages: [
            { role: "system", content: LESSON_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          maxTokens: tokensCap,
          temperature: 0.7,
          jsonMode: true,
        });
        const lesson = parseAIJSON(raw as string);
        if (!lesson) throw new Error("Falha ao parsear JSON");

        await supabase.from("content_cache").upsert({
          cache_key: cacheKey,
          tipo: "lesson",
          materia,
          tema,
          dificuldade: "normal",
          estilo: mode,
          objetivo: level,
          payload: { lesson },
          hits: 0,
        }, { onConflict: "cache_key" });

        okCount++;
        results.push({ materia, tema, status: "ok" });
      } catch (e: any) {
        errCount++;
        results.push({ materia, tema, status: "error", error: String(e?.message || e) });
      }

      // pequena pausa pra não estourar rate limit
      await new Promise(r => setTimeout(r, 400));
    }

    return new Response(JSON.stringify({
      ok: true,
      mode, level,
      total: topics.length,
      created: okCount,
      skipped: skipCount,
      errors: errCount,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});