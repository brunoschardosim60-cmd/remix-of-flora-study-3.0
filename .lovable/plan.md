# Roadmap StudyFlow — 4 frentes paralelas

Quatro melhorias em ordem de impacto x esforço. Cada fase é independente e pode ser implementada/parada em qualquer ponto. Tudo respeita o design atual (sem mudanças visuais fora do escopo de cada feature).

---

## Fase 1 — API ENEM + Brasil API *(menor esforço, ganho imediato)*

**Objetivo:** trazer questões oficiais do ENEM direto da API pública `enem.dev` para o Banco de Questões e Simulado, e usar Brasil API para feriados/CEP.

- Nova edge function `import-enem-questions` que chama `https://api.enem.dev/v1/exams/{ano}/questions` e popula a tabela `questions` existente (categoriza por disciplina via `classify_question_tema` que já existe).
- Painel admin para disparar import por ano (2009-2023).
- No `SimuladoEnem.tsx`: botão "Modo oficial" que filtra apenas questões com `source='enem_oficial'`.
- Brasil API: hook `useFeriados()` → bloqueia agendamento de revisão em feriado nacional no `WeeklySchedule`/`spaced_reviews`.
- Brasil API CEP no onboarding para preencher escola/cidade automaticamente.

**Sem chave de API, sem custo.**

---

## Fase 2 — Notificações push + resumo semanal por email

**Objetivo:** trazer o aluno de volta sem depender de ele abrir o app.

### Push (Web Push API nativo, sem Firebase)
- Tabela `push_subscriptions` já existe ✓.
- Service worker dedicado `public/sw-push.js` (separado do PWA, não interfere no preview).
- Página Settings → toggle "Receber lembretes" gera VAPID subscription e salva.
- Edge function `send-push-notification` + cron pg_cron a cada 1h:
  - Revisão atrasada hoje
  - Streak prestes a quebrar (último estudo > 20h)
  - Meta do dia ainda 0% às 19h
- Secrets necessários: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (gero e adiciono via add_secret).

### Email semanal
- Usa Lovable Emails (infra nativa, sem provedor externo).
- Template React Email `weekly-summary.tsx`: horas estudadas, top matérias, pontos fracos, plano da próxima semana.
- Edge function `send-weekly-summary` agendada domingo 18h via pg_cron.
- Conteúdo gerado pela Flora (já tem `flora-engine`).
- Pré-requisito: domínio de email (mostro botão de setup se ainda não tem).

---

## Fase 3 — Flora proativa + diagnóstico inicial

**Objetivo:** Flora deixa de esperar o aluno e passa a agir.

### Onboarding diagnóstico
- Nova etapa em `pages/Onboarding.tsx`: 10 questões adaptativas (2 por área ENEM).
- Resultado vira `student_performance` inicial + Flora gera plano de 30 dias.
- Tela final: "Aqui está seu mapa de pontos fortes/fracos".

### Flora proativa
- Hook `useFloraProactive()` no shell do app:
  - Por horário (manhã: revisões; tarde: novo conteúdo; noite: 5 questões rápidas).
  - Por desempenho: se 3 erros seguidos no mesmo tópico → sugere pausa/troca.
  - Por inatividade: > 2 dias sem estudar → mensagem motivacional.
- Mensagens entram como `flora_decisions` com `decision_type='proactive'` e aparecem no chat como cards de ação.
- Limite: máx 1 sugestão proativa não-lida por vez (evita spam).

---

## Fase 4 — Páginas públicas SEO *(maior alcance, maior esforço)*

**Objetivo:** transformar conteúdo gerado pela Flora em tráfego orgânico.

- Nova rota pública `/conteudo/:slug` (sem login).
- Tabela `public_content` (slug, título, h1, meta_description, body_markdown, materia, tema, views).
- Edge function `generate-public-content` (admin) gera lote: "Resumo de [tema]" para todos os temas do `classify_question_tema`.
- Template visual reaproveita design do notebook (sem alterar UI dos cadernos).
- SEO: title <60c, meta <160c, H1 único, JSON-LD Article, canonical, OG tags.
- `public/sitemap.xml` gerado dinamicamente via edge function que lê `public_content`.
- CTA discreto no fim de cada página: "Estude com a Flora →" → leva ao signup.
- Redações modelo nota 1000 (lote inicial de 20) como primeira leva.

---

## Ordem sugerida e estimativa

| Ordem | Fase | Esforço | Impacto |
|------|------|---------|---------|
| 1ª | API ENEM + Brasil API | Pequeno | Alto (qualidade do banco) |
| 2ª | Flora proativa + diagnóstico | Médio | Alto (retenção) |
| 3ª | Push + email semanal | Médio | Alto (retorno) |
| 4ª | SEO público | Grande | Alto (aquisição) |

---

## Detalhes técnicos

- **Sem mudança de design** em telas existentes — apenas novas telas/cards seguem o sistema atual (Space Grotesk + Inter, tokens semânticos).
- **Backend:** tudo em Lovable Cloud (edge functions + pg_cron + pgmq para email).
- **IA:** continua usando o fallback existente em `_shared/providers.ts` (Gemini → Groq → Mistral...).
- **Sem novos secrets pagos**: Brasil API e ENEM API são abertas; Web Push usa VAPID auto-gerado; email via Lovable Emails.
- **Migrations necessárias:** `questions` ganha coluna `source`, nova `public_content`, índices em `flora_decisions(decision_type, read_at)`.

---

Posso começar pela **Fase 1 (ENEM + Brasil API)** que é a mais rápida e já entrega valor visível, ou prefere outra ordem?