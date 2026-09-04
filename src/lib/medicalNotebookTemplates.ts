export type MedicalNotebookPaper = "blank" | "lined" | "grid" | "dotted" | "cornell" | "clinical" | "anatomy";

export interface MedicalNotebookPageTemplate {
  title: string;
  purpose: string;
  html: string;
  paper?: MedicalNotebookPaper;
}

export interface MedicalNotebookTemplate {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  accent: string;
  coverImage: string;
  pages: MedicalNotebookPageTemplate[];
}

const safetyNote = `
  <blockquote><strong>Uso educacional.</strong> Este material organiza o estudo e não substitui livros-texto, aulas, supervisão profissional, protocolos locais ou avaliação de pacientes.</blockquote>
`;

const sourcePage = (title: string, sources: string[]) => `
  <h1>${title}</h1>
  <p>Use esta página para registrar a edição, o capítulo e a data de consulta de cada referência usada na sua síntese.</p>
  <h2>Referências iniciais sugeridas</h2>
  <ul>${sources.map((source) => `<li>${source}</li>`).join("")}</ul>
  <h2>Minha checagem</h2>
  <ul>
    <li>□ Comparei a informação em mais de uma fonte confiável.</li>
    <li>□ Diferenciei anatomia, fisiologia e aplicação clínica.</li>
    <li>□ Marquei pontos ainda incertos para revisar com professor ou preceptor.</li>
    <li>□ Não registrei dados identificáveis de pacientes reais.</li>
  </ul>
  ${safetyNote}
`;

