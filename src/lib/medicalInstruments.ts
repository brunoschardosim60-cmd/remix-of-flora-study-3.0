import type { MedicineLevel } from "./medicineData";

export type MedicalInstrumentCategory = "Avaliação" | "Procedimentos" | "Emergência" | "Diagnóstico";
export type MedicalInstrumentIcon = "stethoscope" | "activity" | "thermometer" | "eye" | "ear" | "syringe" | "scissors" | "heart" | "microscope" | "tool" | "wind" | "droplet" | "test" | "scan" | "gauge" | "flashlight" | "hammer" | "bone" | "zap" | "pipette" | "ruler" | "weight" | "radio";

export interface MedicalInstrument {
  id: string;
  name: string;
  aliases: string[];
  category: MedicalInstrumentCategory;
  level: MedicineLevel;
  icon: MedicalInstrumentIcon;
  summary: string;
  function: string;
  recognition: string[];
  safety: string;
  sourceId: string;
}

export const medicalInstrumentCategories: Array<{ id: MedicalInstrumentCategory; description: string; color: string }> = [
  { id: "Avaliação", description: "Observar, auscultar e medir", color: "#4f8173" },
  { id: "Procedimentos", description: "Acessar, cortar, pinçar e suturar", color: "#8b6f90" },
  { id: "Emergência", description: "Via aérea, circulação e imobilização", color: "#b4655c" },
  { id: "Diagnóstico", description: "Registrar sinais e analisar amostras", color: "#547d9b" },
];

