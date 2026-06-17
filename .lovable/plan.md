## Objetivo

Transformar `src/pages/Admin.tsx` (707 linhas, tabs apertadas) em um painel administrativo com **sidebar lateral**, código modular, novas funções de moderação e ações de dados em massa.

## 1. Novo layout (sidebar)

Estrutura nova:

```text
┌─────────────────────────────────────────────────┐
│ AdminShell                                       │
│ ┌──────────────┬────────────────────────────┐   │
│ │ AdminSidebar │ Sticky header (busca Cmd+K)│   │
│ │              ├────────────────────────────┤   │
│ │ • Visão geral│                            │   │
│ │ • Usuários   │  <Outlet /> da seção       │   │
│ │ • Moderação  │                            │   │
│ │ • Conteúdo   │                            │   │
│ │   ├ ENEM     │                            │   │
│ │   └ Concurso │                            │   │
│ │ • PDFs       │                            │   │
│ │ • IA & Tiers │                            │   │
│ │ • Cache      │                            │   │
│ │ • Logs       │                            │   │
│ └──────────────┴────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

- `SidebarProvider` + `Sidebar collapsible="icon"`, badges de contagem (ex: "Usuários 1.2k").
- Seleção via state local (sem mudar rota — mantém URL `/admin`).
- Sticky header com `<Input>` de busca global + botão `Cmd+K` (command palette).

## 2. Refactor de código

Quebrar `Admin.tsx` (707 → ~120 linhas de shell) em:

```text
src/components/admin/
  AdminShell.tsx            (layout sidebar + roteamento de seção)
  AdminSidebar.tsx          (nav)
  AdminCommandPalette.tsx   (Cmd+K, ações + busca de usuário)
  panels/
    OverviewPanel.tsx       (NOVO: cards de métricas, gráfico de uso Flora 7d)
    UsersPanel.tsx          (lista + filtros + edição inline + bulk)
    ModerationPanel.tsx     (NOVO: banir, resetar senha, promover, logs)
    HoursPanel.tsx          (ajuste de horas + snapshots)
    TopicsPanel.tsx         (gerência de tópicos do usuário selecionado)
    AITiersPanel.tsx        (já existe: AdminAITierPanel)
    EnemContentPanel.tsx    (wrapper de AdminQuestionsPanel + GenerateQuestionsDialog + TemaClassifier)
    ConcursoContentPanel.tsx
    PdfPanel.tsx            (Single + Batch como sub-tabs internas)
    CachePanel.tsx
    LogsPanel.tsx           (NOVO: leitura de admin_action_logs paginada com filtros)
  hooks/
    useAdminUsers.ts        (lista, filtros, paginação, search)
    useAdminMutations.ts    (ban, role, tier, password reset, impersonate)
    useBulkSelection.ts     (seleção múltipla genérica)
```

`Admin.tsx` vira só guard + `<AdminShell />`.

## 3. Novas funções

### Moderação
- **Banir/desbanir** (campo `banned_until` em `profiles` ou via `auth.admin.updateUserById`)
- **Reset de senha** (gerar magic link e copiar)
- **Promover/rebaixar admin** (insert/delete em `user_roles`)
- **Impersonar** (gerar magic link de login como o usuário — link copiável, não auto-login pra segurança)
- **Notificar** (mensagem em `flora_chat_messages` ou toast persistente — usar tabela existente se houver)
- Toda ação grava em `admin_action_logs` (já existe).

### Dados
- **Edição inline** de qualquer campo do usuário (nome, email, tier, role, theme) com `<Input>` que salva onBlur
- **Filtros avançados**: tier, role, theme, status (banido), última atividade, busca por email/nome
- **Bulk actions** (checkbox em massa): mudar tier, deletar, notificar, exportar CSV dos selecionados
- **Exportar CSV**: usuários filtrados, questões, horas, snapshots
- **Gráfico de uso da Flora** (últimos 7d) no Overview — Recharts já existe no projeto

### Liberdade
- **Cmd+K command palette**: busca usuário, ações rápidas ("Banir @email", "Mudar tier de @email para pro"), navegação entre painéis
- **Query builder visual** simples no `UsersPanel`: chips AND/OR sobre colunas conhecidas (sem SQL bruto)

## 4. Edge functions (admin)

Criar `supabase/functions/admin-actions/index.ts` que centraliza ações privilegiadas:
- `ban_user`, `unban_user`, `reset_password`, `set_role`, `set_tier`, `delete_user`, `impersonate_link`, `bulk_update`
- Verifica `has_role(auth.uid(), 'admin')` no início
- Grava em `admin_action_logs`
- Usa `service_role` (não exposto ao cliente)

## 5. Migração SQL

- Adicionar `banned_until timestamptz` a `profiles` (se não existir).
- Index em `admin_action_logs(created_at desc)` para LogsPanel.
- Nada destrutivo.

## Detalhes técnicos

- Sidebar usa o shadcn `Sidebar` (já no projeto) com `collapsible="icon"`.
- Command palette: `cmdk` (já no projeto via shadcn `Command`).
- Mantém o design tokens existente — sem mudar cores nem fontes.
- Cada painel é lazy (`React.lazy`) para não inflar bundle inicial do Admin.
- `useAdminUsers` busca via RPC `admin_list_profiles` (já existe em outras telas? se não, query direta a `profiles` validada por RLS de admin).

## Ordem de entrega

Vou entregar em 3 sub-pacotes para validar cedo:

1. **Pacote A (shell + refactor)**: `AdminShell`, `AdminSidebar`, mover painéis existentes pra `panels/`, `Admin.tsx` enxuto. Sem nova função ainda.
2. **Pacote B (moderação + edição inline)**: edge function `admin-actions`, `ModerationPanel`, edição inline em `UsersPanel`, bulk selection, export CSV.
3. **Pacote C (Cmd+K + Overview + Logs)**: command palette, `OverviewPanel` com gráficos, `LogsPanel`.

Confirme e começo pelo **Pacote A**.