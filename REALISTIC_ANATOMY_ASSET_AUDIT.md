# Auditoria de assets para anatomia 3D realista

Data da auditoria: 28 de agosto de 2026  
Branch: `codex/full-human-anatomy-atlas`

## Decisão executiva

Os modelos científicos ativos foram mantidos. Eles já oferecem a melhor combinação encontrada de segmentação, licença redistribuível e custo Web. A limitação visual principal não é a quantidade de polígonos: nenhum GLB ativo contém `TEXCOORD_0`, Base Color, Normal, Roughness, AO ou displacement. Os materiais anteriores dependiam de cor uniforme/vertex color, brilho escalar e luzes quentes, produzindo aspecto de plástico.

A arquitetura escolhida é híbrida:

- o atlas Z-Anatomy continua responsável por corpo completo, 256 regiões de superfície, 683 músculos, 277 ossos, 672 vasos, 572 estruturas nervosas e 116 estruturas viscerais;
- os órgãos HRA/NIH continuam como nível detalhado carregado somente quando o órgão é isolado;
- um sistema PBR procedural, determinístico e não anatômico fornece microvariação de albedo, normal e roughness por tecido sem inventar estruturas;
- nenhum modelo externo foi incorporado nesta rodada, portanto não há novo asset binário nem nova obrigação de atribuição.

## Diagnóstico visual da versão anterior

| Sistema | Geometria | Material/textura anterior | Consequência visual |
|---|---|---|---|
| Superfície | 256 regiões consolidadas, 135.204 triângulos | uma cor, sem UV e sem mapas; roughness/clearcoat escalares | pele lisa, uniforme e com leitura de manequim |
| Músculos | 683 malhas dentro do conjunto musculoesquelético HD | vermelho uniforme; sem diferenciação de tendão/aponeurose e sem normal map | aparência de borracha apesar da geometria densa |
| Esqueleto | 277 malhas preservadas | marfim uniforme, roughness escalar | aspecto de porcelana polida, pouca microirregularidade |
| Vasos | 672 estruturas combinadas em uma malha selecionável | vertex colors vermelho/azul e material único | tubos plásticos, brilho igual para artérias e veias |
| Nervos | 572 estruturas combinadas em uma malha selecionável | vertex colors e material único | pouca leitura fibrosa e profundidade superficial |
| Órgãos Z-Anatomy | 116 malhas | cor por vértice gerada pela posição, sem UV/mapas | variação ampla mas ainda lisa e artificial |
| Coração externo | 9 malhas, 538.040 triângulos | vermelho uniforme e clearcoat elevado | principal prova do aspecto plástico |
| Coração interno HRA | 14 malhas, 85.914 triângulos | uma base vermelha; seleção amarela substituía o tecido | boa segmentação, baixa fidelidade material |
| Encéfalo HRA | 283 malhas, 656.268 triângulos | rosa uniforme por classe, sem mapas | giros presentes, porém pouco definidos pela luz |
| Pulmões HRA | 56 malhas, 297.097 triângulos | rosa fosco escalar | lobos legíveis, superfície excessivamente uniforme |
| Fígado HRA | 26 malhas, 93.303 triângulos | vermelho escuro uniforme | pouco relevo e reflexo semelhante a outros órgãos |
| Rins HRA | 29 malhas combinadas, 147.071 triângulos | cores por subestrutura, sem microtextura | diferenciação anatômica correta, acabamento artificial |

### Renderer anterior

- ACES Filmic e saída sRGB já estavam corretos.
- A iluminação possuía key/fill/rim e environment com `Lightformer`, mas o key quente, o fill magenta e o point light vermelho reforçavam saturação e brilho artificial.
- `MeshPhysicalMaterial` usava clearcoat, sheen, transmission e thickness sem mapas e sem UV; o resultado variava por tecido somente em valores globais.
- Não havia normal map, roughness map ou oclusão ambiente por texel.
- A seleção substituía a cor de órgãos detalhados por amarelo brilhante, ocultando a aparência do tecido.

## Inventário técnico ativo

