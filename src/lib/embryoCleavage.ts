/**
 * Etapas esquemáticas da fertilização até a implantação. Tempos aproximados (variam entre indivíduos):
 * clivagem em 2 células em ~30 h, 4 células ~2º dia, 8 células ~3º dia, mórula ~4º dia,
 * blastocisto ~5º dia, início da implantação ~6º-7º dia.
 */
export type CleavageVisual = "sperm-approach" | "sperm-entry" | "zygote" | "cells" | "morula" | "blastocyst" | "implantation";

export interface CleavageStep {
  id: string;
  /** Rótulo de tempo exibido ao aluno. */
  time: string;
  title: string;
  location: string;
  description: string;
  visual: CleavageVisual;
  /** Número de células (blastômeros) quando aplicável. */
  cells?: number;
}

export const cleavageSourceIds = ["openstaxEmbryonic"];

export const cleavageSteps: CleavageStep[] = [
  {
    id: "approach", time: "Dia 0", title: "Espermatozoides se aproximam do oócito", location: "Ampola da tuba uterina", visual: "sperm-approach",
    description: "O oócito secundário, envolto pela zona pelúcida e pela corona radiata, aguarda na ampola da tuba uterina. Espermatozoides capacitados chegam até ele.",
  },
  {
    id: "entry", time: "Dia 0", title: "Um espermatozoide penetra o oócito", location: "Ampola da tuba uterina", visual: "sperm-entry",
    description: "A reação acrossômica libera enzimas que ajudam o espermatozoide a atravessar a zona pelúcida. Após a fusão das membranas, a reação cortical do oócito dificulta a entrada de outros espermatozoides (bloqueio da polispermia).",
  },
  {
    id: "zygote", time: "Dia 0–1", title: "Zigoto: união dos pronúcleos", location: "Tuba uterina", visual: "zygote", cells: 1,
    description: "O oócito completa a segunda divisão meiótica. Os pronúcleos materno e paterno se aproximam e os cromossomos se reúnem, restaurando o número diploide (46) na célula única: o zigoto.",
  },
  {
    id: "two", time: "~30 horas", title: "Clivagem: 2 células", location: "Tuba uterina", visual: "cells", cells: 2,
    description: "Começam as divisões mitóticas rápidas chamadas clivagem. As células-filhas (blastômeros) ficam menores a cada divisão, pois o conjunto não cresce: continua dentro da zona pelúcida.",
  },
  {
    id: "four", time: "~2º dia", title: "4 células", location: "Tuba uterina", visual: "cells", cells: 4,
    description: "Os blastômeros continuam se dividindo, ainda em um conjunto do mesmo tamanho total. O embrião é transportado lentamente pela tuba em direção ao útero.",
  },
  {
    id: "eight", time: "~3º dia", title: "8 células e compactação", location: "Tuba uterina", visual: "cells", cells: 8,
    description: "Por volta de 8 células ocorre a compactação: os blastômeros se aderem com mais firmeza, aumentando o contato entre eles.",
  },
  {
    id: "morula", time: "~4º dia", title: "Mórula", location: "Chegada ao útero", visual: "morula", cells: 16,
    description: "Uma esfera maciça de cerca de 16 a 32 células, semelhante a uma amora. As células externas e internas começam a se diferenciar.",
  },
  {
    id: "blastocyst", time: "~5º dia", title: "Blastocisto", location: "Cavidade uterina", visual: "blastocyst",
    description: "Surge uma cavidade cheia de líquido, o blastocele. As células externas formam o trofoblasto (origem de parte da placenta) e as internas formam a massa celular interna (origem do embrioblasto).",
  },
  {
    id: "implantation", time: "~6º–7º dia", title: "Início da implantação", location: "Endométrio", visual: "implantation",
    description: "Após eclodir da zona pelúcida, o blastocisto adere ao endométrio pelo lado da massa celular interna. O trofoblasto começa a invadir o tecido materno, iniciando a implantação.",
  },
];
