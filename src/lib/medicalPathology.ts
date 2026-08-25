export type PathologyOrganId = "lungs" | "heart" | "liver" | "kidney" | "brain";

export interface PathologyStage {
  label: string;
  title: string;
  description: string;
}

export interface PathologyHotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  description: string;
}

export interface PathologyQuestion {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface MedicalPathology {
  id: PathologyOrganId;
  organ: string;
  condition: string;
  system: string;
  accent: string;
  image: string;
  imageAlt: string;
  healthy: string;
  pathological: string;
  visualLimit: string;
  stages: PathologyStage[];
  hotspots: PathologyHotspot[];
  causes: string[];
  findings: string[];
  tests: string[];
  question: PathologyQuestion;
  source: { title: string; organization: string; url: string };
}

export const medicalPathologies: MedicalPathology[] = [
  {
    id: "lungs",
    organ: "Pulmões",
    condition: "Enfisema relacionado ao tabagismo",
    system: "Respiratório",
    accent: "#a95f63",
    image: "/medicine/pathology/lungs-emphysema-comparison-v1.png",
    imageAlt: "Comparação educacional entre pulmões saudáveis e pulmões com alterações enfisematosas",
    healthy: "Parênquima elástico, espaços aéreos pequenos e grande área disponível para trocas gasosas.",
    pathological: "Destruição de septos alveolares, aumento permanente dos espaços aéreos e perda de recolhimento elástico.",
    visualLimit: "A prancha representa um padrão macroscópico avançado. Cor isolada não diagnostica tabagismo nem DPOC.",
    stages: [
      { label: "1", title: "Exposição e inflamação", description: "Irritantes inalados podem manter inflamação das vias aéreas e do parênquima em pessoas suscetíveis." },
      { label: "2", title: "Destruição alveolar", description: "A perda de paredes alveolares reduz a superfície de troca e a sustentação das pequenas vias aéreas." },
      { label: "3", title: "Hiperinsuflação e bolhas", description: "Espaços aéreos confluentes e perda elástica podem favorecer aprisionamento de ar e formação de bolhas." },
    ],
    hotspots: [
      { id: "bullae", label: "Bolhas enfisematosas", x: 75, y: 31, description: "Espaços aéreos anormalmente ampliados por destruição do tecido pulmonar adjacente." },
      { id: "septa", label: "Perda de septos", x: 68, y: 59, description: "Menos paredes alveolares significam menor área funcional para difusão gasosa." },
      { id: "hyperinflation", label: "Hiperinsuflação", x: 84, y: 73, description: "O órgão pode permanecer excessivamente distendido pela dificuldade de esvaziamento." },
    ],
    causes: ["Tabagismo e fumaça passiva", "Exposição prolongada a partículas e gases", "Deficiência de alfa-1 antitripsina em uma minoria dos casos"],
    findings: ["Dispneia progressiva", "Limitação persistente ao fluxo aéreo", "Aprisionamento aéreo e redução da difusão em contextos compatíveis"],
    tests: ["Espirometria pós-broncodilatador", "Oximetria e avaliação funcional", "Imagem quando clinicamente indicada"],
    question: {
      prompt: "Qual alteração estrutural é central no enfisema?",
      options: ["Destruição de paredes alveolares", "Espessamento isolado da pleura", "Acúmulo de líquido no pericárdio", "Calcificação da traqueia"],
      answer: 0,
      explanation: "O enfisema envolve aumento permanente dos espaços aéreos distais associado à destruição de suas paredes, com perda de superfície e elasticidade.",
    },
    source: { title: "COPD — Causes and Risk Factors", organization: "NHLBI · NIH", url: "https://www.nhlbi.nih.gov/health/copd/causes" },
  },
  {
    id: "heart",
    organ: "Coração",
    condition: "Cicatriz após infarto do miocárdio",
    system: "Cardiovascular",
    accent: "#b9535f",
    image: "/medicine/pathology/heart-infarction-comparison-v1.png",
    imageAlt: "Comparação educacional entre coração saudável e coração com cicatriz após infarto",
    healthy: "Miocárdio viável e espessura ventricular preservada, capaz de contrair de forma coordenada.",
    pathological: "Após necrose isquêmica, a área lesada pode cicatrizar com tecido fibroso que não contrai como o músculo saudável.",
    visualLimit: "A localização e a extensão reais variam conforme o vaso, o tempo até reperfusão e o tratamento. A imagem não representa um ECG ou exame de imagem.",
    stages: [
      { label: "1", title: "Isquemia", description: "A obstrução reduz subitamente o fornecimento de oxigênio a um território do miocárdio." },
      { label: "2", title: "Lesão e necrose", description: "Sem reperfusão oportuna, cardiomiócitos podem morrer e uma resposta inflamatória organiza a área." },
      { label: "3", title: "Cicatriz e remodelamento", description: "Tecido fibroso substitui parte do músculo perdido e pode alterar geometria e função ventricular." },
    ],
    hotspots: [
      { id: "scar", label: "Cicatriz fibrosa", x: 82, y: 66, description: "Área pálida que representa substituição de miocárdio por tecido cicatricial." },
      { id: "wall", label: "Parede remodelada", x: 76, y: 78, description: "A parede pode afinar ou mudar de curvatura conforme a extensão da lesão." },
      { id: "viable", label: "Miocárdio preservado", x: 68, y: 45, description: "Regiões não infartadas continuam trabalhando, mas podem sofrer maior carga funcional." },
    ],
    causes: ["Ruptura de placa e trombose coronariana", "Outros mecanismos de desequilíbrio entre oferta e demanda", "Condições coronarianas menos comuns"],
    findings: ["Dor ou desconforto torácico pode ocorrer", "Alterações eletrocardiográficas variáveis", "Elevação de troponina no contexto clínico adequado"],
    tests: ["ECG seriado", "Troponina de alta sensibilidade", "Ecocardiograma e outros métodos de imagem quando indicados"],
    question: {
      prompt: "Por que uma cicatriz extensa pode reduzir o bombeamento cardíaco?",
      options: ["Tecido cicatricial não contrai como miocárdio viável", "A cicatriz aumenta o número de válvulas", "O sangue deixa de entrar nos átrios", "Toda cicatriz bloqueia a aorta"],
      answer: 0,
      explanation: "O tecido fibroso dá sustentação à área curada, mas não possui a capacidade contrátil do miocárdio que substituiu.",
    },
    source: { title: "What is a Heart Attack?", organization: "American Heart Association", url: "https://www.heart.org/en/health-topics/heart-attack/about-heart-attacks" },
  },
  {
    id: "liver",
    organ: "Fígado",
    condition: "Cirrose",
    system: "Digestório e metabólico",
    accent: "#9a6752",
    image: "/medicine/pathology/liver-cirrhosis-comparison-v1.png",
    imageAlt: "Comparação educacional entre fígado saudável e fígado com alterações cirróticas",
    healthy: "Superfície lisa e arquitetura organizada para metabolismo, síntese, armazenamento e fluxo biliar.",
    pathological: "Fibrose difusa e nódulos regenerativos distorcem a arquitetura, o fluxo sanguíneo e a função hepática.",
    visualLimit: "Uma superfície nodular sugere alteração avançada, mas a causa e a gravidade exigem história, exames laboratoriais e imagem apropriada.",
    stages: [
      { label: "1", title: "Lesão persistente", description: "Agressões crônicas podem manter inflamação e ativar deposição de matriz extracelular." },
      { label: "2", title: "Fibrose em pontes", description: "Faixas de cicatriz conectam regiões e começam a distorcer a arquitetura vascular e lobular." },
      { label: "3", title: "Cirrose estabelecida", description: "Nódulos regenerativos cercados por fibrose alteram forma, consistência e função do órgão." },
    ],
    hotspots: [
      { id: "nodules", label: "Nódulos regenerativos", x: 77, y: 35, description: "Ilhas de parênquima cercadas por tecido fibroso produzem o aspecto nodular." },
      { id: "bands", label: "Septos fibrosos", x: 69, y: 56, description: "Bandas de colágeno distorcem a organização normal e o trajeto do fluxo sanguíneo." },
      { id: "contour", label: "Contorno irregular", x: 86, y: 70, description: "A superfície deixa de ser lisa conforme fibrose e regeneração se tornam difusas." },
    ],
    causes: ["Doença hepática associada ao álcool", "Esteato-hepatite metabólica", "Hepatites virais crônicas e outras hepatopatias"],
    findings: ["Pode ser assintomática por anos", "Sinais de hipertensão portal", "Redução progressiva da função de síntese e depuração"],
    tests: ["Exames hepáticos e função de síntese", "Ultrassom, elastografia ou outros métodos de imagem", "Biópsia em situações selecionadas"],
    question: {
      prompt: "Qual processo define melhor a arquitetura da cirrose?",
      options: ["Fibrose difusa com nódulos regenerativos", "Apenas aumento da vesícula biliar", "Dilatação isolada do estômago", "Ausência completa de vasos"],
      answer: 0,
      explanation: "A cirrose é caracterizada por cicatrização difusa e nódulos regenerativos que reorganizam de forma anormal o parênquima hepático.",
    },
    source: { title: "Cirrhosis", organization: "NIDDK · NIH", url: "https://www.niddk.nih.gov/health-information/liver-disease/cirrhosis" },
  },
  {
    id: "kidney",
    organ: "Rim",
    condition: "Hidronefrose",
    system: "Urinário",
    accent: "#8c6b70",
    image: "/medicine/pathology/kidney-hydronephrosis-comparison-v1.png",
    imageAlt: "Comparação educacional em corte entre rim saudável e rim com hidronefrose",
    healthy: "Córtex e medula preservados drenam urina por cálices estreitos para a pelve renal e o ureter.",
    pathological: "A dificuldade de drenagem pode dilatar pelve e cálices; quando persistente, comprime e afina o parênquima.",
    visualLimit: "Hidronefrose descreve dilatação, não sua causa. A imagem avançada não permite concluir obstrução, função renal ou urgência sozinha.",
    stages: [
      { label: "1", title: "Dilatação da pelve", description: "A pelve renal começa a ampliar quando a urina encontra resistência ao escoamento." },
      { label: "2", title: "Dilatação dos cálices", description: "O aumento de pressão deforma progressivamente cálices e papilas." },
      { label: "3", title: "Afinamento do parênquima", description: "Obstrução importante e persistente pode comprimir o tecido funcional e comprometer a função." },
    ],
    hotspots: [
      { id: "pelvis", label: "Pelve dilatada", x: 72, y: 55, description: "O centro coletor está ampliado em comparação com a pelve estreita do rim saudável." },
      { id: "calyces", label: "Cálices ampliados", x: 82, y: 34, description: "Cálices arredondados refletem distensão do sistema coletor." },
      { id: "parenchyma", label: "Parênquima comprimido", x: 88, y: 70, description: "A faixa de tecido funcional se torna mais fina em apresentações avançadas e prolongadas." },
    ],
    causes: ["Cálculo ou estreitamento da via urinária", "Compressão ou alteração funcional do trato urinário", "Anomalias congênitas e outras causas"],
    findings: ["Dor pode ocorrer em obstrução aguda", "Infecção associada aumenta a urgência", "Pode ser silenciosa quando se instala gradualmente"],
    tests: ["Ultrassonografia", "Função renal e exame de urina", "Tomografia ou avaliação funcional conforme o contexto"],
    question: {
      prompt: "Qual estrutura se dilata diretamente na hidronefrose?",
      options: ["Pelve e cálices renais", "Artéria carótida", "Ducto biliar comum", "Ventrículo cerebral"],
      answer: 0,
      explanation: "A hidronefrose corresponde à dilatação do sistema coletor renal, especialmente pelve e cálices, geralmente associada à dificuldade de drenagem.",
    },
    source: { title: "Hydronephrosis of one kidney", organization: "MedlinePlus · U.S. National Library of Medicine", url: "https://medlineplus.gov/ency/article/000506.htm" },
  },
  {
    id: "brain",
    organ: "Cérebro",
    condition: "Acidente vascular cerebral isquêmico",
    system: "Nervoso",
    accent: "#8f6c78",
    image: "/medicine/pathology/brain-stroke-comparison-v1.png",
    imageAlt: "Comparação educacional em corte entre cérebro saudável e cérebro com área de infarto isquêmico",
    healthy: "Fluxo sanguíneo contínuo sustenta neurônios e glia em territórios vasculares interdependentes.",
    pathological: "A obstrução arterial interrompe oxigênio e nutrientes; a lesão varia conforme território, duração e circulação colateral.",
    visualLimit: "AVC agudo é reconhecido por sintomas e confirmado por avaliação e imagem urgentes. A palidez desta prancha é uma representação didática, não um aspecto confiável a olho nu.",
    stages: [
      { label: "1", title: "Oclusão e hipoperfusão", description: "Um trombo ou êmbolo reduz o fluxo em um território; parte do tecido pode ainda ser recuperável." },
      { label: "2", title: "Infarto e edema", description: "Sem reperfusão, células morrem e o tecido pode edemaciar, alterando estruturas vizinhas." },
      { label: "3", title: "Organização da lesão", description: "A resposta inflamatória remove tecido lesado e, com o tempo, ocorre gliose e perda de volume variável." },
    ],
    hotspots: [
      { id: "territory", label: "Território focal", x: 83, y: 35, description: "A lesão é unilateral e territorial, em vez de comprometer todo o encéfalo de maneira uniforme." },
      { id: "cortex", label: "Córtex envolvido", x: 88, y: 51, description: "A localização cortical ajuda a compreender déficits motores, sensitivos, de linguagem ou atenção." },
      { id: "edema", label: "Efeito de edema", x: 76, y: 60, description: "Na fase aguda, edema pode apagar limites e comprimir sulcos; intensidade e tempo variam." },
    ],
    causes: ["Trombose em artéria cerebral", "Embolia cardíaca ou arterial", "Outros mecanismos vasculares"],
    findings: ["Déficit neurológico focal súbito", "Face, braço, fala, visão ou equilíbrio podem ser afetados", "O padrão depende do território e do tamanho da lesão"],
    tests: ["Avaliação neurológica imediata", "Tomografia sem contraste na abordagem inicial", "Angiografia e ressonância em cenários selecionados"],
    question: {
      prompt: "O que inicia um AVC isquêmico?",
      options: ["Obstrução do fluxo em um vaso cerebral", "Ruptura obrigatória de uma artéria", "Infecção de todos os neurônios", "Crescimento normal dos ventrículos"],
      answer: 0,
      explanation: "No AVC isquêmico, um vaso que fornece sangue ao cérebro é obstruído, reduzindo o fluxo para o tecido dependente daquele território.",
    },
    source: { title: "Ischemic Stroke (Clots)", organization: "American Stroke Association", url: "https://www.stroke.org/en/about-stroke/types-of-stroke/ischemic-stroke-clots" },
  },
];
