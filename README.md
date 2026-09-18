# OutZila

Marketplace P2P para aluguer protegido de equipamentos individuais premium de lazer outdoor. CleanShare e OutShare são nomes históricos do mesmo projeto; o nome do repositório e o protótipo ainda não foram migrados.

## Documentação central atual

- [Blueprint estratégico e técnico v1.8](OutZila_Blueprint_v1.8.md).
- [Decisão de identidade e autenticação](OutZila_Identidade_Autenticacao.md).
- [Dossier de Produto Segurador v0.9](OutZila_Dossier_Produto_Segurador_v0.9.md).
- [Contexto do projeto](PROJECT_CONTEXT.txt), [fluxo de trabalho](AI_WORKFLOW.txt), [instruções Codex](AGENTS.md) e [regras visuais](DESIGN_RULES.txt).
- [Briefing para o futuro contrato de aluguer](OutZila_Brief_Contrato_Aluguer.md), sujeito a revisão jurídica antes de utilização.

Estas versões substituem a orientação anterior CMD-only, catálogo generalista e limiar de 300 euros. Os ficheiros CleanShare/OutShare anteriores são conservados como histórico. A matriz e as migrações existentes descrevem o estado implementado, não substituem decisões estratégicas posteriores.

As versões Markdown acima são a referência documental atual. Os Word anteriores não incluem a decisão de identidade de 17 de setembro de 2026; a publicação de novas versões Word fica pendente de validação visual.

## Identidade e confiança

Supabase continua responsável pelas contas, login e sessões. Signicat é a solução preferencial para verificação civil e assinatura eletrónica. O onboarding deverá suportar eID nacional/EUDI Wallet quando disponível e documento com selfie/liveness e NFC quando aplicável. Wallet não é obrigatória no lançamento; login e email confirmado não comprovam identidade civil.

A OutZila guarda apenas atributos verificados necessários à operação e contratos e prova mínima do resultado, evitando documentos de identidade e biometria salvo necessidade jurídica documentada. Os contratos devem ligar as identidades verificadas de ambas as partes, as duas assinaturas eletrónicas e um audit trail exportável ao aluguer. Preservar a cadeia identidade verificada → contrato → pagamento → entrega bilateral documentada → devolução bilateral documentada. Arquitetura Europe-first, com regiões e tratamento a validar e preparação para futura EUDI Wallet.

## Catálogo e modelo segurador

Equipamento principal individual, aquisição ou substituição superior a 500 euros, uso ocasional, transportável e inspecionável. Famílias: transporte/mobilidade outdoor, campismo/abrigo, desportos aquáticos e energia/autonomia. São subfamílias do único segmento outdoor, não o antigo lançamento generalista de quatro categorias. Produtos e critérios detalhados no Blueprint e Dossier. Não aceitar kits de vários bens; veículos não estão incluídos.

Seguro adequado é condição do modelo real pretendido. Solicitar dano acidental, furto/roubo por terceiros, perda total e não restituição/apropriação pelo locatário expressamente coberta. O dossier não é apólice ativa. Economia: hipóteses de comissão de aluguer de 20%, prémio médio de 10% do aluguer, comissão seguradora de 10% do prémio e financiamento do prémio 70% arrendatário/30% plataforma. Custos Signicat requerem proposta e recálculo, não tarifas inventadas.

## Execução e demonstração

Aplicação estática HTML, CSS e JavaScript vanilla com Supabase. Não é necessário instalar dependências para servir o projeto localmente. Usar um servidor HTTP na raiz, por exemplo `python -m http.server 8000`, e abrir `http://127.0.0.1:8000/`.

Demo externo: [demo.outzila.com](https://demo.outzila.com/), alojado no projeto Vercel existente. O build `node scripts/build-static.mjs` publica apenas a aplicação estática em `dist/`; documentos centrais, contexto, migrações e segredos não são conteúdo do site. Domínio principal e email profissional continuam geridos na Hostinger. Deploy comercial e planos pagos requerem avaliação e autorização próprias.

## Estado implementado e limites do piloto

A rota `area-utilizador.html` usa sessão Supabase e dados reais. `?demo=1` é demonstração isolada. O piloto inclui perfil, anúncios, pedido entre duas contas, resposta do proprietário, chat privado e fotografias/checklists bilaterais. O backend decide valores, conflitos, permissões e transições através de RLS/RPCs; user_metadata só personaliza a interface.

Ainda não há integração Signicat, assinatura contratual jurídica, pagamento real, caução bloqueada ou seguro ativo. A exceção reversível de acesso piloto não comprova identidade civil. A migração destas capacidades exige tarefa de implementação separada.

Migrações operacionais existentes, por ordem:

1. `supabase/migrations/20260824000000_pilot_rental_workflow.sql`.
2. `supabase/migrations/20260824010000_rental_chat_condition_flow.sql`.
3. `supabase/migrations/20260901000000_return_confirmation_deadline.sql`.
4. `supabase/migrations/20260901010000_operational_email_outbox.sql`.

Entrega e devolução exigem confirmação individual e evidência privada de cada participante. A primeira confirmação da devolução inicia o máximo de 24 horas; no piloto a conclusão sem segunda resposta é desencadeada numa atualização autenticada, sem movimentar dinheiro. Não existe ainda fecho autónomo nem fluxo funcional de disputa/backoffice. O dossier antes/depois permanece interno à operação, não público. Telefone só é divulgado nos estados autorizados; email e morada continuam privados.

## Emails e segredos

Em 17 de setembro de 2026, `updates.outzila.com` foi verificado no Resend e SMTP Auth do Supabase foi configurado com remetente `OutZila <notificacoes@updates.outzila.com>`. O teste de envio e receção foi adiado pelo utilizador; não o considerar concluído. A chave dedicada está no campo protegido do Supabase, não no código ou GitHub. Este SMTP não ativa a fila de emails de aluguer.

Notificações operacionais usam outbox idempotente e [Edge Function](supabase/functions/send-operational-email/README.md). O checkpoint de 2 de setembro confirmou envio sandbox apenas ao titular Resend; a fila global continua desativada. Remetente operacional e teste de duas contas continuam pendentes. Nunca ativar a fila ou alterar segredos sem tarefa e autorização próprias. Resend é o fornecedor inicial; o adaptador Amazon SES é alternativa futura, não prova de processamento integral europeu.
