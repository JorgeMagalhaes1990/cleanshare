# CleanShare

CleanShare é um marketplace P2P curado para aluguer de equipamentos de valor elevado e uso ocasional em Portugal. A plataforma não está limitada a equipamentos de limpeza: liga proprietários particulares a pessoas que precisam de equipamento específico por períodos curtos, com uma operação simples e protegida.

## Catálogo inicial

### Projetos em casa

- Berbequins e aparafusadoras profissionais
- Lixadoras
- Serras tico-tico e circulares
- Escadas extensíveis e articuladas

### Limpeza profunda

- Lavadoras de alta pressão
- Extratoras de estofos e alcatifas
- Máquinas de limpeza a vapor

### Jardim e terreno

- Roçadoras
- Corta-relvas
- Motoenxadas

### Eventos e lazer

- Projetores
- Colunas de som potentes
- Tendas grandes
- Kits de campismo

## Orientação de mercado

Os particulares constituem a oferta inicial da CleanShare. A plataforma começa com um catálogo focado e curado, privilegiando equipamento de aquisição relevante, utilização ocasional, transporte simples, inspeção verificável e risco baixo ou moderado.

O segmento B2B e o equipamento industrial são uma expansão futura. Essa fase terá regras próprias de elegibilidade, risco, operação e suporte, e não deve ser apresentada como parte da oferta inicial.

## Confiança e segurança

A CleanShare deve tornar a transação clara e segura para ambas as partes. A experiência assenta em identidade verificada, contratos, pagamentos e cauções protegidos, seguro quando aplicável e confirmação da entrega e devolução.

## Stack

- HTML
- CSS
- JavaScript vanilla
- Supabase para autenticação e dados

## Fontes centrais

As decisões de produto, conteúdo e implementação devem seguir, por ordem:

1. `CleanShare_Blueprint_v1.4.docx`, ou a versão mais recente do Blueprint.
2. `PROJECT_CONTEXT.txt`.
3. `DESIGN_RULES.txt` para regras visuais e de conteúdo público.
4. A `valuation_matrix` e as migrações em `supabase/migrations/`, incluindo `20260820000000_reorient_catalog.sql`.

O Blueprint define a orientação estratégica; o contexto e as regras mantêm a implementação coerente; a matriz e as migrações formalizam o catálogo e os critérios no modelo de dados.
