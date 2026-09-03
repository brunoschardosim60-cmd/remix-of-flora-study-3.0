import type { Subject } from "@/lib/studyData";

export interface NotebookTemplate {
  id: string;
  label: string;
  description: string;
  html: string;
}

const cornell = (titulo: string): string => `
<h2>${titulo}</h2>
<table style="width:100%;border-collapse:collapse" border="1">
  <thead>
    <tr>
      <th style="width:30%;padding:8px;text-align:left">Palavras-chave / perguntas</th>
      <th style="padding:8px;text-align:left">Anotações principais</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px">&nbsp;</td><td style="padding:8px">&nbsp;</td></tr>
    <tr><td style="padding:8px">&nbsp;</td><td style="padding:8px">&nbsp;</td></tr>
    <tr><td style="padding:8px">&nbsp;</td><td style="padding:8px">&nbsp;</td></tr>
  </tbody>
</table>
<p><strong>Resumo (em 2-3 frases):</strong></p>
<p>&nbsp;</p>
`;

const formulario = (materia: string): string => `
<h2>Formulário — ${materia}</h2>
<ul>
  <li><strong>Fórmula:</strong> &nbsp; — <em>Quando usar:</em> &nbsp;</li>
  <li><strong>Fórmula:</strong> &nbsp; — <em>Quando usar:</em> &nbsp;</li>
  <li><strong>Fórmula:</strong> &nbsp; — <em>Quando usar:</em> &nbsp;</li>
</ul>
<h3>Exemplos resolvidos</h3>
<p>1) &nbsp;</p>
<p>2) &nbsp;</p>
`;

const fluxograma = `
<h2>Fluxograma do processo</h2>
<p><strong>Etapa 1 →</strong> &nbsp;</p>
<p><strong>Etapa 2 →</strong> &nbsp;</p>
<p><strong>Etapa 3 →</strong> &nbsp;</p>
<p><strong>Resultado final:</strong> &nbsp;</p>
<h3>Pontos de regulação</h3>
<ul><li>&nbsp;</li><li>&nbsp;</li></ul>
`;

const redacao = `
<h2>Estrutura da redação</h2>
<p><strong>Tese:</strong> &nbsp;</p>
<h3>Introdução</h3><p>Contextualização + tese + apresentação dos argumentos.</p>
<h3>Desenvolvimento 1</h3><p>Argumento + repertório sociocultural + análise.</p>
<h3>Desenvolvimento 2</h3><p>Argumento + dado/citação + consequência.</p>
<h3>Conclusão</h3><p>Retomada da tese + proposta de intervenção (agente, ação, meio, finalidade, detalhamento).</p>
`;

const linhaTempo = `
<h2>Linha do tempo</h2>
<ul>
  <li><strong>Ano/Período:</strong> &nbsp; — <em>Fato:</em> &nbsp;</li>
  <li><strong>Ano/Período:</strong> &nbsp; — <em>Fato:</em> &nbsp;</li>
  <li><strong>Ano/Período:</strong> &nbsp; — <em>Fato:</em> &nbsp;</li>
</ul>
<p><strong>Conexão entre os eventos:</strong> &nbsp;</p>
`;

const fichaAnatomica = `
<h1>Estrutura anatômica</h1>
<p><strong>Estrutura:</strong> &nbsp; <em>Nome em latim:</em> &nbsp;</p>
<table style="width:100%;border-collapse:collapse" border="1">
  <tbody>
    <tr><th style="padding:8px;text-align:left;width:28%">Localização</th><td style="padding:8px">&nbsp;</td></tr>
    <tr><th style="padding:8px;text-align:left">Relações</th><td style="padding:8px">Anterior: &nbsp; Posterior: &nbsp; Medial: &nbsp; Lateral:</td></tr>
    <tr><th style="padding:8px;text-align:left">Irrigação / drenagem</th><td style="padding:8px">&nbsp;</td></tr>
    <tr><th style="padding:8px;text-align:left">Inervação</th><td style="padding:8px">&nbsp;</td></tr>
    <tr><th style="padding:8px;text-align:left">Função</th><td style="padding:8px">&nbsp;</td></tr>
  </tbody>
</table>
<h2>Desenho e orientação espacial</h2>
<p>Insira uma imagem do Atlas visual e use setas para identificar relações, planos e trajetos.</p>
<h2>Aplicação clínica</h2><p>Lesão ou alteração → estrutura afetada → função comprometida → manifestação esperada.</p>
`;

const mecanismoFisiologico = `
<h1>Mecanismo fisiológico</h1>
<p><strong>Pergunta central:</strong> &nbsp;</p>
<h2>Estado inicial</h2><p>Variáveis, compartimentos e valores de referência relevantes.</p>
<h2>Sequência causal</h2>
<p><strong>Estímulo → receptor → integração → efetor → resposta → feedback.</strong></p>
<ol><li>&nbsp;</li><li>&nbsp;</li><li>&nbsp;</li><li>&nbsp;</li></ol>
<h2>Se algo falhar</h2><p>Alteração → compensação → sinal/sintoma → dado que ajuda a confirmar.</p>
`;

