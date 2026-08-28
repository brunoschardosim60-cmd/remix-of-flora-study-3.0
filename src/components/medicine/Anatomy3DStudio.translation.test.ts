import { describe, expect, it } from "vitest";
import { translateAnatomyName } from "./Anatomy3DStudio";

describe("translateAnatomyName", () => {
  it.each([
    ["Inferior_vena_cava_(abdominal_part)", "Parte abdominal da veia cava inferior"],
    ["Angular_artery.r", "Artéria angular direita"],
    ["(Accessory_parotid_gland)l", "Glândula parótida acessória esquerda"],
    ["Ductus_deferensl", "Ducto deferente esquerdo"],
    ["Anterior_semilunar_leaflet_of_pulmonary_valve", "Folheto semilunar anterior da valva pulmonar"],
    ["Cingulate_gyrus_(Posteroventral_part*)l.", "Parte posteroventral do giro do cíngulo esquerda"],
    ["Superficial_palmar_archl", "Arco palmar superficial esquerdo"],
    ["Posterior_cord_of_brachial_plexus.r", "Cordão posterior do plexo braquial direito"],
    ["Middle_cerebral_artery_M1-segment.r", "Artéria cerebral média — segmento M1 direito"],
    ["Middle_cerebral_artery_(M1-segment)r.", "Artéria cerebral média — segmento M1 direito"],
  ])("traduz %s com ordem e concordância anatômicas", (rawName, expected) => {
    expect(translateAnatomyName(rawName, "organs", 0)).toBe(expected);
  });
});
