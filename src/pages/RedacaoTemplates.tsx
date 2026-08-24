import { Copy, Check, Sparkles, FileText, Layout, Heart, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";

const TEMPLATES = [
  {
    id: "esqueleto-1",
    title: "Esqueleto Nota 1000 — Modelo Coringa",
    description: "Ideal para qualquer tema de ordem social ou educacional.",
    category: "Coringa",
    icon: <Layout className="w-5 h-5" />,
    content: `## Introdução
Historicamente, o Brasil é um país marcado por [Citar um Contexto Histórico Relacionado]. Nesse sentido, o(a) [Tema da Redação] apresenta-se como um desafio que precisa ser superado. Esse cenário ocorre não apenas devido à [Causa 1], mas também em virtude da [Causa 2]. Dessa forma, é fundamental analisar esses fatores para mitigar esse impasse.

## Desenvolvimento 1 (Causa 1)
Em primeira análise, é importante destacar o papel da [Instituição ou Fator] na manutenção do problema. Segundo o filósofo [Citar Repertório], "frase do repertório". Sob essa ótica, percebe-se que a falta de medidas eficazes para combater o(a) [Tema] perpetua um ciclo de desigualdade. Assim, enquanto a [Causa 1] for negligenciada, o problema continuará a afetar a sociedade brasileira.

## Desenvolvimento 2 (Causa 2)
Ademais, a [Causa 2] também contribui para o agravamento da questão. De acordo com [Citar Outro Repertório], a sociedade tende a normalizar situações de injustiça quando elas se tornam recorrentes. Nesse contexto, a ausência de debate público sobre o(a) [Tema] impede que novas soluções surjam. Logo, urge que essa barreira seja rompida para garantir o bem-estar coletivo.

## Conclusão
Portanto, medidas são necessárias para resolver o impasse. Cabe ao Governo Federal, por meio do Ministério da [Ministério Correspondente], investir em [Ação Prática], com o objetivo de [Finalidade da Ação]. Tal iniciativa deve ser realizada por intermédio de [Meio/Modo]. Somente assim, será possível transformar a realidade do(a) [Tema] e garantir que os direitos fundamentais sejam respeitados.`
  },
  {
    id: "esqueleto-2",
    title: "Esqueleto Nota 1000 — Foco em Tecnologia e Meio Ambiente",
    description: "Estrutura otimizada para temas que envolvem inovação, redes sociais ou ecologia.",
    category: "Específico",
    icon: <Smartphone className="w-5 h-5" />,
    content: `## Introdução
Na obra "Utopia", de Thomas More, é descrita uma sociedade perfeita, onde o bem comum é a prioridade. No entanto, ao analisar a realidade contemporânea brasileira, percebe-se que o(a) [Tema da Redação] distancia o país desse ideal. Isso ocorre devido ao descaso governamental e à negligência social. Nesse contexto, deve-se avaliar como esses entraves impedem o progresso nacional.

## Desenvolvimento 1
Em um primeiro plano, a insuficiência legislativa é um fator determinante. Conforme o pensamento de [Citar Repertório], a lei deve ser um instrumento de proteção, e não apenas de punição. Contudo, no que tange ao(à) [Tema], nota-se que as normas vigentes são falhas ou insuficientemente aplicadas. Como consequência, a problemática se intensifica, gerando prejuízos para toda a coletividade.

## Desenvolvimento 2
Além disso, a passividade da sociedade civil reforça o cenário negativo. Segundo Zygmunt Bauman, vivemos em uma "modernidade líquida", onde as relações e os problemas sociais são tratados de forma superficial. No caso do(a) [Tema], essa superficialidade impede uma conscientização real sobre a gravidade do assunto. Dessa maneira, a mudança estrutural torna-se cada vez mais distante.

## Conclusão
Em suma, é imprescindível que ações sejam tomadas. O Ministério da Educação, em parceria com a mídia, deve promover campanhas de conscientização sobre o(a) [Tema], por meio de debates e materiais informativos, a fim de educar a população sobre seus direitos e deveres. Paralelamente, o Poder Legislativo deve endurecer as penas para quem descumpre as leis ambientais/tecnológicas. Assim, o Brasil poderá se aproximar da utopia de More.`
  },
  {
    id: "esqueleto-3",
    title: "Esqueleto Nota 1000 — Foco em Saúde e Minorias",
    description: "Ideal para temas como saúde pública, doação de órgãos ou direitos de grupos minoritários.",
    category: "Social/Saúde",
    icon: <Heart className="w-5 h-5" />,
    content: `## Introdução
De acordo com a Constituição Federal de 1988, é dever do Estado garantir o bem-estar e a dignidade de todos os cidadãos. Todavia, a persistência do(a) [Tema da Redação] no Brasil demonstra que esse direito constitucional ainda não é plenamente usufruído por todos. Esse quadro de negligência é fomentado pela lacuna estatal e pelo preconito enraizado na sociedade. Logo, urge analisar como esses pilares sustentam o impasse.

## Desenvolvimento 1
A princípio, cabe pontuar que a inércia do Poder Público é um dos principais motores da questão. Segundo a teoria do "Contrato Social" de John Locke, o Estado deve garantir a segurança e os direitos dos indivíduos. Entretanto, no que diz respeito ao(à) [Tema], observa-se que os investimentos são escassos e as políticas públicas, ineficientes. Dessa forma, a omissão estatal torna-se um obstáculo para a efetivação da cidadania.

## Desenvolvimento 2
Outrossim, o estigma social agrava o problema. Segundo Gilberto Freyre, a formação da sociedade brasileira é marcada por hierarquias e exclusões que se refletem até os dias atuais. Nesse viés, o(a) [Tema] é muitas vezes visto com indiferença ou julgamento, o que dificulta o acolhimento e a resolução do conflito. Portanto, é necessário desconstruir essa visão arcaica para que haja progresso.

## Conclusão
Em virtude dos fatos mencionados, medidas urgentes são necessárias. O Ministério da Saúde, em conjunto com as Secretarias de Assistência Social, deve ampliar o acesso ao(à) [Solução Específica], por meio da descentralização dos serviços e do aumento de verbas para o setor. Além disso, cabe às escolas promoverem palestras e projetos que visem combater o preconceito sobre o(a) [Tema]. Somente assim, o preceito constitucional deixará de ser apenas um texto teórico.`
  },
  {
    id: "esqueleto-4",
    title: "Esqueleto Nota 1000 — Crítica à Cultura de Consumo",
    description: "Perfeito para temas sobre publicidade infantil, lixo eletrônico ou comportamento moderno.",
    category: "Cultura",
    icon: <FileText className="w-5 h-5" />,
    content: `## Introdução
A Escola de Frankfurt, em seus estudos sobre a Indústria Cultural, alertou sobre a padronização dos comportamentos e a alienação dos indivíduos em prol do consumo. No Brasil atual, esse fenômeno reflete-se diretamente no(a) [Tema da Redação]. Essa problemática é alimentada pela falta de educação crítica e pelo bombardeio midiático constante. Dessa maneira, é essencial discutir os impactos dessa cultura na sociedade contemporânea.

## Desenvolvimento 1
Sob esse prisma, a ausência de um pensamento crítico desde a infância é preocupante. Segundo Paulo Freire, "se a educação sozinha não transforma a sociedade, sem ela tampouco a sociedade muda". No contexto do(a) [Tema], percebe-se que a falta de letramento midiático torna os cidadãos vulneráveis a manipulações. Assim, a educação falha em formar indivíduos capazes de questionar o status quo do consumo desenfreado.

## Desenvolvimento 2
Somado a isso, o papel da mídia na manutenção desse cenário é evidente. De acordo com o conceito de "Sociedade do Espetáculo" de Guy Debord, a imagem e o consumo sobrepõem-se à essência humana. No que tange ao(à) [Tema], o marketing agressivo estimula o desejo por [Citar Consequência], ignorando os danos sociais e ambientais. Com isso, o indivíduo é reduzido a um mero consumidor, distanciando-se de sua responsabilidade civil.

## Conclusão
Fica clara, portanto, a necessidade de intervenções. O Ministério da Cultura, aliado ao Ministério da Educação, deve implementar o "Projeto de Conscientização Crítica" nas redes de ensino, através de oficinas que ensinem a ler imagens e publicidades. Paralelamente, o CONAR (Conselho Nacional de Autorregulamentação Publicitária) deve impor limites mais rígidos ao(à) [Prática Específica]. Só assim poderemos transpor a alienação descrita pela Escola de Frankfurt.`
  }
];

export default function RedacaoTemplates() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-primary mb-1">Como usar os templates?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Estes esqueletos são estruturas lógicas que já garantem os pontos de coesão e estrutura. 
              Substitua os termos entre colchetes <strong>[ ]</strong> pelos argumentos do tema que você escolheu.
              Pratique encaixando diferentes temas no mesmo esqueleto para ganhar velocidade!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {TEMPLATES.map((t) => (
            <Card key={t.id} className="overflow-hidden border-2 hover:border-primary/30 transition-colors">
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                        {t.icon}
                      </div>
                      <h2 className="font-bold text-lg">{t.title}</h2>
                      <Badge variant="secondary" className="text-[10px] h-5">{t.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyToClipboard(t.id, t.content)}
                    className="shrink-0 rounded-xl gap-1.5"
                  >
                    {copiedId === t.id ? <Check size={14} /> : <Copy size={14} />}
                    {copiedId === t.id ? "Copiado" : "Copiar tudo"}
                  </Button>
                </div>

                <div className="bg-muted/50 rounded-xl p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap border border-border/40 max-h-[400px] overflow-y-auto">
                  {t.content}
                </div>
              </div>
            </Card>
          ))}
        </div>
    </div>
  );
}
