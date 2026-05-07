# Remix of Flora Study 3.0

Aplicação de estudo com planejamento, revisões espaçadas, geração de flashcards e quizzes assistidos por IA.

## O que este projeto cobre

- Sincronização local + remota com Supabase
- Merge inicial de estado entre local e nuvem
- Offline-first para conteúdos e rascunhos
- Tratamento de erros de quota de IA e mensagens amigáveis
- Geração de recursos IA (quiz, flashcards, resumos)

## Como rodar localmente

1. Instale dependências:

   ```bash
   bun install
   ```

2. Inicie o servidor de desenvolvimento:

   ```bash
   bun dev
   ```

3. Abra `http://localhost:5173`

## Testes

Executar testes unitários com Vitest:

```bash
bun test
```

### Cobertura de testes

- **Unitários**: Lógica de gamificação, cálculo de datas, merge de estado de estudo
- **Integração**: Tratamento de erros amigáveis, sincronização offline
- **UI**: Componentes de quota e status de sync (parcial)

Testes cobrem cenários críticos como:
- Merge de dados locais/remotos sem perda
- Detecção de erros de quota IA
- Fallback offline para sincronização

## Observações de estabilidade

- O estado de estudo é mantido localmente e sincronizado em segundo plano quando o usuário está online.
- O app detecta falta de tabelas de sync no Supabase e muda para modo local automaticamente.
- Há mecanismos de restauração local clara quando há conflito de dados remotos.
