import type { AnatomyPartGroup } from "./anatomyPartLibrary";

export type AnatomyPresentation = "Realistas" | "Didáticos";
export interface AnatomyModelCandidate {
  id: string;
  label: string;
  presentation: AnatomyPresentation;
  group: AnatomyPartGroup;
  author: string;
  url: string;
  license: string;
  status: "integrated" | "awaiting-file" | "permission-required" | "download-unconfirmed";
  description: string;
  limitation: string;
}

// Research candidates are deliberately separate from the renderable asset registry.
// A public viewer/download button does not establish local files or native capabilities.
export const anatomyModelSelection: readonly AnatomyModelCandidate[] = [
  {
    id: "neshallads-heart", label: "Coração texturizado", presentation: "Realistas", group: "Órgãos",
    author: "neshallads", url: "https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089",
    license: "CC BY 4.0", status: "integrated",
    description: "Modelo artístico com textura orgânica para estudar a superfície cardíaca.",
    limitation: "Integrado como superfície externa única, com texturas 2K. Sem estruturas internas separáveis.",
  },
  {
    id: "sgu-lung", label: "Pulmão real escaneado", presentation: "Realistas", group: "Órgãos",
    author: "SGU · Center for Biomedical Visualization", url: "https://sketchfab.com/3d-models/human-right-lung-anatomy-3d-cadaver-scan-7dcd1ef3ff0a42e1b10f90391c8cb1a2",
    license: "Redistribuição não confirmada", status: "download-unconfirmed",
    description: "Scan de espécime humano para observar textura e irregularidades superficiais.",
    limitation: "Referência externa. Não foi confirmado download autorizado para integrar ao Flora.",
  },
  {
    id: "unam-skull", label: "Crânio desmontável", presentation: "Didáticos", group: "Ossos e articulações",
    author: "EVE3D UNAM", url: "https://sketchfab.com/3d-models/eve3d-craneo-humano-desarticulado-08e1a0df9d8942ec8e3bd09d6f482b11",
    license: "CC BY-NC 4.0", status: "permission-required",
    description: "Crânio derivado de tomografia, com ossos diferenciados por cores.",
    limitation: "Licença não comercial. A integração depende de autorização compatível e teste das malhas.",
  },
  {
    id: "sgu-brain", label: "Cérebro com estruturas internas", presentation: "Didáticos", group: "Órgãos",
    author: "SGU · Brandon L. Holt", url: "https://sketchfab.com/3d-models/human-brain-with-internal-structures-95b4e19bb32c4edeb46fcb3db048037c",
    license: "Redistribuição não confirmada", status: "download-unconfirmed",
    description: "Referência de exploração das estruturas internas do encéfalo.",
    limitation: "Referência externa. Arquivo e permissão para importação não confirmados.",
  },
  {
    id: "ct-foot", label: "Esqueleto do pé · tomografia", presentation: "Didáticos", group: "Ossos e articulações",
    author: "alebogino", url: "https://sketchfab.com/3d-models/huesos-del-pie-f05a793150904c3d848f35f3726d2af3",
    license: "CC BY 4.0", status: "awaiting-file",
    description: "Reconstrução do pé direito a partir de tomografia.",
    limitation: "Aguardar arquivo e revisão de possíveis pontes entre ossos. Separação ainda não validada.",
  },
  {
    id: "ct-skeleton", label: "Esqueleto · ossos individuais", presentation: "Didáticos", group: "Ossos e articulações",
    author: "Terrie Simmons-Ehrhardt · fonte MySegmenter", url: "https://sketchfab.com/3d-models/human-skeleton-911b9df7e7834175b69b4840ea15e054",
    license: "CC BY 4.0 · NoAI", status: "awaiting-file",
    description: "Ossos separados de tomografia e organizados como mesa de estudo osteológico.",
    limitation: "Aguardar arquivo e validação. Não enviar o modelo para IA generativa.",
  },
  {
    id: "witmerlab-skull", label: "Crânio em expansão", presentation: "Didáticos", group: "Ossos e articulações",
    author: "WitmerLab · Ohio University", url: "https://sketchfab.com/3d-models/visible-interactive-human-exploding-skull-252887e2e755427c90d9e3d0c6d3025f",
    license: "CC BY-NC-ND 4.0", status: "permission-required",
    description: "Crânio de tomografia com animação que afasta os ossos e expõe superfícies internas.",
    limitation: "Referência de interação. Integração comercial ou compartilhamento de adaptações exige autorização.",
  },
];

export const anatomyCandidateStatus = {
  "integrated": "Disponível no Flora",
  "awaiting-file": "Aguardando arquivo e validação",
  "permission-required": "Depende de autorização",
  "download-unconfirmed": "Download não confirmado",
} as const;

export function matchesAnatomyQuery(text: string, query: string) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const haystack = normalize(text);
  return normalize(query).trim().split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
}
