# Vista ilustrada — adaptação local

- Referência visual indicada pelo usuário: Male Anatomy — medical model, Novaky, https://sketchfab.com/3d-models/male-anatomy-medical-model-4f706245d70a49c99bafb48e04b965e0. Nenhum arquivo, textura ou geometria dessa obra foi copiado ou incorporado.
- Novo botão Vista ilustrada: cinco sistemas registrados na posição anatômica original. Pele a 40% de opacidade e músculos opacos compartilham o plano central X=0; ossos, órgãos e vasos não recebem esses planos. Nervos não são carregados nesse preset.
- Revisão solicitada pelo usuário: removido o deslocamento lateral de 0,28 da pele. Controle de opacidade entre 10% e 80%, preservado ao ocultar/mostrar. Pele translúcida não grava profundidade sobre os tecidos internos. Nove testes focados passaram novamente; conferida a aparência em desktop e viewport móvel sem transbordamento lateral.
- Fundo Estúdio sem grade, preenchimento luminoso maior, controles compactos e painéis recolhidos; detalhes e pele podem ser alternados. No celular, Mostrar detalhes revela também os controles secundários.
- Sair, trocar de sistema, aplicar presets ou separar camadas desativa os recortes ilustrativos. O modo é identificado como apresentação visual, não corte clínico nem novo espécime.
- Corrigida a invalidação do renderer sob demanda após mudanças imperativas nos materiais e planos: o recorte não deve depender de um gesto posterior na câmera para aparecer.
- Geometria, pose e fontes do atlas preservadas. A versão não é idêntica à referência e não é fotorealista. Não implementa dissecção física, novas texturas anatômicas nem pose em T.
- Validação: 12 testes focados passaram; TypeScript, ESLint dos arquivos alterados e build conferidos. QA de composição em 1280×900 e viewport móvel de 390×844, com uma cena canvas; não é medição de FPS nem teste em GPU móvel física.
- Entrega para comparação local, sem push/deploy nesta etapa.

## Refinamento de enquadramento e acabamento

- Corrigido o conflito entre a altura fixa do workspace e a altura mínima do canvas. O modo focado usa uma única linha de grid, inclusive no celular; detalhes expandidos mantêm altura útil própria. Na conferência móvel: viewport 390 px, página 375 px, cena e canvas com a mesma altura de 447 px; expandir detalhes manteve a cena em 480 px.
- Câmera da figura inteira calculada a partir do aspecto do canvas, FOV de 36° e envelope conservador de 4,2 × 8,7 × 2,1. O envelope não é uma medição dinâmica dos GLBs. Frente e costas usam alvo sem inclinação vertical nessa apresentação.
- Materiais de tecido e DPR até 1,45 ficam disponíveis na composição ilustrada em perfis balanced/ultra; o perfil economy e Priorizar fluidez mantêm o caminho leve. Não foi feita nova medição de FPS/GPU.
- Pele translúcida renderiza apenas a face externa; cabelo é omitido na apresentação ilustrada e restaurado ao sair. Olho registrado aparece na metade preservada. Nenhuma nova geometria ou textura anatômica foi criada.
- Fundo de estúdio em gradiente CSS, sem imagem externa; fundo do WebGL transparente somente quando não há cor opaca de cenário. Controles secundários recolhidos para ampliar a leitura do corpo.
- Selecionar estrutura preserva a orientação ilustrada; Recentrar volta à Frente mantendo a opacidade. Isolar uma estrutura desativa a ilustração e seus recortes antes de aproximar a peça.
- Validação final deste refinamento: 37 testes focados passaram (26 de enquadramento, 2 do preset e 9 de navegação); build de produção passou. Conferência visual local em desktop e viewport móvel, sem publicação e sem alegação de fotorealismo ou desempenho em dispositivo físico.
