export type AnamnesisCategory =
  | "Abertura"
  | "Sintoma atual"
  | "Antecedentes"
  | "Medicamentos e alergias"
  | "Contexto"
  | "Segurança";

export type QuestionValue = "critical" | "high" | "useful" | "poor";
export type DecisionValue = "best" | "reasonable" | "unsafe";
export type PatientVisualState = "neutral" | "pain" | "distressed" | "unconscious" | "stabilized";

export interface AnamnesisVitalSigns {
  heartRate: number;
  bloodPressure: string;
  respiratoryRate: number;
  oxygenSaturation: number;
  temperatureC?: number;
}

export interface AnamnesisCrisisTrigger {
  id: string;
  afterTurns: number;
  requiredQuestionIds: string[];
  state: Exclude<PatientVisualState, "neutral" | "stabilized">;
  narrative: string;
  patientResponse: string;
  crisisVitals?: AnamnesisVitalSigns;
  safeDecisionIds: string[];
}

export interface AnamnesisQuestion {
  id: string;
  category: AnamnesisCategory;
  text: string;
  answer: string;
  value: QuestionValue;
  feedback: string;
  redFlag?: string;
}

export interface AnamnesisDecision {
  id: string;
  label: string;
  value: DecisionValue;
  feedback: string;
}

export interface AnamnesisCase {
  id: string;
  title: string;
  setting: string;
  specialty: string;
  difficulty: "Inicial" | "Intermediário" | "Avançado";
  sensitive: boolean;
  sensitiveWarnings?: string[];
  patient: {
    alias: string;
    age: string;
    occupation: string;
    pronouns: string;
  };
  arrival: string;
  openingStatement: string;
  demeanor: string;
  initialState: PatientVisualState;
  baselineVitals?: AnamnesisVitalSigns;
  crisisTrigger?: AnamnesisCrisisTrigger;
  learningGoals: string[];
  questions: AnamnesisQuestion[];
  decisions: AnamnesisDecision[];
  referenceSummary: string;
  keyFindings: string[];
  differentials: string[];
  sourceIds: string[];
}

export const anamnesisSources = [
  {
    id: "openstax-interview",
    title: "Práticas de entrevista abrangente — habilidades clínicas de enfermagem",
    url: "https://openstax.org/books/clinical-nursing-skills/pages/3-2-comprehensive-interview-practices",
  },
  {
    id: "openstax-history",
    title: "Coleta e documentação de dados — habilidades clínicas de enfermagem",
    url: "https://openstax.org/books/clinical-nursing-skills/pages/4-2-data-collection-and-documentation",
  },
  {
    id: "cdc-stroke",
    title: "Sinais e sintomas de acidente vascular cerebral — CDC",
    url: "https://www.cdc.gov/stroke/signs-symptoms/index.html",
  },
  {
    id: "aha-acs",
    title: "Síndrome coronariana aguda — American Heart Association",
    url: "https://www.heart.org/en/health-topics/heart-attack/about-heart-attacks/acute-coronary-syndrome",
  },
  {
    id: "acog-ectopic",
    title: "Gestação ectópica — American College of Obstetricians and Gynecologists",
    url: "https://www.acog.org/womens-health/faqs/ectopic-pregnancy",
  },
  {
    id: "who-mhgap",
    title: "Guia de intervenção mhGAP — OMS",
    url: "https://iris.who.int/bitstream/handle/10665/250239/9789241549790-eng.pdf",
  },
] as const;

