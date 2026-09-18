# Identidade e autenticação da OutZila

Decisão estratégica aprovada em 17 de setembro de 2026. Esta decisão substitui a orientação anterior de CMD obrigatória. Define a arquitetura pretendida; não representa uma integração Signicat já contratada, implementada ou validada.

## Responsabilidades separadas

Supabase continua responsável pelas contas, login e sessões. A confirmação de email e uma sessão válida autenticam a conta, mas não comprovam a identidade civil. Signicat passa a ser a solução preferencial para verificação de identidade civil e assinatura eletrónica. As permissões operacionais continuam a ser decididas pelo backend da OutZila e pelas regras da base de dados.

## Dois métodos de onboarding

1. eID nacional ou EUDI Wallet, quando o método estiver disponível e for suportado para o país, atributos e nível de garantia necessários.
2. Documento de identificação, selfie e verificação de presença real (liveness), com leitura NFC do chip quando o documento e dispositivo o permitirem.

A eID/EUDI Wallet não será obrigatória no lançamento. O percurso documental deve permitir operar sem carteira digital, depois de verificação civil bem-sucedida. NFC não é universal nem um bloqueio automático: devem existir alternativas adequadas e encaminhamento para revisão quando necessário. A disponibilidade de cada método e equivalência dos níveis de garantia dependem da proposta Signicat, avaliação de risco e aceitação jurídica e seguradora.

## Dados mínimos e privacidade

A OutZila guardará apenas os atributos verificados estritamente necessários à operação e aos contratos, bem como a prova mínima do resultado. Nome civil, identificador interno, referência da verificação, método, data, resultado e nível de garantia devem ter finalidade e retenção definidas. NIF, morada e outros atributos só serão recolhidos quando necessários e não serão classificados como verificados se o método usado não os comprovar. Para maioridade, privilegiar um atributo de maioridade em vez de data de nascimento completa quando suficiente.

Não guardar por defeito cópias de documentos de identidade, selfies, vídeos de liveness, imagens NFC ou modelos biométricos na OutZila, incluindo Storage, logs, analytics, emails e dados de teste. O processamento destes elementos pelo fornecedor deve ter base jurídica, finalidade e retenção acordadas. Qualquer retenção excecional pela OutZila requer necessidade jurídica documentada, prazo, acesso restrito e validação de privacidade. Não assumir que externalizar o processamento elimina as responsabilidades da plataforma.

## Contratos e assinatura eletrónica

Cada contrato de aluguer será gerado com os dados verificados necessários e associado à identidade civil de proprietário e arrendatário e ao identificador da operação. Deve existir assinatura eletrónica por ambas as partes e audit trail exportável, com versão e hash do contrato, identidade dos signatários, referências das verificações, método de assinatura, resultado e carimbos temporais. Alterações materiais após assinatura originam nova versão e novas assinaturas, sem substituir a prova anterior.

O nível de assinatura e de garantia deve ser acordado com advogado, seguradora e Signicat. Uma assinatura eletrónica simples, avançada ou qualificada não deve ser apresentada como outra; não assumir assinatura qualificada por existir identidade verificada. Preservar o documento assinado e os elementos necessários à validação e consulta futura, com integridade e acesso controlado.

## Cadeia de evidência por aluguer

Identidade verificada → contrato → pagamento → entrega bilateral documentada → devolução bilateral documentada.

O contrato nesta cadeia inclui as assinaturas de ambas as partes. Pagamento e caução mantêm referências do prestador regulado; não guardar dados de cartão. Entrega e devolução mantêm fotografias, checklist, data e confirmação separada de cada parte. Todos os elementos estão ligados ao mesmo aluguer, sem tornar as provas operacionais públicas. A rastreabilidade não garante ausência de fraude nem cobertura automática de sinistro.

## Arquitetura Europe first

Priorizar processamento e alojamento no EEE para identidade, assinatura e prova, sujeito a confirmação contratual de regiões, subcontratantes, acessos de suporte e transferências internacionais. Preparar uma camada de integração que normalize os resultados dos dois métodos e permita futura adoção generalizada da EUDI Wallet sem substituir Supabase Auth nem reconstruir contratos e operações. Os atributos solicitados à wallet devem ser seletivos e limitados à finalidade.

Credenciais do fornecedor ficam apenas no backend. O resultado de identidade não pode ser atribuído pelo browser, por user_metadata ou por um simples redirecionamento de sucesso. A integração futura deve validar respostas autenticadas do fornecedor, vincular cada verificação à conta e tratar repetição de eventos, falhas, expiração e revogação de forma autoritativa. Alterações a atributos civis verificados exigem atualização controlada e, quando necessário, reverificação.

## Critérios antes da produção

- Confirmar com Signicat disponibilidade por país, documentos, dispositivos, NFC, eIDs, wallets e métodos de assinatura; obter proposta comercial e condições de serviço.
- Validar tratamento de dados, retenção, acesso às provas, acordo de processamento e necessidade de avaliação de impacto com apoio jurídico e de privacidade.
- Acordar com seguradora os níveis de garantia, assinatura e prova que sustentam a subscrição, sem prometer aceitação ou cobertura antes do acordo.
- Testar dois utilizadores, ambos os métodos disponíveis, falhas e retomas, assinaturas bilaterais, exportação do audit trail e vinculação à cadeia completa.

No piloto atual, Supabase Auth mantém-se funcional. Signicat, assinaturas jurídicas, pagamentos, cauções e seguros reais não ficam ativos por esta atualização documental. A exceção de acesso piloto não pode ser apresentada como identidade civil verificada e deverá ser substituída por controlos reais antes de operações de produção.

## Referências técnicas primárias

Consultadas em 17 de setembro de 2026. As capacidades públicas orientam a avaliação e não substituem um contrato com o fornecedor.

- [Signicat verificação documental e biométrica](https://www.signicat.com/products/identity-proofing/id-document-and-biometric-verification) descreve documento, face match, liveness e NFC, combináveis com eIDs e wallets.
- [Signicat assinatura eletrónica](https://developer.signicat.com/docs/electronic-signing/) descreve APIs de assinatura, fluxos de signatários e métodos avançados e qualificados conforme configuração.
- [Signicat Digital Evidence Management](https://developer.signicat.com/docs/digital-evidence-management/) descreve gestão de audit trail, retenção configurável e proteção por carimbos temporais.
- [Comissão Europeia segurança e privacidade da EUDI Wallet](https://ec.europa.eu/digital-building-blocks/sites/spaces/EUDIGITALIDENTITYWALLET/pages/712508927/Security+and+Privacy) descreve minimização e divulgação seletiva de atributos.
