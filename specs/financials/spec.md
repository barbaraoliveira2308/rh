# Módulo 16 — Dashboard Financeiro & Analytics

## Objetivo
Disponibilizar indicadores financeiros consolidados sobre custos de colaboradores, projetos, rentabilidade e fluxos de pagamento, com filtros avançados e exportação.

## Responsabilidades
1. Calcular custo por colaborador, equipa e projeto.
2. Calcular margem por consultor (rate do projeto vs. custo do colaborador).
3. Apresentar fluxo de caixa e pagamentos pendentes.
4. Filtrar por projeto, equipa, centro de custos, entidade legal, função e local.
5. Exportar relatórios financeiros.

## Indicadores Chave (KPIs)

| Indicador | Fórmula | Fonte |
|-----------|---------|-------|
| Custo total por colaborador | Salário + Benefícios + Despesas | Contratos + Despesas |
| Custo por projeto | Soma(Horas * Custo/hora) | Timesheets + JTitle.hourly_rate |
| Receita por projeto | Horas faturáveis * Rate do projeto | Timesheets + Project.hourly_rate |
| Margem bruta por consultor | (Rate projeto - Custo colaborador) / Rate projeto | Projetos + Contratos |
| Despesas pendentes de reembolso | Soma de despesas em pending/approved | Despesas |
| Horas não faturáveis | Horas sem projeto associado | Timesheets |

## Filtros Disponíveis

| Filtro | Tipo |
|--------|------|
| Projeto | Multi-select |
| Equipa | Multi-select |
| Centro de custos | Multi-select |
| Entidade legal | Multi-select (Bridge351, NIVVOS) |
| Função/Cargo | Multi-select |
| Local de trabalho | Multi-select |
| Período | Date range |

## Ambiguidade Identificada

> **Margem por consultor:** O documento refere "margem em cada consultor, tendo em conta a rate do projeto". 
> Interpretação proposta: Margem = (Rate faturação ao cliente - Custo hora do colaborador) × Horas trabalhadas no projeto.
> Custo hora = Salário mensal / Horas mensais contratuais.
> **Confiança: 70%** — necessita confirmação de como o custo por hora é calculado.

## Requisitos Funcionais

| ID | Descrição |
|----|-----------|
| RF-FIN-001 | O sistema deve calcular custo por colaborador por período. |
| RF-FIN-002 | O sistema deve calcular custo e receita por projeto. |
| RF-FIN-003 | O sistema deve calcular margem bruta por consultor em cada projeto. |
| RF-FIN-004 | O sistema deve apresentar indicadores de pagamentos pendentes (despesas). |
| RF-FIN-005 | O sistema deve suportar filtros múltiplos combinados. |
| RF-FIN-006 | O sistema deve exportar relatórios financeiros em PDF e Excel. |
| RF-FIN-007 | O sistema deve atualizar indicadores de forma regular (não necessariamente real-time). |

## Permissões

| Ação | Administrador | Gestor | Aprovador | Colaborador |
|------|:---:|:---:|:---:|:---:|
| Ver dashboard financeiro completo | ✅ | ❌ | ❌ | ❌ |
| Ver custos da própria equipa | ✅ | ✅ | ❌ | ❌ |
| Ver margem própria | ✅ | ❌ | ❌ | ❌ |
| Exportar relatórios financeiros | ✅ | ❌ | ❌ | ❌ |

## Dependências do Módulo

```
financials depende de:
- Projetos (rates, horas)
- Timesheets (horas trabalhadas por projeto)
- Contratos (custo/salário dos colaboradores)
- Despesas (reembolsos pendentes e pagos)
- Utilizadores (equipas, cargos, entidade legal)
```

## APIs

- GET /api/v1/analytics/financial-dashboard
  - Query: project_id, team_id, cost_center, entity, job_title, location, start_date, end_date
- GET /api/v1/analytics/consultant-margin
- GET /api/v1/analytics/project-profitability
- GET /api/v1/analytics/export (PDF/Excel)

## Questões em Aberto

| ID | Questão | Prioridade |
|----|---------|------------|
| Q-FIN-001 | Como é calculado o custo/hora do colaborador? Salário/168h ou baseado em horário real? | Alta |
| Q-FIN-002 | Os dados financeiros são calculados em tempo real ou com cache diária? | Alta |
| Q-FIN-003 | "Centro de custos" e "Entidade legal" são entidades do sistema ou atributos dos projetos? | Alta |
| Q-FIN-004 | Existe integração com sistema de contabilidade para dados de payroll? | Alta |
| Q-FIN-005 | Quem define os centros de custo? É configurável pelo Admin? | Média |
