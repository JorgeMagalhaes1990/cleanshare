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
- Kits de campismo com sacos-cama
- Suportes de bicicletas para automóvel
- Malas de tejadilho
- Barras de tejadilho
- Tendas de tejadilho

## Acessórios automóveis removíveis

A CleanShare não aluga veículos. Os acessórios automóveis do catálogo são equipamentos removíveis de lazer, normalmente guardados em casas ou garagens e alugados separadamente do automóvel.

Antes da utilização, devem ser verificadas a compatibilidade com o veículo, os limites de carga aplicáveis e a montagem segura de acordo com as instruções do fabricante. Os kits de campismo com sacos-cama exigem também higienização verificada entre utilizações.

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

1. `CleanShare_Blueprint_v1.5.docx`, o Blueprint oficial mais recente.
2. `PROJECT_CONTEXT.txt`.
3. `DESIGN_RULES.txt` para regras visuais e de conteúdo público.
4. A `valuation_matrix` e as migrações em `supabase/migrations/`, incluindo `20260820000000_reorient_catalog.sql` e `20260821000000_expand_events_leisure.sql`.

O Blueprint define a orientação estratégica; o contexto e as regras mantêm a implementação coerente; a matriz e as migrações formalizam o catálogo e os critérios no modelo de dados.

## MVP 3 — operação piloto

O MVP 3 acrescenta publicação de equipamentos, exploração de anúncios e o primeiro pedido real entre duas contas distintas. Esta fase não processa pagamentos, não bloqueia cauções, não cria contratos com validade jurídica, não ativa seguro e mantém a exceção temporária de CMD durante o piloto.

Antes de testar o fluxo real com duas contas, aplique as migrações por esta ordem no Supabase SQL Editor:

1. `supabase/migrations/20260824000000_pilot_rental_workflow.sql` — RPCs autoritativas de aluguer/anúncios e bucket `equipment-images`.
2. `supabase/migrations/20260824010000_rental_chat_condition_flow.sql` — chat privado dos participantes, telefone apenas após confirmação, evidência bilateral de recolha/devolução e bucket privado `rental-condition-photos`.
3. `supabase/migrations/20260901000000_return_confirmation_deadline.sql` — prazo máximo de 24 horas após a primeira confirmação da devolução e conclusão automática quando falta a resposta da contraparte.

A segunda migração mantém mensagens e evidência confirmada imutáveis e usa URLs assinadas de curta duração para fotografias privadas. A terceira conserva a confirmação bilateral imediata, mas limita a espera na devolução: a primeira confirmação inicia 24 horas e, sem a segunda, a operação é concluída automaticamente quando um participante atualiza a área pessoal. No piloto este fecho não movimenta dinheiro; a integração futura de pagamentos e cauções deverá consumir o evento de conclusão. Email e morada continuam privados; o telefone só é devolvido em estados confirmados ou operacionais posteriores. Sem as migrações, a área pessoal mantém o acesso ao perfil e apresenta um aviso honesto de preparação da base de dados.

O dossier fotográfico antes/depois é um registo interno da operação, acessível apenas aos dois participantes autenticados. As fotografias apoiam o acompanhamento e uma eventual análise, mas não decidem por si só qualquer divergência. A intervenção interna da CleanShare em desacordos fica prevista para uma fase futura de suporte/backoffice; este MVP não disponibiliza botão, estado ou fluxo funcional de disputa.
