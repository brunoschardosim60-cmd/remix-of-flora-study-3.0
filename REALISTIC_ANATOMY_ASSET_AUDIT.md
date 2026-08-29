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

## Prova de conceito escolhida

O coração externo Z-Anatomy foi escolhido porque já está no produto, possui 538.040 triângulos e nove malhas selecionáveis (parede, aorta, coronárias e veias cavas). Ele permite demonstrar melhora material sem sacrificar anatomia nem introduzir uma nova licença.

O POC deve:

1. substituir a cor lisa por albedo procedural sutil;
2. usar normal map para microrelevo sem alterar anatomia;
3. usar roughness map para quebrar o highlight plástico;
4. distinguir miocárdio, artérias e veias pelos nomes/IDs já validados;
5. reduzir clearcoat/transmission a valores biologicamente plausíveis;
6. manter todos os nove alvos selecionáveis e o fallback didático;
7. preservar o coração HRA de 14 malhas para interior, corte e transparência.

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

