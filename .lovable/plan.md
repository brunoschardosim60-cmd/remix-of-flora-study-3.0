# Caderno StudyFlow Premium — Plano em 5 Fases

Vou elevar o caderno ao nível Procreate/Notability + Notion AI, mantendo a identidade visual atual (Space Grotesk/Inter, temas existentes).

## Fase 1 — Desenho realista (começa agora)

**Libs novas**: `perfect-freehand` (3kb, vetor suavizado de verdade)

- Substituir o canvas atual por um **stroke engine** baseado em Pointer Events com `pressure`, `tiltX/Y` e `pointerType` reais (Apple Pencil, S-Pen, Wacom, mouse cai em pressão simulada por velocidade).
- 5 pincéis pro: **Caneta fina**, **Caneta gel**, **Marcador**, **Lápis 6B** (textura), **Marca-texto** (multiply blend).
- Traço vetorial via `perfect-freehand` → `<path>` SVG, não pixel — escala infinita, sem serrilhado.
- Borracha de verdade (vetorial, apaga stroke inteiro ou parcial).
- Undo/redo por stroke, não por bitmap.
- **Flora Vetor**: botão "Limpar desenho" → manda PNG do canvas pro `flora-engine` com Gemini vision → devolve SVG limpo (forma geométrica reconhecida). Salva ao lado do original.

## Fase 2 — Folha & layout impecáveis

- Textura de papel real (SVG noise sutil + sombra interna).
- 3 tipos: pautado, quadriculado, pontilhado, liso — com margem vermelha clássica.
- Sombra de profundidade (papel parece flutuar).
- Tipografia: opção **Caveat** (manuscrita) ou Inter (digital), leading 1.7, tracking ajustado.
- **Toolbar flutuante** que aparece on-hover e some no modo foco.
- Modo foco: só a folha, nada mais. Tecla `F`.

## Fase 3 — Página que dobra (page-flip)

**Lib**: `react-pageflip`

- Navegação entre páginas vira animação de virar folha de livro real.
- Funciona em mobile (swipe) e desktop (drag canto).
- Toggle: modo livro ↔ modo scroll.

## Fase 4 — Capa 3D + estante

- Capa do caderno com perspectiva CSS 3D (transform-style: preserve-3d), lombada visível.
- Página `/cadernos` vira **estante** com livros lado a lado, hover levanta.
- Capa gerada por IA (Gemini image) baseada no título + matéria.

## Fase 5 — Flora dentro da página (3 superpoderes)

1. **Ghost text autocomplete**: ao parar de digitar 800ms, Flora sugere continuação em cinza. `Tab` aceita, `Esc` ignora. Endpoint: `flora-engine action: "ghost_complete"`.
2. **Correção/reescrita por seleção**: seleciona trecho → bubble menu com "Corrigir ortografia", "Reescrever formal", "Reescrever simples", "Resumir".
3. **Flora vê o desenho**: botão "Explicar isto" no canvas → manda imagem pro Gemini vision → Flora explica o que está desenhado (fórmula, diagrama, mapa mental).

## Detalhes técnicos

- Nenhuma API externa paga — tudo via **Lovable AI Gateway** (Gemini vision já incluso).
- Libs novas totais: `perfect-freehand` (Fase 1), `react-pageflip` (Fase 3). ~15kb gzip somados.
- Mantém schema do banco atual (`notebook_pages.content`, `canvas_data`). Stroke vetorial guardado como JSON dentro de `canvas_data`.
- Migração suave: páginas antigas (canvas raster) continuam abrindo em modo legado.
- Edge function `flora-engine` ganha 2 ações novas: `ghost_complete` e `vectorize_drawing`.

## Ordem de entrega

Implemento **Fase 1 completa agora**. Após validar, sigo Fase 2 → 3 → 4 → 5. Cada fase é independente e não quebra o que já existe.
