# Corrigir 429 em Flashcards (tier pro_plus sem limites)

## Causa raiz

Os logs do `flora-engine` mostram:
```
[flora] quota exceeded user=... action=generate_flashcards tier=pro_plus 0/0
```

A função `check_ai_quota` consulta `tier_limits` por `(tier, action_type)`. A tabela só tem linhas para `free` e `pro` — **não existe nenhuma linha para `pro_plus`**. Resultado: `limit = 0`, `used = 0`, `allowed = false` → todo request retorna **429**.

Isso afeta o usuário atual (cuja conta está marcada como `pro_plus`) e qualquer outro usuário pro_plus, em **todas** as ações de IA, não só flashcards.

## Correção

Migration SQL inserindo limites generosos para `pro_plus` em todas as `action_type` já existentes em `tier_limits`. Valores propostos (≈ 2-3× o tier `pro`):

| action_type | free | pro | pro_plus (novo) |
|---|---|---|---|
| generate_flashcards | 10 | 200 | 1000 |
| generate_quiz | (ver tabela) | (ver tabela) | 3× pro |
| decide_next_topic | ... | ... | 3× pro |
| (demais ações) | ... | ... | 3× pro |

Antes de escrever a migration final, leio `tier_limits` completo para preservar todas as `action_type` existentes e usar `INSERT ... ON CONFLICT DO NOTHING` para ser idempotente.

## Arquivos / mudanças

- **Nova migration SQL**: insere uma linha em `tier_limits` para cada `action_type` existente, com `tier = 'pro_plus'` e `daily_limit` = 3× o valor de `pro` (ou 1000 quando `pro` for >= 500).
- Nenhuma mudança de código (cliente ou edge function) é necessária — a lógica já funciona, só faltam os dados.

## Validação

1. Rodar `SELECT * FROM tier_limits WHERE tier = 'pro_plus'` e confirmar uma linha por `action_type`.
2. Tentar gerar flashcards novamente no app — deve funcionar (200, sem 429).
3. Conferir log do `flora-engine`: deve mostrar `provider=... OK` em vez de `quota exceeded`.

## Observação

Não vou mexer em layout/cores/visual (memória do projeto). Mudança é puramente de dados no backend.
