# Atribuição dos modelos anatômicos 3D

> O modelo `zanatomy-organ-eye-v1.glb` também é reutilizado no módulo **Histologia e Sentidos**. A aparência do globo ocular usa o mesmo perfil `eye` de `src/lib/organRealism.ts`; nenhuma segunda malha artificial foi criada.

## Vayu AI Anatomy — corpo humano segmentado ativo

Arquivos ativos: `vayu-zanatomy-muscular-v1.glb`, `vayu-zanatomy-skeletal-v1.glb`, `vayu-zanatomy-cardiovascular-v1.glb`, `vayu-zanatomy-nervous-sensory-v1.glb`, `vayu-human-internal-systems-v1.glb` e `vayu-human-manifest-v1.json`.

- Fonte e documentação: [Vayu AI Anatomy](https://www.vayuai.ai/writing/vayu-ai-anatomy), com índice público em `https://anatomy.vayuai.ai/species/human/manifest.json`; acesso em 30 de agosto de 2026.
- Catálogo preservado: 3.753 estruturas nomeadas, 13 sistemas e hierarquia anatômica. O Flora carrega cada sistema sob demanda e mantém `structureId`, `systemId`, fonte e caminho hierárquico para pesquisa e seleção.
- Fontes upstream declaradas no manifesto local: Z-Anatomy, CC BY-SA 4.0; BodyParts3D/DBCLS, CC BY-SA 2.1 Japan; e SPL Abdominal Atlas/BWH, 3D Slicer License Section B. Cada estrutura mantém o identificador de sua fonte no manifesto.
- Alterações locais: renomeação dos pacotes; união dos pacotes nervoso + sentidos e dos sistemas internos com `@gltf-transform/cli`; aplicação de materiais PBR, cores por tecido, transparência, seleção e câmera em tempo de execução. A união reorganiza os contêineres GLB, mas não remodela intencionalmente a anatomia.
- A superfície externa continua usando `zanatomy-surface-hd-v2.glb`: a fonte aberta informa que ainda não oferece pele/face fotográfica. Os modelos HRA/NIH permanecem como LODs internos de coração, cérebro, pulmões, fígado e rins.

SHA-256 dos arquivos distribuídos:

- muscular: `57027A81B445431BCF5A23F35F93147C378AE9CFD7DCA08C267A8722BEB5CD2A`
- esquelético: `736B922982BE995755B40679B09FC973D88FF3BD59493A91796BAED597E3CE36`
- cardiovascular: `1F39C2FDD47C52D6291AE6D41C21F95EB94C0D21631633C6CD3F51ECB2497FF6`
- nervoso + sentidos: `1A617BC8B9EA3C23E5D1F58A92E287B88AE064C2971ED3CEDE61E5092E44ECB2`
- sistemas internos: `C91EBA7B6D59F14CFFF8506A547114F6E5B727B308E666CAA1947DA249A07A1D`
- manifesto: `A8A0081D560D3EB2F790950C2B88EEC1F27E26860CC9D6949E958FB261A04FDE`

## Exportações oficiais Z-Anatomy HD v2 (geração anterior preservada)

Arquivos: `zanatomy-surface-hd-v2.glb`, `zanatomy-musculoskeletal-hd-v2.glb`, `zanatomy-cardiovascular-hd-v2.glb`, `zanatomy-nervous-hd-v2.glb` e `zanatomy-organs-hd-v2.glb`. A superfície continua ativa; os quatro pacotes sistêmicos permanecem como geração anterior rastreável.

- Fonte direta: [`Z-Anatomy/Models-of-human-anatomy`](https://github.com/Z-Anatomy/Models-of-human-anatomy), arquivo oficial `Z-Anatomy.zip` / `Startup.blend`.
- Autores e base anatômica: Z-Anatomy (Gauthier Kervyn e colaboradores) e BodyParts3D, Database Center for Life Science. A lista completa de autores permanece no `License.txt` da fonte.
- Licença do conjunto exportado: [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/). As derivações GLB permanecem sob a mesma licença.
- Data de acesso e exportação: 28 de agosto de 2026.
- SHA-256 do `Z-Anatomy.zip` oficial: `E029688545627BD0214B269E1063143ABB580AAD72B2C2445D6D8A9A0D9DA736`.
- Alterações: avaliação dos modificadores e curvas do Blender, conversão para meshes separadas, redução controlada apenas nos sistemas acima do orçamento web, exportação GLB com Draco e inclusão de `anatomyName`, `anatomyType` e coleção de origem em metadados glTF. Materiais, cores, seleção, transparência e iluminação são aplicados em tempo de execução.
- Exportação reproduzível: `scripts/export_zanatomy_web_hd.py`; métricas por arquivo em `zanatomy-web-hd-v2.export.json`.

Exclusões de licença: a fonte declara o modelo renal de Lissie Cowley como CC BY-NC 4.0 e o ouvido interno da University of Dundee como CC BY-NC-SA 4.0. Nomes relacionados a esses subconjuntos foram removidos das exportações redistribuíveis. Os rins mostrados em detalhe no Flora vêm dos modelos HRA/NIH CC BY 4.0 descritos abaixo.

## `zanatomy-musculoskeletal-v1.glb`

- Fonte imediata: [Body Anatomy 3D Viewer](https://github.com/hpfrei/body-anatomy-3d-viewer), de hpfrei.
- Dados anatômicos originais: [Z-Anatomy](https://www.z-anatomy.com/) / BodyParts3D.
- Licença: [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/).
- Cópia local da licença: `CC-BY-SA-4.0.txt`.
- Alterações neste projeto: renomeação do arquivo, integração com React Three Fiber, centralização e escala em tempo de execução, materiais próprios, filtros por tipo, seleção, destaque e navegação de câmera. A geometria GLB não foi remodelada neste repositório.

O ativo derivado permanece disponibilizado sob CC BY-SA 4.0. A licença do modelo não altera automaticamente a licença do código independente da aplicação, mas adaptações do próprio modelo devem obedecer aos termos de compartilhamento pela mesma licença.

Os arquivos em `draco/` são os decodificadores distribuídos com Three.js e usados apenas para abrir a malha comprimida no navegador.

## `nih-hra-heart-interior-v1.glb`

- Nome original: **3D Reference Organ for Heart, Female v1.2** (`VH_F_Heart.glb`).
- Autoras: Kristen Browne e Heidi Schlehlein.
- Instituição/projeto: Human Reference Atlas (HRA), disponibilizado pelo NIH 3D.
- Entrada oficial: [NIH 3D 3DPX-020966](https://3d.nih.gov/entries/3DPX-020966).
- DOI informado na atribuição da entrada: [`10.48539/HBM384.VWVH.465`](https://doi.org/10.48539/HBM384.VWVH.465).
- Arquivo original obtido pela API oficial do NIH 3D: [`/api/files/742112`](https://3d.nih.gov/api/files/742112).
- Data de acesso: 28 de agosto de 2026.
- Licença da entrada: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
- Atribuição solicitada pela fonte: “Kristen Browne; Heidi Schlehlein. 2022. 3D Reference Organ for Heart, Female v1.2. https://doi.org/10.48539/HBM384.VWVH.465.”
- Conteúdo usado: quatro câmaras cardíacas, septo interventricular, valvas aórtica, pulmonar, mitral e tricúspide e cinco músculos papilares, preservados como 14 malhas selecionáveis.
- Alterações neste projeto: somente renomeação do arquivo; centralização, escala, materiais, transparência, corte, destaque e seleção são aplicados em tempo de execução. A geometria original não foi simplificada nem remodelada.
- SHA-256 do arquivo usado: `9AFDFB2CCF926869813582CFE150DCE8CB28377417A968A4F29A5B8DC060428B`.

O coração NIH é carregado apenas ao abrir a anatomia interna. Ele complementa, sem substituir, `zanatomy-organ-heart-v1.glb`: o modelo Z-Anatomy mantém a parede externa, aorta, coronárias direitas e veias cavas; o modelo HRA fornece as estruturas internas realmente segmentadas.

## Órgãos de referência HRA adicionados ao atlas completo

Todos os arquivos abaixo foram obtidos pela API oficial do NIH 3D em 28 de agosto de 2026. A geometria não foi remodelada nem simplificada. Centralização, escala, materiais PBR, transparência, corte, destaque e seleção são aplicados em tempo de execução. Eles são carregados somente quando o órgão correspondente é isolado.

### `nih-hra-brain-female-v1.glb`

- Original: `3d-vh-f-allen-brain.glb`; API [`/api/files/741980`](https://3d.nih.gov/api/files/741980); entrada [3DPX-020959](https://3d.nih.gov/entries/3DPX-020959).
- Autoras: Kristen Browne e Heidi Schlehlein; Human Reference Atlas / NIH 3D.
- Atribuição: “Kristen Browne; Heidi Schlehlein. 2023. 3D Reference Organ for Brain, Female v1.3. https://doi.org/10.48539/HBM425.NDKM.969.”
- Licença: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Conteúdo: 283 malhas, incluindo giros, núcleos, tálamo, hipotálamo, hipocampo, ventrículos, cerebelo e tronco encefálico; 656.268 triângulos.
- SHA-256: `C5711A1A8BC62CA930B8BCF076DEF15315C11F5AD9BC7901E51F698406D38DBC`.

### `nih-hra-lung-female-v1.glb`

- Original: `3d-vh-f-lung.glb`; API [`/api/files/742064`](https://3d.nih.gov/api/files/742064); entrada [3DPX-020974](https://3d.nih.gov/entries/3DPX-020974).
- Autoras: Kristen Browne e Heidi Schlehlein; Human Reference Atlas / NIH 3D.
- Atribuição: “Kristen Browne; Heidi Schlehlein. 2023. 3D Reference Organ for Lung, Female v1.3. https://doi.org/10.48539/HBM794.PKQV.978.”
- Licença: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Conteúdo: 56 malhas de segmentos broncopulmonares, hilos, brônquios lobares e segmentares; 297.097 triângulos. A própria fonte informa que laringe, traqueia e brônquios principais não integram esta versão.
- SHA-256: `323D27BB76BA2C5B140FF31AD5190627EEB8D4E37CD220E4B541655D67789C1A`.

### `nih-hra-liver-female-v1.glb`

- Original: `VH_F_Liver.glb`; API [`/api/files/742070`](https://3d.nih.gov/api/files/742070); entrada [3DPX-020973](https://3d.nih.gov/entries/3DPX-020973).
- Autora: Kristen Browne; Human Reference Atlas / NIH 3D.
- Atribuição: “Kristen Browne. 2021. 3D Reference Organ for Liver, Female v1.1. https://doi.org/10.48539/HBM798.JZZM.649.”
- Licença: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Conteúdo: 26 malhas, incluindo segmentos, lobos, cápsula, porta hepatis, superfícies, impressões e ligamentos; 93.303 triângulos.
- SHA-256: `AD9B0BE0FF253E7BFE31BFFFC00017DAFCE226D4F3E7804A81CBB4C2E269D598`.

### `nih-hra-kidney-left-female-v1.glb` e `nih-hra-kidney-right-female-v1.glb`

- Originais: `VH_F_Kidney_L.glb` e `VH_F_Kidney_R.glb`; APIs [`/api/files/742106`](https://3d.nih.gov/api/files/742106) e [`/api/files/742100`](https://3d.nih.gov/api/files/742100); entradas [3DPX-020967](https://3d.nih.gov/entries/3DPX-020967) e [3DPX-020968](https://3d.nih.gov/entries/3DPX-020968).
- Autoras: Kristen Browne e Heidi Schlehlein; Human Reference Atlas / NIH 3D.
- Atribuição e DOI: “3D Reference Organ for Kidney, Female, Left v1.2”, `10.48539/HBM898.QGVV.734`; “Right v1.2”, `10.48539/HBM487.ZGCW.688`.
- Licença: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Conteúdo: 29 malhas combinadas de cápsulas, hilos, córtex, colunas e pirâmides renais; 147.071 triângulos.
- SHA-256 esquerdo: `8AC1228E4DB8C07CBF9F6C6DC7CA522C5B8D61F641927233A29AE6609B577403`.
- SHA-256 direito: `A67508E6948723D34A29FEA2BC8C96931A8FE2F8A08293FD1C3161CFCF13968E`.

## `zanatomy-circulatory-v1.glb`, `zanatomy-nervous-v1.glb` e `zanatomy-organs-v1.glb`

- Fonte imediata e conversão para GLB: [Anatomi Simülatörü](https://github.com/DrMuratAltun/anatomi-simulatoru), de Dr. Murat Altun.
- Dados anatômicos originais: [Z-Anatomy](https://www.z-anatomy.com/) e [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/).
- Licença dos dados 3D: [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/).
- Cópia local da licença: `CC-BY-SA-4.0.txt`.
- Conteúdo incorporado (contagem técnica dos GLBs distribuídos): 676 estruturas circulatórias, 549 estruturas nervosas e 117 estruturas de órgãos internos, preservadas como malhas individualmente identificáveis.
- Alterações neste projeto: renomeação dos arquivos, centralização e escala, combinação das malhas densas de vasos e nervos para reduzir chamadas de desenho, atributo de identificação por vértice, materiais e cores próprios, catálogo pesquisável com tradução auxiliar para português, seleção, isolamento, corte e transparência aplicados em tempo de execução. A geometria anatômica não foi remodelada neste repositório.

Esses três ativos e adaptações das próprias malhas permanecem sob CC BY-SA 4.0. Os nomes traduzidos são auxiliares; a nomenclatura original é preservada nos detalhes da estrutura.

## `zanatomy-organ-heart-v1.glb`, `zanatomy-organ-brain-v1.glb`, `zanatomy-organ-spleen-v1.glb` e `zanatomy-organ-eye-v1.glb`

- Fonte imediata e otimização GLB: [FSichi/anatomy-atlas](https://github.com/FSichi/anatomy-atlas).
- Dados anatômicos originais: Z-Anatomy / BodyParts3D.
- Licença dos dados 3D: Creative Commons Attribution-ShareAlike 4.0 International.
- Alterações neste projeto: arquivos renomeados e usados como ampliações isoladas; rotação de eixo, escala, posição, materiais, corte, transparência, seleção e câmera aplicados em tempo de execução. A geometria não foi remodelada neste repositório.

## `bodyparts3d-skin-v1.glb` e `bodyparts3d-organs-v1.glb`

- Fonte imediata e conversão para GLB: [human-body-simulator](https://github.com/yamz8/human-body-simulator), de yamz8.
- Dados originais: BodyParts3D 3.0, © The Database Center for Life Science, DOI `10.18908/lsdba.nbdc00837-000`.
- Espelho de origem informado pelo projeto: [Kevin-Mattheus-Moerman/BodyParts3D](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D).
- Licença: [Creative Commons Attribution-ShareAlike 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/).
- Alterações neste projeto: renomeação dos arquivos, materiais, transparência, agrupamento semântico, destaque, filtros e câmera aplicados em tempo de execução. A geometria não foi remodelada neste repositório.

O aviso resumido e a cópia do texto jurídico estão nos arquivos `CC-BY-SA-2.1-JP.txt` e `CC-BY-SA-2.1-JP-legalcode.html` deste diretório.