const anamneseEstruturada = `
<h1>Anamnese simulada</h1>
<blockquote>Use somente casos fictícios ou anonimizados. Não registre dados identificáveis de pacientes reais.</blockquote>
<p><strong>Identificação fictícia:</strong> &nbsp; <strong>Idade:</strong> &nbsp; <strong>Ocupação:</strong> &nbsp;</p>
<h2>Queixa principal</h2><p>“____________________________________________________________”</p>
<h2>História da doença atual</h2>
<ul><li>Início, localização, irradiação e caráter:</li><li>Intensidade, duração e evolução:</li><li>Fatores de melhora e piora:</li><li>Sintomas associados:</li></ul>
<h2>Antecedentes e contexto</h2><p>Patológicos · cirúrgicos · medicamentos · alergias · hábitos · história familiar · contexto psicossocial.</p>
<h2>Síntese em uma frase</h2><p>&nbsp;</p>
`;

const casoClinico = `
<h1>Caso clínico fictício</h1>
<p><strong>Problema representado:</strong> &nbsp;</p>
<h2>Dados-chave</h2><p>Achados positivos importantes · negativos importantes · fatores de risco · cronologia.</p>
<h2>Hipóteses</h2>
<table style="width:100%;border-collapse:collapse" border="1"><thead><tr><th style="padding:8px">Hipótese</th><th style="padding:8px">A favor</th><th style="padding:8px">Contra</th><th style="padding:8px">Como testar</th></tr></thead><tbody><tr><td style="padding:12px">&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td style="padding:12px">&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>
<h2>Conduta de estudo</h2><p>Prioridade → exame ou informação → resultado esperado → como mudaria o raciocínio.</p>
`;

const mapaFarmacologico = `
<h1>Mapa farmacológico</h1>
<p><strong>Fármaco/classe:</strong> &nbsp; <strong>Indicação estudada:</strong> &nbsp;</p>
<h2>Mecanismo de ação</h2><p><strong>Alvo → efeito molecular → efeito celular → efeito clínico.</strong></p>
<h2>Farmacocinética</h2><p>Absorção · distribuição · metabolismo · eliminação.</p>
<h2>Segurança</h2><ul><li>Efeitos adversos importantes:</li><li>Contraindicações e precauções:</li><li>Interações relevantes:</li><li>Monitorização:</li></ul>
<blockquote>Material para estudo. Não use esta página como prescrição ou orientação individual.</blockquote>
`;