| Asset | Formato/tamanho | Triângulos | Malhas | Mapas PBR | Licença | Adequação Web |
|---|---:|---:|---:|---|---|---|
| Z-Anatomy superfície HD v2 | GLB, 0,78 MB | 135.204 | 256 | nenhum; normal geométrica | CC BY-SA 4.0 | excelente como atlas base |
| Z-Anatomy musculoesquelético HD v2 | GLB, 10,39 MB | 2.952.925 | 960 | nenhum; normal geométrica | CC BY-SA 4.0 | alto custo, mas preserva 683 músculos e 277 ossos |
| Z-Anatomy cardiovascular HD v2 | GLB, 4,56 MB | 1.353.740 | 672 | nenhum; normal geométrica | CC BY-SA 4.0 | adequado após combinação em uma chamada de desenho |
| Z-Anatomy nervoso HD v2 | GLB, 4,02 MB | 1.208.218 | 572 | nenhum; normal geométrica | CC BY-SA 4.0 | adequado após combinação em uma chamada de desenho |
| Z-Anatomy órgãos HD v2 | GLB, 1,74 MB | 706.289 | 116 | nenhum; normal geométrica | CC BY-SA 4.0 | adequado para contexto corporal |
| Z-Anatomy coração externo | GLB, 1,61 MB | 538.040 | 9 | nenhum; `COLOR_0` | CC BY-SA 4.0 | adequado como coração HD externo segmentado |
| HRA coração interno | GLB, 1,66 MB | 85.914 | 14 | nenhum; `COLOR_0` | CC BY 4.0 | excelente camada interna sob demanda |
| HRA encéfalo feminino | GLB, 11,42 MB | 656.268 | 283 | nenhum | CC BY 4.0 | adequado somente sob demanda |
| HRA pulmões femininos | GLB, 22,18 MB | 297.097 | 56 | nenhum; `COLOR_0` | CC BY 4.0 | pesado; manter estritamente sob demanda |
| HRA fígado feminino | GLB, 1,66 MB | 93.303 | 26 | nenhum | CC BY 4.0 | adequado sob demanda |
| HRA rins femininos | GLB, 2,56 MB combinados | 147.071 | 29 | nenhum | CC BY 4.0 | adequado sob demanda |

## Candidatos pesquisados

Campos que a fonte não publica são marcados como **não informado**; não foram inferidos a partir de imagens promocionais.

