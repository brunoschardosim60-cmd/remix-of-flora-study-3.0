# Roadmap: Redação + Análise + Cadernos

Você marcou as 4 frentes. Em vez de empilhar tudo num turno (alto risco de quebrar `flora-engine`, `essay-corrector` e o canvas dos cadernos), vou entregar em **fases curtas**, cada uma testável sozinha. Confirme a ordem e eu começo pela Fase 1.

---

## Fase 1 — Redação: evolução por competência (baixo risco)

**O que entrego**
- Card em `Redacao.tsx` com mini-gráfico de linha (Recharts) das últimas 5 redações corrigidas.
- 5 linhas (uma por competência 1–5), eixo Y 0–200, eixo X data.
- Indicador "↑ subindo / → estável / ↓ caindo" por competência (compara média das 2 últimas vs 3 anteriores).

**Onde mexe**
- `src/pages/Redacao.tsx` (ou `EssayEvolutionCard.tsx` que já existe — provavelmente só preencher).
- Query: `essays` filtrado por `status='corrigida'` ordenado por `corrected_at desc limit 5`.
- Zero migração, zero edge function.

---

## Fase 2 — Redação: banco de repertórios sugeridos pela Flora

**O que entrego**
- Antes de escrever, botão "Sugerir repertórios" no editor de redação.
- Chama edge function nova `essay-repertoires` (Lovable AI Gateway, gemini-flash).
- Retorna 6 sugestões agrupadas: filósofos, dados/estatísticas, citações, exemplos históricos, obras, leis.
- Cache em `content_cache` por `tema` normalizado (TTL 30 dias) — repertórios do mesmo tema não recustam.

**Onde mexe**
- Nova edge function `supabase/functions/essay-repertoires/index.ts`.
- Painel novo no `Redacao.tsx` (drawer lateral).
- Sem mudança em `essay-corrector`.

---

## Fase 3 — Análise: heatmap horário×dia + alertas proativos

**O que entrego**
- Em `Analise.tsx`: heatmap 7×24 (dias × horas) colorido pela média de acerto de quizzes/questões feitas naquele bucket.
- Card "Alertas" no topo: detecta quedas >10% por matéria nas últimas 2 semanas vs 2 anteriores.
- Computado client-side a partir de `question_attempts` + `study_sessions`.

**Onde mexe**
- `src/pages/Analise.tsx`.
- `src/lib/predictENEM.ts` ou novo `src/lib/heatmap.ts`.
- Zero backend novo.

---

## Fase 4a — Cadernos: busca full-text + flashcards/quiz do trecho

**O que entrego**
- Barra de busca no topo de `Notebooks.tsx`: busca em `notebook_pages.content` (ILIKE) + `ocr_cache.text` (já indexado).
- Resultado lista página + snippet com highlight + link para o caderno.
- No editor (`PremiumNotebookEditor`), seleção de texto mostra mini-toolbar com "Gerar flashcards do trecho" e "Gerar quiz do trecho" — reusa `flora-engine` actions passando só o texto selecionado.

**Onde mexe**
- `src/pages/Notebooks.tsx`, `src/components/notebook/PremiumNotebookEditor.tsx`.
- Sem mudança no `flora-engine` (só payload menor).

## Fase 4b — Cadernos: resumo automático + tags inteligentes + templates

**O que entrego**
- Botão "Resumir página" (já existe em `notebookPageActions.ts`!) — verificar se está exposto na UI.
- Ao salvar página com >300 chars: Flora sugere 3 tags via `flora-engine` action nova; usuário aceita/recusa.
- Templates por matéria: ao criar página, dropdown com `Cornell`, `Fluxograma`, `Fórmulas`, `Mapa mental`, `Blank` — pré-popula `content` HTML.

**Onde mexe**
- `src/components/notebook/PremiumNotebookEditor.tsx`.
- Templates como constantes em novo `src/lib/notebookTemplates.ts`.

---

## Itens que NÃO vão entrar nesse roadmap (e por quê)

- **Backlinks `[[tema]]`** — exige parser + índice reverso + reescrita do RichEditor. Turno dedicado.
- **Modo apresentação** — escopo grande (slides skill), turno dedicado.
- **Sincronia desenho ↔ texto OCR no canvas** — mexe no Konva canvas, alto risco, turno dedicado.
- **Modelos vencedores anotados** — precisa curadoria de redações nota 1000 reais com anotação manual; é trabalho editorial, não código.
- **Reescrita guiada** — depende de mudar prompt do `essay-corrector` e UI de marcação de trecho; turno próprio.

---

## Ordem sugerida

1. **Fase 1** (Redação evolução) — 1 turno, baixo risco, valor visível imediato.
2. **Fase 4a** (Cadernos busca + flashcards/quiz do trecho) — 1 turno, alto valor.
3. **Fase 3** (Análise heatmap + alertas) — 1 turno.
4. **Fase 4b** (Resumo + tags + templates) — 1 turno.
5. **Fase 2** (Repertórios Flora) — 1 turno, requer edge function nova.

Confirma a ordem ou ajusta, e eu começo pela primeira.
