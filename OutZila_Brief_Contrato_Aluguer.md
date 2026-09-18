# OutZila — Briefing para o futuro contrato automático de aluguer

## Estado do documento

Este ficheiro regista decisões e requisitos indicados pelo fundador para orientar a futura redação do contrato automático da OutZila. É uma base de trabalho e não constitui parecer jurídico.

Antes de utilização real, o contrato e os documentos associados devem ser:

- verificados contra as versões vigentes da legislação e das fontes oficiais;
- revistos por advogado português especializado em contratos, plataformas digitais e marketplaces;
- alinhados com a apólice, as condições e o processo de sinistro da seguradora parceira;
- compatibilizados com o enquadramento regulatório aplicável à distribuição de seguros.

## 1. Natureza pretendida do contrato

O contrato automático deve ser pensado como um contrato de aluguer de coisa móvel entre:

- **locador:** o proprietário que disponibiliza o equipamento;
- **locatário:** o utilizador que aluga o equipamento;
- **OutZila:** plataforma que estrutura e documenta a operação, gere os fluxos de pagamento e caução, associa o seguro e disponibiliza mecanismos de prova e suporte.

A qualificação jurídica exata do papel da OutZila deve ser validada. Quanto maior for o controlo da plataforma sobre preço, pagamento, condições contratuais e execução, maior poderá ser o risco de lhe serem atribuídas responsabilidades próprias enquanto operador do marketplace.

Na interface do produto poderão ser utilizados os termos comerciais “proprietário” e “arrendatário”. No contrato deverá ser ponderado o uso juridicamente adequado de “locador” e “locatário”.

## 2. Arquitetura documental aprovada

A documentação não deve ser concentrada num único PDF extenso. A arquitetura pretendida tem três camadas ligadas entre si:

1. **Termos da Plataforma OutZila** — regulam a relação entre cada utilizador e a OutZila.
2. **Contrato de Aluguer** — regula a relação entre locador e locatário e é gerado para cada operação.
3. **Condições de Seguro** — documento emitido ou disponibilizado pela seguradora e aplicável à reserva concreta.

O contrato de cada operação deve incorporar automaticamente os dados estruturados da transação.

## 3. Dados e cláusulas do contrato de aluguer

### Identificação das partes

- nome completo;
- NIF;
- morada;
- contactos;
- identificador da conta na plataforma;
- estado da sessão Supabase e, separadamente, prova da verificação civil necessária à operação.

### Identificação do equipamento

- categoria;
- marca e modelo;
- número de série, quando exista;
- identificadores adicionais e fotografias;
- acessórios pertencentes ao produto e efetivamente incluídos;
- valor de referência OutZila e respetiva base documental;
- instruções do fabricante relevantes para utilização, transporte ou montagem.

### Período e locais

- data, hora e local da entrega/recolha;
- data, hora e local da devolução;
- período efetivo do aluguer;
- território autorizado;
- regras e consequências do atraso.

### Preço e fluxos financeiros

- preço base do aluguer;
- taxas da plataforma;
- prémio do seguro;
- caução;
- franquia aplicável;
- encargos adicionais possíveis e respetivos critérios;
- calendário e condições de cobrança, retenção, libertação ou reembolso.

Os valores e conceitos devem ser apresentados de forma clara e discriminada, sem confundir prémio, franquia, caução, comissão e preço do aluguer.

## 4. Estado do equipamento e prova bilateral

O estado do equipamento na entrega e na devolução deve ser documentado através de:

- fotografias associadas à operação;
- vídeo, quando aplicável;
- checklist do equipamento e dos elementos pertencentes ao produto;
- registo de danos, desgaste e defeitos preexistentes;
- confirmação da data e hora;
- aceitação separada por ambas as partes.

A documentação bilateral de entrega e devolução é uma funcionalidade central da OutZila e uma peça probatória essencial. Deve permitir comparar de forma organizada o estado inicial e final do equipamento e apoiar a resolução de incidentes ou conflitos.

Nenhuma das partes nem a OutZila deve poder concluir unilateralmente que existe dano indemnizável sem prova, contraditório e aplicação do processo de disputa previsto.

## 5. Obrigações do locador

O contrato deverá prever, entre outras obrigações a confirmar juridicamente, que o locador:

- entrega o equipamento identificado, no local e momento acordados;
- declara defeitos, desgaste e limitações existentes;
- assegura que o equipamento está em condições de funcionamento e é adequado ao uso declarado;
- fornece instruções, componentes e informação de segurança necessários;
- demonstra a propriedade e o valor do equipamento;
- não omite problemas de manutenção ou incompatibilidades conhecidas;
- participa na confirmação bilateral da entrega e devolução.

## 6. Obrigações do locatário

