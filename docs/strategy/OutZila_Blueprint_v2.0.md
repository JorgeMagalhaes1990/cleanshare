# OutZila Blueprint estratégico e técnico

Versão 2.0 | 22 de setembro de 2026

## 1. Visão

A OutZila pretende permitir que particulares rentabilizem equipamento premium de lazer outdoor que usam ocasionalmente e que outras pessoas o utilizem por períodos definidos, sem suportar o custo integral de aquisição. A proposta não é um simples portal de anúncios. A OutZila estrutura e acompanha uma operação de aluguer protegida.

O serviço combina identidade civil verificada, contrato de aluguer assinado, pagamento e caução validados, seguro embedded, chat privado antes da confirmação, recolha documentada e devolução documentada. O objetivo é tornar possível uma operação entre particulares com evidência, responsabilidades claras e apoio quando exista um incidente.

## 2. Catálogo de lançamento

O lançamento foca uma única família coerente: equipamentos individuais premium para vida, lazer e outdoor. Cada anúncio deve representar um bem principal identificável, com valor de aquisição ou substituição superior a 500 EUR, condição verificável e transporte compatível com automóvel ligeiro.

Famílias iniciais indicativas:

- transporte e mobilidade outdoor: malas de tejadilho, plataformas e barras de tejadilho, suportes premium de bicicletas, caixas de carga para engate, malas rígidas de transporte de bicicletas e atrelados multidesporto;
- campismo e abrigo: tendas de tejadilho, tendas familiares insufláveis premium, tendas de engate, toldos ou avançados identificáveis e frigoríficos elétricos portáteis;
- desportos aquáticos: kayaks insufláveis ou dobráveis e pranchas de stand up paddle premium;
- energia e autonomia: estações de energia e painéis solares portáteis, quando cumpram os critérios individuais de valor, identificação e inspeção.

Não fazem parte do lançamento kits completos de campismo, ski ou snowboard. Veículos não são alugados. A aceitação de cada item depende de identificação, valor, estado, risco, logística, regras do fabricante e aceitação da seguradora.

## 3. Processo operacional

1. O proprietário cria o anúncio e apresenta a informação necessária sobre o equipamento.
2. A OutZila valida elegibilidade e a reserva utiliza um preço, condições e caução estruturados.
3. O arrendatário pede a reserva e as partes podem esclarecer a operação no chat interno.
4. Com a aceitação, a plataforma gera o contrato com dados verificados e recolhe a assinatura eletrónica de ambas as partes.
5. O pagamento, a caução e o seguro aplicável são validados antes da recolha.
6. Na recolha, proprietário e arrendatário confirmam equipamento, acessórios e estado inicial com evidência bilateral.
7. Na devolução, ambos repetem o processo de confirmação e registam qualquer diferença relevante. A confirmação deve ocorrer imediatamente ou no prazo máximo de 24 horas.
8. Sem divergência, a operação é concluída para efeitos de pagamento ao proprietário e libertação da caução ao arrendatário. Um desacordo preserva a evidência e segue o processo de apoio e sinistro aplicável.

## 4. Seguro embedded desde o lançamento

Cada aluguer elegível deve incluir seguro embedded desde o lançamento. As coberturas prioritárias solicitadas são dano acidental, furto ou roubo por terceiro, perda total e não restituição ou apropriação ilegítima pelo arrendatário.

Não restituição é um requisito de lançamento e precisa de cobertura expressa. Roubo por terceiro e retenção por alguém a quem o bem foi entregue voluntariamente são riscos distintos. O seguro, a caução, o contrato, a identidade e a evidência reduzem o risco, mas não substituem a cobertura seguradora contratada.

O arrendatário paga 100% do prémio do seguro. Um prémio médio equivalente a 10% do aluguer e uma remuneração de distribuição de 10% do prémio à OutZila são hipóteses de modelização. Ambas dependem de proposta da seguradora, contrato e enquadramento regulatório aplicável.

## 5. Identidade, assinatura e evidência

Supabase é responsável por contas, login e sessões. A verificação civil e assinatura eletrónica dependem de um fornecedor europeu especializado. Signicat é a solução preferencial, sujeita a contratação e implementação.

O onboarding deve suportar eID nacional ou EUDI Wallet quando disponível, bem como documento de identificação com selfie/liveness e NFC quando aplicável. eID/EUDI não será obrigatório no lançamento. A OutZila deve guardar apenas os atributos verificados necessários à reserva, ao contrato, ao seguro e à conformidade. Por defeito, não deve guardar documentos de identidade, selfies ou biometria.

Cadeia de evidência obrigatória:

`identidade verificada -> contrato assinado -> pagamento validado -> entrega documentada -> devolução documentada`

Cada contrato deve ficar associado às duas identidades, à versão do documento, ao método e resultado de assinatura, a carimbos temporais e a um audit trail exportável. Alterações materiais exigem novo contrato e novas assinaturas.

## 6. Portugal como piloto e expansão europeia

Portugal é o piloto operacional e segurador controlado. A meta do primeiro ano, 1.500 operações, diz respeito exclusivamente a Portugal e aos primeiros doze meses após lançamento.

A ambição não termina em Portugal. Após validação do produto e do risco, os próximos mercados prioritários são Espanha, França, Alemanha e Itália. A capacidade da seguradora para acompanhar esta expansão deve pesar na escolha do parceiro. O desenho técnico deve ser Europe-first, preparado para evolução da EUDI Wallet e para regras de produto, risco e documentação por mercado.

## 7. Limites do piloto atual

A aplicação existente é uma base de teste operacional autenticada. Não se deve comunicar que já processa pagamentos, bloqueia cauções, emite seguros, conclui assinatura eletrónica com valor jurídico ou verifica identidade civil, enquanto esses serviços não estiverem contratados, integrados e validados. A evolução funcional depende de tarefas próprias e de decisões de fornecedor.

## 8. Referências

Yescapa é referência para o modelo de operação protegida entre particulares. Roofwander é referência de segmento outdoor. A OutZila pode adaptar princípios operacionais, mas não copiar identidade, interface, textos, código, contratos ou condições de seguro. A validação jurídica e seguradora será própria para Portugal e para cada mercado futuro.
