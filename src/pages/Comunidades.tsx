import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Plus, MessageCircle, BookOpen, Send, Sparkles, Pin, ThumbsUp, Search, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FloraIcon } from "@/components/FloraIcon";

// ============ TIPOS ============
interface CommunityPost {
  id: string;
  author: string;
  authorEmoji: string;
  content: string;
  timestamp: Date;
  likes: number;
  liked: boolean;
  isFlora?: boolean;
  pinned?: boolean;
  replies: CommunityPost[];
}

interface Community {
  id: string;
  name: string;
  subject: string;
  description: string;
  emoji: string;
  memberCount: number;
  posts: CommunityPost[];
  joined: boolean;
}

// ============ DADOS INICIAIS ============
const INITIAL_COMMUNITIES: Community[] = [
  {
    id: "matematica",
    name: "Matemática ENEM",
    subject: "Matemática",
    description: "Dicas, exercícios e resolução de questões de matemática para o ENEM.",
    emoji: "📐",
    memberCount: 1247,
    joined: false,
    posts: [
      {
        id: "p1",
        author: "Flora",
        authorEmoji: "🌸",
        content: "**Dica do dia:** Para questões de geometria espacial, sempre visualize o sólido em 2D antes de calcular. Isso reduz erros em 60%! Alguma dúvida sobre geometria?",
        timestamp: new Date(Date.now() - 3600000),
        likes: 42,
        liked: false,
        isFlora: true,
        pinned: true,
        replies: [],
      },
      {
        id: "p2",
        author: "Carlos M.",
        authorEmoji: "🧑‍🎓",
        content: "Alguém pode me ajudar com progressão geométrica? Tô travado na fórmula da soma.",
        timestamp: new Date(Date.now() - 1800000),
        likes: 5,
        liked: false,
        replies: [],
      },
    ],
  },
  {
    id: "portugues",
    name: "Português & Redação",
    subject: "Português",
    description: "Gramática, interpretação de texto e técnicas de redação.",
    emoji: "✍️",
    memberCount: 2103,
    joined: false,
    posts: [
      {
        id: "p3",
        author: "Flora",
        authorEmoji: "🌸",
        content: "**Técnica de redação:** A Flora recomenda estruturar sua dissertação assim: Introdução (tese + contexto) → 2 parágrafos de desenvolvimento (argumento + exemplo) → Conclusão (proposta de intervenção). Qual é o maior desafio de vocês na redação?",
        timestamp: new Date(Date.now() - 7200000),
        likes: 89,
        liked: false,
        isFlora: true,
        pinned: true,
        replies: [],
      },
    ],
  },
  {
    id: "ciencias",
    name: "Ciências da Natureza",
    subject: "Ciências",
    description: "Física, Química e Biologia para o ENEM e vestibulares.",
    emoji: "🔬",
    memberCount: 987,
    joined: false,
    posts: [
      {
        id: "p4",
        author: "Flora",
        authorEmoji: "🌸",
        content: "**Física:** Lembrem-se que a maioria das questões de mecânica no ENEM usa apenas F=ma, energia cinética e potencial. Não precisa de cálculo avançado! Pratiquem com exercícios contextualizados.",
        timestamp: new Date(Date.now() - 10800000),
        likes: 67,
        liked: false,
        isFlora: true,
        pinned: true,
        replies: [],
      },
    ],
  },
  {
    id: "humanas",
    name: "Ciências Humanas",
    subject: "Humanas",
    description: "História, Geografia, Filosofia e Sociologia.",
    emoji: "🌍",
    memberCount: 1456,
    joined: false,
    posts: [
      {
        id: "p5",
        author: "Flora",
        authorEmoji: "🌸",
        content: "**História:** O ENEM adora questões que conectam eventos históricos com o presente. Ao estudar qualquer período, sempre pergunte: 'Como isso afeta o Brasil hoje?' Isso ajuda na interpretação!",
        timestamp: new Date(Date.now() - 14400000),
        likes: 54,
        liked: false,
        isFlora: true,
        pinned: true,
        replies: [],
      },
    ],
  },
  {
    id: "concursos",
    name: "Concursos Públicos",
    subject: "Concursos",
    description: "Direito, Administração, Português jurídico e matérias específicas.",
    emoji: "⚖️",
    memberCount: 743,
    joined: false,
    posts: [
      {
        id: "p6",
        author: "Flora",
        authorEmoji: "🌸",
        content: "**Concursos:** A repetição espaçada é sua melhor aliada! Revise o conteúdo nos dias 1, 3, 7, 14 e 30 após estudar. Use os flashcards da plataforma para isso. Qual concurso vocês estão mirando?",
        timestamp: new Date(Date.now() - 18000000),
        likes: 38,
        liked: false,
        isFlora: true,
        pinned: true,
        replies: [],
      },
    ],
  },
];

