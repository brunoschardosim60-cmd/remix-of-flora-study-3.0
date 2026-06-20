CREATE OR REPLACE FUNCTION public.classify_question_tema_audit(
  p_disciplina text,
  p_area text,
  p_enunciado text,
  p_alternativas jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  d text := lower(coalesce(p_disciplina, ''));
  t text := lower(coalesce(p_enunciado, '') || ' ' || coalesce(p_alternativas::text, ''));
  tema text := '';
  confidence numeric := 0.72;
  reason text := '';
BEGIN
  IF btrim(t) = '' THEN
    RETURN jsonb_build_object('tema', 'Sem classificação', 'confidence', 0.1, 'reason', 'Enunciado vazio ou ausente.');
  END IF;

  IF d ~ 'educa[cç][aã]o f[ií]sic' THEN
    IF t ~ '(sa[uú]de|qualidade de vida|sedentari|obesidade|atividade f[ií]sica)' THEN tema := 'Saúde'; confidence := 0.88; reason := 'Saúde, sedentarismo ou qualidade de vida.';
    ELSIF t ~ '(luta|jud[oô]|capoeira|dan[cç]a|bal[eé]|boxe)' THEN tema := 'Lutas e Danças'; confidence := 0.86; reason := 'Lutas, dança ou práticas corporais.';
    ELSIF t ~ '(esporte|futebol|basquete|v[oô]lei|atletismo|ol[ií]mp|paral[ií]mp|jogo|atleta)' THEN tema := 'Esportes'; confidence := 0.88; reason := 'Esportes, jogos ou atletas.';
    ELSE tema := 'Atividade Física'; confidence := 0.62; reason := 'Práticas corporais sem tema específico forte.';
    END IF;

  ELSIF d ~ 'matem' THEN
    IF t ~ '(probabilidade|chance de|sorteio|aleat[oó]ri|urna|dado|moeda)' THEN tema := 'Probabilidade'; confidence := 0.94; reason := 'Termos de probabilidade/sorteio/evento aleatório.';
    ELSIF t ~ '(combina[cç][aã]o|permuta[cç][aã]o|arranjo|anagrama|quantas maneiras|n[uú]mero de maneiras|possibilidades|senha|placa.*ve[ií]culo|princ[ií]pio fundamental da contagem)' THEN tema := 'Análise Combinatória'; confidence := 0.9; reason := 'Contagem de possibilidades, arranjos ou combinações.';
    ELSIF t ~ '(matriz|matrizes|determinante|sistema linear)' THEN tema := 'Matrizes'; confidence := 0.93; reason := 'Matriz, determinante ou sistema linear explícito.';
    ELSIF t ~ '(logaritmo|escala richter|ph\b)' THEN tema := 'Logaritmos'; confidence := 0.88; reason := 'Logaritmo ou escala logarítmica explícita.';
    ELSIF t ~ '(progress[aã]o aritm|progress[aã]o geom|\bpa\b|\bpg\b|sequ[eê]ncia num[eé]rica)' THEN tema := 'Progressões'; confidence := 0.9; reason := 'Sequência numérica ou progressão.';
    ELSIF t ~ '(por cento|porcent|percentual|%|desconto|acr[eé]scimo|juros|infla[cç][aã]o|taxa percentual)' THEN tema := 'Porcentagem'; confidence := 0.93; reason := 'Cálculo percentual, desconto/acréscimo ou juros.';
    ELSIF t ~ '(raz[aã]o|propor[cç][aã]o|proporcional|regra de tr[eê]s|escala|densidade|velocidade m[eé]dia|km/h|m/s|km/l|litro|consumo|rendimento|taxa de|diretamente proporcional|inversamente proporcional|grandezas|convers[aã]o de unidades|dose|receita|mistura)' THEN tema := 'Razão e Proporção'; confidence := 0.9; reason := 'Relação entre grandezas, escala, taxa, consumo ou proporcionalidade.';
    ELSIF t ~ '(volume|prisma|cilindro|cone|esfera|pir[aâ]mide|cubo|paralelep[ií]pedo|octaedro|poliedro|planifica[cç][aã]o|s[oó]lido geom[eé]trico)' THEN tema := 'Geometria Espacial'; confidence := 0.92; reason := 'Sólido, volume ou planificação 3D.';
    ELSIF t ~ '(coordenadas|plano cartesiano|equa[cç][aã]o da reta|dist[aâ]ncia entre pontos|ponto m[eé]dio|coeficiente angular)' THEN tema := 'Geometria Analítica'; confidence := 0.9; reason := 'Plano cartesiano, reta ou coordenadas.';
    ELSIF t ~ '(seno|cosseno|tangente|trigonom|[aâ]ngulo de eleva[cç][aã]o)' THEN tema := 'Trigonometria'; confidence := 0.9; reason := 'Razões trigonométricas ou ângulos.';
    ELSIF t ~ '([aá]rea|per[ií]metro|tri[aâ]ngulo|quadrado|ret[aâ]ngulo|losango|trap[eé]zio|circunfer[eê]ncia|c[ií]rculo|pol[ií]gono|pit[aá]goras|semelhan[cç]a de tri[aâ]ngulos|escada|planta baixa)' THEN tema := 'Geometria Plana'; confidence := 0.88; reason := 'Figuras planas, área/perímetro ou semelhança.';
    ELSIF t ~ '(m[eé]dia|mediana|moda|desvio padr[aã]o|vari[aâ]ncia|estat[ií]stic|histograma|gr[aá]fico de barras|gr[aá]fico de setores|boxplot|tabela|quadro|dados)' THEN tema := 'Estatística'; confidence := 0.86; reason := 'Leitura/medida estatística em tabela, quadro ou gráfico.';
    ELSIF t ~ '(fun[cç][aã]o|f\s*\(|gr[aá]fico da fun[cç][aã]o|fun[cç][aã]o afim|fun[cç][aã]o quadr[aá]tica|exponencial|modelada pela express[aã]o|lei de forma[cç][aã]o)' THEN tema := 'Funções'; confidence := 0.88; reason := 'Função, expressão algébrica ou gráfico funcional explícito.';
    ELSE tema := 'Razão e Proporção'; confidence := 0.52; reason := 'Fallback matemático: questão quantitativa sem marcador forte; revisar se necessário.';
    END IF;

  ELSE
    tema := nullif(public.classify_question_tema(p_disciplina, p_enunciado || ' ' || coalesce(p_alternativas::text, '')), '');
    IF tema IS NULL THEN tema := 'Interpretação de Texto'; END IF;
    confidence := 0.55;
    reason := 'Classificação por regra legada; revisar se a confiança estiver baixa.';
  END IF;

  RETURN jsonb_build_object('tema', tema, 'confidence', confidence, 'reason', reason);
END;
$$;