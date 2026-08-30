# Auditoria técnica do atlas humano 3D

Data da revisão atual: 30 de agosto de 2026.

## Pacotes ativos após a substituição integral

| Asset | MB | Estruturas da fonte | Triângulos | Estado | Cobertura |
|---|---:|---:|---:|---|---|
| `vayu-zanatomy-muscular-v1.glb` | 5,43 | 692 | 2.335.895 | ACTIVE | Corpo muscular completo, incluindo músculos profundos, tendões, fáscias e retináculos. |
| `vayu-zanatomy-skeletal-v1.glb` | 7,72 | 1.386 | 1.916.818 | ACTIVE | Ossos, costelas, dentes, cartilagens, discos, ligamentos e articulações. |
| `vayu-zanatomy-cardiovascular-v1.glb` | 9,61 | 680 | 3.844.392 | ACTIVE | Rede arterial, venosa e estruturas cardiovasculares segmentadas. |
| `vayu-zanatomy-nervous-sensory-v1.glb` | 5,51 | 613 | 2.396.782 | ACTIVE | Encéfalo, medula, nervos periféricos e órgãos/sistemas sensoriais. |
| `vayu-human-internal-systems-v1.glb` | 2,97 | 275 | 1.059.085 | ACTIVE | Digestório, endócrino, linfático, respiratório, urinário e reprodutivo. |
| `zanatomy-surface-hd-v2.glb` | 0,81 | 256 | 135.204 | ACTIVE | Superfície externa regionalizada; mantida por ser a melhor superfície aberta e verificável disponível na fonte. |

O manifesto local registra 3.753 estruturas em 13 sistemas. A soma por pacote não deve ser usada como total humano único: sistemas podem conter agrupadores hierárquicos, instâncias laterais e estruturas de fontes diferentes. No navegador, após deduplicação por `structureId` e união com o catálogo didático do Flora, foram observadas 697 seleções musculares, 1.385 esqueléticas, 676 vasculares, 614 nervosas/sensoriais e 321 internas.

Os pacotes anteriores `zanatomy-*-hd-v2.glb` continuam no repositório apenas para rastreabilidade e fallback; não são mais o caminho ativo de músculos, esqueleto, vasos, nervos ou órgãos. Os LODs HRA/NIH continuam ativos quando o aluno isola coração, cérebro, pulmões, fígado ou rins.

## Geração anterior: exportações HD oficiais

| Asset | MB | Malhas | Triângulos | Classificação | Motivo |
|---|---:|---:|---:|---|---|
| `zanatomy-surface-hd-v2.glb` | 0,81 | 256 | 135.204 | KEEP/ACTIVE | Superfície externa regionalizada. |
| `zanatomy-musculoskeletal-hd-v2.glb` | 10,90 | 960 | 2.952.925 | LEGACY | Substituído pelos pacotes muscular e esquelético separados. |
| `zanatomy-cardiovascular-hd-v2.glb` | 4,79 | 672 | 1.353.740 | LEGACY | Substituído pela rede cardiovascular Vayu de maior densidade. |
| `zanatomy-nervous-hd-v2.glb` | 4,21 | 572 | 1.208.218 | LEGACY | Substituído pelo pacote combinado nervoso + sentidos. |
| `zanatomy-organs-hd-v2.glb` | 1,83 | 116 | 706.289 | LEGACY | Substituído pelo pacote multissistêmico; LODs HRA continuam ativos. |
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

- Entrada ativa padrão: somente a superfície HD (0,81 MB). Músculos, esqueleto, vasos, nervos/sentidos e sistemas internos são pacotes Draco independentes, carregados quando a camada é aberta.
- Sistemas densos atuais: 2,97–9,61 MB. Separar músculos de esqueleto evita transferir os dois conjuntos quando o aluno precisa estudar apenas um deles.
- LODs de órgão: carregados somente ao isolar cérebro, pulmões, fígado ou rins.
- Exceções justificadas: pulmões (22,18 MB) e cérebro (11,42 MB), preservados sem redução destrutiva por sua segmentação didática. Nenhum deles entra no carregamento inicial.
- As 394 novas malhas permanecem separadas para seleção. Não houve merge que destruísse identidade anatômica.
- Os identificadores anatômicos dos cinco pacotes alimentam o índice pesquisável. O nível Iniciante continua mostrando o recorte introdutório; a Residência expõe o catálogo segmentado completo disponível para a camada.
- Nomes técnicos originalmente em inglês são traduzidos em tempo de execução sem alterar os metadados do GLB. Descrições longas em inglês não são exibidas como conteúdo médico em português; o atlas usa um resumo educacional neutro e mantém a fonte rastreável.

## Reprodutibilidade da substituição

- Fonte: `Z-Anatomy.zip` do repositório oficial `Z-Anatomy/Models-of-human-anatomy`, acesso em 28 de agosto de 2026.
- SHA-256 do ZIP de origem: `E029688545627BD0214B269E1063143ABB580AAD72B2C2445D6D8A9A0D9DA736`.
- Exportador: `scripts/export_zanatomy_web_hd.py`, Blender 4.5 LTS, Draco nível 6, nomes e camadas preservados em `extras`.
- Relatório de cada exportação: `zanatomy-web-hd-v2.export.json`.