// Respostas da Flora baseadas em palavras-chave
const FLORA_RESPONSES: Record<string, string[]> = {
  duvida: [
    "Ótima pergunta! Vou tentar ajudar. Qual parte específica está gerando dúvida?",
    "Essa é uma dúvida muito comum! Vamos resolver juntos passo a passo.",
  ],
  ajuda: [
    "Estou aqui para ajudar! Me conta mais detalhes sobre o que está precisando.",
    "Claro! Pode compartilhar o exercício ou o conceito que está travando.",
  ],
  default: [
    "Que discussão interessante! Alguém quer complementar ou tem uma perspectiva diferente?",
    "Ótima contribuição! Lembrem-se de usar os flashcards para fixar esse conteúdo.",
    "Excelente! Para aprofundar esse tema, recomendo criar uma nota no caderno com os pontos principais.",
    "Muito bom! Pratiquem com exercícios do banco de questões para solidificar o aprendizado.",
  ],
};

function getFloraResponse(message: string): string {
  const lower = message.toLowerCase();
  for (const [key, responses] of Object.entries(FLORA_RESPONSES)) {
    if (lower.includes(key)) {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }
  const defaults = FLORA_RESPONSES.default;
  return defaults[Math.floor(Math.random() * defaults.length)];
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "agora";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

// ============ COMPONENTE PRINCIPAL ============
export default function Comunidades() {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Community[]>(INITIAL_COMMUNITIES);
  const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);
  const [newPost, setNewPost] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFloraTyping, setIsFloraTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeCommunity) scrollToBottom();
  }, [activeCommunity?.posts]);

  const joinCommunity = (communityId: string) => {
    setCommunities((prev) =>
      prev.map((c) =>
        c.id === communityId
          ? { ...c, joined: !c.joined, memberCount: c.joined ? c.memberCount - 1 : c.memberCount + 1 }
          : c
      )
    );
    const community = communities.find((c) => c.id === communityId);
    if (community) {
      toast.success(community.joined ? `Saiu de ${community.name}` : `Entrou em ${community.name}!`);
    }
  };

  const openCommunity = (community: Community) => {
    if (!community.joined) {
      joinCommunity(community.id);
    }
    const updated = communities.find((c) => c.id === community.id);
    setActiveCommunity(updated || community);
  };

  const sendPost = async () => {
    if (!newPost.trim() || !activeCommunity) return;

    const post: CommunityPost = {
      id: `post_${Date.now()}`,
      author: "Você",
      authorEmoji: "👤",
      content: newPost.trim(),
      timestamp: new Date(),
      likes: 0,
      liked: false,
      replies: [],
    };

    const updatedCommunity = {
      ...activeCommunity,
      posts: [...activeCommunity.posts, post],
    };

    setCommunities((prev) =>
      prev.map((c) => (c.id === activeCommunity.id ? updatedCommunity : c))
    );
    setActiveCommunity(updatedCommunity);
    setNewPost("");

    // Flora responde após 2-4 segundos (30% de chance)
    if (Math.random() < 0.3) {
      setIsFloraTyping(true);
      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));
      setIsFloraTyping(false);

      const floraPost: CommunityPost = {
        id: `flora_${Date.now()}`,
        author: "Flora",
        authorEmoji: "🌸",
        content: getFloraResponse(newPost),
        timestamp: new Date(),
        likes: 0,
        liked: false,
        isFlora: true,
        replies: [],
      };

      setCommunities((prev) =>
        prev.map((c) =>
          c.id === activeCommunity.id
            ? { ...c, posts: [...c.posts, floraPost] }
            : c
        )
      );
      setActiveCommunity((prev) =>
        prev ? { ...prev, posts: [...prev.posts, floraPost] } : prev
      );
    }
  };

  const likePost = (postId: string) => {
    if (!activeCommunity) return;
    const updatedPosts = activeCommunity.posts.map((p) =>
      p.id === postId
        ? { ...p, likes: p.liked ? p.likes - 1 : p.likes + 1, liked: !p.liked }
        : p
    );
    const updated = { ...activeCommunity, posts: updatedPosts };
    setCommunities((prev) => prev.map((c) => (c.id === activeCommunity.id ? updated : c)));
    setActiveCommunity(updated);
  };

  const filteredCommunities = communities.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ============ TELA DE COMUNIDADE ATIVA ============
  if (activeCommunity) {
    return (
      <div className="flex flex-col h-dvh bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card sticky top-0 z-10">
          <div className="container max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveCommunity(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="text-2xl">{activeCommunity.emoji}</span>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-base truncate">{activeCommunity.name}</h1>
              <p className="text-xs text-muted-foreground">
                {activeCommunity.memberCount.toLocaleString()} membros
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
              <FloraIcon className="w-3 h-3" />
              <span>Flora moderando</span>
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-3xl mx-auto px-4 py-4 space-y-3">
            {/* Posts fixados */}
            {activeCommunity.posts
              .filter((p) => p.pinned)
              .map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border-2 p-4 space-y-2 ${
                    post.isFlora
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{post.authorEmoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{post.author}</span>
                        {post.isFlora && (
                          <Badge variant="default" className="text-xs px-1.5 py-0">
                            Moderadora
                          </Badge>
                        )}
                        {post.pinned && (
                          <Pin className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{formatTime(post.timestamp)}</span>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  <button
                    onClick={() => likePost(post.id)}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      post.liked ? "text-primary" : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {post.likes}
                  </button>
                </motion.div>
              ))}

            {/* Posts normais */}
            {activeCommunity.posts
              .filter((p) => !p.pinned)
              .map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border p-4 space-y-2 ${
                    post.isFlora ? "border-primary/20 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{post.authorEmoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{post.author}</span>
                        {post.isFlora && (
                          <Badge variant="default" className="text-xs px-1.5 py-0">
                            Moderadora
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{formatTime(post.timestamp)}</span>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  <button
                    onClick={() => likePost(post.id)}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      post.liked ? "text-primary" : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {post.likes}
                  </button>
                </motion.div>
              ))}

            {/* Flora digitando */}
            <AnimatePresence>
              {isFloraTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-lg">🌸</span>
                  <div className="bg-muted rounded-xl px-3 py-2 flex gap-1">
                    <span className="animate-bounce delay-0">•</span>
                    <span className="animate-bounce delay-75">•</span>
                    <span className="animate-bounce delay-150">•</span>
                  </div>
                  <span className="text-xs">Flora está digitando...</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card p-4">
          <div className="container max-w-3xl mx-auto">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendPost();
              }}
            >
              <Input
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Compartilhe uma dúvida, dica ou nota..."
                className="flex-1"
              />
              <Button type="submit" disabled={!newPost.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ============ TELA DE LISTAGEM ============
  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Comunidades
            </h1>
            <p className="text-xs text-muted-foreground">Estude junto com outros alunos</p>
          </div>
        </div>
      </div>

      <div className="container max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar comunidades..."
            className="pl-9"
          />
        </div>

        {/* Banner Flora */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 p-4 flex items-start gap-3">
          <span className="text-3xl">🌸</span>
          <div>
            <p className="font-semibold text-sm">Flora modera todas as comunidades</p>
            <p className="text-xs text-muted-foreground mt-1">
              A Flora acompanha as discussões, responde dúvidas e sugere materiais de estudo para ajudar todos os membros.
            </p>
          </div>
        </div>

        {/* Comunidades que participo */}
        {communities.some((c) => c.joined) && (
          <div>
            <h2 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4" /> Minhas Comunidades
            </h2>
            <div className="space-y-2">
              {filteredCommunities
                .filter((c) => c.joined)
                .map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    onOpen={() => openCommunity(community)}
                    onJoin={() => joinCommunity(community.id)}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Todas as comunidades */}
        <div>
          <h2 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Explorar Comunidades
          </h2>
          <div className="space-y-2">
            {filteredCommunities
              .filter((c) => !c.joined)
              .map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  onOpen={() => openCommunity(community)}
                  onJoin={() => joinCommunity(community.id)}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunityCard({
  community,
  onOpen,
  onJoin,
}: {
  community: Community;
  onOpen: () => void;
  onJoin: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card p-4 flex items-center gap-3 hover:border-primary/30 transition-colors"
    >
      <span className="text-3xl">{community.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm truncate">{community.name}</h3>
          {community.joined && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              Membro
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{community.description}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {community.memberCount.toLocaleString()} membros · {community.posts.length} posts
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        {community.joined && (
          <Button size="sm" variant="outline" onClick={onOpen}>
            <MessageCircle className="w-4 h-4 mr-1" />
            Abrir
          </Button>
        )}
        <Button
          size="sm"
          variant={community.joined ? "ghost" : "default"}
          onClick={community.joined ? onJoin : onOpen}
        >
          {community.joined ? "Sair" : "Entrar"}
        </Button>
      </div>
    </motion.div>
  );
}
