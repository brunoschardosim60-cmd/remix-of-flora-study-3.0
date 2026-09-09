# Crânio externo e primeira etapa da revisão

## Crânio solicitado

- Modelo: Visible Interactive Human – Exploding skull, WitmerLab at Ohio University; modelagem Ryan Ridgely.
- Fonte: https://sketchfab.com/3d-models/visible-interactive-human-exploding-skull-252887e2e755427c90d9e3d0c6d3025f
- Em 9/9/2026, a página ofereceu o botão Embed e o iframe oficial usado nesta implementação.
- Documentação: https://help.sketchfab.com/en/articles/16152735-embedding-your-3d-models
- Licença do arquivo: CC BY-NC-ND 4.0. Nenhum arquivo copiado, adaptado ou redistribuído. Importação nativa/comercial continua dependendo de autorização compatível.
- Biblioteca mantém o visualizador externo separado das peças nativas, fora da contagem de arquivos locais.
- Carregamento explícito; fechar/descarregar desmonta o iframe. Sem carregamento antecipado da biblioteca.
- Instruções em português identificam rotação, zoom, animação, linha do tempo, configurações e tela cheia. Controles internos continuam sob responsabilidade do Sketchfab.

## Validação realizada

- Suíte completa: 69 arquivos, 453 testes aprovados antes da inclusão de três testes de apresentação da Flora.
- Build de produção aprovado. Avisos existentes de bundles grandes, Browserslist antigo e imports dinâmicos ineficazes permanecem.
- Fluxo local da biblioteca, filtro por crânio, abertura do diálogo e capa do visualizador conferidos no navegador integrado em largura estreita.
- Ainda não comprovados: animação 3D em execução, FPS do crânio em aparelhos físicos e integração publicada.

## Correções incluídas

- Caderno: escrita condicionada à versão lida do servidor, preservação de rascunhos em conflitos, aviso de erro e exportação existente. Filas legadas sem versão não sobrescrevem o servidor.
- Flora: elimina uso de duração persistida entre sessões como se fosse estudo contínuo; categorias legíveis; alerta histórico inconsistente sinalizado; falhas de consulta não viram painel vazio.
- Dashboard: contagem canônica de revisões pendentes repassada à recomendação.
- Metas: aba Estudo passa a respeitar o parâmetro da rota.
- Biblioteca: modelos médicos recolhidos para quem já possui notas; identidade genérica de cadernos mantida.
- Análise: mapa de horários usa sessões filtradas; índice heurístico não se apresenta como TRI ou média nacional.
- Redação: remove intervalo fixo de palavras e bloqueio por linhas digitais estimadas.
- Filtros de questões e botão de fechar janela receberam nomes acessíveis em português.

## Revisão geral ainda pendente

- Caderno totalmente offline, interface completa de reconciliação entre dispositivos, validação com caneta física/rejeição de palma.
- Teste autenticado de salvamento e reabertura em produção, incluindo concorrência real no Supabase.
- Revisão de conteúdo/OCR de questões, ampliação de casos médicos e avaliação anatômica especializada.
- Multiplayer e reconexão do Quiz Battle; auditoria sistemática de acessibilidade e de todos os botões.
- Comparativos reais de desempenho em celular e tablet. Não afirmar que toda a revisão foi concluída.
