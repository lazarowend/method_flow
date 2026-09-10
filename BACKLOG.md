# Backlog — Duplo Green

Prioridade por valor de negócio. Cada item descreve o problema e o critério de aceite.

## P0 — Reconciliação automática (maior economia de tempo)

### 1. Salvar `fixture_id` e `liga` na operação
- **Problema:** hoje salva só o texto `"Time x Time"`, impossibilitando puxar o resultado real depois.
- **Aceite:** nova coluna opcional `fixture_id` (int) e `liga` (text) na tabela `operacoes` + tipos TS.

### 2. Buscar placar/resultado real por `fixture_id`
- **Problema:** usuário precisa digitar retorno e confirmar duplo green manualmente.
- **Aceite:** função no serviço que, dado `fixture_id`, retorna placar final e status do jogo.

### 3. Reconciliação semiautomática no formulário
- **Problema:** trabalho manual de conferir cada jogo.
- **Aceite:** ao editar/selecionar um jogo já encerrado, sugerir preenchimento de retorno/duplo baseado no placar real.

## P1 — Qualidade de vida

### 4. Filtro rápido por período no Histórico
- **Aceite:** atalhos "Hoje / Semana / Mês" além de data inicial/final.

### 5. Exportar CSV
- **Aceite:** botão "Exportar CSV" no Histórico que baixa as operações filtradas.

## P2 — Gestão de risco

### 6. Alerta de valor em jogo alto
- **Aceite:** aviso visual no Dashboard quando o total em jogo ultrapassa um % configurável da banca.

## Fora de escopo (decisão adiada)
- Rate limiting/cache da SportAPI7 (free tier limitado).
- Autenticação multi-usuário (hoje é single-tenant).