const TEMPLATES_BY_SUBJECT: Record<string, NotebookTemplate[]> = {
  "Medicina": [
    { id: "med-anatomia", label: "Ficha anatômica", description: "Estrutura, relações e aplicação", html: fichaAnatomica },
    { id: "med-anamnese", label: "Anamnese simulada", description: "Entrevista clínica organizada", html: anamneseEstruturada },
    { id: "med-caso", label: "Caso clínico", description: "Hipóteses e dados-chave", html: casoClinico },
    { id: "med-farmaco", label: "Mapa farmacológico", description: "Mecanismo, cinética e segurança", html: mapaFarmacologico },
  ],
  "HAM": [
    { id: "ham-anatomia", label: "Ficha anatômica", description: "Estrutura, relações e aplicação", html: fichaAnatomica },
    { id: "ham-cornell", label: "Resumo de aula", description: "Perguntas, notas e síntese", html: cornell("HAM — Anatomia e morfofisiologia") },
  ],
  "SOI": [
    { id: "soi-mecanismo", label: "Mecanismo fisiológico", description: "Cadeia causal e feedback", html: mecanismoFisiologico },
    { id: "soi-caso", label: "Caso integrador", description: "Hipóteses e dados-chave", html: casoClinico },
  ],
  "IESC": [
    { id: "iesc-anamnese", label: "Anamnese simulada", description: "Entrevista sem dados identificáveis", html: anamneseEstruturada },
    { id: "iesc-caso", label: "Caso clínico", description: "Contexto, hipóteses e conduta", html: casoClinico },
  ],
  "PIEPE": [
    { id: "piepe-caso", label: "Problema integrador", description: "Problema, hipóteses e objetivos", html: casoClinico },
    { id: "piepe-fluxo", label: "Fluxograma", description: "Etapas e pontos de decisão", html: fluxograma },
  ],
  "MCM": [
    { id: "mcm-mecanismo", label: "Mapa de mecanismo", description: "Causa, resposta e consequência", html: mecanismoFisiologico },
    { id: "mcm-farmaco", label: "Mapa farmacológico", description: "Ação, cinética e segurança", html: mapaFarmacologico },
  ],
  "Matemática": [
    { id: "math-formulario", label: "Formulário", description: "Lista de fórmulas + exemplos", html: formulario("Matemática") },
    { id: "math-cornell", label: "Cornell", description: "Palavras-chave + anotações + resumo", html: cornell("Aula de Matemática") },
  ],
  "Física": [
    { id: "fis-formulario", label: "Formulário", description: "Fórmulas + quando aplicar", html: formulario("Física") },
    { id: "fis-cornell", label: "Cornell", description: "Conceitos + observações", html: cornell("Aula de Física") },
  ],
  "Química": [
    { id: "qui-formulario", label: "Reações & fórmulas", description: "Equações + observações", html: formulario("Química") },
    { id: "qui-fluxograma", label: "Fluxograma", description: "Etapas de uma reação", html: fluxograma },
  ],
  "Biologia": [
    { id: "bio-fluxograma", label: "Fluxograma", description: "Processos biológicos passo a passo", html: fluxograma },
    { id: "bio-cornell", label: "Cornell", description: "Conceitos + resumo", html: cornell("Aula de Biologia") },
  ],
  "História": [
    { id: "his-cornell", label: "Cornell", description: "Padrão para aulas teóricas", html: cornell("Aula de História") },
    { id: "his-timeline", label: "Linha do tempo", description: "Eventos em ordem cronológica", html: linhaTempo },
  ],
  "Geografia": [
    { id: "geo-cornell", label: "Cornell", description: "Conceitos + análise espacial", html: cornell("Aula de Geografia") },
    { id: "geo-timeline", label: "Linha do tempo", description: "Processos históricos/ambientais", html: linhaTempo },
  ],
  "Português": [
    { id: "por-cornell", label: "Cornell", description: "Regra + exemplos", html: cornell("Aula de Português") },
    { id: "por-redacao", label: "Estrutura de redação", description: "Tese, argumentos, proposta", html: redacao },
  ],
  "Redação": [
    { id: "red-estrutura", label: "Estrutura ENEM", description: "Tese + 2 argumentos + intervenção", html: redacao },
  ],
  "Inglês": [
    { id: "ing-cornell", label: "Cornell", description: "Vocabulário + estrutura + exemplos", html: cornell("English class") },
  ],
  "Raciocínio Lógico": [
    { id: "rlm-formulario", label: "Atalhos & padrões", description: "Macetes + exemplos", html: formulario("Raciocínio Lógico") },
  ],
  "Direito Constitucional": [
    { id: "const-cornell", label: "Cornell jurídico", description: "Artigo + interpretação + jurisprudência", html: cornell("Direito Constitucional") },
  ],
  "Direito Administrativo": [
    { id: "adm-cornell", label: "Cornell jurídico", description: "Conceito + lei + exemplo", html: cornell("Direito Administrativo") },
  ],
  "Direito Penal": [
    { id: "penal-cornell", label: "Cornell jurídico", description: "Tipo penal + elementos + exceções", html: cornell("Direito Penal") },
  ],
  "Direito Civil": [
    { id: "civil-cornell", label: "Cornell jurídico", description: "Conceito + artigo + caso", html: cornell("Direito Civil") },
  ],
};

const DEFAULT_TEMPLATES: NotebookTemplate[] = [
  { id: "cornell-geral", label: "Cornell", description: "Anotações + palavras-chave + resumo", html: cornell("Aula") },
  { id: "fluxograma-geral", label: "Fluxograma", description: "Passos de um processo", html: fluxograma },
];

export function getTemplatesForSubject(subject: Subject | string | null | undefined): NotebookTemplate[] {
  if (!subject) return DEFAULT_TEMPLATES;
  return TEMPLATES_BY_SUBJECT[subject] ?? DEFAULT_TEMPLATES;
}

// ---------- Smart tags (client-side heuristic) ----------
const STOPWORDS = new Set([
  "a","o","as","os","de","da","do","das","dos","e","ou","em","no","na","nos","nas","um","uma","uns","umas",
  "para","por","pelo","pela","pelos","pelas","com","sem","sob","sobre","entre","ate","até","se","que","qual",
  "como","quando","onde","mais","menos","muito","muita","muitos","muitas","seu","sua","seus","suas","ele","ela",
  "eles","elas","isso","isto","aquilo","esse","essa","este","esta","aqui","ali","la","lá","ja","já","nao","não",
  "sim","tambem","também","entao","então","porque","porém","mas","entao","ser","estar","ter","fazer","foi","era",
  "são","sao","ao","aos","à","às","the","of","and","or","to","in","on","is","are","was","were","this","that",
]);

export function suggestTagsFromText(text: string, max = 6): string[] {
  if (!text) return [];
  const clean = text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ");
  const tokens = clean.split(/\s+/).filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  const sorted = Array.from(counts.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
  if (sorted.length === 0) {
    return Array.from(new Set(tokens)).slice(0, max);
  }
  return sorted;
}
