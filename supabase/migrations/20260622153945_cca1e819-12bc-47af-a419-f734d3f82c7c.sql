
CREATE OR REPLACE FUNCTION public.infer_disciplina(p_area text, p_enunciado text, p_alternativas jsonb DEFAULT '[]'::jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  a text := lower(coalesce(p_area, ''));
  t text := lower(coalesce(p_enunciado, '') || ' ' || coalesce(p_alternativas::text, ''));
BEGIN
  IF a ~ 'matem' THEN RETURN 'Matemática'; END IF;

  IF a ~ 'natureza' THEN
    IF t ~ '(c[eé]lul|dna|rna|gene|alelo|cromossom|prote[ií]na|enzima|fotoss[ií]nt|ecossistema|bioma|esp[eé]cie|evolu[cç][aã]o|darwin|bact[eé]ri|v[ií]rus|fungo|planta|animal|mam[ií]fer|reprodu[cç][aã]o|organela|tecido|[oó]rg[aã]o|sangu|cora[cç][aã]o|sistema (nervoso|digest|respirat|circulat|imun)|horm[oô]ni|vacin|doen[cç]a|microrgan|biodivers|cadeia alimentar|fotoss|respira[cç][aã]o celular|metabolismo|herd|gen[eé]tic|biolog)' THEN RETURN 'Biologia';
    ELSIF t ~ '([aá]cido|base|ph\b|sal\b|reagente|rea[cç][aã]o qu[ií]mic|mol\b|mols\b|molar|estequiom|solu[cç][aã]o aquosa|concentra[cç][aã]o|hidrocarbon|[aá]lcool|aldeid|cetona|[eé]ster|amina|amida|hidr[oó]xido|combust[aã]o|oxida[cç][aã]o|redu[cç][aã]o|eletr[oó]lise|pilha|catalis|polimer|isomeria|tabela peri[oó]dica|elemento qu[ií]mic|liga[cç][aã]o (covalente|i[oô]nica)|qu[ií]mica)' THEN RETURN 'Química';
    ELSIF t ~ '(velocidade|acelera[cç]|for[cç]a|newton|atrito|peso|massa\b|energia (cin[eé]tica|potencial|mec[aâ]nic)|trabalho mec|pot[eê]ncia|onda|frequ[eê]ncia|comprimento de onda|som\b|ac[uú]stic|[oó]ptic|espelho|lente|refra[cç]|reflex[aã]o|eletric|corrente|tens[aã]o|resist[eê]nci|circuito|amp[eè]r|volt|watt|magn[eé]tic|f[oó]ton|relatividade|qu[aâ]ntic|calor|temperatura|dilata[cç]|press[aã]o|empuxo|f[ií]sic)' THEN RETURN 'Física';
    ELSE RETURN 'Biologia';
    END IF;
  END IF;

  IF a ~ 'humanas' THEN
    IF t ~ '(filosof|s[oó]crates|plat[aã]o|arist[oó]teles|kant|nietzsche|descartes|hegel|sartre|hobbes|locke|rousseau|virtude|[eé]tica\b|moral\b|metaf[ií]sic|epistemolog|silogismo|iluminismo filos)' THEN RETURN 'Filosofia';
    ELSIF t ~ '(sociolog|durkheim|weber|marx\b|comte|classe social|estratifica[cç]|movimento social|ind[uú]stria cultural|cidadania|trabalho assalariado|sindicat|fato social)' THEN RETURN 'Sociologia';
    ELSIF t ~ '(mapa|cartograf|escala\b|proje[cç][aã]o cartogr|clima|relevo|hidrograf|bacia hidr|popula[cç][aã]o|demograf|migra[cç][aã]o|urbaniza[cç]|cidade|metr[oó]pole|favela|industrializa[cç]|agropecu|agricultura|pecu[aá]ria|meio ambiente|sustentabilidade|desmatamento|polui[cç]|aquecimento global|globaliza|geopol[ií]tic|regi[aã]o (norte|nordeste|sul|sudeste|centro-oeste)|bioma|geograf)' THEN RETURN 'Geografia';
    ELSE RETURN 'História';
    END IF;
  END IF;

  IF a ~ 'linguagens' THEN
    IF t ~ '(esporte|futebol|basquete|v[oô]lei|atletismo|ol[ií]mp|paral[ií]mp|atleta|ed(\.|uca[cç][aã]o) f[ií]sic|jud[oô]|capoeira|dan[cç]a|bal[eé]|gin[aá]stica|exerc[ií]cio f[ií]sico|sedentaris)' THEN RETURN 'Educação Física';
    ELSIF t ~ '(pintura|escultura|fotograf|m[uú]sica|cantor|composit|melodia|teatro|dramaturg|artes visuais|quadr[oa] de|tela de|obra de arte|artista pl[aá]stic|cinema)' THEN RETURN 'Artes';
    ELSIF t ~ '(poema|verso|estrofe|soneto|romance|conto|cr[oô]nica|narrador|persona[gj]em|machado de assis|drummond|clarice|guimar[aã]es rosa|manuel bandeira|m[aá]rio de andrade|oswald|literatur|barroc|arcadism|romantism|realism|naturalism|parnasian|simbolism|modernism)' THEN RETURN 'Literatura';
    ELSE RETURN 'Português';
    END IF;
  END IF;

  RETURN coalesce(nullif(p_area, ''), 'Geral');
END;
$$;

-- Reclassifica anos com disciplinas amplas
UPDATE public.questions
SET disciplina = public.infer_disciplina(area, enunciado, alternativas)
WHERE disciplina IN ('Ciências da Natureza', 'Ciências Humanas', 'Natureza', 'Humanas', 'Linguagens')
  AND area IS NOT NULL;