O contrato deverá prever, entre outras obrigações a confirmar juridicamente, que o locatário:

- paga os valores devidos;
- utiliza o equipamento apenas para a finalidade, período, território e condições autorizados;
- observa as instruções do fabricante e os limites operacionais declarados;
- não utiliza o equipamento de modo imprudente;
- não cede, empresta ou subaluga o equipamento a terceiros sem autorização;
- protege o equipamento contra perda, furto e dano;
- comunica imediatamente incidentes, avarias, roubo ou impossibilidade de devolução;
- devolve o equipamento no prazo e local acordados;
- participa na confirmação bilateral da entrega e devolução.

## 7. Desgaste, dano e avaria

O contrato deve distinguir claramente:

- **desgaste normal:** consequência de uma utilização prudente e conforme, em princípio não indemnizável;
- **dano imputável:** perda ou deterioração causada por conduta ou evento pelo qual o utilizador seja responsável;
- **defeito preexistente:** falha existente antes da entrega e documentada ou demonstrável;
- **falta de manutenção:** problema pertencente à esfera do proprietário;
- **erro acidental do operador:** situação a articular com a cobertura do seguro;
- **avaria interna súbita:** situação que poderá depender de cobertura própria, idade, manutenção e categoria do equipamento.

O locatário não deve ser responsabilizado automaticamente por qualquer avaria ocorrida durante o período de aluguer.

## 8. Roubo, perda, não restituição e sinistro

Devem ser definidos:

- dever de comunicação imediata à OutZila, à contraparte e, quando aplicável, à seguradora;
- participação às autoridades nos casos exigidos;
- preservação e envio de provas;
- medidas razoáveis de proteção ou recuperação do equipamento;
- distinção entre roubo por terceiro e não restituição ou apropriação pelo locatário;
- prazos e etapas de acionamento do seguro;
- suspensão da libertação do pagamento ou da caução enquanto o incidente é analisado;
- cooperação obrigatória das partes durante a análise.

A “não restituição” deve ser tratada expressamente no contrato e na apólice, não ficando dependente de uma referência genérica a roubo.

## 9. Seguro e responsabilidade perante terceiros

O contrato específico deve identificar ou remeter de forma clara para:

- segurador;
- riscos cobertos;
- exclusões;
- capital seguro;
- franquia;
- territorialidade;
- período de cobertura;
- procedimento e prazos de participação do sinistro;
- documentos e provas exigidos;
- responsabilidade civil, quando incluída.

O seguro do equipamento não deve ser apresentado como cobrindo automaticamente danos pessoais, danos no veículo utilizado no transporte ou danos causados a terceiros. Estes riscos dependem das coberturas efetivamente contratadas.

## 10. Caução

O contrato deve definir:

- valor e forma de autorização ou retenção;
- duração da autorização;
- situações concretas em que pode ser utilizada;
- relação com a franquia e com danos não acionáveis pelo seguro;
- provas necessárias;
- comunicação e contraditório;
- processo de contestação;
- prazo de libertação.

Deve ser evitada qualquer cláusula que permita à OutZila ou ao locador retirar unilateralmente valores da caução sem prova e sem possibilidade de contestação.

## 11. Compatibilidade, instalação e limites do produto

Este tema é particularmente importante para tendas de tejadilho, barras, porta-bicicletas, malas e caixas de carga.

O contrato e o fluxo operacional devem determinar:

- quem verifica a compatibilidade com o veículo;
- quem executa ou supervisiona a instalação;
- quem confirma a montagem;
- responsabilidade por montagem incorreta;
- peso e carga máximos;
- distinção entre carga dinâmica e estática, quando aplicável;
- velocidade máxima recomendada pelo fabricante;
- veículos e sistemas de fixação compatíveis;
- instruções de segurança obrigatórias;
- proibição de alterações, desmontagem ou transporte incompatível.

## 12. Atrasos, cancelamentos e utilização proibida

Devem existir regras claras para:

- atraso na recolha ou devolução;
- indemnização ou penalização pelo atraso, validada à luz da lei aplicável;
- cancelamento pelo locador;
- cancelamento pelo locatário;
- no-show;
- prazos e consequências económicas;
- utilização comercial não autorizada;
- competição ou atividades de risco não autorizadas;
- utilização por terceiros;
- saída do território permitido;
- transporte, instalação ou modificação incompatíveis com o produto.

## 13. Processo de disputa

O processo deverá prever:

- prazo para apresentação de reclamação;
- notificação da contraparte;
- contraditório de ambas as partes;
- tipos de prova aceites;
- acesso controlado às fotografias, checklists e comunicações da operação;
- papel exato da OutZila;
- articulação com seguradora, prestadores de pagamento e autoridades;
- decisão sobre caução distinta da decisão seguradora;
- meios de resolução alternativa de litígios e tribunal competente;
- lei aplicável.