| Candidato | URL / criador | Licença e redistribuição | Formato / tamanho / geometria | Base Color / Normal / Roughness / AO / displacement / 2K–4K | Qualidade e vantagem | Desvantagem / decisão |
|---|---|---|---|---|---|---|
| HRA 3D Reference Organs | [HRA Knowledge Graph](https://github.com/hubmapconsortium/hra-kg) / HuBMAP NIH | dados CC BY 4.0; uso comercial e redistribuição permitidos com atribuição | GLB; métricas dos arquivos ativos acima | nenhum mapa nos GLBs auditados | alta precisão e segmentação por subestrutura | **mantido** como Ultra científico; material precisa ser criado no renderer |
| Z-Anatomy oficial | [Models of Human Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy) / Gauthier Kervyn e colaboradores | CC BY-SA 4.0; uso comercial e redistribuição permitidos sob ShareAlike | Blender/GLB derivado; métricas ativas acima | nenhum mapa nos GLBs exportados | melhor cobertura corporal e seleção encontrada | **mantido**; trocar por outra derivação Z-Anatomy não melhoraria a aparência |
| BodyParts3D 4.0 | [DBCLS](https://lifesciencedb.jp/bp3d/info/index.html) / Database Center for Life Science | CC BY-SA 2.1 JP; uso comercial e redistribuição permitidos sob ShareAlike | OBJ; tamanho e triângulos variam por pacote | sem pipeline PBR publicado | fonte estrutural extensa e rastreável | base histórica do Z-Anatomy; não representa melhoria visual |
| NIH 3D 3DPX-022787 | [Human Heart 3D Model](https://3d.nih.gov/entries/22787?version=1.01) / Sourav Pan | licença não exibida na página indexada; NIH informa que a licença varia por entrada | download disponível; tamanho, triângulos e meshes não informados | não informado | referência visual externa | **não usado**: licença e composição material não verificáveis |
| Sketchfab “Realistic Human Heart” | [neshallads](https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089) | CC BY; uso comercial e redistribuição permitidos com atribuição | download; 22,6 mil triângulos, 11,3 mil vértices; tamanho/meshes não informados | descrito como texturizado; mapas e resolução não informados | aparência promocional superior com baixo número de triângulos | **não usado**: não comprova anatomia/segmentação nem inventário PBR antes do download autenticado |
| Sketchfab “Anatomically Correct Human Heart” | [Pigcraft](https://sketchfab.com/3d-models/anatomically-correct-human-heart-54fa880728d14c11afff78be8721620a) | CC BY; uso comercial e redistribuição permitidos com atribuição | download; 1 milhão de triângulos, 500 mil vértices; tamanho/meshes não informados | descrição menciona textura; mapas/resolução não informados | microdetalhe externo e estriações declaradas | **não usado**: custo alto, segmentação interna não demonstrada e mapas não auditáveis |
| Dundee “External view of human heart” | [Hannah Newey / University of Dundee](https://sketchfab.com/3d-models/cardiac-anatomy-external-view-of-human-heart-a3f0ea2030214a6bbaa97e7357eebd58) | CC BY-NC-SA; redistribuição não comercial apenas | download; 3 milhões de triângulos, 1,5 milhão de vértices | não informado | anatomia revisada por docente e excelente referência artística | **excluído** por licença não comercial e custo Web |
| HRA UI/CCF | [hra-ui](https://github.com/hubmapconsortium/hra-ui) | código MIT; dados HRA CC BY 4.0 | interfaces e objetos HRA | não é um pacote PBR | boa referência de navegação científica | não substitui os assets atuais |
| Poly Haven Studio Small 09 | [Sergej Majboroda](https://polyhaven.com/a/studio_small_09) | CC0; uso comercial e redistribuição permitidos | HDR/EXR/JPG; 18,54 MB no arquivo destacado, resoluções até 16K | HDRI, não material anatômico | luz neutra de estúdio, softboxes e contraste médio | **não incorporado**: Lightformers locais reproduzem a função com custo e download menores |

## Segunda rodada: candidatos Ultra individuais

Revisão em 30 de agosto de 2026. Nesta rodada nenhum arquivo foi baixado ou integrado. A finalidade é selecionar candidatos realmente diferentes antes de alterar o produto.

| Área | Candidato | Licença | Geometria e material declarados | Avaliação preliminar |
|---|---|---|---|---|
| Coração científico real | [Full Patient Heart from CT — APIL](https://sketchfab.com/3d-models/full-patient-heart-from-ct-with-texture-ae1c46e7f44547b3aea4d79acdb6e6ab) | CC BY 4.0; uso comercial e redistribuição permitidos com atribuição | 493.525 triângulos; segmentado de CT com Mimics e texturizado no Blender | **Prioridade A.** Melhor combinação encontrada de origem clínica e textura. Precisa auditar arquivo, número de meshes, interior, UV e mapas após download autenticado. |
| Coração Web PBR | [Human Heart 3D Model — SahuAvdhesh](https://sketchfab.com/3d-models/human-heart-3d-model-d04d3dc85f584876ac753b68342124d1) | CC BY 4.0 | 24.638 triângulos; declara seis texturas 2K, incluindo color, height, normal e roughness | **Prioridade A/B.** Excelente orçamento Web e inventário PBR declarado. A precisão anatômica e a autoria das texturas precisam de revisão visual e técnica. |
| Coração Web alternativo | [Realistic Human Heart — neshallads](https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089) | CC BY 4.0 | 22.600 triângulos; descrito como detalhado e texturizado | **Prioridade B.** Muito popular e leve, mas a página não publica mapas, resolução nem validação médica. |
| Encéfalo científico | [HRA Brain, Male](https://3d.nih.gov/entries/20960/1) | CC BY 4.0 | 141 estruturas originais espelhadas; derivado do Allen Human Reference Atlas 3D | **Atlas/HD científico.** Superior em segmentação e proveniência; não resolve sozinho o PBR externo. |
| Encéfalo visual PBR | [Anatomical Human Brain — Mox3DModels](https://sketchfab.com/3d-models/anatomical-human-brain-54f1704b47324a3f8063a18176ab7a82) | CC BY 4.0 | 985.121 triângulos; PBR declarado | **Prioridade B experimental.** Visualmente promissor, porém recente, pesado e sem instituição médica ou composição dos mapas publicada. Não deve substituir o HRA sem revisão anatômica. |
| Encéfalo histológico | [BigBrain](https://bigbrainproject.org/maps-and-models.html) | licença varia por conjunto; parte do acervo possui restrição NC | reconstrução histológica 3D a 20 μm; superfícies e volumes científicos, não GLB Web pronto | **Referência científica/pipeline futuro.** Não integrar até verificar a licença do arquivo específico e gerar LODs derivados. |
| Pulmões | [Realistic Human Lungs — neshallads](https://sketchfab.com/3d-models/realistic-human-lungs-ce09f4099a68467880f46e61eb9a3531) | CC BY 4.0 | 63.974 triângulos; texturas declaradas | **Prioridade A visual.** Leve o bastante para Ultra sob demanda. Precisa confirmar lobos, árvore brônquica, UV, mapas e se há meshes separadas. HRA permanece fallback científico. |
| Fígado | [Human liver and gallbladder — ElliotSS](https://sketchfab.com/3d-models/human-liver-and-gallbladder-6c4e9bd0d49f4828b804259330c0c6c4) | CC BY 4.0 | 79.192 triângulos; produzido em disciplina de ilustração médica da Mälardalen University com referências publicadas | **Prioridade A anatômica.** Boa proveniência educacional e inclui vesícula. O material/PBR precisa ser inspecionado no arquivo. |
| Rim seccionado | [[Free] Kidney 3D Model Anatomy — Novsred](https://sketchfab.com/3d-models/free-kidney-3d-model-anatomy-a90191bfce254697b2807848695a0230) | CC BY 4.0 | 41.152 triângulos; artéria, veia, córtex, cápsula, medula, cálices, pelve e ureter declarados | **Prioridade B.** Útil como visualização interna; trabalho escolar sem validação institucional publicada. Revisão médica obrigatória antes do uso. |
| Rim Web PBR | [Kidneys — 9darsh2235](https://sketchfab.com/3d-models/kidneys-356cd9b1ea2d419991820bd7f33033e4) | CC BY 4.0 | 22.978 triângulos; PBR e corte interno declarados | **Somente investigação.** Publicação muito recente e praticamente sem histórico; não aprovado sem inspeção e comparação anatômica. |
| Superfície/pele | [MakeHuman core e skin packs](https://static.makehumancommunity.org/assets/assetpacks/index.html) | assets principais e exports oficiais CC0; confirmar individualmente qualquer asset comunitário | corpo UV-mapeado, skins naturais e variações de sexo/idade; não é atlas interno | **Prioridade A para superfície.** Caminho aberto mais seguro para uma pele realmente texturizada, mantendo o atlas atual como proxy de seleção. Exige exportação reproduzível e alinhamento corporal. |
| Musculatura visual | [Male Full Body Ecorche — Diego Luján García](https://sketchfab.com/3d-models/male-full-body-ecorche-ab11ebff89224f03bd75efede1164cf6) | CC BY 4.0 | 640.470 triângulos; escultura ZBrush de formas musculares | **Prioridade A como camada visual.** Geometria perceptivelmente diferente, mas não substitui as 683 estruturas selecionáveis. Deve ser sobreposta ao atlas ou usada somente no modo Ultra. |
| Musculatura alternativa | [Ecorche — Anatomy Study — Beatriz Gomez](https://sketchfab.com/3d-models/ecorche-anatomy-study-e402d3d541eb4b199c57d5410f5d3c57) | CC BY 4.0 | 419.000 triângulos; estudo anatômico ZBrush | **Prioridade B.** Comparar lado a lado com o candidato de Diego antes do download final. Segmentação e texturas não publicadas. |
| Sistema vascular | [HRA Blood Vasculature](https://3d.nih.gov/users/hra) | dados HRA CC BY 4.0 | modelo corporal baseado no Visible Human; cobertura científica | **Manter como atlas.** Não foi encontrado candidato aberto, texturizado e clinicamente confiável claramente superior. |
| Sistema nervoso | Z-Anatomy/Vayu atualmente instalado | licenças já registradas no projeto | centenas de estruturas selecionáveis; sem texturas PBR | **Manter como atlas.** Nenhum candidato aberto pesquisado superou simultaneamente cobertura, licença e seleção. |

### Referências visuais que não podem ser incorporadas

- [CU Anschutz Plastination Library — liver](https://sketchfab.com/3d-models/liver-b1163b5421194d76a467059eb52a3611): escaneamento de doador humano com excelente referência visual, mas CC BY-NC-SA e política expressa de uso educacional restrito.
- [CU Anschutz — Human Brain Visual Pathway](https://sketchfab.com/3d-models/human-brain-visual-pathway-f82dd24f63804ac58d6e67f5d3c6d431): cérebro plastinado real, porém CC BY-NC-SA.
- [University of Dundee — external heart](https://sketchfab.com/3d-models/cardiac-anatomy-external-view-of-human-heart-a3f0ea2030214a6bbaa97e7357eebd58): revisão anatômica institucional, mas CC BY-NC-SA e 3 milhões de triângulos.
- [SA Anatomy](https://saanatomy.gumroad.com/): sistemas PBR comerciais separados, incluindo musculatura, nervoso, linfático, cardiovascular e órgãos. Serve como referência de qualidade; não comprar ou integrar sem autorização e revisão da licença comercial.

## Shortlist para inspeção antes de implementar

1. **Coração:** APIL CT texturizado versus SahuAvdhesh PBR 2K.
2. **Pulmões:** neshallads, mantendo HRA como fallback e proxy científico.
3. **Fígado:** ElliotSS/Mälardalen University.
4. **Pele:** export oficial MakeHuman CC0 com skin core CC0.
5. **Musculatura:** Diego Luján García como camada visual não selecionável sobre o atlas.
6. **Encéfalo:** manter HRA para estruturas e avaliar Mox somente como casca visual Ultra.
7. **Rim:** nenhum aprovado ainda; baixar somente para auditoria comparativa, não para produção.

Os candidatos do Sketchfab exigem sessão autenticada para baixar os arquivos. Antes de qualquer integração, o próximo gate é baixar somente a shortlist para uma pasta temporária e medir: formato real, tamanho, meshes, materiais, UV, texturas, resolução, extensões glTF, bounds e aparência no mesmo renderer. Nenhum candidato deve entrar em `public/medicine` antes dessa inspeção.

## Restrições técnicas e científicas

- Os GLBs não possuem UV. UVs projetados são gerados em memória somente para microtextura; não codificam vasos, fibras ou estruturas anatômicas.
- AO e thickness anatômicos não serão fabricados. Sem unwrap/bake confiável, um mapa de AO procedural seria visualmente enganoso. A profundidade vem de normais geométricas, normal maps de microrelevo, sombras suaves e iluminação indireta.
- Fibras musculares são deliberadamente sutis: comunicam material, não fascículos individualizados.
- O modo econômico reduz DPR, sombra e resolução dos mapas; não remove o modo realista.
- A malha pulmonar de 22,18 MB permanece sob demanda. Se falhar, o atlas de órgãos continua visível.

## Fontes técnicas

- [Three.js — MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html): workflow PBR, normal map, roughness map e exigência de segundo UV para AO.
- [Three.js — MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html): clearcoat, sheen, transmission e thickness, com o custo adicional por pixel.
- [NIH 3D — FAQ de licenças e citação](https://3d.nih.gov/faqs): a licença deve ser verificada individualmente em cada entrada.
- [HRA Knowledge Graph](https://github.com/hubmapconsortium/hra-kg): código MIT e dados CC BY 4.0.