export const anamnesisCases: AnamnesisCase[] = [
  {
    id: "chest-pressure",
    title: "Pressão no peito durante o trabalho",
    setting: "Pronto atendimento",
    specialty: "Cardiovascular",
    difficulty: "Inicial",
    sensitive: false,
    patient: { alias: "Carlos M.", age: "54 anos", occupation: "Motorista", pronouns: "ele/dele" },
    arrival: "Chegou acompanhado, está apreensivo e leva a mão ao centro do tórax.",
    openingStatement: "Doutor, começou uma pressão forte aqui no peito e não está passando. Achei que fosse nervoso, mas fiquei com medo.",
    demeanor: "Fala em frases curtas, transpira e parece desconfortável.",
    initialState: "pain",
    baselineVitals: { heartRate: 106, bloodPressure: "152/94", respiratoryRate: 23, oxygenSaturation: 95, temperatureC: 36.6 },
    crisisTrigger: {
      id: "cp-progressive-distress",
      afterTurns: 4,
      requiredQuestionIds: ["cp-associated", "cp-timing"],
      state: "distressed",
      narrative: "Durante a entrevista, a pressão torácica fica mais intensa, o paciente demonstra maior desconforto e passa a falar com mais dificuldade.",
      patientResponse: "A pressão está piorando... estou mais sem ar e muito suado.",
      crisisVitals: { heartRate: 124, bloodPressure: "96/62", respiratoryRate: 29, oxygenSaturation: 91, temperatureC: 36.6 },
      safeDecisionIds: ["cp-best", "cp-reasonable"],
    },
    learningGoals: ["Começar com pergunta aberta", "Caracterizar a queixa", "Reconhecer sinais de alarme", "Evitar encerramento prematuro"],
    questions: [
      { id: "cp-open", category: "Abertura", text: "Conte com suas palavras o que aconteceu desde o começo.", answer: "Eu estava dirigindo quando veio uma pressão bem no meio do peito. Parei o carro, mas não melhorou. Parece que aperta e vai para o braço esquerdo.", value: "critical", feedback: "Boa abertura: permite conhecer cronologia, qualidade, localização e irradiação sem induzir a resposta.", redFlag: "Pressão retroesternal persistente com irradiação" },
      { id: "cp-associated", category: "Sintoma atual", text: "Além da pressão, sentiu falta de ar, suor, náusea ou desmaio?", answer: "Fiquei com falta de ar, enjoado e comecei a suar frio. Não cheguei a desmaiar.", value: "critical", feedback: "Pergunta dirigida essencial diante de uma queixa potencialmente tempo-dependente.", redFlag: "Dispneia, náusea e sudorese associadas" },
      { id: "cp-timing", category: "Sintoma atual", text: "Quando começou, foi súbito ou gradual e algo melhora ou piora?", answer: "Começou há uns quarenta minutos, foi ficando mais forte em poucos minutos. Parar e respirar fundo não resolveu.", value: "critical", feedback: "A cronologia e a ausência de alívio ajudam a avaliar urgência e hipóteses.", redFlag: "Sintoma prolongado sem alívio com repouso" },
      { id: "cp-prior", category: "Antecedentes", text: "Já teve algo parecido ou possui pressão alta, diabetes ou colesterol elevado?", answer: "Tenho pressão alta e colesterol, mas às vezes esqueço os remédios. Já senti um aperto leve subindo ladeira, nunca assim.", value: "high", feedback: "Explora episódios prévios e fatores cardiovasculares relevantes." },
      { id: "cp-meds", category: "Medicamentos e alergias", text: "Quais medicamentos usa e possui alguma alergia?", answer: "Uso losartana e um remédio para colesterol. Não conheço alergias. Hoje ainda não tomei nada.", value: "high", feedback: "Medicações, adesão e alergias são componentes básicos da história segura." },
      { id: "cp-family", category: "Antecedentes", text: "Há doença cardíaca ou morte súbita na família?", answer: "Meu pai morreu de infarto com cinquenta e oito anos.", value: "high", feedback: "A história familiar modifica o contexto de risco." },
      { id: "cp-substances", category: "Contexto", text: "Fuma, usa álcool, energéticos ou alguma droga estimulante?", answer: "Fumo quase um maço por dia. Bebo nos fins de semana e não uso drogas.", value: "useful", feedback: "Pergunta relevante, feita de forma neutra e sem julgamento." },
      { id: "cp-pleuritic", category: "Sintoma atual", text: "A dor muda ao respirar, tossir, apertar o peito ou movimentar o braço?", answer: "Não. Respirar e apertar não mudam a pressão.", value: "high", feedback: "Ajuda a explorar características que podem apoiar ou afastar diferenciais, sem encerrar o raciocínio." },
      { id: "cp-blame", category: "Contexto", text: "Por que esperou tanto e não se cuidou direito?", answer: "Eu achei que você fosse me ajudar, não me dar bronca. Agora prefiro não falar disso.", value: "poor", feedback: "Formulação julgadora rompe vínculo e reduz a qualidade das informações. Reformule com curiosidade e respeito." },
      { id: "cp-diet", category: "Contexto", text: "Pode descrever detalhadamente tudo o que comeu nesta semana?", answer: "Não lembro de tudo. Ontem comi arroz, feijão e carne.", value: "poor", feedback: "Há questões mais urgentes neste momento; a entrevista precisa ser focada e priorizar risco." },
    ],
    decisions: [
      { id: "cp-best", label: "Reconhecer possível emergência cardiovascular e acionar avaliação imediata enquanto a história focada continua.", value: "best", feedback: "Decisão mais segura. A queixa reúne características e sintomas associados que não permitem atrasar a avaliação urgente." },
      { id: "cp-reasonable", label: "Completar rapidamente alergias, medicamentos e antecedentes enquanto outra pessoa da equipe inicia a avaliação.", value: "reasonable", feedback: "É aceitável se a avaliação urgente já estiver ocorrendo em paralelo; a entrevista não deve criar atraso." },
      { id: "cp-unsafe", label: "Concluir que é ansiedade, orientar repouso e agendar consulta para outro dia.", value: "unsafe", feedback: "Decisão insegura por fechamento prematuro diante de múltiplos sinais de alarme." },
    ],
    referenceSummary: "Pessoa de 54 anos com pressão retroesternal persistente, irradiação para braço, dispneia, náusea e sudorese, além de fatores cardiovasculares. O objetivo educacional é reconhecer urgência e evitar atribuição precoce à ansiedade.",
    keyFindings: ["Pressão retroesternal", "Irradiação para braço esquerdo", "Sudorese e náusea", "Sintoma persistente", "Fatores cardiovasculares"],
    differentials: ["Síndrome coronariana aguda", "Síndrome aórtica", "Embolia pulmonar", "Causa gastrointestinal", "Dor musculoesquelética"],
    sourceIds: ["openstax-interview", "openstax-history", "aha-acs"],
  },
  {
    id: "sudden-neurologic-deficit",
    title: "Fala alterada no café da manhã",
    setting: "Sala de emergência",
    specialty: "Neurologia",
    difficulty: "Intermediário",
    sensitive: false,
    patient: { alias: "Lúcia A.", age: "68 anos", occupation: "Professora aposentada", pronouns: "ela/dela" },
    arrival: "A filha responde parte das perguntas; a paciente compreende, mas tem dificuldade para articular palavras.",
    openingStatement: "Eu... estava... café... minha mão não...",
    demeanor: "Mantém-se acordada, frustrada com a fala e movimenta menos o braço direito.",
    initialState: "distressed",
    baselineVitals: { heartRate: 88, bloodPressure: "178/96", respiratoryRate: 18, oxygenSaturation: 97, temperatureC: 36.7 },
    crisisTrigger: {
      id: "neuro-communication-decline",
      afterTurns: 4,
      requiredQuestionIds: ["neuro-witness", "neuro-last-well", "neuro-features"],
      state: "distressed",
      narrative: "A dificuldade de comunicação se acentua durante a entrevista e a filha percebe que a paciente responde menos.",
      patientResponse: "Eu... não... consigo...",
      crisisVitals: { heartRate: 94, bloodPressure: "184/100", respiratoryRate: 20, oxygenSaturation: 96, temperatureC: 36.7 },
      safeDecisionIds: ["neuro-best", "neuro-reasonable"],
    },
    learningGoals: ["Identificar a fonte da história", "Definir o último momento sem sintomas", "Pesquisar anticoagulantes", "Priorizar sinais neurológicos súbitos"],
    questions: [
      { id: "neuro-witness", category: "Abertura", text: "Peço autorização para que sua filha ajude: o que vocês observaram?", answer: "A filha diz: ela estava normal quando acordou. Durante o café, a xícara caiu da mão direita e a fala ficou enrolada de repente.", value: "critical", feedback: "Reconhece a limitação de comunicação, identifica fonte secundária e preserva a participação da paciente.", redFlag: "Déficit focal súbito observado por familiar" },
      { id: "neuro-last-well", category: "Sintoma atual", text: "Qual foi o último horário em que ela estava completamente como de costume?", answer: "Às sete e dez ela conversava normalmente. Os sintomas começaram perto das sete e quarenta.", value: "critical", feedback: "Pergunta tempo-dependente indispensável em déficit neurológico súbito.", redFlag: "Início agudo com último momento sem sintomas conhecido" },
      { id: "neuro-features", category: "Sintoma atual", text: "Houve fraqueza, alteração visual, desequilíbrio, convulsão ou dor de cabeça súbita?", answer: "O braço e a perna direitos ficaram fracos. Não convulsionou e não reclamou de dor de cabeça.", value: "critical", feedback: "Define o padrão do déficit e pesquisa manifestações associadas importantes.", redFlag: "Fraqueza unilateral e alteração da linguagem" },
      { id: "neuro-meds", category: "Medicamentos e alergias", text: "Ela usa anticoagulante, antiagregante ou outros medicamentos?", answer: "Usa remédio para pressão e apixabana por causa de fibrilação atrial. Não sabemos se tomou hoje.", value: "critical", feedback: "Medicamentos que alteram coagulação são informação crítica para avaliação segura.", redFlag: "Uso de anticoagulante" },
      { id: "neuro-prior", category: "Antecedentes", text: "Já teve AVC, sangramento, cirurgia recente ou trauma?", answer: "Teve um episódio transitório há dois anos. Não houve trauma nem cirurgia recente.", value: "high", feedback: "Antecedentes neurológicos e hemorrágicos ajudam a contextualizar risco." },
      { id: "neuro-baseline", category: "Antecedentes", text: "Como era sua autonomia e comunicação antes de hoje?", answer: "Ela mora sozinha, faz compras e conversa normalmente. Não usa ajuda para caminhar.", value: "high", feedback: "O estado funcional prévio diferencia déficit novo de limitação basal." },
      { id: "neuro-glucose", category: "Contexto", text: "Ela tem diabetes, ficou em jejum ou usou medicamento que possa baixar a glicose?", answer: "Tem diabetes e usa metformina. Tomou café normalmente.", value: "high", feedback: "Explora condição que pode produzir ou acompanhar alterações neurológicas, sem assumir uma causa." },
      { id: "neuro-allergy", category: "Medicamentos e alergias", text: "Existe alergia conhecida a medicamentos ou contraste?", answer: "Ela relata alergia a dipirona; não conhecemos reação a contraste.", value: "useful", feedback: "Informação relevante para continuidade da avaliação." },
      { id: "neuro-memory", category: "Contexto", text: "Nos últimos cinco anos, quais datas importantes ela esqueceu?", answer: "Não sei responder isso agora. O problema começou hoje de repente.", value: "poor", feedback: "A pergunta desvia da apresentação aguda e consome tempo sem esclarecer a prioridade." },
      { id: "neuro-force-speech", category: "Abertura", text: "Peço que fale mais rápido e repita até pronunciar corretamente.", answer: "A paciente fica angustiada e para de tentar responder.", value: "poor", feedback: "Pressionar alguém com alteração de linguagem prejudica vínculo e não é uma técnica terapêutica." },
    ],
    decisions: [
      { id: "neuro-best", label: "Reconhecer déficit neurológico súbito e acionar imediatamente o fluxo de emergência apropriado.", value: "best", feedback: "Decisão correta: início súbito, déficit focal e linguagem alterada tornam o tempo um componente crítico." },
      { id: "neuro-reasonable", label: "Manter entrevista extremamente focada em tempo, medicamentos e estado basal enquanto a avaliação urgente ocorre.", value: "reasonable", feedback: "Adequado somente em paralelo ao atendimento urgente, sem produzir atraso." },
      { id: "neuro-unsafe", label: "Observar por algumas horas para verificar se a fala volta antes de comunicar a equipe.", value: "unsafe", feedback: "Decisão insegura: esperar diante de déficit neurológico súbito pode atrasar avaliação tempo-dependente." },
    ],
    referenceSummary: "Pessoa de 68 anos, previamente independente, com início súbito testemunhado de fraqueza à direita e alteração de linguagem, último momento sem sintomas conhecido e uso de anticoagulante.",
    keyFindings: ["Início súbito", "Fraqueza unilateral", "Alteração da linguagem", "Horário conhecido", "Uso de anticoagulante"],
    differentials: ["Evento cerebrovascular isquêmico", "Hemorragia intracraniana", "Alteração metabólica", "Crise epiléptica com déficit pós-ictal", "Enxaqueca com aura"],
    sourceIds: ["openstax-interview", "openstax-history", "cdc-stroke"],
  },
  {
    id: "pregnancy-pain-bleeding",
    title: "Dor pélvica e sangramento",
    setting: "Atendimento de urgência",
    specialty: "Saúde reprodutiva",
    difficulty: "Avançado",
    sensitive: true,
    sensitiveWarnings: ["sangramento genital", "possível perda gestacional", "sexualidade e reprodução"],
    patient: { alias: "Marina S.", age: "29 anos", occupation: "Designer", pronouns: "ela/dela" },
    arrival: "Está pálida, ansiosa e pede que o acompanhante aguarde fora durante parte da conversa.",
    openingStatement: "Estou com uma dor forte de um lado da barriga e comecei a sangrar. Minha menstruação também está atrasada.",
    demeanor: "Responde com clareza, mas teme estar grávida e demonstra preocupação com confidencialidade.",
    initialState: "pain",
    baselineVitals: { heartRate: 108, bloodPressure: "104/68", respiratoryRate: 22, oxygenSaturation: 98, temperatureC: 36.5 },
    crisisTrigger: {
      id: "gyn-presyncope",
      afterTurns: 4,
      requiredQuestionIds: ["gyn-pain", "gyn-bleeding", "gyn-pregnancy"],
      state: "distressed",
      narrative: "Durante a entrevista, a paciente fica mais pálida, relata tontura intensa e precisa se apoiar para não cair.",
      patientResponse: "Estou ficando muito tonta... parece que vou desmaiar.",
      crisisVitals: { heartRate: 126, bloodPressure: "86/54", respiratoryRate: 26, oxygenSaturation: 96, temperatureC: 36.5 },
      safeDecisionIds: ["gyn-best", "gyn-reasonable"],
    },
    learningGoals: ["Assegurar privacidade", "Perguntar sobre possibilidade de gestação sem julgamento", "Reconhecer sintomas de instabilidade", "Integrar história ginecológica"],
    questions: [
      { id: "gyn-privacy", category: "Abertura", text: "Podemos conversar em ambiente privado? Há algo que você prefira discutir sem acompanhante?", answer: "Sim, obrigada. Eu não contei ao meu parceiro que minha menstruação atrasou e quero falar disso sozinha.", value: "high", feedback: "Privacidade e autonomia favorecem uma história reprodutiva segura e honesta." },
      { id: "gyn-pain", category: "Sintoma atual", text: "Conte como a dor começou, onde é mais forte e se está piorando.", answer: "Começou leve ontem e ficou muito forte hoje, principalmente do lado direito. Agora dói também no ombro e fico tonta ao levantar.", value: "critical", feedback: "Pergunta aberta revela progressão e sintomas associados de alto risco.", redFlag: "Dor unilateral, dor referida no ombro e tontura" },
      { id: "gyn-bleeding", category: "Sintoma atual", text: "Quando o sangramento começou e houve coágulos, desmaio ou fraqueza intensa?", answer: "Começou hoje, é mais que um escape. Quase desmaiei no banheiro e estou muito fraca.", value: "critical", feedback: "Caracteriza gravidade sem solicitar uma quantificação falsa ou constrangedora.", redFlag: "Sangramento com pré-síncope e fraqueza" },
      { id: "gyn-pregnancy", category: "Segurança", text: "Existe possibilidade de gestação? Quando foi a última menstruação e realizou algum teste?", answer: "Minha última menstruação foi há cerca de sete semanas. Fiz um teste de farmácia positivo há quatro dias.", value: "critical", feedback: "Pergunta direta, neutra e essencial na combinação de dor pélvica e sangramento.", redFlag: "Gestação possível com dor e sangramento" },
      { id: "gyn-obstetric", category: "Antecedentes", text: "Já esteve grávida antes, teve perda, parto, cesariana ou gestação fora do útero?", answer: "Tive uma gestação há três anos, terminou em aborto espontâneo. Nunca tive gestação fora do útero.", value: "high", feedback: "História obstétrica anterior faz parte da avaliação focada." },
      { id: "gyn-risk", category: "Antecedentes", text: "Já teve infecção pélvica, cirurgia nas trompas ou tratamento de fertilidade?", answer: "Tratei uma infecção pélvica há alguns anos. Nunca operei e não fiz tratamento de fertilidade.", value: "high", feedback: "Explora antecedentes pertinentes sem culpabilizar a paciente." },
      { id: "gyn-meds", category: "Medicamentos e alergias", text: "Usa medicamentos, anticoagulantes ou possui alergias?", answer: "Só uso sertralina. Tenho alergia a amoxicilina e não uso anticoagulante.", value: "high", feedback: "Medicação e alergia devem ser registradas com clareza." },
      { id: "gyn-safety", category: "Segurança", text: "Você se sente segura em casa e alguém a pressionou ou machucou sexualmente?", answer: "Sinto-me segura. Ninguém me pressionou nem me machucou.", value: "useful", feedback: "Pergunta sensível apropriada quando feita com privacidade, normalização e respeito." },
      { id: "gyn-judgment", category: "Contexto", text: "Por que teve relação sem se prevenir se não queria engravidar?", answer: "Essa pergunta parece um julgamento. Não quero continuar falando sobre isso.", value: "poor", feedback: "Pergunta culpabilizante prejudica vínculo e não melhora a segurança clínica." },
      { id: "gyn-future", category: "Contexto", text: "Quantos filhos pretende ter nos próximos dez anos?", answer: "Não consigo pensar nisso agora; estou com dor e com medo.", value: "poor", feedback: "Não prioriza a queixa aguda e aumenta sofrimento desnecessário." },
    ],
    decisions: [
      { id: "gyn-best", label: "Reconhecer possível emergência relacionada à gestação e acionar avaliação imediata, preservando privacidade e acolhimento.", value: "best", feedback: "Decisão mais segura diante de dor unilateral, sangramento, pré-síncope e teste positivo." },
      { id: "gyn-reasonable", label: "Manter perguntas focadas em alergias e antecedentes enquanto a avaliação urgente já está em andamento.", value: "reasonable", feedback: "Pode ser adequado em paralelo, desde que a entrevista não atrase a avaliação urgente." },
      { id: "gyn-unsafe", label: "Tranquilizar que sangramento é comum e orientar retorno apenas se piorar amanhã.", value: "unsafe", feedback: "Decisão insegura: o conjunto de sinais exige avaliação urgente e não permite tranquilização isolada." },
    ],
    referenceSummary: "Pessoa de 29 anos com teste de gestação positivo, dor pélvica unilateral progressiva, sangramento, dor no ombro e pré-síncope. A entrevista deve reconhecer urgência, preservar privacidade e evitar julgamento.",
    keyFindings: ["Gestação possível", "Dor pélvica unilateral", "Sangramento", "Pré-síncope", "Dor no ombro"],
    differentials: ["Gestação ectópica", "Perda gestacional", "Cisto ovariano complicado", "Torção anexial", "Causa gastrointestinal ou urinária"],
    sourceIds: ["openstax-interview", "openstax-history", "acog-ectopic"],
  },
  {
    id: "self-harm-risk",
    title: "“Não vejo saída”",
    setting: "Consulta de saúde mental",
    specialty: "Saúde mental",
    difficulty: "Avançado",
    sensitive: true,
    sensitiveWarnings: ["ideação suicida", "autolesão", "sofrimento emocional intenso"],
    patient: { alias: "Rafael N.", age: "22 anos", occupation: "Estudante", pronouns: "ele/dele" },
    arrival: "Veio após faltar às aulas. Mantém pouco contato visual e fala baixo.",
    openingStatement: "Eu não estou conseguindo fazer nada. Parece que só atrapalho todo mundo e não vejo mais saída.",
    demeanor: "Apresenta fala lenta, desesperança e hesita antes de responder sobre segurança.",
    initialState: "distressed",
    crisisTrigger: {
      id: "mh-withdrawal",
      afterTurns: 5,
      requiredQuestionIds: ["mh-direct", "mh-plan", "mh-means"],
      state: "distressed",
      narrative: "Sem uma abordagem direta de segurança, o paciente se retrai, reduz o contato e diz que prefere encerrar a conversa.",
      patientResponse: "Acho que não adianta continuar falando... eu quero ir embora.",
      safeDecisionIds: ["mh-best", "mh-reasonable"],
    },
    learningGoals: ["Usar comunicação terapêutica", "Perguntar diretamente sobre suicídio", "Avaliar plano e acesso a meios", "Identificar suporte e proteção"],
    questions: [
      { id: "mh-open", category: "Abertura", text: "Quero entender melhor. Como têm sido seus dias e o que significa não ver saída?", answer: "Há semanas quase não saio da cama. Parei de ir às aulas, não sinto prazer em nada e acho que minha família estaria melhor sem mim.", value: "critical", feedback: "Abertura empática explora sofrimento e revela desesperança sem confronto.", redFlag: "Desesperança e percepção de ser um peso" },
      { id: "mh-direct", category: "Segurança", text: "Quando diz que estariam melhor sem você, tem pensado em morrer ou tirar a própria vida?", answer: "Sim. Tenho pensado nisso todos os dias nesta última semana.", value: "critical", feedback: "Pergunta direta, clara e sem julgamento é necessária; evitar o tema não protege a pessoa.", redFlag: "Ideação suicida atual" },
      { id: "mh-plan", category: "Segurança", text: "Pensou em como faria, quando faria ou preparou alguma coisa?", answer: "Pensei em um método e separei algumas coisas ontem. Não marquei um horário, mas tenho medo de ficar sozinho hoje.", value: "critical", feedback: "Investiga planejamento e preparação sem pedir detalhes operacionais desnecessários.", redFlag: "Planejamento e comportamento preparatório" },
      { id: "mh-means", category: "Segurança", text: "Você tem acesso agora ao que pensou usar?", answer: "Sim, está no meu quarto.", value: "critical", feedback: "Acesso a meios é componente essencial da avaliação de risco iminente.", redFlag: "Acesso atual a meio planejado" },
      { id: "mh-attempts", category: "Antecedentes", text: "Já tentou se machucar ou tirar a própria vida antes?", answer: "Há dois anos tomei comprimidos e não contei a ninguém. Passei mal, mas fiquei em casa.", value: "critical", feedback: "História de tentativa anterior é informação de segurança indispensável.", redFlag: "Tentativa prévia não assistida" },
      { id: "mh-protective", category: "Contexto", text: "O que ainda ajuda a permanecer seguro e quem poderia estar com você hoje?", answer: "Minha irmã. Eu não queria causar isso a ela. Acho que ela viria se eu ligasse.", value: "high", feedback: "Identifica suporte e fatores protetores sem tratá-los como garantia de segurança." },
      { id: "mh-substances", category: "Contexto", text: "Usou álcool ou outras substâncias recentemente?", answer: "Tenho bebido quase toda noite para dormir. Hoje ainda não bebi.", value: "high", feedback: "Substâncias podem agravar desinibição e risco, por isso a pergunta é pertinente." },
      { id: "mh-treatment", category: "Medicamentos e alergias", text: "Faz acompanhamento ou usa medicação para saúde mental? Houve alguma mudança recente?", answer: "Parei o antidepressivo sozinho há um mês porque achei que não ajudava. Não vejo minha terapeuta há semanas.", value: "high", feedback: "Tratamento atual, adesão e mudanças recentes ajudam a compreender o contexto." },
      { id: "mh-promise", category: "Segurança", text: "Você promete que não fará nada se eu deixar você ir para casa?", answer: "Não sei se consigo prometer. Eu disse isso antes porque queria encerrar a conversa.", value: "poor", feedback: "Uma promessa isolada não substitui avaliação estruturada, presença e plano de segurança profissional." },
      { id: "mh-guilt", category: "Contexto", text: "Você percebe como isso seria egoísta com sua família?", answer: "Isso só confirma que sou um problema. Prefiro parar de conversar.", value: "poor", feedback: "Culpa e julgamento podem aumentar sofrimento e romper o vínculo terapêutico." },
    ],
    decisions: [
      { id: "mh-best", label: "Reconhecer risco elevado, manter a pessoa acompanhada e acionar imediatamente avaliação profissional de segurança.", value: "best", feedback: "Decisão mais segura diante de ideação atual, planejamento, acesso a meio e tentativa prévia." },
      { id: "mh-reasonable", label: "Envolver suporte confiável e equipe de saúde enquanto a pessoa permanece acompanhada e a avaliação continua.", value: "reasonable", feedback: "É parte de uma resposta segura quando integrada à avaliação profissional imediata, não como substituição." },
      { id: "mh-unsafe", label: "Aceitar uma promessa verbal, recomendar descanso em casa e marcar retorno para a próxima semana.", value: "unsafe", feedback: "Decisão insegura: uma promessa não neutraliza os sinais de risco iminente identificados." },
    ],
    referenceSummary: "Estudante de 22 anos com desesperança, ideação suicida atual, planejamento, acesso a meio, comportamento preparatório, tentativa prévia e aumento do uso de álcool. A prioridade é segurança imediata, vínculo e avaliação profissional.",
    keyFindings: ["Ideação atual", "Planejamento", "Acesso a meio", "Tentativa prévia", "Desesperança", "Uso crescente de álcool"],
    differentials: ["Episódio depressivo", "Transtorno relacionado a substâncias", "Transtorno de ajustamento", "Condição bipolar", "Outra condição psiquiátrica ou médica"],
    sourceIds: ["openstax-interview", "openstax-history", "who-mhgap"],
  },
];

export const questionValueScore: Record<QuestionValue, number> = {
  critical: 8,
  high: 5,
  useful: 3,
  poor: -3,
};

export const decisionValueScore: Record<DecisionValue, number> = {
  best: 30,
  reasonable: 20,
  unsafe: 0,
};
