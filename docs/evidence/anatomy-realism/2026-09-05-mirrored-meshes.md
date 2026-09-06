# Atlas 3D: orientação das malhas e vistas de estudo

## Causa da divisão claro/escuro

As peças espelhadas usam matrizes com determinante negativo. Ao incorporar essas
matrizes nos vértices e juntar as peças, o renderizador perdia a informação do
espelhamento. A ordem dos triângulos permanecia invertida em relação às normais;
materiais de dupla face então iluminavam incorretamente o lado espelhado.

`bakeAnatomyGeometry` preserva a geometria original e inverte a ordem dos
triângulos apenas para transformações refletidas. Também corrige a orientação dos
tangentes e mantém os atributos associados aos vértices. Não achata nem deforma
a linha mediana do corpo.

Auditoria dos arquivos locais com `scripts/audit-anatomy-transforms.mjs`:

| Arquivo | Peças | Espelhadas | Texturas incorporadas |
| --- | ---: | ---: | ---: |
| zanatomy-surface-hd-v2.glb | 256 | 127 | 0 |
| zanatomy-musculoskeletal-hd-v2.glb | 960 | 458 | 0 |
| vayu-zanatomy-muscular-v1.glb | 691 | 343 | 0 |
| vayu-zanatomy-skeletal-v1.glb | 1379 | 632 | 0 |
| zanatomy-organs-hd-v2.glb | 116 | 13 | 0 |

## Revisão

- Microrelevo procedural mais discreto; mapa de rugosidade deixa de polir os tecidos.
- Transmissão óptica desativada nos materiais opacos, evitando passe adicional de renderização.
- Iluminação de ambiente simétrica; fundo claro/escuro independente do acabamento.
- Biblioteca com 15 vistas reutilizando os assets existentes: seis sistemas,
  quatro pares de sistemas e cinco órgãos em detalhe.
- Trocar a vista limpa corte, separação, foco e opacidades anteriores. O índice
  respeita as camadas visíveis. O atalho de órgãos usa a seleção solicitada.
- Cabeçalho compacto e área 3D dimensionada para notebook; conteúdo integrado
  de Medicina permanece disponível em uma seção recolhível.

## Verificação

- Testes de geometria: malhas indexadas/não indexadas, reflexões combinadas,
  tangentes, UVs e preservação da malha de origem.
- Testes de navegação: mistura de camadas, limpeza de cortes, seleção de rins,
  retorno ao sistema muscular e independência entre fundo e material.
- Conferência no navegador local: pele, músculos, músculos + esqueleto, rins e coração.
- Suite completa: 312 testes aprovados; build de produção, TypeScript e lint
  dos arquivos alterados verificados.
- Página de QA apenas de desenvolvimento: `/scripts/qa/anatomy.html`.

## Limites

Esta revisão não substitui as malhas nem adiciona espécimes novos. Os arquivos
auditados não contêm texturas fotográficas. Os materiais são ilustrativos e não
devem ser apresentados como fotorealismo ou variação individual validada.
Não houve benchmark de FPS em aparelhos móveis nem validação desta revisão no
deploy público.
