
CREATE OR REPLACE FUNCTION public.classify_question_tema(p_disciplina text, p_enunciado text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d text := lower(coalesce(p_disciplina, ''));
  t text := lower(coalesce(p_enunciado, ''));
BEGIN
  IF t = '' THEN RETURN ''; END IF;

  IF d ~ 'biolog' OR (d ~ 'natureza' AND t ~ '(c[eé]lul|dna|gene|esp[eé]cie|ecossistema|planta|animal|bact[eé]ri|v[ií]rus|prote[ií]na|enzima|fotoss[ií]ntese)') THEN
    IF t ~ '(c[eé]lul|organela|mitoc[oô]ndri|cloroplast|n[uú]cleo celular|membrana plasm|citoplasm|ribossom)' THEN RETURN 'Citologia';
    ELSIF t ~ '(dna|rna|gene|alelo|cromossom|hereditar|mendel|muta[cç][aã]o|gen[oó]tipo|fen[oó]tipo|cariot)' THEN RETURN 'Genética';
    ELSIF t ~ '(ecossistema|cadeia alimentar|bioma|h[aá]bitat|biodiversidade|n[ií]vel tr[oó]fico|sucess[aã]o ecol|comunidade biol)' THEN RETURN 'Ecologia';
    ELSIF t ~ '(darwin|sele[cç][aã]o natural|evolu[cç][aã]o das esp|ancestral comum|lamarck)' THEN RETURN 'Evolução';
    ELSIF t ~ '(planta|fotoss[ií]ntese|raiz|caule|folha|flor|vegetal|angiosperm|gimnosperm)' THEN RETURN 'Botânica';
    ELSIF t ~ '(mam[ií]fer|r[eé]ptil|anf[ií]bi|peixe|ave|inseto|artr[oó]pod|molusco|vertebrad|invertebrad)' THEN RETURN 'Zoologia';
    ELSIF t ~ '(sistema nervoso|sistema digest|sistema respirat|sistema circulat|horm[oô]nio|sangue|cora[cç][aã]o humano|rim|f[ií]gado|neur[oô]n)' THEN RETURN 'Fisiologia Humana';
    ELSIF t ~ '(bact[eé]ri|v[ií]rus|fungo|microrgan|protozo[aá]ri|arquea)' THEN RETURN 'Microbiologia';
    ELSIF t ~ '(prote[ií]na|enzima|lip[ií]di|carboidrat|[aá]cido nucl|amino[aá]cido|glicose)' THEN RETURN 'Bioquímica';
    ELSIF t ~ '(doen[cç]a|vacin|epidemi|pand[eê]mi|sa[uú]de|transmiss[aã]o|cont[aá]gio|sintom|parasit)' THEN RETURN 'Saúde e Doenças';
    ELSIF t ~ '(transg[eê]nic|clonagem|biotecnolog|engenharia gen|crispr)' THEN RETURN 'Biotecnologia';
    ELSIF t ~ '(origem da vida|abi[oó]gen|panspermi)' THEN RETURN 'Origem da Vida';
    ELSE RETURN 'Ecologia'; END IF;
  END IF;

  IF d ~ 'qu[ií]mic' THEN
    IF t ~ '(org[aâ]nic|hidrocarbon|alcano|alceno|[aá]lcool|aldeid|cetona|[eé]ster|amina|amida)' THEN RETURN 'Química Orgânica';
    ELSIF t ~ '(estequiom|massa molar|rendimento|reagente limitante)' THEN RETURN 'Estequiometria';
    ELSIF t ~ '(solu[cç][aã]o|concentra[cç][aã]o|molarid|dilui[cç][aã]o|soluto|solvente|titula[cç][aã]o)' THEN RETURN 'Soluções';
    ELSIF t ~ '(termoqu[ií]m|entalpia|calor de rea[cç]|exot[eé]rm|endot[eé]rm|hess)' THEN RETURN 'Termoquímica';
    ELSIF t ~ '(eletroqu[ií]m|pilha|eletr[oó]lise|c[aá]todo|[aâ]nodo|oxida[cç][aã]o|redu[cç][aã]o|potencial padr)' THEN RETURN 'Eletroquímica';
    ELSIF t ~ '(cin[eé]tica qu[ií]mic|velocidade.*rea[cç]|catalisador)' THEN RETURN 'Cinética';
    ELSIF t ~ '(equil[ií]brio qu[ií]m|le chatelier)' THEN RETURN 'Equilíbrio Químico';
    ELSIF t ~ '([aá]cido|base|ph|p[oó]h|neutraliza[cç]|arrhenius|bronsted)' THEN RETURN 'Ácidos e Bases';
    ELSIF t ~ '(tabela peri[oó]dica|elemento qu[ií]m|el[eé]tron de val)' THEN RETURN 'Tabela Periódica';
    ELSIF t ~ '(liga[cç][aã]o (i[oô]nica|covalente|met[aá]lica)|geometria molecular|polaridade)' THEN RETURN 'Ligações Químicas';
    ELSIF t ~ '(polui[cç][aã]o|atmosfera|chuva [aá]cida|efeito estufa)' THEN RETURN 'Química Ambiental';
    ELSE RETURN 'Química Orgânica'; END IF;
  END IF;

  IF d ~ 'f[ií]sic' THEN
    IF t ~ '(termodin[aâ]m|calor espec|dilata[cç]|gases ideais|carnot)' THEN RETURN 'Termodinâmica';
    ELSIF t ~ '([oó]ptic|espelho|lente|refra[cç]|reflex[aã]o|[ií]ndice de refra)' THEN RETURN 'Óptica';
    ELSIF t ~ '(eletromag|campo magn|indu[cç][aã]o magn|faraday|lenz|onda eletromag)' THEN RETURN 'Eletromagnetismo';
    ELSIF t ~ '(onda|frequ[eê]nci|comprimento de onda|som|ac[uú]stic|doppler)' THEN RETURN 'Ondulatória';
    ELSIF t ~ '(hidrost[aá]t|press[aã]o.*l[ií]quido|empuxo|arquimedes)' THEN RETURN 'Hidrostática';
    ELSIF t ~ '(energia (cin[eé]tica|potencial|mec[aâ]nic)|conserva[cç][aã]o de energia)' THEN RETURN 'Energia';
    ELSIF t ~ '(velocidade|acelera[cç]|movimento.*uniform|cinem[aá]tic|deslocamento)' THEN RETURN 'Cinemática';
    ELSIF t ~ '(for[cç]a|newton|atrito|peso|din[aâ]mica)' THEN RETURN 'Dinâmica';
    ELSIF t ~ '(rela(t|c)ividade|qu[aâ]ntic|f[oó]ton|f[ií]sica moderna|efeito fotoel)' THEN RETURN 'Física Moderna';
    ELSIF t ~ '(eletric|corrente|tens[aã]o|resist[eê]nci|circuito|amp[eè]r|volt|watt|carga el[eé]tr)' THEN RETURN 'Eletromagnetismo';
    ELSE RETURN 'Mecânica'; END IF;
  END IF;

  IF d ~ 'matem[aá]tic' THEN
    IF t ~ 'fun[cç][aã]o (afim|quadr[aá]tic|exponencial|logar)' THEN RETURN 'Funções';
    ELSIF t ~ '([aá]rea|per[ií]metro|tri[aâ]ngul|quadril[aá]ter|c[ií]rculo|pol[ií]gono|pit[aá]goras)' THEN RETURN 'Geometria Plana';
    ELSIF t ~ '(volume|prisma|cilindro|cone|esfera|pir[aâ]mide|poliedr)' THEN RETURN 'Geometria Espacial';
    ELSIF t ~ '(coordenadas|equa[cç][aã]o da reta|dist[aâ]ncia entre pontos|plano cartesiano)' THEN RETURN 'Geometria Analítica';
    ELSIF t ~ '(seno|cosseno|tangente|trigonom)' THEN RETURN 'Trigonometria';
    ELSIF t ~ '(m[eé]dia|mediana|moda|desvio padr[aã]o|estat[ií]stic|histograma|gr[aá]fico de barras|gr[aá]fico de setores)' THEN RETURN 'Estatística';
    ELSIF t ~ '(probabilidade|chance de|evento aleat)' THEN RETURN 'Probabilidade';
    ELSIF t ~ '(combina[cç][aã]o|permuta[cç][aã]o|arranjo|princ[ií]pio fundamental da contagem|anagrama)' THEN RETURN 'Análise Combinatória';
    ELSIF t ~ '(progress[aã]o (aritm|geom)|sequ[eê]ncia num)' THEN RETURN 'Progressões';
    ELSIF t ~ '(logaritmo)' THEN RETURN 'Logaritmos';
    ELSIF t ~ '(matriz|determinante|sistema linear)' THEN RETURN 'Matrizes';
    ELSIF t ~ '(porcent|%|desconto|acr[eé]scimo|juros)' THEN RETURN 'Porcentagem';
    ELSIF t ~ '(raz[aã]o|propor[cç][aã]o|regra de tr[eê]s)' THEN RETURN 'Razão e Proporção';
    ELSE RETURN 'Funções'; END IF;
  END IF;

  IF d ~ 'hist[oó]ri' THEN
    IF t ~ '(brasil col[oô]ni|colon[ií]a portuguesa|capitanias|engenho)' THEN RETURN 'Brasil Colônia';
    ELSIF t ~ '(brasil imp[eé]rio|dom pedro|regenc|imp[eé]rio do brasil)' THEN RETURN 'Brasil Império';
    ELSIF t ~ '(rep[uú]blica velha|primeira rep[uú]blica|coronelism|caf[eé] com leite)' THEN RETURN 'Brasil República';
    ELSIF t ~ '(getulio|vargas|estado novo)' THEN RETURN 'Era Vargas';
    ELSIF t ~ '(ditadura militar|regime militar|ai-?5|1964|abertura pol[ií]tica)' THEN RETURN 'Ditadura Militar';
    ELSIF t ~ '(antiguidade|gr[eé]cia antiga|roma antiga|mesopot[aâ]m|egito antigo|fara[oó])' THEN RETURN 'Idade Antiga';
    ELSIF t ~ '(idade m[eé]dia|feudal|cruzadas|medieval)' THEN RETURN 'Idade Média';
    ELSIF t ~ '(renascimento|reforma protestante|absolutism|grandes navega[cç]|iluminismo|revolu[cç][aã]o francesa)' THEN RETURN 'Idade Moderna';
    ELSIF t ~ '(revolu[cç][aã]o industrial)' THEN RETURN 'Revolução Industrial';
    ELSIF t ~ '(primeira guerra mundial|segunda guerra mundial|nazismo|fascismo|holocausto)' THEN RETURN 'Guerras Mundiais';
    ELSIF t ~ '(guerra fria|uni[aã]o sovi[eé]tica|urss|cortina de ferro)' THEN RETURN 'Guerra Fria';
    ELSIF t ~ '(am[eé]rica latina|cuba|pinochet|argentina)' THEN RETURN 'América Latina';
    ELSIF t ~ '([aá]frica|apartheid|colonialismo africano)' THEN RETURN 'África';
    ELSIF t ~ '(movimento social|sufr[aá]gio|direitos civis|movimento negro|feminism)' THEN RETURN 'Movimentos Sociais';
    ELSE RETURN 'Brasil República'; END IF;
  END IF;

  IF d ~ 'geografi' THEN
    IF t ~ '(mapa|escala cartogr|cartograf|proje[cç][aã]o cartogr|coordenadas geogr)' THEN RETURN 'Cartografia';
    ELSIF t ~ '(geopol[ií]tic|ordem mundial|onu|terrorismo)' THEN RETURN 'Geopolítica';
    ELSIF t ~ '(popula[cç][aã]o|demograf|migra[cç][aã]o|pir[aâ]mide et[aá]ria|natalidade|mortalidade)' THEN RETURN 'População';
    ELSIF t ~ '(urbaniza[cç]|cidade|metr[oó]pole|favela|conurb)' THEN RETURN 'Urbanização';
    ELSIF t ~ '(industrializa[cç]|setor industri)' THEN RETURN 'Industrialização';
    ELSIF t ~ '(agropecu|agricultura|pecu[aá]ria|agroneg[oó]cio|reforma agr[aá]ria)' THEN RETURN 'Agropecuária';
    ELSIF t ~ '(clima|tempo atmosf|temperatura|precipita[cç]|massa de ar|el ni[nñ]o)' THEN RETURN 'Clima';
    ELSIF t ~ '(relevo|montanha|planalto|plan[ií]cie|placa tect)' THEN RETURN 'Relevo';
    ELSIF t ~ '(hidrograf|rio|bacia hidr|aqu[ií]fero)' THEN RETURN 'Hidrografia';
    ELSIF t ~ '(meio ambiente|sustentabilidade|desmatamento|polui[cç]|aquecimento global|kyoto)' THEN RETURN 'Meio Ambiente';
    ELSIF t ~ '(globaliza|multinacional|com[eé]rcio internacional|blocos econ[oô]micos)' THEN RETURN 'Globalização';
    ELSIF t ~ '(regi[aã]o (norte|nordeste|sul|sudeste|centro-oeste))' THEN RETURN 'Brasil Regional';
    ELSE RETURN 'Meio Ambiente'; END IF;
  END IF;

  IF d ~ 'filosofi' THEN
    IF t ~ '(s[oó]crates|plat[aã]o|arist[oó]teles|pr[eé]-?socr[aá]ti|filosofia antig)' THEN RETURN 'Filosofia Antiga';
    ELSIF t ~ '(escol[aá]stic|santo agostinho|s[aã]o tom[aá]s|filosofia medieval|patr[ií]stica)' THEN RETURN 'Filosofia Medieval';
    ELSIF t ~ '(descartes|kant|hume|locke|hobbes|rousseau|iluminismo|filosofia moderna)' THEN RETURN 'Filosofia Moderna';
    ELSIF t ~ '(nietzsche|sartre|foucault|habermas|frankfurt|existencialismo|filosofia contempor)' THEN RETURN 'Filosofia Contemporânea';
    ELSIF t ~ '([eé]tica|moral|virtude)' THEN RETURN 'Ética';
    ELSIF t ~ '(pol[ií]tica|estado|democracia|contrato social)' THEN RETURN 'Política';
    ELSIF t ~ '(est[eé]tica|beleza)' THEN RETURN 'Estética';
    ELSIF t ~ '(l[oó]gica|silogismo)' THEN RETURN 'Lógica';
    ELSE RETURN 'Ética'; END IF;
  END IF;

  IF d ~ 'sociologi' THEN
    IF t ~ '(trabalho|emprego|sindicato)' THEN RETURN 'Trabalho';
    ELSIF t ~ '(cultura|identidade cultural|patrim[oô]nio cultural)' THEN RETURN 'Cultura';
    ELSIF t ~ '(movimento social|movimento negro|feminism|lgbt|movimento ind[ií]gena)' THEN RETURN 'Movimentos Sociais';
    ELSIF t ~ '(cidadania|direitos|democracia)' THEN RETURN 'Cidadania';
    ELSIF t ~ '(ind[uú]stria cultural|m[ií]dia de massa|adorno|horkheimer)' THEN RETURN 'Indústria Cultural';
    ELSIF t ~ '(classe social|estratifica[cç]|desigualdade social)' THEN RETURN 'Estratificação';
    ELSIF t ~ '(durkheim|weber|marx|comte)' THEN RETURN 'Sociologia Clássica';
    ELSE RETURN 'Cultura'; END IF;
  END IF;

  IF d ~ 'portugu' OR d = 'linguagens' THEN
    IF t ~ '(figura de linguagem|met[aá]fora|metoním|hip[eé]rbole|ironia)' THEN RETURN 'Figuras de Linguagem';
    ELSIF t ~ '(fun[cç][aã]o (referencial|emotiva|conativa|po[eé]tica|f[aá]tica|metalingu))' THEN RETURN 'Funções da Linguagem';
    ELSIF t ~ '(varia[cç][aã]o lingu[ií]stic|sotaque|reg[ií]onalism|dialeto|gir[ií]a)' THEN RETURN 'Variação Linguística';
    ELSIF t ~ '(g[eê]nero textual|cr[oô]nica|editorial|reportagem|carta argumentativa)' THEN RETURN 'Gêneros Textuais';
    ELSIF t ~ '(coes[aã]o|coer[eê]ncia|conectivo)' THEN RETURN 'Coesão e Coerência';
    ELSIF t ~ '(sem[aâ]ntica|sin[oô]nim|ant[oô]nim|sentido (denot|conot))' THEN RETURN 'Semântica';
    ELSIF t ~ '(concord[aâ]nci|reg[eê]nci|crase|pontua[cç][aã]o|gram[aá]tic|ortograf)' THEN RETURN 'Gramática';
    ELSE RETURN 'Interpretação de Texto'; END IF;
  END IF;

  IF d ~ 'literatur' THEN
    IF t ~ '(barroc|gregorio de matos|padre vieira)' THEN RETURN 'Barroco';
    ELSIF t ~ '(arcadism|cl[aá]udio manuel|tom[aá]s ant[oô]nio gonzaga)' THEN RETURN 'Arcadismo';
    ELSIF t ~ '(romantism|jos[eé] de alencar|gon[cç]alves dias|castro alves|[aá]lvares de azevedo)' THEN RETURN 'Romantismo';
    ELSIF t ~ '(realism|machado de assis|memorias p[oó]stumas|dom casmurro)' THEN RETURN 'Realismo';
    ELSIF t ~ '(naturalism|alu[ií]sio azevedo|o corti[cç]o)' THEN RETURN 'Naturalismo';
    ELSIF t ~ '(parnasian|olavo bilac)' THEN RETURN 'Parnasianismo';
    ELSIF t ~ '(simbolism|cruz e sousa)' THEN RETURN 'Simbolismo';
    ELSIF t ~ '(modernism|semana de 22|m[aá]rio de andrade|oswald de andrade|carlos drummond|manuel bandeira|clarice lispector|guimar[aã]es rosa)' THEN RETURN 'Modernismo';
    ELSE RETURN 'Literatura Contemporânea'; END IF;
  END IF;

  IF d ~ 'ingl[eê]s' THEN RETURN 'Interpretação de Texto'; END IF;
  IF d ~ 'espanhol' THEN RETURN 'Interpretación de Texto'; END IF;

  IF d ~ 'arte' THEN
    IF t ~ '(m[uú]sica|cantor|composit|melodia|ritmo|tonalidade)' THEN RETURN 'Música';
    ELSIF t ~ '(teatro|dramaturg|cena teatral)' THEN RETURN 'Teatro';
    ELSIF t ~ '(pintura|escultura|fotograf|artes visuais|quadr)' THEN RETURN 'Artes Visuais';
    ELSE RETURN 'História da Arte'; END IF;
  END IF;

  IF d ~ 'educa[cç][aã]o f[ií]sic' THEN
    IF t ~ '(esporte|futebol|basquete|v[oô]lei|atletismo|jogos ol[ií]mp)' THEN RETURN 'Esportes';
    ELSIF t ~ '(luta|judo|capoeira|dan[cç]a|bal[eé])' THEN RETURN 'Lutas e Danças';
    ELSIF t ~ '(sa[uú]de|qualidade de vida|sedentari)' THEN RETURN 'Saúde';
    ELSE RETURN 'Atividade Física'; END IF;
  END IF;

  IF d ~ '(humanas|ci[eê]ncias humanas)' THEN
    IF t ~ '(brasil col[oô]ni|imp[eé]rio do brasil|rep[uú]blica|vargas|ditadura militar|guerra fria|revolu[cç][aã]o industrial|idade m[eé]dia)' THEN RETURN 'História do Brasil';
    ELSIF t ~ '(filosof|s[oó]crates|kant|nietzsche|[eé]tica)' THEN RETURN 'Filosofia';
    ELSIF t ~ '(sociolog|durkheim|weber|marx)' THEN RETURN 'Sociologia';
    ELSIF t ~ '(mapa|clima|relevo|urbaniza|popula[cç][aã]o|hidrograf|meio ambiente|globaliza)' THEN RETURN 'Geografia';
    ELSIF t ~ '(antiguidade|gr[eé]cia antiga|roma antiga|guerras mundiais|revolu[cç][aã]o francesa|nazismo)' THEN RETURN 'História Geral';
    ELSE RETURN 'Atualidades'; END IF;
  END IF;

  RETURN '';
END;
$$;

UPDATE public.questions
SET tema = public.classify_question_tema(disciplina, enunciado)
WHERE coalesce(tema, '') = '';
