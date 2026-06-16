# Plano: Correções + Flora 360°

Vou executar em 4 etapas (uma por mensagem) para você validar entre elas. Confirma para eu começar pela Etapa 1.

---

## Etapa 1 — Bugs críticos (entrego primeiro)

**1.1 — "Não consigo criar aulas" (`lesson-on-demand` + Aulão)**
- Adicionar fallback de modelo: tenta `gemini-2.5-pro` → se falhar com timeout/5xx tenta `gemini-2.5-flash` (mais rápido e estável).
- Sanitizar JSON da IA (remover code-fences ` ```json `, vírgulas finais) antes de `JSON.parse`.
- Timeout cliente de 45s com mensagem clara em vez de spinner infinito.
- Mostrar mensagem técnica real ao usuário (status HTTP) em vez de "erro inesperado".

**1.2 — "Buscar por Assunto só carrega" (`/aulao` modo search)**
- `handleSearch` hoje invoca `flora-engine/semantic_search`. Adicionar:
  - `AbortController` com timeout de 12s.
  - Empty state com botão "Pedir pra Flora gerar um resumo" (fallback que sempre funciona).
  - Tratamento de erro do `.or()` quando o usuário digita vírgula/aspas (escape).
- Telemetria: logar query + nº de resultados em `user_actions`.

**1.3 — Identificação de erros de escrita global**
- Criar `src/lib/textCorrector.ts` que envolve qualquer `<input>`/`<textarea>` de busca com correção ortográfica leve (lista PT-BR comum: "geografía"→"geografia", "matematica"→"matemática", etc.) usando dicionário local + acentuação. Sem custo de IA.
- Aplicar nos campos: busca do `/aulao`, busca do `/aulas`, busca da Flora, busca do Banco.

---

## Etapa 2 — Tutor de Redação → Autocomplete

**Remover** o `EssayTutorMode` atual (duplica `/redacao` corretor). **Substituir** por:

**2.1 — `EssayAutocomplete.tsx`** (novo)
- Editor com sugestão fantasma (cinza) da próxima frase enquanto o aluno escreve (estilo GitHub Copilot).
- Tecla `Tab` aceita, `Esc` recusa.
- Debounce 1.2s, mínimo 15 palavras antes de sugerir.
- Limite 12 sugestões por redação (controle de custo).
- Edge function `essay-autocomplete` nova: recebe `{theme, currentText}`, retorna `{suggestion: "..."}` (1 frase, máx 25 palavras). Modelo `gemini-2.5-flash`.

**2.2 — Templates de redação**
- Página `/redacao/templates` (já existe) ganha 2 abas:
  - **"Esqueletos"**: estrutura pré-preenchida com `[contextualização]`, `[tese]`, `[argumento 1]`, etc. que o aluno completa.
  - **"Exemplos nota 1000"**: biblioteca de 8 redações reais comentadas (seed inicial via Flora — gero 1x e cacheio).

**2.3 — Atalho no Aulão**
- Botão "Começar redação" passa a abrir `/redacao` com `?mode=autocomplete&theme=...` em vez do tutor inline.

---

## Etapa 3 — Flora onisciente (telemetria 360°)

Garantir que **toda** ação relevante grava em `user_actions` + alimenta `flora_decisions` para a Flora ler depois.

**3.1 — Hook global `useFloraTelemetry`**
- Wrappar pontos cegos atuais:
  - Quiz: erro/acerto por questão (hoje só salva agregado).
  - Redação: cada submit + nota por competência.
  - Caderno: imagem inserida, OCR rodado, tempo na página.
  - Aulas: bloco lido, exercício final respondido, tempo total.
  - Foco: sessões + interrupções.
- Cada evento: `{action, materia, topic_id, metadata: {detail}}`.

**3.2 — `flora-engine` ganha contexto enriquecido**
- `getStudentContext` passa a incluir últimos 30 eventos de `user_actions` resumidos.
- Sistema prompt da Flora referencia: "Hoje o aluno errou X em Y", "Acabou de escrever sobre Z", "Está com dificuldade em W há 3 dias".

**3.3 — Painel `/eu/flora-sabe`** (opcional, debug)
- Mostra ao aluno o que a Flora "sabe" dele. Transparência + confiança.

---

## Etapa 4 — Revisão didática de aulas + mídia

**4.1 — Auditoria prompt-a-prompt** dos 3 geradores de aula:
- `lesson-on-demand`, `generate-saved-lesson`, `generate_lesson_block` no flora-engine.
- Garantir em TODOS: introdução com gancho real, 2 analogias do cotidiano por bloco, 1 exemplo resolvido passo a passo, 1 pegadinha típica de prova, 1 macete mnemônico, glossário final.

**4.2 — Imagens automáticas por bloco**
- Cada bloco gerado dispara `flora-images` em background (não-bloqueante) com prompt do título do bloco. Salva URL em `payload.blocos[i].image_url`.
- Reusa cache do Pixabay/Pexels (já tem chaves).

**4.3 — Vídeos sugeridos por bloco**
- `lesson-on-demand` enriquece cada bloco com `youtube_query` (3-5 palavras) → frontend renderiza link "Ver no YouTube".

**4.4 — Modo "ultra didático"** (toggle no player)
- Quando ativo: cada parágrafo é dividido em frases curtas + emoji âncora + reading-time. Bom pra TDAH/iniciantes.

---

## Detalhes técnicos

- Sem mudanças de schema novas na Etapa 1. Etapa 3 só adiciona linhas em tabelas existentes (`user_actions`).
- Etapa 2 cria 1 edge function (`essay-autocomplete`).
- Etapa 4 reusa `flora-images` e `content_cache` existentes.
- Sem mudanças visuais no layout (memória `no-design-changes` respeitada).
- Custo IA estimado: Etapa 2 ~$0.001/sugestão, Etapa 4 imagens em batch ~$0.50 pra repopular toda biblioteca.

**Posso começar pela Etapa 1?**
