# Caderno Flora — consolidação

## Implementado

- Fila de salvamento separada por usuário, persistida antes do temporizador de envio.
- Confirmação de gravação exige a página retornada pelo servidor. Um envio antigo não remove uma revisão mais nova da fila.
- Recuperação de rascunhos ao abrir o caderno, incluindo migração de páginas legadas com propriedade confirmada.
- Distinção entre sincronizado, salvo neste dispositivo e erro de armazenamento; cópia em memória e aviso ao fechar quando o armazenamento falha.
- Cabeçalho compacto, barra compartilhada de texto/desenho, páginas recolhidas por padrão e foco sem remontar o editor.
- Última página por conta/caderno; posição de leitura por página na sessão; zoom interno por roda com Ctrl e gesto de dois dedos.
- Toque para rolar por padrão no desenho; opção explícita de desenhar com o dedo. Pressão de caneta ainda precisa de validação em hardware.
- Tabelas editáveis e preservação dos modelos médicos; painel contextual da Flora com modelos por matéria e ações existentes de resumo, quiz e revisão.
- Correção de importação de PDF (sombreamento de `document`) e liberação do documento em caso de falha.
- Rotação da imagem reserva o espaço correto; redimensionamento considera a escala da folha; alça só aparece na seleção; remoção de sombras decorativas.
- Atlas: retirada do achatamento sagital que deformava o rosto; atualizações de destaque, materiais e opacidade das camadas densas separadas.
- Correções de tipos e propriedades entre componentes de Medicina, inclusive eventos de hover de órgãos detalhados.

## Validação

- Build de produção e TypeScript sem erros.
- Testes de fila: confirmação, falha, revisões concorrentes, isolamento de contas, armazenamento cheio e migração.
- Testes de autosave: troca de página antes do debounce, offline/reconexão e recusa do servidor.
- Testes do editor: tabelas médicas, barra compartilhada e alternância texto/desenho.
- Testes de PDF: renderização e limpeza após erro.
- Conferência manual na fixture local: rolagem, desenho/desfazer, rotação e recorte de imagem. Sem modificar cadernos reais.
- Fixture somente para Vite em desenvolvimento: `/scripts/qa/notebook.html`; não é rota do produto e não grava no servidor. Alguns comandos periféricos são intencionalmente inertes nessa fixture.

## Limites e próximos critérios

- Não é uma declaração de equivalência/superioridade ao Samsung Notes. Caneta física, rejeição de palma, telas pequenas e gestos precisam de uma matriz de dispositivos.
- A fila não implementa resolução de conflitos entre dispositivos ou abas, nem abertura completa de um caderno sem conexão. Evoluir para armazenamento local transacional e histórico persistente no servidor.
- O histórico local continua complementar e limitado pelo armazenamento do navegador.
- A correção visual não remove fundos incorporados aos arquivos de imagem. A transparência depende do asset.
- O atlas conserva os modelos existentes. A costura original e a qualidade da pele requerem revisão do asset, com licença e alinhamento entre sistemas verificados. Não mascarar problemas de geometria com achatamento.
- A melhora no caminho de atualização do atlas não substitui medir FPS, tempo de carga e memória com todas as camadas. Identificação individual na composição densa ainda tem limitações.
- Gravação autenticada, geração da Flora e deploy de produção precisam de validação no serviço real; testes locais não comprovam permissões/migrations do Supabase.
