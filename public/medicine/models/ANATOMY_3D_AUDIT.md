# Auditoria técnica do atlas humano 3D

Data: 28 de agosto de 2026.

## Corpo-base substituído por exportações HD oficiais

| Asset | MB | Malhas | Triângulos | Classificação | Motivo |
|---|---:|---:|---:|---|---|
| `zanatomy-surface-hd-v2.glb` | 0,81 | 256 | 135.204 | REPLACE/ACTIVE | Substitui a pele única de baixa resolução por regiões anatômicas oficiais separadas. |
| `zanatomy-musculoskeletal-hd-v2.glb` | 10,90 | 960 | 2.952.925 | REPLACE/ACTIVE | Exportação direta do atlas oficial: 277 ossos/cartilagens/dentes e 683 músculos, com aproximadamente 10 vezes mais triângulos que a base anterior. |
| `zanatomy-cardiovascular-hd-v2.glb` | 4,79 | 672 | 1.353.740 | REPLACE/ACTIVE | Mesma rede anatômica completa com curvas convertidas e cerca de 3 vezes mais geometria efetiva; vasos intrarrenais NC excluídos. |
| `zanatomy-nervous-hd-v2.glb` | 4,21 | 572 | 1.208.218 | REPLACE/ACTIVE | Mais estruturas e aproximadamente 2,8 vezes mais geometria; subconjunto NC de ouvido interno excluído. |
| `zanatomy-organs-hd-v2.glb` | 1,83 | 116 | 706.289 | REPLACE/ACTIVE | Vísceras oficiais em resolução integral disponível; rins NC excluídos e substituídos pelos LODs HRA CC BY. |
| `bodyparts3d-skin-v1.glb` e sistemas `zanatomy-*-v1.glb` | — | — | — | LEGACY/FALLBACK | Permanecem no repositório para rastreabilidade, mas não são mais apontados pelo registro ativo do Corpo 3D. |
| `bodyparts3d-organs-v1.glb` | 0,30 | 16 | 143.202 | KEEP | Contexto corporal leve e fallback. |
| `zanatomy-organ-heart-v1.glb` | 1,61 | 9 | 538.040 | KEEP | Parede e grandes vasos externos; complementado pelo interior HRA. |
| `nih-hra-heart-interior-v1.glb` | 1,66 | 14 | 85.914 | KEEP | Câmaras, septo, valvas e músculos papilares reais. |
| `zanatomy-organ-brain-v1.glb` | 1,29 | 3 | 539.608 | KEEP/FALLBACK | Exterior cerebral leve; substituído em isolamento pelo cérebro HRA de 283 malhas. |
| `zanatomy-organ-spleen-v1.glb` | 0,09 | 1 | 36.064 | KEEP | Ampliação isolada válida. |
| `zanatomy-organ-eye-v1.glb` | 0,13 | 1 | 65.320 | KEEP | Reuso coerente com Histologia e Sentidos. |

## Novos LODs de órgão

| Asset | Fonte | Licença | MB | Malhas | Triângulos | Permitido | Modificado |
|---|---|---|---:|---:|---:|---|---|
| Cérebro feminino v1.3 | HRA / NIH 3D 3DPX-020959 | CC BY 4.0 | 11,42 | 283 | 656.268 | Sim | Não; materiais em runtime |
| Pulmões femininos v1.3 | HRA / NIH 3D 3DPX-020974 | CC BY 4.0 | 22,18 | 56 | 297.097 | Sim | Não; materiais em runtime |
| Fígado feminino v1.1 | HRA / NIH 3D 3DPX-020973 | CC BY 4.0 | 1,66 | 26 | 93.303 | Sim | Não; materiais em runtime |
| Rim esquerdo feminino v1.2 | HRA / NIH 3D 3DPX-020967 | CC BY 4.0 | 1,27 | 15 | 72.788 | Sim | Não; materiais em runtime |
| Rim direito feminino v1.2 | HRA / NIH 3D 3DPX-020968 | CC BY 4.0 | 1,29 | 14 | 74.283 | Sim | Não; materiais em runtime |

## Decisões e recusas

| Fonte/asset | Decisão | Motivo |
|---|---|---|
| HRA/NIH 3D | APROVADO por entrada | Fonte acadêmica, revisão especializada, licença CC BY explícita e segmentação anatômica. |
| Z-Anatomy oficial `Startup.blend` | APROVADO com exclusões | CC BY-SA 4.0 documentada; fonte oficial, alta segmentação e exportação reproduzível. Rim Cowley e ouvido interno Dundee foram excluídos por licenças NC. |
| BodyParts3D atual | APROVADO com licença histórica preservada | Os derivados locais declaram CC BY-SA 2.1 JP e não foram rel licenciados. |
| HRA pulmão v1.3 como sistema respiratório completo | RECUSADO | A própria fonte informa ausência de laringe, traqueia e brônquios principais; usado somente como LOD pulmonar. |
| NIH CT heart 3DPX-002636 | RECUSADO | A descrição alerta que válvulas não transferem bem; inferior ao coração HRA segmentado já integrado. |
| Sketchfab sem licença verificável | RECUSADO | Autoria/licença/redistribuição não comprovadas por asset. |
| Complete Anatomy, Visible Body, BioDigital, Kenhub e assets de jogos | RECUSADO | Conteúdo proprietário ou redistribuição incompatível. |

## Arquitetura e budgets

- Entrada ativa: superfície HD (0,81 MB) e musculoesquelético HD (10,90 MB). A compressão Draco mantém a transferência total em 11,71 MB apesar do salto de 290.886 para 2.952.925 triângulos no musculoesquelético.
- Sistemas densos HD: 1,83–4,80 MB e carregamento somente ao abrir a camada correspondente.
- LODs de órgão: carregados somente ao isolar cérebro, pulmões, fígado ou rins.
- Exceções justificadas: pulmões (22,18 MB) e cérebro (11,42 MB), preservados sem redução destrutiva por sua segmentação didática. Nenhum deles entra no carregamento inicial.
- As 394 novas malhas permanecem separadas para seleção. Não houve merge que destruísse identidade anatômica.
- As 960 malhas musculoesqueléticas oficiais alimentam o índice pesquisável: 277 ósseas/cartilaginosas/dentárias e 683 musculares. O nível Iniciante continua mostrando somente o recorte introdutório; a Residência expõe o catálogo segmentado.
- Nomes técnicos originalmente em inglês são traduzidos em tempo de execução sem alterar os metadados do GLB. Descrições longas em inglês não são exibidas como conteúdo médico em português; o atlas usa um resumo educacional neutro e mantém a fonte rastreável.

## Reprodutibilidade da substituição

- Fonte: `Z-Anatomy.zip` do repositório oficial `Z-Anatomy/Models-of-human-anatomy`, acesso em 28 de agosto de 2026.
- SHA-256 do ZIP de origem: `E029688545627BD0214B269E1063143ABB580AAD72B2C2445D6D8A9A0D9DA736`.
- Exportador: `scripts/export_zanatomy_web_hd.py`, Blender 4.5 LTS, Draco nível 6, nomes e camadas preservados em `extras`.
- Relatório de cada exportação: `zanatomy-web-hd-v2.export.json`.
