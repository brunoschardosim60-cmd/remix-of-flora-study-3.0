## Objetivo

Implementar duas frentes em paralelo:

**A) Dashboard vivo** — visão analítica viva do aluno: mapa de calor por matéria, evolução temporal, pontos fracos detectados pela Flora. Reutiliza componentes/estilo já existentes (sem mudar layout/cores).

**B) Pré-cache inteligente de conteúdo** — popular `content_cache` com aulas, blocos, imagens didáticas e questões reais (ENEM / concurso) para reduzir custo de tokens nas próximas aulas.

---

## Parte A — Dashboard vivo

### 1. Página `/analise` (já existe `src/pages/Analise.tsx`) — adicionar 3 widgets

**1.1 Mapa de calor por matéria (`SubjectHeatmap.tsx`)**
- Grid: linhas = matérias do aluno, colunas = últimos 14 dias.
- Cor da célula deriva de tempo estudado + acertos do dia (HSL via tokens existentes: `--primary` com alpha variável, sem cor nova).
- Fonte de dados: `study_sessions` (duração) + `question_attempts` + `concurso_question_attempts` (acertos) + `study_topics.quiz_last_score`.
- Cálculo client-side com `useStudyDashboard` estendido.

**1.2 Linha de evolução (`EvolutionChart.tsx`)**
- Gráfico recharts (já no projeto) — 2 linhas: horas/dia e % acerto (média móvel 7d).
- Período: últimos 30 dias.

**1.3 Pontos fracos da Flora (`WeakSpotsCard.tsx`)**
- Lê `student_performance` ordenado por `prioridade desc` + `accuracy asc` (top 5).
- Cada item: matéria · tema · accuracy · botão "Estudar agora" (chama `floraStudyNow` com tema fixo) e "Gerar quiz de reforço".
- Se `student_performance` estiver vazio, faz fallback agregando `quiz_errors` de `study_topics`.

### 2. Hook `useDashboardLive.ts`
- Centraliza queries (uma chamada por widget, com cache em memória 60s).
- Retorna `{ heatmap, evolution, weakSpots, loading, error }`.

### 3. Integração na página `Analise.tsx`
- Adiciona seção "Dashboard vivo" no topo, antes do conteúdo atual.
- Mantém layout/grid existente (Tailwind tokens).

---

## Parte B — Pré-cache inteligente

### 1. Estender `seed-content-cache` (já existe)
Adicionar 3 modos novos ao endpoint:

**1.1 `mode: "blocks"`** — gera blocos individuais (não apenas aulas inteiras), cada bloco salvo com `cache_key` no formato `block:materia:tema:idx:total:mode`. Aproveita o mesmo skeleton de `flora-engine` `generate_lesson_block`. Reduz custo quando aluno pula blocos.

**1.2 `mode: "questions"`** — para cada `(materia, tema)` popular, busca em `questions` (ENEM) e `concurso_questions` (concurso) até 5 questões reais por tema e salva em `content_cache` como `tipo: "questions"`, `payload: { questions: [...] }`. Usado como exercício final em vez de gerar via IA.

**1.3 `mode: "images"`** — detecta conceitos visuais por tema (lista curada: "DNA", "mitose", "célula animal", "função quadrática gráfico", "circuito elétrico", etc.) e chama `flora-images` para pré-gerar. Salva URL em `content_cache` `tipo: "image"`, `cache_key: image:concept-slug`.

### 2. Painel admin (`AdminCachePanel.tsx`)
Adicionar 3 botões além de Rápida/Completa/Masterclass:
- "Popular blocos" (modo `blocks`)
- "Popular questões reais" (modo `questions`) — mostra contagem de questões disponíveis por matéria antes
- "Popular imagens didáticas" (modo `images`) — preview da lista de conceitos

### 3. Integração com geração de aula
- `flora-engine` `generate_lesson_block`: antes de chamar IA para `exercicio`, procura em `content_cache` `tipo: "questions"` com `materia`+`tema`. Se achar ≥1, usa questão real (transforma para o formato do bloco). Cai pra IA só se não houver.
- `flora-engine` `generate_lesson_block`: para `imagem_didatica`, procura `content_cache` `tipo: "image"` por slug do conceito antes de chamar `flora-images`.

### 4. Lookup helpers (`flora-engine/index.ts`)
- `findCachedQuestion(supabase, materia, tema)`
- `findCachedImage(supabase, concept)`

---

## Detalhes técnicos

**Banco**: nenhuma migration nova; reusa `content_cache` (já tem `tipo`, `payload`, `cache_key`).

**Cache key convention**:
- Aula completa: `k:lesson|materia:..|tema:..|level:..|style:..|mode:..` (já existe)
- Bloco: `k:block|materia:..|tema:..|idx:..|total:..|mode:..` (novo)
- Questões: `k:questions|materia:..|tema:..` (novo)
- Imagem: `k:image|concept:..` (novo)

**Token saving**: aula com 5 blocos hoje custa ~12-15k tokens. Com cache de blocos + questões reais + imagens pré-geradas, primeira execução popula; execuções subsequentes do mesmo tema custam <2k tokens (apenas personalização da Flora no comentário inicial).

**Imagens**: orçamento controlado — máx. 30 imagens por execução do modo `images`, lista curada hardcoded em `seed-content-cache`.

**Questões**: usa `questions` para ENEM e `concurso_questions` para concurso, mapeando matéria/tema com normalização (já existe helper `normCacheStr`).

---

## Arquivos a criar/editar

**Criar:**
- `src/hooks/useDashboardLive.ts`
- `src/components/dashboard/SubjectHeatmap.tsx`
- `src/components/dashboard/EvolutionChart.tsx`
- `src/components/dashboard/WeakSpotsCard.tsx`

**Editar:**
- `src/pages/Analise.tsx` (adicionar seção Dashboard vivo)
- `src/components/AdminCachePanel.tsx` (3 botões novos)
- `supabase/functions/seed-content-cache/index.ts` (modos blocks/questions/images)
- `supabase/functions/flora-engine/index.ts` (lookup de questão real e imagem cacheada antes de gerar)

Sem mudanças de schema. Sem mudanças de design/cores.

---

## Ordem de execução

1. Parte A completa (dashboard vivo) — entregável visível ao aluno.
2. Parte B backend (seed estendido + lookups no flora-engine).
3. Parte B admin UI (botões no painel).
4. Deploy de `seed-content-cache` e `flora-engine`.
5. Rodar seed manual de `questions` + `images` para os 25 tópicos populares já listados.
