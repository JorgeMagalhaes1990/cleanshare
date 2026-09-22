# OutZila Identidade e autenticação

Versão 1.0 | 22 de setembro de 2026

## Arquitetura oficial

Supabase mantém contas, login e sessões. Este nível confirma acesso à conta, não identidade civil.

A OutZila deverá contratar um fornecedor europeu especializado para verificação de identidade civil e assinatura eletrónica. Signicat é a solução preferencial, sujeita a avaliação comercial, jurídica, técnica e de proteção de dados.

## Onboarding

O onboarding deve suportar:

1. eID nacional ou EUDI Wallet, quando disponível;
2. documento de identificação com selfie/liveness e NFC, quando aplicável.

eID/EUDI Wallet não é obrigatório no lançamento. NFC depende de documento e dispositivo e não é universal. O utilizador que não tem wallet deve poder concluir a via documental adequada.

## Minimização de dados

Guardar apenas atributos verificados necessários à operação, ao contrato, à cobertura de seguro e aos deveres legais. Não guardar por defeito cópias de documentos, selfies, vídeos ou modelos biométricos. Qualquer exceção exige necessidade jurídica documentada, prazo de retenção, controlo de acesso e registo de auditoria.

## Assinatura e contratos

Os contratos de aluguer devem conter os atributos verificados necessários das duas partes e ficar associados à referência da verificação, método de assinatura, resultado, carimbos temporais, versão e hash do documento. A OutZila deve manter audit trail exportável. O nível de assinatura deve ser validado com advogado, seguradora e fornecedor.

## Cadeia de evidência

`identidade verificada -> contrato assinado -> pagamento validado -> entrega documentada -> devolução documentada`

Esta cadeia deve apoiar contrato, seguro, pagamentos e eventual resolução de conflito. A plataforma não deve afirmar que verificou identidade civil ou assinou contratos enquanto a integração correspondente não estiver implementada e validada.

## Orientação europeia

O desenho é Europe-first. Deve permitir expansão por mercado e futura adoção generalizada da EUDI Wallet, sem depender dela no lançamento português.
