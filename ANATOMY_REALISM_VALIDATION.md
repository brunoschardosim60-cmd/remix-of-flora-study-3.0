# Validação final — anatomia 3D realista

Data: 29 de agosto de 2026  
Branch: `codex/full-human-anatomy-atlas`

## Escopo entregue

O modo realista deixou de ser um atalho exclusivo para o coração e passou a ser uma dimensão visual independente do sistema anatômico. Ele permanece ativo ao alternar entre corpo integrado, superfície, músculos, esqueleto, vasos, nervos e órgãos.

Foram implementados perfis PBR distintos para pele, músculo, tendão/aponeurose, osso, artéria, veia, nervo, miocárdio, pulmão, fígado, rim, encéfalo, mucosa, tecido adiposo e vísceras. Cada perfil combina albedo, microrelevo, roughness, resposta especular, sheen e clearcoat sem alterar a geometria científica nem inventar estruturas anatômicas.

## Comparação visual

As capturas equivalentes estão em:

- `docs/evidence/anatomy-realism/before/body-full.png` e `after/body-full-final.png`;
- `before/muscles.png` e `after/muscles.png`;
- `before/skeleton.png` e `after/skeleton.png`;
- `before/heart.png` e `after/heart.png`;
- `before/brain.png` e `after/brain.png`.

Evidências adicionais: `after/vascular.png`, `after/nervous.png`, `after/heart-section.png`, `after/mobile-muscles-390x844.png`, `after/mobile-nervous-390x844.png`, `after/tablet-skeleton-768x1024.png` e `after/tablet-body-full-768x1024.png`.

## Resultado por sistema

| Sistema | Resultado |
|---|---|
| Corpo integrado | todas as camadas preservadas; aparência realista pode permanecer ligada durante a troca de sistema |
| Superfície | pele menos uniforme, com microvariação fosca e iluminação neutra |
| Músculos | vermelho biológico mais profundo, microfibras sutis e tendões/aponeuroses diferenciados sem esconder o ventre muscular |
| Esqueleto | osso seco e irregular, sem brilho de porcelana |
| Vasos | vertex colors vermelho/azul preservadas, com roughness e microrelevo PBR |
| Nervos | rede central e periférica preservada, acabamento fibroso e maior separação do fundo |
| Órgãos | materiais próprios por tecido; coração externo e interior HRA, encéfalo, pulmões, fígado e rins mantêm segmentação e seleção |

## Responsividade e interações

| Viewport | Resultado |
|---|---|
| 390 × 844 | sem overflow horizontal; canvas 349 × 520; controles principais com 44 px de altura |
| 768 × 1024 | sem overflow horizontal; canvas 727 × 520; botão voltar 44 × 44 |
| 1366 × 768 | sem overflow horizontal; canvas 563 × 635; índice, canvas e detalhe acessíveis |

Testes manuais concluídos: troca de todos os sistemas, rotação automática, vistas frente/costas/laterais, zoom 135% → 150%, recentralização, estrutura anterior/próxima, isolamento, corte por plano, transparência/interior e tela cheia. Arrasto e roda do mouse foram verificados no canvas; em viewport móvel, o canvas mantém gesto vertical da página e os controles permanecem acessíveis. Uma sessão nova do navegador abriu sem erro de console.

## Política de desempenho e fallback

| Tier | Uso típico | Textura procedural | DPR máximo | Sombra | Environment |
|---|---|---:|---:|---:|---:|
| Economy | celular, memória ≤ 4 GB ou tablet restrito | 64 px | 1,10 | 512 | 64 |
| Balanced | tablet/notebook ou CPU restrita | 128 px | 1,45 | 1024 | 64 |
| Ultra | desktop amplo | 256 px | 1,80 | 2048 | 128 |

O carregamento continua progressivo por sistema. O pulmão HRA de 22,18 MB, o encéfalo HRA e os demais órgãos detalhados só entram quando solicitados. Se um órgão HRA falhar, o modelo contextual Z-Anatomy continua disponível. Não foi usado um GLB simplificado como LOD geométrico porque os arquivos antigos são maiores, menos segmentados e cientificamente inferiores; o LOD aplicado reduz custo de material, DPR, sombra e environment sem remover estruturas.

## Verificações automatizadas

- `npm test -- --run`: **41 arquivos e 265 testes aprovados**;
- `npm run build`: **aprovado**, 4.167 módulos transformados e bundle produzido;
- `npx eslint` nos cinco arquivos TypeScript alterados/criados: **aprovado**;
- `npm run lint`: continua falhando por **507 erros e 42 avisos preexistentes** distribuídos pelo projeto, fora do escopo; nenhum erro pertence aos arquivos desta entrega;
- `git diff --check`: **aprovado**;
- TypeScript (`npx tsc --noEmit`): **aprovado**.

## Integridade científica e de assets

Nenhum arquivo `public/medicine/**/*.png`, `*.jpg`, `*.jpeg`, `*.webp`, `*.glb` ou `ATTRIBUTION.md` foi modificado. Nenhum asset externo foi incorporado. A mudança atua somente no renderer, nos materiais gerados em memória, na política de qualidade e na interface.