export const medicalNotebookTemplates: MedicalNotebookTemplate[] = [
  {
    id: "anatomy-layers",
    name: "Anatomia por camadas",
    eyebrow: "ATLAS GUIADO · 5 PÁGINAS",
    description: "Explore superfície, músculos, esqueleto, vasos, nervos e órgãos com relações espaciais e revisão ativa.",
    accent: "#3f806f",
    coverImage: "/medicine/atlas/organs-anterior-v2.png",
    pages: [
      {
        title: "Mapa do corpo por camadas",
        purpose: "Visão geral e orientação anatômica",
        html: `
          <h1>Anatomia por camadas</h1>
          <p><strong>Objetivo:</strong> compreender como as estruturas se organizam da superfície para os planos profundos e como se relacionam no espaço.</p>
          <img src="/medicine/atlas/organs-anterior-v2.png" alt="Vista anatômica anterior dos principais órgãos" />
          <h2>Da superfície ao plano profundo</h2>
          <p><strong>Pele e tecido subcutâneo → fáscias → músculos → vasos e nervos → ossos e cavidades → órgãos.</strong></p>
          <p>Essa sequência é um roteiro de orientação, não uma regra rígida: a profundidade relativa muda conforme a região do corpo.</p>
          <h2>Linguagem anatômica essencial</h2>
          <ul>
            <li><strong>Superior ↕ inferior:</strong> em direção à cabeça ou aos pés.</li>
            <li><strong>Anterior ↔ posterior:</strong> em direção à frente ou ao dorso.</li>
            <li><strong>Medial ↔ lateral:</strong> perto ou longe do plano mediano.</li>
            <li><strong>Proximal ↔ distal:</strong> perto ou longe da origem de um membro.</li>
            <li><strong>Superficial ↔ profundo:</strong> perto ou longe da superfície.</li>
          </ul>
          ${safetyNote}
        `,
        paper: "anatomy",
      },
      {
        title: "Sistema musculoesquelético",
        purpose: "Relacionar sustentação, articulações e movimento",
        html: `
          <h1>Esqueleto + músculos</h1>
          <img src="/medicine/atlas/skeletal-anterior-v2.png" alt="Vista anterior do esqueleto humano" />
          <h2>Organização funcional</h2>
          <p><strong>Sistema nervoso → ativação muscular → tensão no tendão → movimento da articulação → deslocamento do osso.</strong></p>
          <p>Os ossos fornecem sustentação e alavancas; articulações permitem ou limitam movimento; músculos geram força; tendões transmitem essa força ao osso.</p>
          <h2>Estrutura em foco</h2>
          <ul>
            <li><strong>Nome e região:</strong> __________________________________</li>
            <li><strong>Origem e inserção:</strong> ______________________________</li>
            <li><strong>Ação principal:</strong> _________________________________</li>
            <li><strong>Inervação:</strong> _____________________________________</li>
            <li><strong>Vascularização:</strong> _________________________________</li>
            <li><strong>Estruturas vizinhas:</strong> ____________________________</li>
          </ul>
          <p><strong>Desenhe setas</strong> sobre a imagem para indicar o sentido do movimento e marque os pontos de origem e inserção.</p>
        `,
        paper: "anatomy",
      },
      {
        title: "Vasos e nervos",
        purpose: "Seguir trajetos e relações neurovasculares",
        html: `
          <h1>Trajetos: vasos e nervos</h1>
          <img src="/medicine/atlas/vascular-anterior-v2.png" alt="Vista anterior dos principais vasos do corpo" />
          <h2>Como acompanhar um trajeto</h2>
          <ol>
            <li>Localize a origem da estrutura.</li>
            <li>Siga seu trajeto por regiões anatômicas.</li>
            <li>Registre ramos, cruzamentos e relações com ossos, músculos e órgãos.</li>
            <li>Identifique o território irrigado, drenado ou inervado.</li>
          </ol>
          <p><strong>Origem → trajeto → ramos → território → relação clínica.</strong></p>
          <h2>Meu mapa neurovascular</h2>
          <ul>
            <li><strong>Estrutura:</strong> ______________________________________</li>
            <li><strong>Passa anteriormente a:</strong> __________________________</li>
            <li><strong>Passa posteriormente a:</strong> _________________________</li>
            <li><strong>Acompanha:</strong> _____________________________________</li>
            <li><strong>Termina em:</strong> ____________________________________</li>
          </ul>
        `,
        paper: "anatomy",
      },
      {
        title: "Órgão em detalhe",
        purpose: "Estudar forma, função e relações",
        html: `
          <h1>Órgão em detalhe</h1>
          <img src="/medicine/atlas/organs-anterior-v2.png" alt="Principais órgãos em vista anterior" />
          <h2>Ficha anatômica</h2>
          <ul>
            <li><strong>Órgão:</strong> _________________________________________</li>
            <li><strong>Sistema:</strong> _______________________________________</li>
            <li><strong>Localização e cavidade:</strong> _________________________</li>
            <li><strong>Partes externas e internas:</strong> _____________________</li>
            <li><strong>Irrigação e drenagem:</strong> ___________________________</li>
            <li><strong>Inervação:</strong> _____________________________________</li>
            <li><strong>Relações anterior/posterior/medial/lateral:</strong> ______</li>
          </ul>
          <h2>Forma → estrutura → função</h2>
          <p>Explique com suas palavras como a organização anatômica favorece a função do órgão:</p>
          <p>________________________________________________________________</p>
          <p>________________________________________________________________</p>
        `,
        paper: "anatomy",
      },
      {
        title: "Revisão ativa",
        purpose: "Recuperar sem olhar e localizar lacunas",
        html: `
          <h1>Revisão ativa do atlas</h1>
          <h2>Rotule sem consultar</h2>
          <img src="/medicine/atlas/surface-anterior-v2.png" alt="Vista anterior da superfície corporal para rotulagem" />
          <p>Use a caneta e as setas do Caderno para marcar regiões, planos e estruturas. Depois compare com o Atlas.</p>
          <h2>Perguntas de recuperação</h2>
          <ol>
            <li>Qual estrutura fica imediatamente superficial ao alvo estudado?</li>
            <li>Quais estruturas passam medial e lateralmente a ele?</li>
            <li>Qual é sua irrigação, drenagem e inervação?</li>
            <li>Qual função seria afetada se a estrutura fosse lesionada?</li>
            <li>Consigo localizá-la nas vistas anterior, posterior e lateral?</li>
          </ol>
          <h2>Erros que voltam para revisão</h2>
          <p>Estrutura confundida → por que confundi → pista visual correta → data da próxima revisão.</p>
        `,
        paper: "dotted",
      },
    ],
  },
  {
    id: "cardiovascular-map",
    name: "Sistema cardiovascular",
    eyebrow: "FISIOLOGIA VISUAL · 4 PÁGINAS",
    description: "Câmaras, valvas, vasos e circulação em um mapa visual do fluxo sanguíneo.",
    accent: "#a9505c",
    coverImage: "/medicine/systems/cardiovascular-v1.png",
    pages: [
      {
        title: "Mapa cardiovascular",
        purpose: "Visão integrada do sistema",
        html: `
          <h1>Sistema cardiovascular</h1>
          <img src="/medicine/systems/cardiovascular-v1.png" alt="Ilustração educacional do sistema cardiovascular" />
          <p><strong>Função central:</strong> manter fluxo de sangue pelos circuitos pulmonar e sistêmico para transportar gases, nutrientes, sinais e resíduos.</p>
          <h2>Fluxo completo</h2>
          <p><strong>Veias cavas → átrio direito → valva tricúspide → ventrículo direito → valva pulmonar → tronco e artérias pulmonares → pulmões → veias pulmonares → átrio esquerdo → valva mitral → ventrículo esquerdo → valva aórtica → aorta.</strong></p>
          <blockquote>Artérias conduzem sangue para longe do coração; veias o conduzem em direção ao coração. O nome não depende da oxigenação.</blockquote>
        `,
      },
      {
        title: "Coração em detalhe",
        purpose: "Relacionar anatomia e direção do fluxo",
        html: `
          <h1>Coração em detalhe</h1>
          <img src="/medicine/atlas/organs-anterior-v2.png" alt="Vista anterior dos órgãos com coração em posição anatômica" />
          <h2>Quatro câmaras</h2>
          <ul>
            <li><strong>Átrio direito:</strong> recebe o retorno venoso sistêmico.</li>
            <li><strong>Ventrículo direito:</strong> impulsiona sangue ao circuito pulmonar.</li>
            <li><strong>Átrio esquerdo:</strong> recebe o retorno venoso pulmonar.</li>
            <li><strong>Ventrículo esquerdo:</strong> impulsiona sangue ao circuito sistêmico.</li>
          </ul>
          <h2>Ciclo simplificado</h2>
          <p><strong>Enchimento ventricular → contração atrial → contração ventricular e ejeção → relaxamento → novo enchimento.</strong></p>
          <p>As valvas abrem e fecham conforme diferenças de pressão; elas não “puxam” ativamente o sangue.</p>
          <h2>Desenho guiado</h2>
          <p>Marque com <strong>azul</strong> o percurso até os pulmões e com <strong>vermelho</strong> o percurso dos pulmões aos tecidos. Use setas para indicar a direção.</p>
        `,
      },
      {
        title: "Hemodinâmica essencial",
        purpose: "Organizar relações de pressão, fluxo e resistência",
        html: `
          <h1>Hemodinâmica essencial</h1>
          <h2>Relações para compreender</h2>
          <p><strong>Gradiente de pressão ↑ → tendência de fluxo ↑</strong></p>
          <p><strong>Resistência ↑ → fluxo ↓</strong>, se o gradiente de pressão permanecer constante.</p>
          <p><strong>Raio vascular ↓ → resistência aumenta de modo importante.</strong></p>
          <h2>Do vaso ao tecido</h2>
          <p>Aorta → artérias → arteríolas → capilares → vênulas → veias → veias cavas.</p>
          <ul>
            <li><strong>Artérias:</strong> distribuição sob maior pressão.</li>
            <li><strong>Arteríolas:</strong> grande participação no controle da resistência.</li>
            <li><strong>Capilares:</strong> principal interface de trocas.</li>
            <li><strong>Veias:</strong> retorno ao coração e importante reservatório de volume.</li>
          </ul>
          <h2>Explique sem decorar</h2>
          <p>Por que uma alteração do raio de uma arteríola muda o fluxo a jusante?</p>
          <p>________________________________________________________________</p>
        `,
        paper: "clinical",
      },
      {
        title: "Teste de recuperação",
        purpose: "Revisar fluxo e conceitos",
        html: `
          <h1>Teste de recuperação cardiovascular</h1>
          <ol>
            <li>Começando na veia cava superior, escreva o trajeto até a aorta sem consultar.</li>
            <li>Qual câmara envia sangue ao circuito pulmonar? E ao sistêmico?</li>
            <li>Por que as artérias pulmonares não são chamadas de veias?</li>
            <li>Em qual segmento ocorre a maior parte das trocas com os tecidos?</li>
            <li>Como pressão, resistência e fluxo se relacionam?</li>
          </ol>
          <h2>Meu desenho de memória</h2>
          <p>Faça quatro caixas para as câmaras, desenhe as valvas entre elas e conecte pulmões e corpo com setas.</p>
          <p><strong>Acertos:</strong> ______ &nbsp; <strong>Rever em:</strong> ____ / ____ / ______</p>
          ${safetyNote}
        `,
        paper: "grid",
      },
    ],
  },
  {
    id: "development-journey",
    name: "Desenvolvimento humano",
    eyebrow: "LINHA DO TEMPO · 5 PÁGINAS",
    description: "Da primeira semana ao adulto, com imagens, marcos, transições e perguntas de embriologia.",
    accent: "#8c6d9a",
    coverImage: "/medicine/development/weeks-3-8-v2.png",
    pages: [
      {
        title: "Linha do tempo do desenvolvimento",
        purpose: "Organizar as grandes fases",
        html: `
          <h1>Desenvolvimento humano</h1>
          <img src="/medicine/development/weeks-3-8-v2.png" alt="Ilustração educacional do período embrionário entre as semanas 3 e 8" />
          <h2>Mapa temporal</h2>
          <p><strong>Fecundação → clivagem → blastocisto → implantação → gastrulação → neurulação e organogênese → período fetal → nascimento → infância → adolescência → vida adulta → meia-idade → envelhecimento.</strong></p>
          <p>Os processos se sobrepõem. As idades e marcos devem ser estudados com a convenção usada na disciplina, distinguindo idade gestacional e idade pós-fecundação quando necessário.</p>
          ${safetyNote}
        `,
      },
      {
        title: "Semanas 1 a 3",
        purpose: "Bases da implantação e dos folhetos germinativos",
        html: `
          <h1>Semanas iniciais</h1>
          <img src="/medicine/development/weeks-2-3-v1.png" alt="Ilustração educacional das semanas 2 e 3 do desenvolvimento" />
          <h2>Sequência orientadora</h2>
          <p>Fecundação → divisões celulares → mórula → blastocisto → implantação.</p>
          <p>Na gastrulação, formam-se os três folhetos germinativos: <strong>ectoderma, mesoderma e endoderma</strong>. Eles participam da origem dos tecidos e órgãos.</p>
          <h2>Quadro de origem</h2>
          <ul>
            <li><strong>Ectoderma:</strong> exemplo de derivado ___________________</li>
            <li><strong>Mesoderma:</strong> exemplo de derivado ___________________</li>
            <li><strong>Endoderma:</strong> exemplo de derivado ____________________</li>
          </ul>
          <p><strong>Pergunta:</strong> por que a gastrulação é um ponto central para entender malformações?</p>
        `,
      },
      {
        title: "Semanas 3 a 8",
        purpose: "Compreender a organogênese",
        html: `
          <h1>Período embrionário</h1>
          <img src="/medicine/development/weeks-3-8-v2.png" alt="Desenvolvimento embrionário progressivo entre as semanas 3 e 8" />
          <p>Durante esse período ocorre a formação inicial da maioria dos principais sistemas orgânicos. Crescimento, dobramentos e diferenciação modificam rapidamente a forma corporal.</p>
          <h2>Sistema em estudo</h2>
          <p><strong>Origem embrionária → estrutura precursora → principais transformações → organização ao fim do período.</strong></p>
          <ul>
            <li>Sistema escolhido: __________________________________________</li>
            <li>Semana ou intervalo-chave: __________________________________</li>
            <li>Estrutura precursora: _______________________________________</li>
            <li>Resultado anatômico: ________________________________________</li>
          </ul>
          <blockquote>Evite transformar a linha do tempo em datas isoladas: conecte cada mudança a um mecanismo de desenvolvimento.</blockquote>
        `,
      },
      {
        title: "Feto e transição neonatal",
        purpose: "Relacionar crescimento, maturação e nascimento",
        html: `
          <h1>Período fetal e nascimento</h1>
          <img src="/medicine/development/fetal-period-v1.png" alt="Ilustração educacional do período fetal" />
          <h2>Período fetal</h2>
          <p>Predominam crescimento corporal e maturação funcional dos sistemas iniciados no período embrionário, com ritmos diferentes entre órgãos.</p>
          <h2>Transição ao nascimento</h2>
          <p><strong>Interrupção da circulação placentária + expansão pulmonar → mudanças de pressão → reorganização progressiva da circulação.</strong></p>
          <img src="/medicine/development/neonatal-transition-v1.png" alt="Ilustração educacional da transição neonatal" />
          <p>Registre quais estruturas fetais mudam funcionalmente após o nascimento e como ocorre seu fechamento anatômico.</p>
        `,
      },
      {
        title: "Infância à vida adulta",
        purpose: "Reconhecer continuidade do desenvolvimento",
        html: `
          <h1>Do nascimento ao adulto</h1>
          <img src="/medicine/development/childhood-v1.png" alt="Ilustração educacional da infância" />
          <p><strong>Recém-nascido → lactente → criança → adolescente → adulto.</strong></p>
          <h2>Compare por sistema</h2>
          <ul>
            <li><strong>Musculoesquelético:</strong> crescimento, maturação e remodelamento.</li>
            <li><strong>Nervoso:</strong> maturação funcional, experiência e plasticidade.</li>
            <li><strong>Endócrino/reprodutor:</strong> mudanças puberais e maturidade sexual.</li>
          </ul>
          <h2>Revisão ativa</h2>
          <ol>
            <li>Ordene as fases do desenvolvimento sem consultar.</li>
            <li>Explique a diferença entre período embrionário e fetal.</li>
            <li>Relacione um folheto germinativo a três derivados.</li>
            <li>Explique uma mudança fisiológica da transição neonatal.</li>
          </ol>
        `,
      },
    ],
  },
  {
    id: "condition-study",
    name: "Resumo de condição",
    eyebrow: "RACIOCÍNIO ESTRUTURADO · 4 PÁGINAS",
    description: "Da anatomia e fisiopatologia às manifestações, investigação e revisão de uma condição.",
    accent: "#54789a",
    coverImage: "/medicine/medicine-hero-v2.png",
    pages: [
      {
        title: "Visão geral da condição",
        purpose: "Definir escopo e linguagem",
        html: `
          <h1>Resumo de condição</h1>
          <p><strong>Condição estudada:</strong> __________________________________</p>
          <h2>Definição em uma frase</h2>
          <p>________________________________________________________________</p>
          <h2>Quem, onde e por quê?</h2>
          <ul>
            <li><strong>Sistema e estruturas envolvidas:</strong> ________________</li>
            <li><strong>Fatores associados descritos nas fontes:</strong> _________</li>
            <li><strong>Curso temporal:</strong> agudo / subagudo / crônico / variável</li>
            <li><strong>Termos que preciso dominar:</strong> ______________________</li>
          </ul>
          ${safetyNote}
        `,
        paper: "clinical",
      },
      {
        title: "Mecanismo e anatomia aplicada",
        purpose: "Construir uma cadeia causal",
        html: `
          <h1>Fisiopatologia visual</h1>
          <img src="/medicine/atlas/organs-anterior-v2.png" alt="Órgãos do corpo para anotação da anatomia aplicada" />
          <h2>Cadeia causal</h2>
          <p><strong>Fator inicial → alteração celular ou tecidual → mudança no órgão → alteração fisiológica → manifestação observável.</strong></p>
          <p>Substitua cada etapa pelos elementos da condição e use setas de cores diferentes para mecanismos confirmados e hipóteses ainda em revisão.</p>
          <h2>Anatomia aplicada</h2>
          <ul>
            <li>Estrutura primariamente envolvida: ____________________________</li>
            <li>Estruturas próximas e possíveis relações: _____________________</li>
            <li>Função normal: _______________________________________________</li>
            <li>O que muda na condição: _____________________________________</li>
          </ul>
        `,
      },
      {
        title: "Manifestações e investigação",
        purpose: "Relacionar achados ao mecanismo",
        html: `
          <h1>Manifestações e investigação</h1>
          <h2>Achado → mecanismo</h2>
          <ul>
            <li><strong>Manifestação 1:</strong> __________ → explicação: _________</li>
            <li><strong>Manifestação 2:</strong> __________ → explicação: _________</li>
            <li><strong>Manifestação 3:</strong> __________ → explicação: _________</li>
          </ul>
          <h2>Princípios de investigação</h2>
          <p>Organize o propósito educacional de cada dado, sem transformar o caderno em orientação individual.</p>
          <ul>
            <li><strong>Dado:</strong> ________ <strong>· Pergunta que responde:</strong> ________</li>
            <li><strong>Dado:</strong> ________ <strong>· Limitação:</strong> __________________</li>
            <li><strong>Alternativas a comparar:</strong> ________________________</li>
          </ul>
          <blockquote>Um resultado isolado raramente substitui contexto, probabilidade pré-teste e interpretação supervisionada.</blockquote>
        `,
        paper: "lined",
      },
      {
        title: "Síntese e fontes",
        purpose: "Revisar com rastreabilidade",
        html: sourcePage("Síntese e fontes", [
          "Livro-texto principal da disciplina — capítulo e edição",
          "Diretriz ou consenso da sociedade científica pertinente",
          "Material institucional ou artigo de revisão indicado pelo docente",
        ]),
      },
    ],
  },
  {
    id: "pharmacology-map",
    name: "Farmacologia visual",
    eyebrow: "MECANISMO E SEGURANÇA · 4 PÁGINAS",
    description: "Classe, alvo, mecanismo, efeitos, farmacocinética e segurança sem virar uma ficha de prescrição.",
    accent: "#af7b42",
    coverImage: "/medicine/systems/nervous-v1.png",
    pages: [
      {
        title: "Mapa da classe",
        purpose: "Organizar alvo e mecanismo",
        html: `
          <h1>Farmacologia visual</h1>
          <p><strong>Classe:</strong> ____________________________________________</p>
          <p><strong>Exemplo estudado:</strong> ___________________________________</p>
          <h2>Do alvo ao efeito</h2>
          <p><strong>Fármaco → alvo molecular → transdução ou bloqueio → mudança celular → efeito no órgão → efeito observado.</strong></p>
          <ul>
            <li><strong>Tipo de alvo:</strong> receptor / enzima / canal / transportador / outro</li>
            <li><strong>Agonista, antagonista ou modulador:</strong> ______________</li>
            <li><strong>Tecido-alvo principal:</strong> ___________________________</li>
            <li><strong>Efeito farmacológico esperado:</strong> ___________________</li>
          </ul>
          ${safetyNote}
        `,
        paper: "lined",
      },
      {
        title: "Farmacocinética",
        purpose: "Seguir o percurso no organismo",
        html: `
          <h1>Farmacocinética: percurso</h1>
          <img src="/medicine/systems/digestive-v1.png" alt="Ilustração educacional do sistema digestório para relacionar absorção e metabolismo" />
          <p><strong>Administração → absorção → distribuição → metabolismo → excreção.</strong></p>
          <h2>Perguntas para cada etapa</h2>
          <ul>
            <li><strong>Absorção:</strong> por qual via e com quais barreiras?</li>
            <li><strong>Distribuição:</strong> quais tecidos, proteínas e volumes importam?</li>
            <li><strong>Metabolismo:</strong> onde ocorre e há metabólitos ativos?</li>
            <li><strong>Excreção:</strong> quais vias eliminam fármaco ou metabólitos?</li>
          </ul>
          <p><strong>Parâmetros a revisar:</strong> biodisponibilidade, volume de distribuição, depuração e meia-vida.</p>
        `,
      },
      {
        title: "Efeitos e segurança",
        purpose: "Diferenciar efeito esperado, adverso e interação",
        html: `
          <h1>Efeitos e segurança</h1>
          <h2>Organize por mecanismo</h2>
          <ul>
            <li><strong>Efeito esperado:</strong> ________ → mecanismo: __________</li>
            <li><strong>Efeito adverso frequente estudado:</strong> ______________</li>
            <li><strong>Efeito adverso grave estudado:</strong> ___________________</li>
            <li><strong>Interação farmacodinâmica:</strong> _______________________</li>
            <li><strong>Interação farmacocinética:</strong> _______________________</li>
          </ul>
          <h2>Fatores que podem alterar a exposição</h2>
          <p>Função renal → função hepática → idade → composição corporal → genética → interações → adesão.</p>
          <blockquote>Contraindicação, indicação, dose e monitorização dependem de contexto clínico e fontes atualizadas; não use esta página para orientar tratamento real.</blockquote>
        `,
        paper: "lined",
      },
      {
        title: "Recuperação ativa",
        purpose: "Testar mecanismo sem consulta",
        html: `
          <h1>Recuperação ativa de farmacologia</h1>
          <ol>
            <li>Qual é o alvo e o que muda quando ele é modulado?</li>
            <li>Como o efeito molecular se transforma em efeito no órgão?</li>
            <li>Quais etapas determinam a concentração ao longo do tempo?</li>
            <li>Qual efeito adverso consigo explicar pelo mesmo mecanismo?</li>
            <li>Que fonte atualizada confirma essas informações?</li>
          </ol>
          <h2>Flashcard de mecanismo</h2>
          <p><strong>Frente:</strong> Classe + pergunta sobre alvo.</p>
          <p><strong>Verso:</strong> alvo → ação → efeito celular → efeito orgânico → risco-chave.</p>
          <h2>O que ainda confundo</h2>
          <p>________________________________________________________________</p>
        `,
        paper: "dotted",
      },
    ],
  },
  {
    id: "fictional-clinical-case",
    name: "Caso clínico fictício",
    eyebrow: "RACIOCÍNIO PROGRESSIVO · 4 PÁGINAS",
    description: "Problema, hipóteses, mecanismos e síntese em cenário inteiramente fictício.",
    accent: "#4d7181",
    coverImage: "/medicine/medicine-hero-4k.png",
    pages: [
      {
        title: "Apresentação do caso",
        purpose: "Separar dados de interpretação",
        html: `
          <h1>Caso clínico fictício</h1>
          <blockquote>Use somente casos simulados. Não registre nome, data de nascimento, documento, imagem, local ou qualquer dado identificável de paciente real.</blockquote>
          <h2>Dados liberados</h2>
          <ul>
            <li><strong>Perfil fictício:</strong> _________________________________</li>
            <li><strong>Queixa principal:</strong> _______________________________</li>
            <li><strong>Tempo e evolução:</strong> _______________________________</li>
            <li><strong>Contexto relevante:</strong> _____________________________</li>
          </ul>
          <h2>Antes de interpretar</h2>
          <p>Liste fatos objetivos de um lado e interpretações do outro. Não transforme a primeira impressão em conclusão.</p>
        `,
        paper: "clinical",
      },
      {
        title: "Representação do problema",
        purpose: "Resumir o caso com precisão",
        html: `
          <h1>Representação do problema</h1>
          <h2>Resumo em uma frase</h2>
          <p>Perfil + tempo de evolução + síndrome ou achados centrais + modificadores relevantes.</p>
          <p>________________________________________________________________</p>
          <h2>Mapa de hipóteses</h2>
          <ul>
            <li><strong>Hipótese A:</strong> evidências a favor → ______ · contra → ______</li>
            <li><strong>Hipótese B:</strong> evidências a favor → ______ · contra → ______</li>
            <li><strong>Hipótese C:</strong> evidências a favor → ______ · contra → ______</li>
          </ul>
          <p><strong>Não posso deixar de considerar:</strong> _____________________</p>
          <p><strong>Dado que mais mudaria meu raciocínio:</strong> _______________</p>
        `,
        paper: "clinical",
      },
      {
        title: "Anatomia e mecanismo",
        purpose: "Explicar os achados",
        html: `
          <h1>Anatomia e mecanismo do caso</h1>
          <img src="/medicine/atlas/organs-anterior-v2.png" alt="Mapa corporal para localizar estruturas relacionadas ao caso fictício" />
          <h2>Localize antes de concluir</h2>
          <p>Região → estrutura → função normal → alteração proposta → achado do caso.</p>
          <ul>
            <li><strong>Estrutura central:</strong> _______________________________</li>
            <li><strong>Estruturas vizinhas:</strong> _____________________________</li>
            <li><strong>Mecanismo que conecta os achados:</strong> ________________</li>
            <li><strong>Achado que o mecanismo não explica:</strong> ______________</li>
          </ul>
          <p>Use setas no corpo para representar irradiação, trajetos neurovasculares ou relações entre órgãos.</p>
        `,
        paper: "anatomy",
      },
      {
        title: "Síntese e reflexão de segurança",
        purpose: "Fechar o raciocínio educacional",
        html: `
          <h1>Síntese do caso fictício</h1>
          <h2>Hipótese mais coerente no cenário</h2>
          <p>________________________________________________________________</p>
          <h2>Justificativa mecanística</h2>
          <p>Achados → anatomia → fisiopatologia → hipótese.</p>
          <p>________________________________________________________________</p>
          <h2>O que faltou saber?</h2>
          <ul>
            <li>Dado discriminatório ausente: _________________________________</li>
            <li>Viés cognitivo possível: ______________________________________</li>
            <li>Fonte consultada: ____________________________________________</li>
            <li>Pergunta para professor ou preceptor: _________________________</li>
          </ul>
          ${safetyNote}
        `,
        paper: "clinical",
      },
    ],
  },
  {
    id: "simulated-anamnesis",
    name: "Anamnese simulada",
    eyebrow: "ENTREVISTA CLÍNICA · 4 PÁGINAS",
    description: "Treine escuta, organização da história e síntese usando somente personagens e cenários fictícios.",
    accent: "#587f72",
    coverImage: "/medicine/atlas/surface-anterior-v2.png",
    pages: [
      {
        title: "Preparação da entrevista",
        purpose: "Definir segurança e estrutura",
        html: `
          <h1>Anamnese simulada</h1>
          <blockquote><strong>Somente simulação.</strong> Crie um personagem fictício. Não registre nome, data de nascimento, documento, fotografia, endereço, instituição ou qualquer dado que permita identificar uma pessoa real.</blockquote>
          <h2>Roteiro da conversa</h2>
          <p><strong>Acolhimento → pergunta aberta → história focal → antecedentes relevantes → revisão dirigida → síntese e checagem.</strong></p>
          <ul>
            <li><strong>Personagem fictício:</strong> faixa etária e contexto inventados</li>
            <li><strong>Objetivo educacional:</strong> ____________________________</li>
            <li><strong>Habilidade em foco:</strong> escuta / cronologia / síntese / outra</li>
          </ul>
          <h2>Primeira pergunta aberta</h2>
          <p>________________________________________________________________</p>
        `,
        paper: "clinical",
      },
      {
        title: "História da condição simulada",
        purpose: "Construir cronologia e características",
        html: `
          <h1>História da condição simulada</h1>
          <h2>Linha do tempo</h2>
          <p><strong>Estado basal → início → evolução → situação atual.</strong></p>
          <ul>
            <li><strong>Início e circunstância:</strong> __________________________</li>
            <li><strong>Localização e irradiação, se pertinentes:</strong> _________</li>
            <li><strong>Qualidade e intensidade:</strong> _________________________</li>
            <li><strong>Duração, frequência e padrão temporal:</strong> ___________</li>
            <li><strong>Fatores de melhora ou piora:</strong> ______________________</li>
            <li><strong>Manifestações associadas:</strong> ________________________</li>
            <li><strong>Impacto funcional no cenário fictício:</strong> ___________</li>
          </ul>
          <blockquote>Escolha perguntas conforme a queixa simulada; um roteiro ajuda a organizar, mas não substitui escuta ativa.</blockquote>
        `,
        paper: "clinical",
      },
      {
        title: "Revisão anatômica dirigida",
        purpose: "Conectar relato e localização",
        html: `
          <h1>Revisão anatômica dirigida</h1>
          <img src="/medicine/atlas/surface-anterior-v2.png" alt="Superfície corporal anterior para marcações em uma anamnese simulada" />
          <p>Use círculos e setas para representar no corpo a localização descrita pelo personagem fictício. Diferencie localização, irradiação e estruturas anatômicas possíveis.</p>
          <h2>Revisão por sistemas orientada</h2>
          <ul>
            <li><strong>Geral:</strong> __________________________________________</li>
            <li><strong>Cardiovascular e respiratório:</strong> __________________</li>
            <li><strong>Digestório e urinário:</strong> __________________________</li>
            <li><strong>Neurológico e musculoesquelético:</strong> _______________</li>
            <li><strong>Outros sistemas pertinentes:</strong> ____________________</li>
          </ul>
          <p>Registre achados positivos e negativos simulados apenas quando forem úteis para o objetivo do caso.</p>
        `,
        paper: "anatomy",
      },
      {
        title: "Síntese da entrevista",
        purpose: "Transformar dados em representação concisa",
        html: `
          <h1>Síntese da anamnese simulada</h1>
          <h2>Representação em uma frase</h2>
          <p>Perfil fictício + problema central + cronologia + achados discriminatórios.</p>
          <p>________________________________________________________________</p>
          <h2>Qualidade da entrevista</h2>
          <ul>
            <li>□ Comecei com pergunta aberta.</li>
            <li>□ Reconstruí a cronologia sem induzir respostas.</li>
            <li>□ Diferenciei fato simulado de interpretação.</li>
            <li>□ Resumi e conferi se a história permaneceu coerente.</li>
            <li>□ Não usei nenhum dado de pessoa real.</li>
          </ul>
          <h2>O que melhorar na próxima simulação?</h2>
          <p>________________________________________________________________</p>
          ${safetyNote}
        `,
        paper: "clinical",
      },
    ],
  },
];
