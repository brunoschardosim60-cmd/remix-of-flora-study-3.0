export const anatomySpecimens = [{
  id: "neshallads-heart",
  label: "Coração texturizado",
  path: "/medicine/models/neshallads-heart-realistic-v1.glb",
  author: "neshallads",
  sourceUrl: "https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  bytes: 7555476,
  sha256: "5ca211d7ced50856a70cdd0df58e38e1ba3091b2007676d62b5f393ba5629ab7",
  triangles: 22562,
  description: "Superfície cardíaca com texturas originais 2K. Modelo artístico, não scan de um doador.",
  limitation: "Uma única malha externa: câmaras, valvas e vasos não são peças selecionáveis neste arquivo.",
  didacticPartId: "heart",
}] as const;
export type AnatomySpecimen = typeof anatomySpecimens[number];