A OutZila não deve reservar para si um poder absoluto e unilateral de decidir se ocorreu dano ou alterar o ónus da prova através de cláusulas pré-redigidas.

## 14. P2P, utilizadores profissionais e consumidores

O modelo deve distinguir:

- **P2P verdadeiro:** ambas as partes atuam como particulares;
- **proprietário profissional:** disponibiliza equipamentos no âmbito de uma atividade económica organizada;
- **locatário consumidor:** contrata fora da sua atividade profissional.

Um utilizador que adquira vários equipamentos especificamente para os alugar de forma regular pode deixar de poder ser tratado como simples particular. A plataforma deve prever critérios de deteção, declaração e reclassificação, porque uma relação profissional-consumidor pode ativar deveres adicionais de informação, contratação à distância e proteção do consumidor.

## 15. Cláusulas contratuais gerais

Como o contrato será predominantemente pré-redigido pela OutZila, a redação deverá considerar o regime aplicável às cláusulas contratuais gerais, incluindo:

- comunicação integral e atempada das condições;
- redação clara e compreensível;
- aceitação demonstrável;
- ausência de garantias desproporcionadas;
- ausência de exclusões excessivamente amplas;
- proibição de decisões unilaterais sem prova ou contraditório;
- respeito pelas regras aplicáveis ao ónus da prova e à responsabilidade.

## 16. Dados a incorporar automaticamente

O contrato específico deverá receber da plataforma, no mínimo:

- identificadores e dados das partes;
- dados do equipamento;
- valor e prova de referência;
- datas, horas e locais;
- preço, taxas, prémio, franquia e caução;
- finalidade e território autorizados;
- condições particulares do produto;
- apólice ou certificado de seguro aplicável;
- fotografias, vídeo e checklist da entrega;
- confirmações bilaterais;
- fotografias, vídeo e checklist da devolução;
- incidentes, atrasos, mensagens e alterações aceites por ambas as partes.

## 17. Fontes a verificar antes da redação final

As seguintes referências foram indicadas como base e devem ser consultadas diretamente nas suas versões oficiais e vigentes:

- Código Civil português, regime da locação e do aluguer de coisas móveis;
- regras sobre estado da coisa, obrigações das partes, deterioração e restituição;
- regras aplicáveis à mora na restituição;
- Decreto-Lei n.º 446/85, relativo às cláusulas contratuais gerais;
- regime dos contratos celebrados à distância e proteção do consumidor;
- regime aplicável aos operadores de marketplaces e à influência da plataforma na transação;
- legislação e informação da ASF sobre contrato e distribuição de seguros;
- condições da futura apólice e documento de informação do produto segurador.

## 18. Instrução para o futuro draft

Quando for solicitada a redação do draft do contrato de aluguer:

1. começar por confirmar o papel jurídico pretendido para a OutZila;
2. verificar as fontes oficiais vigentes e inserir referências precisas;
3. separar Termos da Plataforma, Contrato de Aluguer e Condições de Seguro;
4. usar dados estruturados e campos variáveis da operação;
5. tornar a prova bilateral de entrega/devolução uma parte central do contrato;
6. não permitir decisões unilaterais sobre dano ou caução;
7. distinguir P2P de relações profissional-consumidor;
8. alinhar cada promessa de proteção com a apólice efetivamente contratada;
9. submeter o texto completo a advogado português e à seguradora antes de utilização real.

## 19. Decisão de identidade e assinatura de 17 de setembro de 2026

Supabase mantém contas, login e sessões; Signicat é a preferência para verificação civil e assinatura eletrónica. Aceitar eID nacional/EUDI Wallet quando disponível e documento com selfie/liveness e NFC quando aplicável, sem exigir wallet no lançamento. Login e confirmação de email não comprovam identidade civil.

O contrato deve usar apenas os atributos verificados necessários, vincular a identidade de ambas as partes e recolher as duas assinaturas eletrónicas. Guardar documento assinado, versão, hash, referências de verificação e audit trail exportável com integridade e retenção definida. Não conservar documentos de identidade ou biometria por defeito, salvo necessidade jurídica documentada. O nível de assinatura requer validação; identidade verificada não implica assinatura qualificada.

Cada aluguer mantém identidade verificada → contrato → pagamento → entrega bilateral documentada → devolução bilateral documentada. Preparar arquitetura Europe-first e futura adoção generalizada da EUDI Wallet. As integrações são requisitos de produção, não capacidades já ativas no piloto. Ler OutZila_Identidade_Autenticacao.md para os critérios completos; a antiga exigência CMD-only está substituída.
