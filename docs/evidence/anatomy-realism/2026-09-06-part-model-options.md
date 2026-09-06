# Modelos anatômicos por peça — 6 de setembro de 2026

## Conclusão prática

Separar **cobertura anatômica**, **aparência de tecidos** e **desempenho**. Um órgão
segmentado pode melhorar muito o estudo sem ser fotorrealista; um scan texturizado
pode ser visualmente convincente, mas não separar as estruturas internas.

O registro atual já continha Vayu/Z-Anatomy e HRA para coração, encéfalo, pulmões,
fígado e ambos os rins. Não apresentar esses arquivos como novos. Nesta revisão
foram adicionados somente os dois HRA pequenos abaixo, após autorização de integração.
Nenhum pacote pago foi comprado; não foi criada conta externa.

## Abertos: novos órgãos individuais verificados

Os metadados oficiais de cada versão listam criadores, licença **CC BY 4.0** e DOI.
A licença permite redistribuição e adaptação comercial com atribuição, link da licença
e indicação de alterações; não autoriza sugerir endosso do NIH ao Flora.
[Termos Creative Commons](https://creativecommons.org/licenses/by/4.0/).

| Modelo | Evidência oficial / arquivo | Métrica confirmada | Situação e limite |
| --- | --- | --- | --- |
| Pâncreas feminino v1.2 | [Metadados](https://cdn.humanatlas.io/hra-releases/v2.0/markdown/ref-organs/3d-vh-f-pancreas.md), [GLB](https://cdn.humanatlas.io/hra-releases/v2.0/models/3d-vh-f-pancreas.glb) | 714.668 bytes; 5 malhas; 12.894 triângulos; zero imagens embutidas | Incorporado sem alterar o binário. Cabeça, colo, corpo, cauda e processo uncinado; não mostra ácinos, ilhotas ou ductos microscópicos. |
| Intestino grosso feminino v1.2 | [Metadados](https://cdn.humanatlas.io/hra-releases/v2.0/markdown/ref-organs/3d-vh-f-large-intestine.md), [GLB](https://cdn.humanatlas.io/hra-releases/v1.2/models/SBU_F_Intestine_Large.glb) | 387.184 bytes; 10 malhas; 20.421 triângulos; zero imagens embutidas | Incorporado como peça independente. Não substituir a seleção genérica de intestinos, que inclui intestino delgado. |
| Joelho esquerdo feminino v1.1 | [Metadados](https://cdn.humanatlas.io/hra-releases/v2.0/markdown/ref-organs/3d-vh-f-knee-l.md), [GLB](https://cdn.humanatlas.io/hra-releases/v1.2/models/VH_F_Knee_L.glb) | HEAD: 347.952 bytes | Candidato para aula isolada; não baixado nem inspecionado geometricamente. |
| Baço feminino v1.2 | [Metadados](https://cdn.humanatlas.io/hra-releases/v2.0/markdown/ref-organs/3d-vh-f-spleen.md), [GLB](https://cdn.humanatlas.io/hra-releases/v1.2/models/VH_F_Spleen.glb) | HEAD: 276.712 bytes | Candidato alternativo ao baço Z-Anatomy já existente; ganho visual ainda não demonstrado. |
| Bexiga feminina v1.1 | [Metadados](https://cdn.humanatlas.io/hra-releases/v2.0/markdown/ref-organs/3d-vh-f-urinary-bladder.md), [GLB](https://cdn.humanatlas.io/hra-releases/v1.2/models/VH_F_Urinary_Bladder.glb) | HEAD: 765.100 bytes | Candidato pequeno para urologia; não baixado. |
| Olho esquerdo feminino v1.2 | [Metadados](https://cdn.humanatlas.io/hra-releases/v2.0/markdown/ref-organs/3d-vh-f-eye-l.md), [GLB](https://cdn.humanatlas.io/hra-releases/v1.4/models/3d-vh-f-eye-l.glb) | HEAD: 27.462.204 bytes | Adiar importação: precisa auditoria e otimização. A fonte descreve alterações de músculos, íris e nervo óptico. |

Os HEADs acima retornaram 200 e `model/gltf-binary`. Bytes são tamanho transferível
do arquivo, não memória de GPU nem promessa de FPS. Somente pâncreas e intestino
grosso tiveram o JSON e a geometria GLB local inspecionados. Ambos usam coordenadas
Y-up, sem transformações nos nós, e exigem centralização do bounding box antes de
enquadrar. Os hashes e créditos completos estão em `public/medicine/models/ATTRIBUTION.md`.

O [útero feminino v1.1](https://cdn.humanatlas.io/hra-releases/v2.0/markdown/ref-organs/3d-vh-f-uterus.md)
tem 909.772 bytes no HEAD, mas o texto de procedência diz “Visible Human Male”,
inconsistente com o título. Não incorporado: confirmar versão/procedência antes.
A [coleção HRA no NIH](https://3d.nih.gov/collections/hra) declara desenvolvimento
por ilustradores médicos e revisão de especialistas; isso não equivale a validação
clínica de todos os usos ou de materiais gerados pelo Flora.

## Outras fontes: o que realmente muda

| Fonte | Candidato / evidência | Licença e decisão |
| --- | --- | --- |
| ARLOOPA, autor oficial no Sketchfab | [Knee Anatomy](https://sketchfab.com/3d-models/knee-anatomy-bd50aacad58b488ea80ed973b4874a08), página indexada informa 7,1 mil triângulos e modelo feito com baking/Substance Painter. | Página informa **CC Attribution**; confirmar versão e arquivos no download oficial antes de redistribuir. Não baixado. Boa candidatura para revisão de um joelho leve; revisão anatômica ainda necessária. |
| University of Dundee / CAHID | [Head and Neck Anatomy for Dentistry](https://sketchfab.com/3d-models/head-and-neck-anatomy-for-dentistry-76e6bdbfd39f40dbab847ba7c382ad60): fotogrametria de escultura de cera, 1,3 milhão de triângulos segundo o autor. | Página informa **CC Attribution**. É scan de peça de cera, não cadáver; necessita LOD e não garante estruturas separadas. Outros modelos do mesmo perfil podem ter licenças NC/ND: nunca generalizar a licença do perfil inteiro. |
| MakeHuman / MPFB | [Licença oficial](https://static.makehumancommunity.org/about/license.html), [licença do projeto](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md). | Assets principais CC0; código tem licença distinta. Candidato para substituir somente a superfície externa e variar biotipo/pele. Não é atlas anatômico interno; exige correspondência de escala, postura e registro com os sistemas. Assets de terceiros precisam verificação individual. Nenhum instalado. |
| SciePro | [Coração individual](https://www.sciepro.com/heart), [biblioteca](https://www.sciepro.com/3d-models). O fornecedor anuncia anatomia interna, texturas e cortes preparados. | **Realtime/Multi-Purpose pago**, sujeito ao [EULA §6.3](https://library.sciepro.com/en/terms-conditions). Candidato premium condicionado a licença, amostra e orçamento web. Não é uma troca direta dos arquivos atuais. |
| BioDigital | [Developer Toolkits](https://www.biodigital.com/product/developer-toolkits), [pré-requisitos de apps](https://support.biodigital.com/hc/en-us/articles/22012525162391-Remove-a-developer-from-my-team). | Plataforma/API com plano School/Business e domínio registrado. Alternativa para integração do atlas do fornecedor; não é fonte de GLBs livres para o renderizador Flora. Preço e direitos concretos dependem do contrato. |

As páginas Sketchfab estavam indexadas com esses dados, mas a abertura direta
retornou 403 nesta pesquisa. Tratar como candidatos, não como assets já liberados.
Não foram acessados endpoints de download privados ou extraídos modelos do viewer.

### Correção importante sobre a SciePro

A página resumida cita WebGL, mas o EULA vinculante **proíbe servir .glb/.gltf/.obj/.fbx
originais em URL pública**, mesmo sem link de download na interface. Exige forma
compilada e medidas de proteção contra extração. O pipeline `public/medicine/models`
do Flora não satisfaz isso. Antes de comprar, obter condições escritas compatíveis
ou projetar entrega protegida; também não colocar o pacote em repositório público.
[EULA, seções 3.4, 4(f), 6.3](https://library.sciepro.com/en/terms-conditions).

A página do [coração SciePro](https://www.sciepro.com/heart) informa mais de 800
texturas, a maioria 8192×8192. Isso é descrição do pacote do fornecedor, não peso
de deployment medido. Retopologia, redução de texturas e amostra WebGL no hardware
alvo continuam requisitos, mesmo com um modelo pago.

O resultado Smithsonian [Anatomical Model of the Human Heart](https://www.si.edu/object/nmah_1809395)
é registro de objeto e fotografias. Não foi confirmado GLB 3D desse item; não deve
ser anunciado como modelo digital importável só porque a página contém “CC0”.

## Critérios antes de acrescentar mais peças

1. Crédito, DOI/URL, licença, hash e lista de mudanças por arquivo.
2. Uma peça carrega só seus recursos; nenhum pacote de corpo inteiro é pré-requisito.
3. Orçamento de triângulos, draw calls, texturas e memória, com teste real de FPS.
4. Nomes estáveis em português, lateralidade e estrutura original preservados.
5. Vista “isolado” distinta de “em contexto”; não insinuar alinhamento clínico entre
   modelos de diferentes doadores sem registro validado.
6. Sem promessa de fotorrealismo para malhas sem texturas; modo segmentado/didático
   deve ser rotulado honestamente.

Esta é uma triagem técnica com fontes primárias, não um parecer jurídico nem uma
auditoria clínica. A incorporação de cada modelo depende da versão exata e dos
testes de renderização e navegação do projeto.
