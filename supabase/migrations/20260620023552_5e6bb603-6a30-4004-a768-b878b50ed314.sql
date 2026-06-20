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

  IF d ~ 'matem' THEN
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

  ELSIF d ~ 'educa[cç][aã]o f[ií]sic' THEN
    IF t ~ '(sa[uú]de|qualidade de vida|sedentari|obesidade|atividade f[ií]sica)' THEN tema := 'Saúde'; confidence := 0.88; reason := 'Saúde, sedentarismo ou qualidade de vida.';
    ELSIF t ~ '(luta|jud[oô]|capoeira|dan[cç]a|bal[eé]|boxe)' THEN tema := 'Lutas e Danças'; confidence := 0.86; reason := 'Lutas, dança ou práticas corporais.';
    ELSIF t ~ '(esporte|futebol|basquete|v[oô]lei|atletismo|ol[ií]mp|paral[ií]mp|jogo|atleta)' THEN tema := 'Esportes'; confidence := 0.88; reason := 'Esportes, jogos ou atletas.';
    ELSE tema := 'Atividade Física'; confidence := 0.62; reason := 'Práticas corporais sem tema específico forte.';
    END IF;

  ELSIF d ~ 'geografi' THEN
    IF t ~ '(mapa|escala cartogr|cartograf|proje[cç][aã]o cartogr|coordenadas geogr)' THEN tema := 'Cartografia'; confidence := 0.9; reason := 'Mapas, escala ou projeções.';
    ELSIF t ~ '(geopol[ií]tic|ordem mundial|onu|terrorismo|fronteira|conflito)' THEN tema := 'Geopolítica'; confidence := 0.86; reason := 'Relações internacionais/conflitos.';
    ELSIF t ~ '(popula[cç][aã]o|demograf|migra[cç][aã]o|pir[aâ]mide et[aá]ria|natalidade|mortalidade)' THEN tema := 'População'; confidence := 0.88; reason := 'Demografia ou migração.';
    ELSIF t ~ '(urbaniza[cç]|cidade|metr[oó]pole|favela|conurb)' THEN tema := 'Urbanização'; confidence := 0.86; reason := 'Cidade e urbanização.';
    ELSIF t ~ '(industrializa[cç]|setor industri)' THEN tema := 'Industrialização'; confidence := 0.84; reason := 'Indústria/industrialização.';
    ELSIF t ~ '(agropecu|agricultura|pecu[aá]ria|agroneg[oó]cio|reforma agr[aá]ria)' THEN tema := 'Agropecuária'; confidence := 0.86; reason := 'Campo, agricultura ou pecuária.';
    ELSIF t ~ '(clima|tempo atmosf|temperatura|precipita[cç]|massa de ar|el ni[nñ]o)' THEN tema := 'Clima'; confidence := 0.84; reason := 'Clima e dinâmica atmosférica.';
    ELSIF t ~ '(relevo|montanha|planalto|plan[ií]cie|placa tect)' THEN tema := 'Relevo'; confidence := 0.84; reason := 'Relevo ou tectonismo.';
    ELSIF t ~ '(hidrograf|rio|bacia hidr|aqu[ií]fero)' THEN tema := 'Hidrografia'; confidence := 0.84; reason := 'Rios, bacias ou aquíferos.';
    ELSIF t ~ '(globaliza|multinacional|com[eé]rcio internacional|blocos econ[oô]micos)' THEN tema := 'Globalização'; confidence := 0.84; reason := 'Globalização/economia mundial.';
    ELSIF t ~ '(regi[aã]o norte|regi[aã]o nordeste|regi[aã]o sul|regi[aã]o sudeste|centro-oeste)' THEN tema := 'Brasil Regional'; confidence := 0.82; reason := 'Regionalização brasileira.';
    ELSE tema := 'Meio Ambiente'; confidence := 0.58; reason := 'Fallback de Geografia, geralmente ambiental/territorial.';
    END IF;

  ELSIF d ~ 'hist[oó]ri' THEN
    IF t ~ '(brasil col[oô]ni|colon[ií]a portuguesa|capitanias|engenho|escravid[aã]o colonial)' THEN tema := 'Brasil Colônia'; confidence := 0.86; reason := 'Período colonial brasileiro.';
    ELSIF t ~ '(brasil imp[eé]rio|dom pedro|regenc|imp[eé]rio do brasil)' THEN tema := 'Brasil Império'; confidence := 0.86; reason := 'Brasil Império.';
    ELSIF t ~ '(get[uú]lio|vargas|estado novo)' THEN tema := 'Era Vargas'; confidence := 0.86; reason := 'Era Vargas/Estado Novo.';
    ELSIF t ~ '(ditadura militar|regime militar|ai-?5|1964|abertura pol[ií]tica)' THEN tema := 'Ditadura Militar'; confidence := 0.86; reason := 'Regime militar brasileiro.';
    ELSIF t ~ '(rep[uú]blica velha|primeira rep[uú]blica|coronelism|caf[eé] com leite|rep[uú]blica)' THEN tema := 'Brasil República'; confidence := 0.8; reason := 'República brasileira.';
    ELSIF t ~ '(antiguidade|gr[eé]cia antiga|roma antiga|mesopot[aâ]m|egito antigo|fara[oó])' THEN tema := 'Idade Antiga'; confidence := 0.84; reason := 'Civilizações antigas.';
    ELSIF t ~ '(idade m[eé]dia|feudal|cruzadas|medieval)' THEN tema := 'Idade Média'; confidence := 0.84; reason := 'Período medieval.';
    ELSIF t ~ '(renascimento|reforma protestante|absolutism|grandes navega[cç]|iluminismo|revolu[cç][aã]o francesa)' THEN tema := 'Idade Moderna'; confidence := 0.84; reason := 'Idade Moderna.';
    ELSIF t ~ '(revolu[cç][aã]o industrial)' THEN tema := 'Revolução Industrial'; confidence := 0.86; reason := 'Revolução Industrial.';
    ELSIF t ~ '(primeira guerra mundial|segunda guerra mundial|nazismo|fascismo|holocausto)' THEN tema := 'Guerras Mundiais'; confidence := 0.86; reason := 'Guerras mundiais/fascismos.';
    ELSIF t ~ '(guerra fria|uni[aã]o sovi[eé]tica|urss|cortina de ferro)' THEN tema := 'Guerra Fria'; confidence := 0.86; reason := 'Guerra Fria.';
    ELSIF t ~ '(am[eé]rica latina|cuba|pinochet|argentina)' THEN tema := 'América Latina'; confidence := 0.82; reason := 'História da América Latina.';
    ELSIF t ~ '([aá]frica|apartheid|colonialismo africano)' THEN tema := 'África'; confidence := 0.82; reason := 'África, colonialismo ou apartheid.';
    ELSIF t ~ '(movimento social|sufr[aá]gio|direitos civis|movimento negro|feminism)' THEN tema := 'Movimentos Sociais'; confidence := 0.82; reason := 'Movimentos sociais/direitos.';
    ELSE tema := 'Brasil República'; confidence := 0.52; reason := 'Fallback de História sem marcador forte; revisar se necessário.';
    END IF;

  ELSIF d ~ 'filosofi' THEN
    IF t ~ '(s[oó]crates|plat[aã]o|arist[oó]teles|pr[eé]-?socr[aá]ti)' THEN tema := 'Filosofia Antiga'; confidence := 0.86; reason := 'Autores/temas da filosofia antiga.';
    ELSIF t ~ '(agostinho|tom[aá]s de aquino|escol[aá]stic|medieval)' THEN tema := 'Filosofia Medieval'; confidence := 0.84; reason := 'Filosofia medieval.';
    ELSIF t ~ '(descartes|kant|hume|locke|hobbes|rousseau|iluminismo)' THEN tema := 'Filosofia Moderna'; confidence := 0.84; reason := 'Filosofia moderna.';
    ELSIF t ~ '(nietzsche|sartre|foucault|habermas|frankfurt|existencialismo)' THEN tema := 'Filosofia Contemporânea'; confidence := 0.84; reason := 'Filosofia contemporânea.';
    ELSIF t ~ '(pol[ií]tica|estado|democracia|contrato social)' THEN tema := 'Política'; confidence := 0.8; reason := 'Filosofia política.';
    ELSIF t ~ '(est[eé]tica|beleza|arte)' THEN tema := 'Estética'; confidence := 0.8; reason := 'Estética/arte.';
    ELSIF t ~ '(l[oó]gica|silogismo)' THEN tema := 'Lógica'; confidence := 0.82; reason := 'Lógica/silogismo.';
    ELSE tema := 'Ética'; confidence := 0.58; reason := 'Fallback de Filosofia, frequentemente ética.';
    END IF;

  ELSIF d ~ 'sociologi' THEN
    IF t ~ '(trabalho|emprego|sindicato|precariza[cç][aã]o)' THEN tema := 'Trabalho'; confidence := 0.84; reason := 'Trabalho e relações laborais.';
    ELSIF t ~ '(movimento social|movimento negro|feminism|lgbt|movimento ind[ií]gena)' THEN tema := 'Movimentos Sociais'; confidence := 0.84; reason := 'Movimentos sociais.';
    ELSIF t ~ '(cidadania|direitos|democracia)' THEN tema := 'Cidadania'; confidence := 0.82; reason := 'Cidadania/direitos.';
    ELSIF t ~ '(ind[uú]stria cultural|m[ií]dia de massa|adorno|horkheimer)' THEN tema := 'Indústria Cultural'; confidence := 0.84; reason := 'Indústria cultural/mídia.';
    ELSIF t ~ '(classe social|estratifica[cç]|desigualdade social)' THEN tema := 'Estratificação'; confidence := 0.82; reason := 'Classes/desigualdade.';
    ELSIF t ~ '(durkheim|weber|marx|comte)' THEN tema := 'Sociologia Clássica'; confidence := 0.84; reason := 'Autores clássicos da sociologia.';
    ELSE tema := 'Cultura'; confidence := 0.58; reason := 'Fallback de Sociologia, tema cultural/social amplo.';
    END IF;

  ELSIF d ~ 'portugu' OR d = 'linguagens' THEN
    IF t ~ '(figura de linguagem|met[aá]fora|metoním|hip[eé]rbole|ironia|eufemismo)' THEN tema := 'Figuras de Linguagem'; confidence := 0.86; reason := 'Figuras de linguagem.';
    ELSIF t ~ '(fun[cç][aã]o referencial|fun[cç][aã]o emotiva|fun[cç][aã]o conativa|fun[cç][aã]o po[eé]tica|fun[cç][aã]o f[aá]tica|metalingu)' THEN tema := 'Funções da Linguagem'; confidence := 0.84; reason := 'Funções da linguagem.';
    ELSIF t ~ '(varia[cç][aã]o lingu[ií]stic|sotaque|regionalism|dialeto|gir[ií]a)' THEN tema := 'Variação Linguística'; confidence := 0.84; reason := 'Variação linguística.';
    ELSIF t ~ '(g[eê]nero textual|cr[oô]nica|editorial|reportagem|carta argumentativa|artigo de opini[aã]o)' THEN tema := 'Gêneros Textuais'; confidence := 0.82; reason := 'Gênero textual.';
    ELSIF t ~ '(coes[aã]o|coer[eê]ncia|conectivo)' THEN tema := 'Coesão e Coerência'; confidence := 0.82; reason := 'Coesão/coerência.';
    ELSIF t ~ '(sem[aâ]ntica|sin[oô]nim|ant[oô]nim|denota[cç][aã]o|conota[cç][aã]o)' THEN tema := 'Semântica'; confidence := 0.82; reason := 'Sentido/semântica.';
    ELSIF t ~ '(concord[aâ]nci|reg[eê]nci|crase|pontua[cç][aã]o|gram[aá]tic|ortograf)' THEN tema := 'Gramática'; confidence := 0.82; reason := 'Gramática normativa.';
    ELSE tema := 'Interpretação de Texto'; confidence := 0.62; reason := 'Leitura e interpretação textual.';
    END IF;

  ELSIF d ~ 'literatur' THEN
    IF t ~ '(barroc|greg[oó]rio de matos|padre vieira)' THEN tema := 'Barroco'; confidence := 0.84; reason := 'Barroco.';
    ELSIF t ~ '(arcadism|cl[aá]udio manuel|tom[aá]s ant[oô]nio gonzaga)' THEN tema := 'Arcadismo'; confidence := 0.84; reason := 'Arcadismo.';
    ELSIF t ~ '(romantism|jos[eé] de alencar|gon[cç]alves dias|castro alves|[aá]lvares de azevedo)' THEN tema := 'Romantismo'; confidence := 0.84; reason := 'Romantismo.';
    ELSIF t ~ '(realism|machado de assis|mem[oó]rias p[oó]stumas|dom casmurro)' THEN tema := 'Realismo'; confidence := 0.84; reason := 'Realismo/Machado de Assis.';
    ELSIF t ~ '(naturalism|alu[ií]sio azevedo|o corti[cç]o)' THEN tema := 'Naturalismo'; confidence := 0.82; reason := 'Naturalismo.';
    ELSIF t ~ '(parnasian|olavo bilac)' THEN tema := 'Parnasianismo'; confidence := 0.82; reason := 'Parnasianismo.';
    ELSIF t ~ '(simbolism|cruz e sousa)' THEN tema := 'Simbolismo'; confidence := 0.82; reason := 'Simbolismo.';
    ELSIF t ~ '(modernism|semana de 22|m[aá]rio de andrade|oswald de andrade|drummond|bandeira|clarice|guimar[aã]es rosa)' THEN tema := 'Modernismo'; confidence := 0.86; reason := 'Modernismo ou autores modernistas.';
    ELSE tema := 'Literatura Contemporânea'; confidence := 0.58; reason := 'Fallback literário sem escola explícita.';
    END IF;

  ELSIF d ~ 'ingl[eê]s' THEN tema := 'Interpretação de Texto'; confidence := 0.74; reason := 'Questão de língua estrangeira focada em leitura.';
  ELSIF d ~ 'espanhol' THEN tema := 'Interpretación de Texto'; confidence := 0.74; reason := 'Questão de língua estrangeira focada em leitura.';
  ELSIF d ~ 'arte' THEN
    IF t ~ '(m[uú]sica|cantor|composit|melodia|ritmo|tonalidade)' THEN tema := 'Música'; confidence := 0.84; reason := 'Música.';
    ELSIF t ~ '(teatro|dramaturg|cena teatral)' THEN tema := 'Teatro'; confidence := 0.84; reason := 'Teatro.';
    ELSIF t ~ '(pintura|escultura|fotograf|artes visuais|quadrinho|imagem)' THEN tema := 'Artes Visuais'; confidence := 0.82; reason := 'Artes visuais.';
    ELSE tema := 'História da Arte'; confidence := 0.58; reason := 'Fallback de Arte.';
    END IF;

  ELSIF d ~ 'humanas' OR a ~ 'humanas' THEN
    IF t ~ '(filosof|s[oó]crates|kant|nietzsche|[eé]tica)' THEN tema := 'Filosofia'; confidence := 0.72; reason := 'Marcadores de Filosofia em área agregada.';
    ELSIF t ~ '(sociolog|durkheim|weber|marx|cultura|cidadania)' THEN tema := 'Sociologia'; confidence := 0.72; reason := 'Marcadores de Sociologia em área agregada.';
    ELSIF t ~ '(mapa|clima|relevo|urbaniza|popula[cç][aã]o|hidrograf|meio ambiente|globaliza)' THEN tema := 'Geografia'; confidence := 0.72; reason := 'Marcadores de Geografia em área agregada.';
    ELSIF t ~ '(antiguidade|gr[eé]cia|roma|guerras mundiais|revolu[cç][aã]o francesa|nazismo)' THEN tema := 'História Geral'; confidence := 0.7; reason := 'Marcadores de História Geral em área agregada.';
    ELSE tema := 'História do Brasil'; confidence := 0.5; reason := 'Área agregada de Humanas sem marcador forte; revisar.';
    END IF;

  ELSIF d ~ 'natureza' OR a ~ 'natureza' THEN
    IF t ~ '(c[eé]lul|dna|gene|ecossistema|planta|animal|bact[eé]ri|v[ií]rus|fotoss[ií]ntese)' THEN tema := (public.classify_question_tema_audit('Biologia', p_area, p_enunciado, p_alternativas)->>'tema'); confidence := 0.68; reason := 'Área agregada de Natureza com marcadores de Biologia.';
    ELSIF t ~ '(mol\b|rea[cç][aã]o|[aá]cido|base|solu[cç][aã]o|org[aâ]nic|elemento qu[ií]mico)' THEN tema := (public.classify_question_tema_audit('Química', p_area, p_enunciado, p_alternativas)->>'tema'); confidence := 0.68; reason := 'Área agregada de Natureza com marcadores de Química.';
    ELSE tema := (public.classify_question_tema_audit('Física', p_area, p_enunciado, p_alternativas)->>'tema'); confidence := 0.62; reason := 'Área agregada de Natureza com marcadores de Física ou fallback.';
    END IF;

  ELSE
    tema := 'Interpretação de Texto'; confidence := 0.45; reason := 'Disciplina sem regra específica; classificação genérica para revisão.';
  END IF;

  RETURN jsonb_build_object('tema', tema, 'confidence', confidence, 'reason', reason);
END;
$$;