# Desmontagem nativa do esqueleto

Substitui a integração externa descrita em `2026-09-09-skull-and-review.md`: o crânio Sketchfab foi retirado da interface a pedido do usuário, antes de ser publicado.

## Implementado

- Corpo 3D → Esqueleto: acesso direto a Abrir crânio por ossos, Desmontar esqueleto, Separação e Remontar.
- Expansão rígida por estrutura, em geometria derivada: preserva os vértices originais e não aumenta o número de draw calls por osso.
- Cavidades frontais/esfenoidais e células etmoidais acompanham o osso correspondente.
- Clique numa peça mantém o contexto do crânio. Isolamento explícito continua disponível; Remontar crânio recupera o conjunto.
- Catálogo completo acessível durante a desmontagem mesmo no nível iniciante. Ossículos da audição incluídos no recorte craniano.
- Nomenclatura explícita em português para todas as entradas esqueléticas do GLB atual, incluindo dentes/cartilagens/cavidades, sem classificá-los nos rótulos como ossos adicionais. Lateralidade preserva os sufixos de origem.

## Verificação

- Teste percorre o GLB real e exige tradução explícita para toda entrada marcada como bone pelo fornecedor.
- Teste geométrico verifica expansão, transformação rígida, agrupamento de cavidades e preservação da fonte.
- Regressão da interface cobre expansão/remontagem craniana e do corpo.
- Suíte completa: 459 testes aprovados. Build aprovado.
- Navegador integrado: crânio aberto e remontado conferidos visualmente em tela ampliada; controles conferidos em largura estreita.
- Chrome teve timeout na captura de tela; não se afirma desempenho comprovado nesse navegador ou em hardware móvel.

## Limitações honestas

- Expansão didática por posição, não simulação de articulações ou dissecação. Pode haver sobreposição de peças próximas em certos ângulos; usar rotação e seleção/isolamento.
- Os nomes refletem as estruturas fornecidas no arquivo; isso não certifica completude de todos os ossos/dentes humanos nem substitui revisão anatômica especializada.
- Referência consultada: https://openstax.org/books/anatomy-and-physiology-2e/pages/7-2-the-skull
- Persistem as pendências gerais registradas no relatório anterior: offline completo, conciliação avançada, testes físicos e sincronização real de produção.
