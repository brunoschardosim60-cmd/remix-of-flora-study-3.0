import type { SurgicalScenario } from "@/lib/surgicalSimulation";

export interface SurgicalScenarioVisual {
  surfaceImage: string;
  anatomyImage: string;
  surfaceAlt: string;
  anatomyAlt: string;
  target: { x: number; y: number };
  visualLabel: string;
}

export const surgicalScenarioVisuals: Record<SurgicalScenario["id"], SurgicalScenarioVisual> = {
  "acute-abdomen": {
    surfaceImage: "/medicine/surgery/acute-abdomen-surface-v1.png",
    anatomyImage: "/medicine/surgery/acute-abdomen-anatomy-v1.png",
    surfaceAlt: "Simulador abdominal sintético com pele realista e campo estéril",
    anatomyAlt: "Modelo abdominal sintético aberto mostrando parede e região ileocecal",
    target: { x: 63, y: 55 },
    visualLabel: "Simulador abdominal de alta fidelidade",
  },
  "thoracic-trauma": {
    surfaceImage: "/medicine/surgery/thoracic-trauma-surface-v1.png",
    anatomyImage: "/medicine/surgery/thoracic-trauma-anatomy-v1.png",
    surfaceAlt: "Simulador torácico sintético com pele realista, equimose e campo estéril",
    anatomyAlt: "Módulo torácico sintético mostrando parede, costela, pleura e pulmão",
    target: { x: 43, y: 48 },
    visualLabel: "Simulador torácico de alta fidelidade",
  },
  "open-limb-trauma": {
    surfaceImage: "/medicine/surgery/open-limb-trauma-surface-v1.png",
    anatomyImage: "/medicine/surgery/open-limb-trauma-anatomy-v1.png",
    surfaceAlt: "Simulador sintético de coxa e joelho com pele realista e campo estéril",
    anatomyAlt: "Módulo sintético de joelho mostrando músculos, ossos, ligamentos, vasos e nervos",
    target: { x: 58, y: 51 },
    visualLabel: "Simulador ortopédico de alta fidelidade",
  },
  "cranial-emergency": {
    surfaceImage: "/medicine/surgery/cranial-emergency-surface-v1.png",
    anatomyImage: "/medicine/surgery/cranial-emergency-anatomy-v1.png",
    surfaceAlt: "Simulador craniano sintético com couro cabeludo realista e campo estéril",
    anatomyAlt: "Módulo craniano sintético mostrando calota, meninges e encéfalo",
    target: { x: 45, y: 47 },
    visualLabel: "Simulador craniano de alta fidelidade",
  },
};
