/**
 * Visitas guiadas narradas pelo Corpo 3D. Cada parada aponta para uma estrutura que existe em
 * `anatomy3DStructures` e usa texto conservador, alinhado às fontes já listadas em `medicalSources`.
 */
export interface AnatomyTourStop {
  structureId: string;
  title: string;
  narration: string;
  /** Pergunta de reflexão curta exibida ao final da parada (sem resposta numérica de memória). */
  reflection?: string;
}

export interface AnatomyTour {
  id: string;
  title: string;
  description: string;
  sourceIds: string[];
  stops: AnatomyTourStop[];
}

export const anatomyGuidedTours: AnatomyTour[] = [
  {
    id: "circulacao-e-respiracao",
    title: "Do ar ao sangue: tórax",
    description: "Pulmões, coração e como o oxigênio chega aos tecidos.",
    sourceIds: ["openstaxHeart", "openstaxRespiratory"],
    stops: [
      {
        structureId: "organ-lungs",
        title: "Pulmões",
        narration: "Começamos pelos pulmões. Os dois pulmões ocupam as cavidades pleurais e ladeiam o mediastino. É nos alvéolos que o ar encosta nos capilares e ocorrem as trocas gasosas: o oxigênio entra no sangue e o gás carbônico sai.",
        reflection: "Por que o pulmão esquerdo costuma ter um formato diferente do direito?",
      },
      {
        structureId: "organ-heart",
        title: "Coração",
        narration: "Entre os pulmões, no mediastino, está o coração. É um órgão muscular oco com quatro câmaras, dois átrios e dois ventrículos, que mantém o sangue em movimento pelas circulações pulmonar e sistêmica.",
        reflection: "Qual circulação sai do ventrículo direito e qual sai do esquerdo?",
      },
      {
        structureId: "organ-heart-right-atrium",
        title: "Átrio direito",
        narration: "O átrio direito recebe o sangue venoso que volta do corpo. Dele, o sangue passa pela valva tricúspide para o ventrículo direito.",
      },
      {
        structureId: "organ-heart-left-ventricle",
        title: "Ventrículo esquerdo",
        narration: "O ventrículo esquerdo bombeia o sangue oxigenado para a aorta e, daí, para a circulação sistêmica. Por precisar vencer uma resistência maior, sua parede é mais espessa que a do ventrículo direito.",
        reflection: "O que muda na parede do ventrículo quando a pressão que ele enfrenta aumenta por muito tempo?",
      },
      {
        structureId: "organ-heart-aortic-valve",
        title: "Valva aórtica",
        narration: "Entre o ventrículo esquerdo e a aorta fica a valva aórtica. Ela se abre durante a sístole e se fecha em seguida, impedindo o refluxo de sangue para o ventrículo.",
      },
    ],
  },
  {
    id: "digestorio-e-urinario",
    title: "Abdome: digerir, filtrar, eliminar",
    description: "Do fígado aos rins e à bexiga.",
    sourceIds: ["openstaxDigestive", "openstaxKidney"],
    stops: [
      {
        structureId: "organ-liver",
        title: "Fígado",
        narration: "O fígado é uma grande glândula situada sob o hemidiafragma direito. Ele produz bile, sintetiza proteínas plasmáticas e processa substâncias absorvidas no intestino, que chegam a ele pela veia porta.",
        reflection: "Por que o sangue vindo do intestino passa pelo fígado antes de seguir para o resto do corpo?",
      },
      {
        structureId: "organ-stomach",
        title: "Estômago",
        narration: "O estômago é um órgão muscular dilatado entre o esôfago e o duodeno. Ele armazena o alimento, mistura e inicia etapas da digestão química.",
      },
      {
        structureId: "organ-pancreas",
        title: "Pâncreas",
        narration: "Atrás do estômago fica o pâncreas, que tem função exócrina, liberando enzimas digestivas no duodeno, e função endócrina, liberando hormônios como a insulina e o glucagon.",
      },
      {
        structureId: "organ-intestines",
        title: "Intestinos",
        narration: "O intestino delgado continua a digestão e absorve a maior parte dos nutrientes. O intestino grosso absorve água e eletrólitos e forma o conteúdo fecal.",
      },
      {
        structureId: "organ-kidneys",
        title: "Rins",
        narration: "Os rins ficam no retroperitônio, um de cada lado da coluna. Eles filtram o plasma e regulam água, eletrólitos e equilíbrio ácido-base, formando a urina.",
        reflection: "Como a urina chega dos rins até a bexiga?",
      },
      {
        structureId: "organ-bladder",
        title: "Bexiga urinária",
        narration: "A bexiga é um órgão muscular oco na pelve que recebe a urina pelos ureteres e a armazena até a micção.",
      },
    ],
  },
  {
    id: "cabeca-e-sentidos",
    title: "Cabeça: controle e sentidos",
    description: "Encéfalo, olhos, orelha interna e tireoide.",
    sourceIds: ["openstaxCns", "openstaxEndocrine"],
    stops: [
      {
        structureId: "organ-brain",
        title: "Encéfalo",
        narration: "O encéfalo reúne cérebro, cerebelo e tronco encefálico. Ele integra informações sensoriais, coordena respostas e participa da regulação das funções vitais.",
        reflection: "Qual parte do encéfalo se continua com a medula espinal?",
      },
      {
        structureId: "organ-eyes",
        title: "Olhos",
        narration: "Os olhos ficam nas órbitas. A luz é focalizada sobre a retina, onde é transformada em sinais nervosos que seguem pelas vias ópticas até o encéfalo.",
      },
      {
        structureId: "organ-inner-ear",
        title: "Orelha interna",
        narration: "Na orelha interna ficam a cóclea, ligada à audição, e o sistema vestibular, ligado ao equilíbrio.",
      },
      {
        structureId: "organ-thyroid",
        title: "Tireoide",
        narration: "No pescoço, a tireoide é uma glândula endócrina que produz hormônios envolvidos na regulação do metabolismo.",
      },
    ],
  },
];
