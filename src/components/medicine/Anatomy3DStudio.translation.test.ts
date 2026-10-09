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
    ["Olfactory_bulb_L", "Bulbo olfatório esquerdo"],
    ["Piriform_region_R", "Região piriforme direita"],
    ["VH_F_porta_hepatis", "Porta do fígado"],
    ["Bronchopulmonary_segment_L", "Segmento broncopulmonar esquerdo"],
    ["Hilum_uppe_L", "Hilo superior esquerdo"],
    ["Lateral_bronchopulmonary_segmennt_R", "Segmento broncopulmonar lateral direito"],
    ["VH_F_gastric_impression_of_right_liver", "Impressão gástrica do fígado direito"],
    ["VH_F_capsule_of_the_right_liver", "Cápsula do fígado direito"],
    ["VH_F_coronary_ligament_of_liver", "Ligamento coronário do fígado"],
    ["VH_F_ligamentum_venosum", "Ligamento venoso"],
    ["VH_F_superomedial_segment1_L", "Segmento I superomedial esquerdo"],
    ["VH_F_renal_pyramid_L_h", "Pirâmide renal esquerda H"],
    ["VH_F_renal_pyramid_R_c", "Pirâmide renal direita C"],
    ["Parietal Bone", "Osso parietal"],
    ["Inferior Nasal Concha Bone", "Osso da concha nasal inferior"],
    ["Deltoid Muscle", "Músculo deltoide"],
  ])("traduz %s com ordem e concordância anatômicas", (rawName, expected) => {
    expect(translateAnatomyName(rawName, "organs", 0)).toBe(expected);
  });
});
