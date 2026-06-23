## Quiz Battle — Revisão Geral

Proposta de melhorias em **3 frentes**: experiência, funções e layout. Tudo mantendo a paleta/tipografia atual (Space Grotesk + Inter, tokens semânticos).

### 1) Layout e visual (toda a feature)

**Tela de criação (Host - config)**
- Cards visuais grandes para escolher a fonte das perguntas (Flora / Banco / Manual) com ícone, título e descrição curta — em vez dos 3 botões pequenos atuais.
- Presets rápidos: "Aquecimento (5q · 15s)", "Padrão (10q · 20s)", "Maratona (20q · 30s)".
- Sliders visuais para nº de perguntas e tempo, em vez de inputs numéricos.
- Editor manual com numeração colorida das alternativas (A vermelho / B azul / C amarelo / D verde — mesma cor da tela de jogo) para o host já visualizar como vai aparecer.

**Lobby**
- Código exibido em "boxes" individuais por letra (visual estilo Kahoot).
- QR code do link de entrada (`/quiz-battle/entrar?code=XXXXX`) ao lado do código — amigo aponta a câmera e entra.
- Avatares dos jogadores em cards animados (pulse ao entrar).
- Contador "X de 30 jogadores".

**Tela de jogo (jogador)**
- Barra de progresso visual do tempo (degradê verde → amarelo → vermelho) no lugar só do número.
- Cores de alternativa com ícone (triângulo / losango / círculo / quadrado) — referência Kahoot, ajuda daltonismo.
- Animação ao escolher (pulso) e ao revelar correta/errada (check/x grandes).
- "Streak" visível ("3 acertos seguidos! 🔥").

**Tela do host durante o jogo**
- Mostra contagem ao vivo de quantos já responderam ("12 / 15 responderam").
- Gráfico de barras das respostas escolhidas (revela após o tempo acabar).
- Botão "Pular pergunta" além de "Próxima".

**Tela final**
- Pódio top 3 com medalhas e animação.
- Estatísticas pessoais: acertos, melhor streak, tempo médio.
- Botões "Jogar de novo" (mesma config) e "Compartilhar resultado".

### 2) Funções novas

- **Auto-avançar opcional**: host marca "avançar automaticamente quando todos responderem ou o tempo acabar" — partida flui sem clique.
- **Revelação automática** ao fim do tempo: jogadores veem qual era a correta + explicação (quando vier do banco/Flora) por 4s antes da próxima.
- **Streak bonus**: +100 pts a cada 3 acertos seguidos.
- **Reentrada após queda**: se o jogador cair, ao voltar com o mesmo código entra de novo (mesmo após start) mantendo o score.
- **Cancelar sala**: botão claro no host para cancelar e liberar todos.
- **Compartilhar lobby**: botão "Compartilhar" com Web Share API (link com `?code=`).
- **Validação melhor no manual**: avisa quantas perguntas faltam e quais estão incompletas.

### 3) Backend (mudanças mínimas)

- Coluna nova `quiz_battles.auto_advance boolean default false` e `reveal_seconds int default 4`.
- Edge function ganha:
  - `action: "reveal"` — host (ou auto) marca status de "revelando"; envia explicação.
  - `action: "rejoin"` — permite reentrar em battle `running` se o jogador já existia.
  - Bônus de streak no cálculo de pontos.
- Permitir join em estado `running` apenas quando o jogador já estava na sala (rejoin).

### Fora do escopo

- Modo assíncrono / desafio por link.
- Power-ups (50/50, dobrar pontos).
- Salas privadas com senha.
- Chat dentro do quiz.

### Ordem de implementação

1. Migration: `auto_advance`, `reveal_seconds`, índices.
2. Edge function: streak, rejoin, reveal, ajustes.
3. `QuizBattleHost.tsx` — config redesenhada + lobby + tela de jogo do host com stats.
4. `QuizBattleJoin.tsx` — visual refinado + QR-friendly.
5. `QuizBattlePlay.tsx` — barra de tempo, animações, revelação, streak.
6. Tela final com pódio + stats pessoais.

Quer que eu siga com tudo, ou prefere que eu corte algum item (ex.: pular QR code, pular auto-avançar)?
