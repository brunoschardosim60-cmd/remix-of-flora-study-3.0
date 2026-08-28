# Atribuição dos modelos anatômicos 3D

> O modelo `zanatomy-organ-eye-v1.glb` também é reutilizado no módulo **Histologia e Sentidos**. A aparência do globo ocular usa o mesmo perfil `eye` de `src/lib/organRealism.ts`; nenhuma segunda malha artificial foi criada.

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

## `zanatomy-circulatory-v1.glb`, `zanatomy-nervous-v1.glb` e `zanatomy-organs-v1.glb`

- Fonte imediata e conversão para GLB: [Anatomi Simülatörü](https://github.com/DrMuratAltun/anatomi-simulatoru), de Dr. Murat Altun.
- Dados anatômicos originais: [Z-Anatomy](https://www.z-anatomy.com/) e [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/).
- Licença dos dados 3D: [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/).
- Cópia local da licença: `CC-BY-SA-4.0.txt`.
- Conteúdo incorporado: 676 estruturas circulatórias, 582 estruturas nervosas e 120 estruturas de órgãos internos, preservadas como malhas individualmente identificáveis.
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
