# Auditoria técnica do atlas humano 3D

Data: 28 de agosto de 2026.

## Assets mantidos

| Asset | MB | Malhas | Triângulos | Classificação | Motivo |
|---|---:|---:|---:|---|---|
| `bodyparts3d-skin-v1.glb` | 0,17 | 1 | 94.966 | KEEP | Superfície leve e proporcional; adequada como camada externa. |
| `zanatomy-musculoskeletal-v1.glb` | 7,87 | 826 | 290.886 | KEEP | Ossos e músculos realmente separados, incluindo ossículos, dentes e estruturas regionais. |
| `zanatomy-circulatory-v1.glb` | 7,51 | 676 | 448.731 | KEEP | Rede arterial e venosa extensa e selecionável. |
| `zanatomy-nervous-v1.glb` | 7,69 | 549 | 436.608 | KEEP | Nervos cranianos, medula, plexos e nervos periféricos separados. |
| `zanatomy-organs-v1.glb` | 4,60 | 117 | 261.853 | KEEP/IMPROVE | Boa relação espacial e digestório extenso; órgãos prioritários recebem LOD HRA. |
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
| Z-Anatomy atual | APROVADO | CC BY-SA 4.0 documentada; elevada segmentação corporal. |
| BodyParts3D atual | APROVADO com licença histórica preservada | Os derivados locais declaram CC BY-SA 2.1 JP e não foram rel licenciados. |
| HRA pulmão v1.3 como sistema respiratório completo | RECUSADO | A própria fonte informa ausência de laringe, traqueia e brônquios principais; usado somente como LOD pulmonar. |
| NIH CT heart 3DPX-002636 | RECUSADO | A descrição alerta que válvulas não transferem bem; inferior ao coração HRA segmentado já integrado. |
| Sketchfab sem licença verificável | RECUSADO | Autoria/licença/redistribuição não comprovadas por asset. |
| Complete Anatomy, Visible Body, BioDigital, Kenhub e assets de jogos | RECUSADO | Conteúdo proprietário ou redistribuição incompatível. |

## Arquitetura e budgets

- Entrada: pele (0,17 MB) e musculoesquelético (7,87 MB), dentro do budget inicial de 10 MB.
- Sistemas densos: 4,60–7,69 MB e carregamento por sistema.
- LODs de órgão: carregados somente ao isolar cérebro, pulmões, fígado ou rins.
- Exceções justificadas: pulmões (22,18 MB) e cérebro (11,42 MB), preservados sem redução destrutiva por sua segmentação didática. Nenhum deles entra no carregamento inicial.
- As 394 novas malhas permanecem separadas para seleção. Não houve merge que destruísse identidade anatômica.
- As 826 malhas musculoesqueléticas existentes agora também alimentam o índice pesquisável: 263 ósseas e 563 musculares. O nível Iniciante continua mostrando somente o recorte introdutório; a Residência expõe o catálogo segmentado.
- Nomes técnicos originalmente em inglês são traduzidos em tempo de execução sem alterar os metadados do GLB. Descrições longas em inglês não são exibidas como conteúdo médico em português; o atlas usa um resumo educacional neutro e mantém a fonte rastreável.