export const medicalInstruments: MedicalInstrument[] = [
  {
    id: "stethoscope", name: "Estetoscópio", aliases: ["stetho"], category: "Avaliação", level: "Iniciante", icon: "stethoscope",
    summary: "Amplifica sons internos produzidos pelo coração, pulmões, vasos e intestino.",
    function: "É usado na ausculta e também participa da medida manual da pressão arterial. Diafragma e campânula favorecem faixas de frequência diferentes.",
    recognition: ["Duas olivas auriculares ligadas por tubos flexíveis", "Peça torácica circular com diafragma e, em alguns modelos, campânula"],
    safety: "Higienize a peça de contato entre pessoas e evite pressão excessiva sobre pele lesionada.", sourceId: "openstaxAssessment",
  },
  {
    id: "sphygmomanometer", name: "Esfigmomanômetro", aliases: ["aparelho de pressão", "manguito"], category: "Avaliação", level: "Iniciante", icon: "gauge",
    summary: "Mede a pressão arterial por meio de um manguito inflável.",
    function: "No modelo manual, a insuflação oclui temporariamente a artéria e a desinsuflação controlada permite estimar pressão sistólica e diastólica com ausculta.",
    recognition: ["Manguito de tecido com bolsa inflável", "Manômetro graduado e pera de insuflação no modelo manual"],
    safety: "Escolha o tamanho correto do manguito e confirme valores inesperados, pois posicionamento e tamanho inadequados alteram a medida.", sourceId: "openstaxVitalSigns",
  },
  {
    id: "thermometer", name: "Termômetro clínico", aliases: ["termômetro digital"], category: "Avaliação", level: "Iniciante", icon: "thermometer",
    summary: "Mede a temperatura corporal em uma rota apropriada ao dispositivo e à pessoa.",
    function: "Converte uma propriedade física detectada pelo sensor em estimativa de temperatura; modelos digitais, timpânicos e temporais usam tecnologias distintas.",
    recognition: ["Corpo estreito com visor numérico no modelo digital", "Sensor localizado na extremidade ou em uma ponteira específica"],
    safety: "Use a rota correta, capa quando indicada e desinfecção compatível; compare leituras incoerentes com outro método.", sourceId: "openstaxVitalSigns",
  },
  {
    id: "pulse-oximeter", name: "Oxímetro de pulso", aliases: ["oxímetro", "saturômetro"], category: "Avaliação", level: "Iniciante", icon: "activity",
    summary: "Estima saturação periférica de oxigênio e frequência de pulso por luz.",
    function: "Emite comprimentos de onda através do tecido e analisa a absorção pulsátil. É uma medida não invasiva útil para tendências, mas sujeita a artefatos.",
    recognition: ["Clipe pequeno colocado geralmente no dedo", "Visor com SpO₂, pulso e às vezes uma onda pletismográfica"],
    safety: "Movimento, baixa perfusão, esmalte e outras condições podem distorcer a leitura; interprete junto do quadro clínico.", sourceId: "openstaxVitalSigns",
  },
  {
    id: "penlight", name: "Lanterna clínica", aliases: ["penlight"], category: "Avaliação", level: "Iniciante", icon: "flashlight",
    summary: "Fornece feixe focal para inspeção e avaliação da resposta pupilar.",
    function: "Ilumina cavidades superficiais, pele, orofaringe e olhos, permitindo observar simetria, cor, reação pupilar e pequenos achados.",
    recognition: ["Formato semelhante a uma caneta", "Feixe pequeno e focal acionado por botão ou pressão"],
    safety: "Não mantenha luz intensa diretamente nos olhos e higienize o corpo quando houver contato com superfícies clínicas.", sourceId: "openstaxAssessment",
  },
  {
    id: "reflex-hammer", name: "Martelo de reflexos", aliases: ["martelo neurológico"], category: "Avaliação", level: "Ciclo básico", icon: "hammer",
    summary: "Percute tendões para provocar e comparar reflexos osteotendíneos.",
    function: "Um golpe curto e controlado alonga rapidamente o tendão e desencadeia resposta reflexa, ajudando a examinar a integridade de vias neuromusculares.",
    recognition: ["Cabo fino com cabeça de borracha", "Cabeça triangular, circular ou tipo tomahawk conforme o modelo"],
    safety: "Use movimento controlado, posição adequada e compare lados; não golpeie osso exposto, pele lesionada ou áreas dolorosas.", sourceId: "openstaxNeuroAssessment",
  },
  {
    id: "tuning-fork", name: "Diapasão", aliases: ["garfo de afinação"], category: "Avaliação", level: "Ciclo básico", icon: "radio",
    summary: "Produz vibração padronizada para testes auditivos e de sensibilidade vibratória.",
    function: "É aplicado nos testes de Weber e Rinne e pode avaliar percepção de vibração em proeminências ósseas durante exame neurológico.",
    recognition: ["Instrumento metálico em forma de U", "Duas hastes paralelas ligadas a um cabo central"],
    safety: "Ative com impacto leve em superfície apropriada e não golpeie diretamente a pessoa ou uma superfície que danifique o instrumento.", sourceId: "openstaxEarAssessment",
  },
  {
    id: "otoscope", name: "Otoscópio", aliases: ["otoscópio clínico"], category: "Avaliação", level: "Ciclo básico", icon: "ear",
    summary: "Ilumina e amplia o conduto auditivo externo e a membrana timpânica.",
    function: "Combina fonte de luz, lente e espéculo para observar cerúmen, inflamação, secreção, corpos estranhos e marcos da membrana timpânica.",
    recognition: ["Cabeça com lente e luz montada sobre um cabo", "Espéculo cônico removível na extremidade"],
    safety: "Escolha espéculo adequado, descarte ou processe-o corretamente e evite inserir profundamente ou causar dor.", sourceId: "openstaxEarAssessment",
  },
  {
    id: "ophthalmoscope", name: "Oftalmoscópio", aliases: ["fundoscópio"], category: "Avaliação", level: "Ciclo clínico", icon: "eye",
    summary: "Permite examinar estruturas internas do olho por iluminação e lentes.",
    function: "Projeta luz através da pupila e oferece seleção de lentes para observar reflexo vermelho, retina, vasos e disco óptico em exame treinado.",
    recognition: ["Cabeça achatada com abertura de visualização", "Disco de lentes e seletores montados em um cabo"],
    safety: "Use técnica treinada, intensidade luminosa adequada e precauções de higiene, respeitando condições oculares dolorosas ou traumáticas.", sourceId: "openstaxAssessment",
  },
  {
    id: "dermatoscope", name: "Dermatoscópio", aliases: ["dermoscópio"], category: "Avaliação", level: "Ciclo clínico", icon: "scan",
    summary: "Amplia lesões da pele e reduz reflexos superficiais para visualizar padrões internos.",
    function: "Usa magnificação e iluminação polarizada ou meio de contato para examinar pigmento, vasos e estruturas que não são evidentes a olho nu.",
    recognition: ["Cabeça circular iluminada com lente de aumento", "Pode ter placa transparente de contato com escala"],
    safety: "A interpretação exige treinamento; higienize a placa de contato e não use o dispositivo isoladamente para afirmar diagnóstico.", sourceId: "whoMedicalDevices",
  },
  {
    id: "measuring-tape", name: "Fita antropométrica", aliases: ["fita métrica clínica"], category: "Avaliação", level: "Iniciante", icon: "ruler",
    summary: "Mede perímetros e comprimentos corporais de forma padronizada.",
    function: "É usada para circunferências, edema, crescimento, feridas e outras medidas seriadas quando a técnica e os pontos anatômicos são consistentes.",
    recognition: ["Faixa flexível graduada em centímetros", "Material não extensível, muitas vezes retrátil"],
    safety: "Não comprima o tecido, mantenha o plano correto e documente ponto anatômico e técnica para permitir comparação.", sourceId: "openstaxAssessment",
  },
  {
    id: "goniometer", name: "Goniômetro", aliases: ["medidor de ângulo articular"], category: "Avaliação", level: "Ciclo básico", icon: "ruler",
    summary: "Mede ângulos e amplitude de movimento das articulações.",
    function: "Alinha um eixo e dois braços a referências anatômicas para quantificar movimento articular e acompanhar evolução funcional.",
    recognition: ["Transferidor central graduado", "Dois braços longos móveis ligados por um eixo"],
    safety: "Alinhe pelos marcos corretos e interrompa se o movimento provocar dor inesperada, resistência ou risco de lesão.", sourceId: "whoMedicalDevices",
  },
  {
    id: "syringe", name: "Seringa", aliases: ["seringa descartável"], category: "Procedimentos", level: "Iniciante", icon: "syringe",
    summary: "Aspira, mede e administra líquidos por deslocamento de um êmbolo.",
    function: "O êmbolo move líquido dentro de um cilindro graduado. Pode conectar-se a agulhas, cateteres e outros dispositivos conforme o procedimento.",
    recognition: ["Cilindro transparente graduado", "Êmbolo móvel e conexão cônica na extremidade"],
    safety: "Seringas de uso único nunca devem ser reutilizadas entre pessoas; mantenha técnica asséptica e descarte apropriado.", sourceId: "cdcInjectionSafety",
  },
  {
    id: "hypodermic-needle", name: "Agulha hipodérmica", aliases: ["agulha descartável"], category: "Procedimentos", level: "Ciclo básico", icon: "syringe",
    summary: "Perfura tecido para injetar substâncias ou retirar líquidos quando indicada.",
    function: "Uma cânula metálica oca com bisel cria um trajeto de pequeno calibre; comprimento e diâmetro variam conforme via, local e finalidade.",
    recognition: ["Cânula metálica fina com ponta biselada", "Canhão plástico colorido conectado à seringa"],
    safety: "É de uso único: não recape manualmente após o uso e descarte imediatamente em coletor para perfurocortantes.", sourceId: "cdcInjectionSafety",
  },
  {
    id: "scalpel", name: "Bisturi", aliases: ["escalpelo"], category: "Procedimentos", level: "Ciclo clínico", icon: "tool",
    summary: "Realiza incisões precisas em tecidos durante procedimentos treinados.",
    function: "Combina cabo e lâmina muito afiada; formatos de lâmina favorecem incisões, punções ou dissecação em contextos diferentes.",
    recognition: ["Cabo metálico plano e estreito", "Lâmina pequena, removível ou integrada, com fio extremamente afiado"],
    safety: "Exige campo controlado, passagem segura e descarte de lâminas em perfurocortantes; não manipule sem treinamento.", sourceId: "whoMedicalDevices",
  },
  {
    id: "mayo-scissors", name: "Tesoura Mayo", aliases: ["Mayo reta", "Mayo curva"], category: "Procedimentos", level: "Ciclo clínico", icon: "scissors",
    summary: "Corta tecidos mais resistentes ou materiais cirúrgicos, conforme o formato.",
    function: "Possui lâminas robustas e ponta romba; versões curvas são usadas em tecidos espessos e versões retas são frequentes em materiais e fios.",
    recognition: ["Hastes e lâminas grossas e robustas", "Pontas rombas, com versão reta ou curva"],
    safety: "A função depende do modelo e protocolo; confirme integridade, processamento e destino antes de usar em tecido ou material.", sourceId: "whoMedicalDevices",
  },
  {
    id: "metzenbaum-scissors", name: "Tesoura Metzenbaum", aliases: ["Metzenbaum"], category: "Procedimentos", level: "Internato", icon: "scissors",
    summary: "Disseca e corta tecidos delicados com controle fino.",
    function: "Tem cabos relativamente longos e lâminas curtas, finas e geralmente curvas, favorecendo dissecação de tecido mole sem força excessiva.",
    recognition: ["Lâminas curtas e delicadas em relação aos cabos", "Curvatura suave e pontas rombas"],
    safety: "Não é destinada a cortar fios ou materiais duros, que podem danificar o fio e comprometer o instrumento.", sourceId: "whoMedicalDevices",
  },
  {
    id: "kelly-forceps", name: "Pinça hemostática Kelly", aliases: ["Kelly"], category: "Procedimentos", level: "Ciclo clínico", icon: "tool",
    summary: "Pinça vasos ou tecidos e auxilia no controle temporário de sangramento.",
    function: "Mandíbulas serrilhadas e cremalheira mantêm a pressão sem esforço contínuo; pode auxiliar também na dissecção romba.",
    recognition: ["Anéis para os dedos e trava por cremalheira", "Mandíbulas retas ou curvas com serrilhas em parte da superfície"],
    safety: "Aplicação inadequada pode esmagar tecido; use apenas sob visualização, indicação e técnica apropriadas.", sourceId: "whoMedicalDevices",
  },
  {
    id: "adson-forceps", name: "Pinça Adson", aliases: ["pinça de dissecção Adson"], category: "Procedimentos", level: "Ciclo clínico", icon: "tool",
    summary: "Segura pele e pequenos tecidos durante sutura e dissecção.",
    function: "Funciona como uma pinça de mola, oferecendo preensão fina. Modelos com dentes e sem dentes têm relações diferentes com o tecido.",
    recognition: ["Corpo curto e largo acionado por pressão dos dedos", "Pontas estreitas que podem apresentar pequenos dentes"],
    safety: "Escolha ponta compatível com o tecido e evite força excessiva, que causa trauma e esmagamento.", sourceId: "whoMedicalDevices",
  },
  {
    id: "needle-holder", name: "Porta-agulhas Mayo-Hegar", aliases: ["porta-agulha"], category: "Procedimentos", level: "Ciclo clínico", icon: "tool",
    summary: "Segura a agulha de sutura com estabilidade durante a passagem pelo tecido.",
    function: "Mandíbulas curtas e firmes, associadas a uma cremalheira, mantêm a agulha orientada e permitem movimentos controlados do punho.",
    recognition: ["Anéis e trava semelhantes aos de uma hemostática", "Mandíbulas curtas, espessas e com superfície de preensão"],
    safety: "Prender a agulha no ponto ou com força inadequada pode deformá-la; requer técnica de sutura treinada.", sourceId: "whoMedicalDevices",
  },
  {
    id: "tourniquet", name: "Torniquete", aliases: ["torniquete de extremidade"], category: "Procedimentos", level: "Internato", icon: "activity",
    summary: "Comprime um membro para controlar hemorragia externa grave quando indicado.",
    function: "Uma faixa larga e um mecanismo de tensão aplicam pressão circunferencial suficiente para interromper o fluxo arterial distal.",
    recognition: ["Faixa resistente com fecho", "Haste ou mecanismo para aumentar e travar a tensão"],
    safety: "Uso inadequado causa dano grave; aplique apenas em contexto indicado, registre horário e siga protocolo de emergência.", sourceId: "niceMajorTrauma",
  },
  {
    id: "urinary-catheter", name: "Cateter urinário Foley", aliases: ["sonda vesical de demora", "Foley"], category: "Procedimentos", level: "Ciclo clínico", icon: "droplet",
    summary: "Drena continuamente a bexiga por um tubo com balão de retenção.",
    function: "É introduzido na bexiga com técnica asséptica; um pequeno balão interno mantém o cateter posicionado e a urina segue a um sistema fechado.",
    recognition: ["Tubo flexível com duas ou três vias", "Uma via conecta-se ao balão e outra ao coletor"],
    safety: "Só deve ser usado com indicação, técnica asséptica e sistema fechado; permanência desnecessária aumenta risco de infecção e trauma.", sourceId: "whoMedicalDevices",
  },
  {
    id: "bag-valve-mask", name: "Bolsa-válvula-máscara", aliases: ["BVM", "Ambu"], category: "Emergência", level: "Ciclo clínico", icon: "wind",
    summary: "Fornece ventilação manual com pressão positiva a uma pessoa que não ventila adequadamente.",
    function: "A compressão da bolsa envia gás através de válvula unidirecional e máscara ou via aérea avançada, permitindo ventilações controladas.",
    recognition: ["Bolsa autoinsuflável ligada a uma válvula", "Máscara facial transparente e conexão para oxigênio/reservatório"],
    safety: "Vedação, posição da via aérea e volume exigem treinamento; ventilação excessiva pode causar dano e insuflação gástrica.", sourceId: "whoMedicalDevices",
  },
  {
    id: "oropharyngeal-airway", name: "Cânula orofaríngea", aliases: ["Guedel"], category: "Emergência", level: "Ciclo clínico", icon: "wind",
    summary: "Ajuda a impedir que a língua obstrua a orofaringe em pessoa sem reflexo protetor adequado.",
    function: "Seu formato curvo acompanha a língua e cria passagem para o fluxo de ar, frequentemente durante ventilação manual.",
    recognition: ["Peça rígida e curva com flange na extremidade", "Tamanhos e cores diferentes para seleção"],
    safety: "Tamanho e indicação são críticos; em pessoa com reflexo de vômito preservado pode provocar vômito, laringoespasmo ou trauma.", sourceId: "whoMedicalDevices",
  },
  {
    id: "laryngoscope", name: "Laringoscópio", aliases: ["laringoscópio direto"], category: "Emergência", level: "Internato", icon: "flashlight",
    summary: "Permite visualizar a entrada da laringe para facilitar intubação treinada.",
    function: "Um cabo alimenta luz na lâmina, que desloca tecidos da orofaringe para criar linha de visão da glote.",
    recognition: ["Cabo cilíndrico robusto", "Lâmina iluminada reta ou curva encaixada no cabo"],
    safety: "Exige treinamento, preparo para falha e monitorização; força excessiva pode lesar dentes e tecidos ou piorar hipóxia.", sourceId: "whoMedicalDevices",
  },
  {
    id: "endotracheal-tube", name: "Tubo endotraqueal", aliases: ["TOT", "tubo orotraqueal"], category: "Emergência", level: "Internato", icon: "wind",
    summary: "Mantém uma via aérea dentro da traqueia para ventilação e proteção selecionada.",
    function: "Um tubo transparente atravessa as cordas vocais; modelos com cuff podem selar a traqueia para ventilação com pressão positiva.",
    recognition: ["Tubo longo transparente com marcações de profundidade", "Balão distal conectado a um pequeno balão piloto"],
    safety: "A posição precisa ser confirmada por métodos apropriados e continuamente monitorada; deslocamento ou pressão incorreta causam dano grave.", sourceId: "whoMedicalDevices",
  },
  {
    id: "supraglottic-airway", name: "Dispositivo supraglótico", aliases: ["máscara laríngea"], category: "Emergência", level: "Internato", icon: "wind",
    summary: "Cria um selo acima da glote para ventilação sem atravessar as cordas vocais.",
    function: "É inserido pela boca até a hipofaringe e forma um canal entre ventilador/bolsa e a entrada da laringe.",
    recognition: ["Tubo curvo com conector padrão", "Cuff ou estrutura distal em formato de máscara"],
    safety: "Não oferece a mesma proteção que um tubo traqueal em todas as situações; escolha, inserção e ventilação exigem protocolo e treinamento.", sourceId: "whoMedicalDevices",
  },
  {
    id: "aed", name: "Desfibrilador externo automático", aliases: ["DEA", "AED"], category: "Emergência", level: "Iniciante", icon: "zap",
    summary: "Analisa o ritmo em parada cardíaca e orienta choque quando encontra ritmo desfibrilável.",
    function: "Eletrodos adesivos captam o ritmo; o aparelho decide se o choque é indicado e guia o usuário por mensagens visuais ou sonoras.",
    recognition: ["Caixa portátil com símbolo de raio e coração", "Dois eletrodos adesivos conectados por cabos"],
    safety: "Siga os comandos, afaste todos durante análise e choque e integre o aparelho à ressuscitação e ao acionamento de emergência.", sourceId: "fdaAed",
  },
  {
    id: "suction-catheter", name: "Cateter de aspiração", aliases: ["sonda de aspiração"], category: "Emergência", level: "Ciclo clínico", icon: "wind",
    summary: "Remove secreções de uma via aérea ou cavidade por pressão negativa.",
    function: "Um tubo flexível conecta a fonte de vácuo e permite aspirar material que dificulta visualização ou ventilação, conforme o local e a técnica.",
    recognition: ["Tubo longo, fino e flexível", "Conector proximal e aberturas na ponta distal"],
    safety: "Aspiração inadequada pode causar hipóxia e trauma; selecione pressão, duração, calibre e técnica conforme protocolo.", sourceId: "whoMedicalDevices",
  },
  {
    id: "cervical-collar", name: "Colar cervical", aliases: ["colar de imobilização"], category: "Emergência", level: "Ciclo básico", icon: "bone",
    summary: "Limita parte do movimento cervical durante manejo selecionado de trauma.",
    function: "Uma estrutura semirrígida apoia mandíbula e occipital para reduzir movimento enquanto avaliação e outras medidas de proteção são realizadas.",
    recognition: ["Peça envolvente semirrígida com apoio de queixo", "Abertura anterior e ajustes de altura ou circunferência"],
    safety: "Não substitui avaliação nem imobiliza completamente; tamanho e posicionamento inadequados podem causar pressão, dor ou pior alinhamento.", sourceId: "niceMajorTrauma",
  },
  {
    id: "glucometer", name: "Glicosímetro", aliases: ["medidor de glicemia"], category: "Diagnóstico", level: "Iniciante", icon: "droplet",
    summary: "Estima glicose em pequena amostra de sangue usando uma tira reagente.",
    function: "A amostra entra na tira e uma reação eletroquímica é convertida em valor numérico pelo aparelho, útil para monitorização pontual.",
    recognition: ["Aparelho portátil com visor", "Entrada para tira descartável e lanceta separada para obtenção da gota"],
    safety: "Use tira compatível, controle de qualidade e descarte seguro da lanceta; resultados incoerentes precisam de confirmação conforme protocolo.", sourceId: "whoMedicalDevices",
  },
  {
    id: "ecg", name: "Eletrocardiógrafo", aliases: ["ECG", "aparelho de eletrocardiograma"], category: "Diagnóstico", level: "Ciclo básico", icon: "heart",
    summary: "Registra diferenças elétricas do coração por eletrodos posicionados na pele.",
    function: "Amplifica sinais captados em derivações padronizadas e os apresenta como traçados, permitindo analisar ritmo, condução e outros padrões.",
    recognition: ["Cabos com eletrodos para tórax e membros", "Tela ou papel com múltiplos traçados em grade"],
    safety: "Posicionamento, identificação e ausência de artefato são essenciais; o traçado exige interpretação no contexto clínico.", sourceId: "whoMedicalDevices",
  },
  {
    id: "ultrasound-probe", name: "Transdutor de ultrassom", aliases: ["probe", "sonda de ultrassom"], category: "Diagnóstico", level: "Ciclo clínico", icon: "scan",
    summary: "Emite e recebe ondas sonoras para formar imagens em tempo real.",
    function: "Cristais no transdutor convertem energia elétrica em ultrassom e ecos em sinais, usados pelo equipamento para construir a imagem.",
    recognition: ["Peça de mão conectada por cabo grosso", "Superfície lisa de contato usada com gel"],
    safety: "Escolha o transdutor e preset corretos, processe conforme o uso e interprete imagens apenas com treinamento adequado.", sourceId: "whoMedicalDevices",
  },
  {
    id: "microscope", name: "Microscópio óptico", aliases: ["microscópio"], category: "Diagnóstico", level: "Ciclo básico", icon: "microscope",
    summary: "Amplia amostras pequenas por um sistema de lentes e iluminação.",
    function: "Objetivas de diferentes aumentos formam uma imagem ampliada da lâmina, permitindo examinar células, tecidos e microrganismos preparados.",
    recognition: ["Oculares, revólver com objetivas e platina", "Fonte de luz sob a amostra e controles de foco"],
    safety: "Amostras podem ser biologicamente perigosas; use preparação, descontaminação e descarte segundo regras do laboratório.", sourceId: "whoMedicalDevices",
  },
  {
    id: "centrifuge", name: "Centrífuga laboratorial", aliases: ["centrífuga"], category: "Diagnóstico", level: "Ciclo básico", icon: "activity",
    summary: "Separa componentes de uma amostra pela rotação em alta velocidade.",
    function: "A força centrífuga promove sedimentação diferencial conforme densidade, tamanho e protocolo, como na separação de plasma ou soro.",
    recognition: ["Câmara com rotor e tampa travável", "Suportes simétricos para tubos"],
    safety: "Balanceie cargas, inspecione tubos e mantenha a tampa fechada; desequilíbrio e quebra podem gerar aerossóis e falha mecânica.", sourceId: "whoMedicalDevices",
  },
  {
    id: "micropipette", name: "Micropipeta", aliases: ["pipeta automática"], category: "Diagnóstico", level: "Ciclo básico", icon: "pipette",
    summary: "Aspira e dispensa volumes muito pequenos de líquido com precisão ajustada.",
    function: "Um pistão desloca ar ou líquido para mover volume definido através de uma ponteira descartável, comum em ensaios laboratoriais.",
    recognition: ["Corpo manual com êmbolo superior", "Visor de volume e ponteira plástica removível"],
    safety: "Use faixa de volume correta, ponteira compatível e técnica que evite aerossol ou contaminação cruzada.", sourceId: "whoMedicalDevices",
  },
  {
    id: "test-tube", name: "Tubo de coleta", aliases: ["tubo de ensaio", "tubo a vácuo"], category: "Diagnóstico", level: "Iniciante", icon: "test",
    summary: "Recebe e preserva amostras para análise conforme aditivo e finalidade.",
    function: "Tubos podem conter anticoagulantes, ativadores ou gel; o tipo e a ordem de coleta interferem na qualidade da amostra.",
    recognition: ["Tubo transparente cilíndrico com tampa colorida", "Etiqueta para identificação e, em alguns tipos, aditivo visível"],
    safety: "Identifique corretamente, respeite ordem e mistura indicadas e trate toda amostra como potencialmente infecciosa.", sourceId: "whoMedicalDevices",
  },
  {
    id: "peak-flow-meter", name: "Medidor de pico de fluxo", aliases: ["peak flow"], category: "Diagnóstico", level: "Ciclo básico", icon: "wind",
    summary: "Mede o maior fluxo obtido em uma expiração forçada.",
    function: "O ar expirado desloca um marcador em escala, permitindo acompanhar variação do fluxo expiratório máximo em contextos respiratórios selecionados.",
    recognition: ["Tubo portátil com bocal", "Escala longitudinal com marcador móvel"],
    safety: "A técnica e o esforço afetam muito o resultado; use bocal individual/processado e compare com o melhor valor pessoal quando indicado.", sourceId: "whoMedicalDevices",
  },
];

export function instrumentQuizOptions(index: number, pool: MedicalInstrument[] = medicalInstruments) {
  const current = pool[index % pool.length];
  const sameCategory = pool.filter((item) => item.category === current.category && item.id !== current.id);
  const other = pool.filter((item) => item.category !== current.category);
  const distractors = [...sameCategory, ...other].filter((item, itemIndex, items) => items.findIndex((candidate) => candidate.id === item.id) === itemIndex).slice(index % 3, index % 3 + 3);
  while (distractors.length < 3) distractors.push(other[distractors.length % Math.max(other.length, 1)]);
  const options = [current, ...distractors.slice(0, 3)];
  const shift = index % options.length;
  return [...options.slice(shift), ...options.slice(0, shift)];
}
