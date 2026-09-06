# Biblioteca de peças e interação 3D — 6 de setembro de 2026

## Entregue nesta revisão

- Biblioteca pesquisável com **34 entradas** de órgãos, ossos/articulações e músculos.
  Distingue peças dedicadas de subconjuntos extraídos das malhas existentes.
- Crânio, cintura escapular, mãos, pelve, pés e grupos musculares são isolados
  por identidade das estruturas. Não são cortados por uma caixa espacial nem
  substituídos por formas geométricas. A extração compacta preserva a fonte.
- Pâncreas HRA (5 malhas) e intestino grosso HRA (10 malhas), 1.10 MB combinados,
  adicionados com CC BY 4.0, créditos e hashes. Referências, limitações e alternativas:
  `2026-09-06-part-model-options.md` e `public/medicine/models/ATTRIBUTION.md`.
- Órgãos HRA isolados carregam diretamente seu arquivo, sem pré-carregar as
  vísceras de corpo inteiro e os suplementos não relacionados.
- Segmentos HRA podem ser isolados; “Reunir peça” restaura o órgão. Nomes dos
  novos segmentos em português; fonte/licença e roteiro de exploração na interface.
- Câmera enquadra a geometria segundo o formato da área de visualização.
  Atualizações do tooltip não reiniciam a câmera. Erro de um modelo pode ser
  recuperado escolhendo outra peça, sem recriar o canvas a cada seleção normal.
- Picking BVH preserva IDs e índices, respeita visibilidade/corte e pausa o hover
  durante arraste. Hover amostrado a 10 Hz; opção reversível “Priorizar fluidez”.
- IDs de malhas densas usam fonte/nome, não posição no array. Trocar HD/economia
  substitui o catálogo ativo e reconcilia a seleção, evitando apontar outra peça.
- A superfície distingue pele, cabelos/sobrancelhas/cílios, detalhes labiais e
  unhas pelos nomes anatômicos originais, em quatro lotes de renderização.
  Tom cutâneo menos alaranjado; variação contínua e simétrica entre os lados,
  sem deslocar vértices faciais nem recolorir o rosto ao selecioná-lo.
- Olhos alinhados derivados do próprio Z-Anatomy: 65.224 bytes, 8 malhas
  originais em quatro lotes. Escleras, íris, córneas translúcidas e interior
  ocular usam acabamentos próprios, sem carregar o pacote nervoso inteiro.
  Geometria e transformações originais preservadas; script reprodutível e
  atribuição CC BY-SA 4.0 incluídos. Visíveis na vista exclusiva da superfície
  para não duplicar olhos quando o sistema nervoso estiver composto.

## Verificação

- TypeScript e lint dos arquivos de implementação alterados sem erros.
- **407 testes / 63 arquivos passaram**, execução `vitest run --maxWorkers=2`.
  Um teste anterior de integridade de imagens excedeu 5 s na execução totalmente
  paralela durante a QA WebGL; passou com concorrência limitada, sem alterar o teste.
- Build de produção passou. Warnings de chunks grandes/imports dinâmicos já
  existentes permanecem; nenhuma promessa de que o bundle inteiro está otimizado.
- QA visual local: crânio isolado, pâncreas inteiro, intestino grosso e cólon
  transverso isolado, mãos/punhos e deltoides; controles, catálogo e fonte
  observados na interface. Troca de qualidade preservou o deltoide selecionado.
  A verificação visual encontrou a convenção Z-Anatomy “finger of foot”:
  adicionado teste de regressão e exclusão explícita para não misturar pés e mãos.
- QA visual da pele: rosto de frente e em rotação, materiais diferenciados e
  olhos alinhados; troca entre acabamento de tecidos/didático e fundo escuro/claro.
  Não foi feita medição de FPS. Testes verificam lotes, simetria de cor,
  imutabilidade da fonte, reflexão, transparência ocular e bytes Draco originais.
- Benchmark reproduzível: `node --experimental-strip-types scripts/qa/anatomy-picking-benchmark.ts`.
  261.120 triângulos / 180 raios: nativo **2.419,26 ms**, BVH **1,89 ms**;
  preparação BVH **103,60 ms**; mesmas interseções e IDs. É um teste sintético
  de busca CPU, **não FPS do navegador nem velocidade de carregamento**.

## Limites

Esta entrega não transforma modelos segmentados em fotogrametria. A superfície
externa atual continua sem textura fotográfica; não foi trocada por um corpo
premium. Não houve compra, implementação SciePro/BioDigital, validação clínica,
medição de FPS móvel ou alegação de que toda a Medicina está concluída.
As verificações descritas são locais. Publicação Git e eventual estado do deploy
são confirmados separadamente; sucesso do build local não comprova deploy ativo.
