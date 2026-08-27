# Atribuições — Histologia e Órgãos dos Sentidos

Os arquivos desta pasta são mantidos em sua resolução original. Não foram recriados, esticados, borrados para simular aumento nem gerados por IA. A interface distingue **fotografia clínica**, **micrografia real**, **modelo 3D**, **ilustração anatômica** e **esquema didático**.

## Fotografias e microscopia reais (`real/`)

### Olho humano externo

- Arquivo: `eye-external-real.jpg` — 3.072 × 2.048 px, original integral.
- Autor: Lourie Pieterse.
- Licença: CC BY-SA 3.0.
- Fonte: https://commons.wikimedia.org/wiki/File:Close_up_of_eye.jpg
- Uso no módulo: fotografia padrão da etapa **Olho nu**. A glândula lacrimal não é marcada nessa foto porque fica profunda à região superolateral da órbita; ela permanece em um mapa anatômico separado.

### Boca e lábios externos

- Arquivo: `oral-external-real.jpg` — 5.760 × 3.840 px, original integral.
- Autor: Genusfotografen (Tomas Gunnarsson) / Wikimedia Sverige.
- Licença: CC BY-SA 4.0.
- Fonte: https://commons.wikimedia.org/wiki/File:Adult_human_mouth.jpg

### Palato, úvula e orofaringe

- Arquivo: `oral-cavity-real.jpg` — 2.318 × 2.318 px, original integral.
- Autor: Luigithemetal64.
- Licença: CC BY-SA 3.0.
- Fonte: https://commons.wikimedia.org/wiki/File:Palatine_Uvula.jpg
- Uso no módulo: fotografia clínica da cavidade oral. A aparência corresponde à pessoa fotografada e não estabelece um padrão universal de normalidade.

### Células humanas em microscopia multiphoton

- Arquivo: `hela-cell-real.jpg` — 2.400 × 1.999 px, original integral.
- Autor/organização: National Institutes of Health (NIH).
- Situação de direitos: domínio público nos Estados Unidos, obra do governo federal.
- Fonte: https://commons.wikimedia.org/wiki/File:HeLa-I.jpg
- Metadados visuais: células HeLa cultivadas; DNA em ciano, microtúbulos em verde e complexo de Golgi em laranja. As cores resultam de marcações fluorescentes, não representam as cores naturais das estruturas.

## OpenStax (`openstax/`)

Fonte: *Anatomy and Physiology* e *Anatomy and Physiology 2e*, OpenStax, Rice University.

- Site e créditos: https://openstax.org/details/books/anatomy-and-physiology-2e
- Licença indicada pelo provedor: CC BY 4.0, salvo indicação específica no crédito incorporado ao material.
- Arquivos utilizados: `animal-cell.jpg`, `eye-anatomy.jpg`, `eye-external.jpg`, `eye-muscles.jpg`, `oral-cavity.jpg`, `retina-photoreceptors.jpg`, `salivary-glands.jpg`, `teeth-types.jpg`, `tongue-anatomy.jpg`, `tongue-taste.jpg`, `tooth-section.jpg`, `epithelial-types.jpg`, `connective-adipose.jpg`, `connective-cartilage.jpg`, `connective-dense.jpg`, `muscle-types.jpg`.
- Páginas de referência:
  - https://openstax.org/books/anatomy-and-physiology-2e/pages/3-2-the-cytoplasm-and-cellular-organelles
  - https://openstax.org/books/anatomy-and-physiology-2e/pages/4-1-types-of-tissues
  - https://openstax.org/books/anatomy-and-physiology/pages/14-1-sensory-perception
  - https://openstax.org/books/anatomy-and-physiology-2e/pages/11-3-axial-muscles-of-the-head-neck-and-back
  - https://openstax.org/books/anatomy-and-physiology-2e/pages/23-3-the-mouth-pharynx-and-esophagus

Os esquemas originais contêm alguns rótulos em inglês. A camada interativa do Flora apresenta os nomes, funções e descrições em português sem adulterar a imagem-fonte.

## Wikimedia Commons (`commons/`)

### Retina

- Autor: Librepath.
- Licença: CC BY-SA 3.0.
- Arquivos: `retina-low.jpg`, `retina-intermediate.jpg`, `retina-high.jpg`.
- Fontes:
  - https://commons.wikimedia.org/wiki/File:Optic_nerve_head_and_retina_--_low_mag.jpg
  - https://commons.wikimedia.org/wiki/File:Retina_--_intermed_mag.jpg
  - https://commons.wikimedia.org/wiki/File:Retina_--_high_mag.jpg

Os botões 4x, 10x e 40x são níveis didáticos de navegação. A interface não afirma que esses números sejam os metadados de aquisição das fotografias; o usuário é encaminhado à fonte para conferir a ampliação original.

### Tecido nervoso

- Autor/organização: OpenStax College.
- Licença: CC BY 3.0.
- Arquivo: `nervous-tissue.jpg`.
- Fonte: https://commons.wikimedia.org/wiki/File:416_Nervous_Tissue-new.jpg

### Glândula salivar

- Autor: Otávio Astor Vaz Costa.
- Licença: CC BY 4.0.
- Arquivo: `salivary-gland.jpg`.
- Fonte: https://commons.wikimedia.org/wiki/File:Histological_section_of_salivary_gland,_with_zoom.jpg

## Modelo 3D do olho

O módulo reutiliza `../models/zanatomy-organ-eye-v1.glb` e o perfil `eye` de `src/lib/organRealism.ts`. Sua procedência, licença e cadeia de conversão estão documentadas em `public/medicine/models/ATTRIBUTION.md`.

## Uso educacional

O material é destinado ao estudo. Ele não substitui lâminas de laboratório, atlas histológico validado, supervisão docente, avaliação clínica ou diagnóstico.
