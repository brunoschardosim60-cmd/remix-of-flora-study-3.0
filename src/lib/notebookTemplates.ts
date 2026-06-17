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

const TEMPLATES_BY_SUBJECT: Record<string, NotebookTemplate[]> = {
  Matematica: [
    { id: "math-formulario", label: "Formulário", description: "Lista de fórmulas + exemplos", html: formulario("Matemática") },
    { id: "math-cornell", label: "Cornell", description: "Palavras-chave + anotações + resumo", html: cornell("Aula de Matemática") },
  ],
  Fisica: [
    { id: "fis-formulario", label: "Formulário", description: "Fórmulas + quando aplicar", html: formulario("Física") },
    { id: "fis-cornell", label: "Cornell", description: "Conceitos + observações", html: cornell("Aula de Física") },
  ],
  Quimica: [
    { id: "qui-formulario", label: "Reações & fórmulas", description: "Equações + observações", html: formulario("Química") },
    { id: "qui-fluxograma", label: "Fluxograma", description: "Etapas de uma reação", html: fluxograma },
  ],
  Biologia: [
    { id: "bio-fluxograma", label: "Fluxograma", description: "Processos biológicos passo a passo", html: fluxograma },
    { id: "bio-cornell", label: "Cornell", description: "Conceitos + resumo", html: cornell("Aula de Biologia") },
  ],
  Historia: [
    { id: "his-cornell", label: "Cornell", description: "Padrão para aulas teóricas", html: cornell("Aula de História") },
    { id: "his-timeline", label: "Linha do tempo", description: "Eventos em ordem cronológica", html: linhaTempo },
  ],
  Geografia: [
    { id: "geo-cornell", label: "Cornell", description: "Conceitos + análise espacial", html: cornell("Aula de Geografia") },
    { id: "geo-timeline", label: "Linha do tempo", description: "Processos históricos/ambientais", html: linhaTempo },
  ],
  Filosofia: [
    { id: "fil-cornell", label: "Cornell", description: "Filósofo, ideia central, crítica", html: cornell("Aula de Filosofia") },
  ],
  Sociologia: [
    { id: "soc-cornell", label: "Cornell", description: "Autor, conceito, exemplo atual", html: cornell("Aula de Sociologia") },
  ],
  Portugues: [
    { id: "por-cornell", label: "Cornell", description: "Regra + exemplos", html: cornell("Aula de Português") },
    { id: "por-redacao", label: "Estrutura de redação", description: "Tese, argumentos, proposta", html: redacao },
  ],
  Redacao: [
    { id: "red-estrutura", label: "Estrutura ENEM", description: "Tese + 2 argumentos + intervenção", html: redacao },
  ],
  Ingles: [
    { id: "ing-cornell", label: "Cornell", description: "Vocabulário + estrutura + exemplos", html: cornell("English class") },
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