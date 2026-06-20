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
  a text := lower(coalesce(p_area, ''));
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

  ELSIF d ~ 'biolog' THEN
    IF t ~ '(dna|rna|gene|alelo|cromossom|hereditar|mendel|muta[cç][aã]o|gen[oó]tipo|fen[oó]tipo|cariot)' THEN tema := 'Genética'; confidence := 0.93; reason := 'Genes, hereditariedade ou material genético.';
    ELSIF t ~ '(c[eé]lul|organela|mitoc[oô]ndri|cloroplast|n[uú]cleo celular|membrana plasm|citoplasm|ribossom)' THEN tema := 'Citologia'; confidence := 0.91; reason := 'Estrutura/função celular.';
    ELSIF t ~ '(ecossistema|cadeia alimentar|teia alimentar|bioma|h[aá]bitat|biodiversidade|n[ií]vel tr[oó]fico|sucess[aã]o ecol|comunidade biol|rela[cç][oõ]es ecol|impacto ambiental)' THEN tema := 'Ecologia'; confidence := 0.92; reason := 'Ecossistemas, relações ecológicas ou impactos ambientais.';
    ELSIF t ~ '(darwin|sele[cç][aã]o natural|evolu[cç][aã]o|ancestral comum|lamarck|adapta[cç][aã]o)' THEN tema := 'Evolução'; confidence := 0.9; reason := 'Evolução, adaptação ou seleção natural.';
    ELSIF t ~ '(planta|fotoss[ií]ntese|raiz|caule|folha|flor|vegetal|angiosperm|gimnosperm)' THEN tema := 'Botânica'; confidence := 0.88; reason := 'Vegetais ou fotossíntese.';
    ELSIF t ~ '(mam[ií]fer|r[eé]ptil|anf[ií]bi|peixe|ave|inseto|artr[oó]pod|molusco|vertebrad|invertebrad)' THEN tema := 'Zoologia'; confidence := 0.88; reason := 'Animais e grupos zoológicos.';
    ELSIF t ~ '(sistema nervoso|digest|respirat|circulat|horm[oô]nio|sangue|cora[cç][aã]o|rim|f[ií]gado|neur[oô]n|homeostase)' THEN tema := 'Fisiologia Humana'; confidence := 0.88; reason := 'Sistemas e funções do corpo humano.';
    ELSIF t ~ '(bact[eé]ri|v[ií]rus|fungo|microrgan|protozo[aá]ri|arquea)' THEN tema := 'Microbiologia'; confidence := 0.88; reason := 'Microrganismos.';
    ELSIF t ~ '(prote[ií]na|enzima|lip[ií]di|carboidrat|[aá]cido nucl|amino[aá]cido|glicose|atp)' THEN tema := 'Bioquímica'; confidence := 0.86; reason := 'Moléculas biológicas e metabolismo.';
    ELSIF t ~ '(doen[cç]a|vacin|epidemi|pand[eê]mi|sa[uú]de|transmiss[aã]o|cont[aá]gio|sintom|parasit)' THEN tema := 'Saúde e Doenças'; confidence := 0.86; reason := 'Saúde, doença, vacinação ou transmissão.';
    ELSIF t ~ '(transg[eê]nic|clonagem|biotecnolog|engenharia gen|crispr)' THEN tema := 'Biotecnologia'; confidence := 0.88; reason := 'Biotecnologia ou engenharia genética.';
    ELSE tema := 'Ecologia'; confidence := 0.55; reason := 'Fallback de Biologia sem marcador forte; revisar se necessário.';
    END IF;

  ELSIF d ~ 'qu[ií]mic' THEN
    IF t ~ '(org[aâ]nic|hidrocarbon|alcano|alceno|[aá]lcool|aldeid|cetona|[eé]ster|amina|amida|cadeia carb[oô]nica)' THEN tema := 'Química Orgânica'; confidence := 0.91; reason := 'Compostos orgânicos ou funções orgânicas.';
    ELSIF t ~ '(estequiom|mol\b|massa molar|rendimento|reagente limitante|balanceamento)' THEN tema := 'Estequiometria'; confidence := 0.88; reason := 'Cálculo de mol, massa ou proporção reacional.';
    ELSIF t ~ '(solu[cç][aã]o|concentra[cç][aã]o|molarid|dilui[cç][aã]o|soluto|solvente|titula[cç][aã]o)' THEN tema := 'Soluções'; confidence := 0.88; reason := 'Soluções, concentração ou diluição.';
    ELSIF t ~ '(termoqu[ií]m|entalpia|calor de rea[cç]|exot[eé]rm|endot[eé]rm|hess)' THEN tema := 'Termoquímica'; confidence := 0.88; reason := 'Calor/entalpia de reação.';
    ELSIF t ~ '(eletroqu[ií]m|pilha|eletr[oó]lise|c[aá]todo|[aâ]nodo|oxida[cç][aã]o|redu[cç][aã]o|potencial padr)' THEN tema := 'Eletroquímica'; confidence := 0.88; reason := 'Pilhas, eletrólise ou oxirredução.';
    ELSIF t ~ '(cin[eé]tica qu[ií]mic|velocidade.*rea[cç]|catalisador)' THEN tema := 'Cinética'; confidence := 0.86; reason := 'Velocidade de reação/catalisador.';
    ELSIF t ~ '(equil[ií]brio qu[ií]m|le chatelier)' THEN tema := 'Equilíbrio Químico'; confidence := 0.86; reason := 'Equilíbrio químico.';
    ELSIF t ~ '([aá]cido|base|ph\b|poh\b|neutraliza[cç]|arrhenius|bronsted)' THEN tema := 'Ácidos e Bases'; confidence := 0.88; reason := 'pH, ácido/base ou neutralização.';
    ELSIF t ~ '(tabela peri[oó]dica|elemento qu[ií]m|el[eé]tron de val|n[uú]mero at[oô]mico)' THEN tema := 'Tabela Periódica'; confidence := 0.86; reason := 'Elementos e propriedades periódicas.';
    ELSIF t ~ '(liga[cç][aã]o i[oô]nica|liga[cç][aã]o covalente|liga[cç][aã]o met[aá]lica|geometria molecular|polaridade)' THEN tema := 'Ligações Químicas'; confidence := 0.86; reason := 'Ligações e geometria molecular.';
    ELSIF t ~ '(polui[cç][aã]o|chuva [aá]cida|efeito estufa|atmosfera|tratamento de [aá]gua)' THEN tema := 'Química Ambiental'; confidence := 0.82; reason := 'Aplicação ambiental da química.';
    ELSE tema := 'Química Orgânica'; confidence := 0.52; reason := 'Fallback de Química sem marcador forte; revisar se necessário.';
    END IF;

  ELSIF d ~ 'f[ií]sic' THEN
    IF t ~ '(termodin[aâ]m|calor espec|dilata[cç]|gases ideais|carnot|temperatura)' THEN tema := 'Termodinâmica'; confidence := 0.9; reason := 'Calor, temperatura ou gases.';
    ELSIF t ~ '([oó]ptic|espelho|lente|refra[cç]|reflex[aã]o|[ií]ndice de refra|raio de luz)' THEN tema := 'Óptica'; confidence := 0.9; reason := 'Luz, lentes, espelhos ou refração.';
    ELSIF t ~ '(eletric|corrente|tens[aã]o|resist[eê]nci|circuito|amp[eè]r|volt|watt|carga el[eé]tr|eletromag|campo magn|indu[cç][aã]o magn|faraday|lenz)' THEN tema := 'Eletromagnetismo'; confidence := 0.9; reason := 'Eletricidade, circuitos ou magnetismo.';
    ELSIF t ~ '(onda|frequ[eê]nci|comprimento de onda|som|ac[uú]stic|doppler)' THEN tema := 'Ondulatória'; confidence := 0.88; reason := 'Ondas, som ou frequência.';
    ELSIF t ~ '(hidrost[aá]t|press[aã]o.*l[ií]quido|empuxo|arquimedes|densidade.*fluido)' THEN tema := 'Hidrostática'; confidence := 0.88; reason := 'Fluidos, pressão ou empuxo.';
    ELSIF t ~ '(energia cin[eé]tica|energia potencial|energia mec[aâ]nica|conserva[cç][aã]o de energia|trabalho)' THEN tema := 'Energia'; confidence := 0.86; reason := 'Energia, trabalho ou conservação.';
    ELSIF t ~ '(velocidade|acelera[cç]|movimento uniforme|cinem[aá]tic|deslocamento|trajet[oó]ria)' THEN tema := 'Cinemática'; confidence := 0.86; reason := 'Movimento sem foco principal em forças.';
    ELSIF t ~ '(for[cç]a|newton|atrito|peso|din[aâ]mica)' THEN tema := 'Dinâmica'; confidence := 0.86; reason := 'Forças e leis de Newton.';
    ELSIF t ~ '(relatividade|qu[aâ]ntic|f[oó]ton|f[ií]sica moderna|efeito fotoel)' THEN tema := 'Física Moderna'; confidence := 0.86; reason := 'Física moderna/quântica.';
    ELSE tema := 'Mecânica'; confidence := 0.52; reason := 'Fallback de Física sem marcador forte; revisar se necessário.';
    END IF;

  ELSE
    RETURN public.classify_question_tema_audit(CASE WHEN d ~ 'natureza' THEN 'Física' WHEN d ~ 'humanas' THEN 'História' ELSE p_disciplina END, p_area, p_enunciado, p_alternativas);
  END IF;

  RETURN jsonb_build_object('tema', tema, 'confidence', confidence, 'reason', reason);
END;
$$;