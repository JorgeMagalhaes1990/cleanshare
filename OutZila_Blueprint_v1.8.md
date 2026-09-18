# OutZila Blueprint estratégico e técnico

Versão 1.8 | 17 de setembro de 2026

Este documento consolida a visão atual da OutZila e a decisão de identidade, autenticação e assinatura. A OutZila pretende operar um marketplace P2P protegido de equipamentos individuais premium de lazer outdoor. A arquitetura separa contas e sessões Supabase da verificação civil e assinatura preferencialmente fornecidas pela Signicat. As integrações de produção descritas são requisitos, não funcionalidades já ativas.

## Visão e proposta de valor

Permitir que particulares rentabilizem equipamento de lazer outdoor usado ocasionalmente e que outras pessoas lhe acedam por períodos curtos, sem comprar o bem. O diferencial é a proteção da operação completa: identidade, contrato, pagamento e caução, seguro, evidência bilateral e acompanhamento de incidentes.

A marca atual é OutZila. CleanShare e OutShare são nomes históricos do mesmo projeto. Os nomes do repositório e do protótipo não alteram a marca aprovada; a migração da interface não faz parte desta revisão documental.

Yescapa é a referência operacional de aluguer protegido; Roofwander é uma referência do segmento outdoor. Adaptar padrões de confiança e operação sem copiar identidade visual, textos, imagens, código, contratos ou condições de seguro. As condições jurídicas e seguradoras exigem validação própria para Portugal.

## Catálogo de lançamento

Um anúncio corresponde a um equipamento principal identificável, com aquisição ou substituição superior a 500 euros, utilização ocasional, transporte compatível com automóvel ligeiro e condição verificável. Acessórios que pertencem ao produto devem ser discriminados. Não aceitar conjuntos de vários bens como um único objeto segurado.

Transporte e mobilidade outdoor: malas de tejadilho, caixas de carga para engate, plataformas de carga de tejadilho, sistemas de barras, suportes premium de bicicletas para engate, malas rígidas de transporte de bicicletas e atrelados multidesporto para bicicleta.

Campismo e abrigo: tendas familiares insufláveis premium, tendas de tejadilho, tendas montadas no engate, toldos ou avançados identificáveis como um único produto e frigoríficos elétricos portáteis.

Desportos aquáticos: kayaks insufláveis ou dobráveis e pranchas de stand up paddle premium.

Energia e autonomia: estações de energia e painéis solares portáteis que cumpram individualmente o valor mínimo e a identificação e inspeção exigidas.

Kits completos de campismo, ski e snowboard ficam excluídos. A presença de uma família não aprova automaticamente todos os modelos. A validação final depende de propriedade, valor, estado, risco, logística e aceitação pela seguradora. Veículos não são alugados; a compatibilidade, carga e montagem dos acessórios removíveis devem ser confirmadas segundo o fabricante.

O catálogo generalista de quatro categorias e o limiar de 300 euros pertencem à fase anterior. A matriz e as migrações existentes documentam a implementação antiga, não a visão aprovada atual; a sua atualização funcional exige tarefa própria.

## Identidade e autenticação

Supabase mantém contas, login e sessões. Login e confirmação de email não equivalem a identidade civil verificada. Signicat é a solução preferencial para identidade civil e assinatura eletrónica, sujeita a contratação, configuração e validação.

O onboarding suportará eID nacional ou EUDI Wallet quando disponíveis, e documento de identificação com selfie/liveness e NFC quando aplicável. A eID/EUDI Wallet não será obrigatória no lançamento; a alternativa documental deverá permitir uma verificação adequada sem wallet. NFC depende do documento e dispositivo e não constitui requisito universal. Esta decisão substitui CMD obrigatória, sem alterar o piloto atual.

A OutZila guardará apenas atributos verificados necessários à operação e contratos e prova mínima do resultado. Não guardar por defeito documentos de identidade, selfies, vídeos ou modelos biométricos. Toda a retenção excecional exige necessidade jurídica documentada e controlos de acesso e prazo. NIF e morada não serão apresentados como verificados se a fonte utilizada não os tiver comprovado.

Os requisitos completos de minimização, integração, estados e validação constam de OutZila_Identidade_Autenticacao.md, que deve ser lido antes de desenvolver identidade, assinatura ou contratos.

## Contratos e cadeia de evidência

Cada aluguer deve manter a cadeia identidade verificada → contrato → pagamento → entrega bilateral documentada → devolução bilateral documentada.

Gerar o contrato com os atributos civis necessários e verificados de ambas as partes e os dados estruturados do bem e reserva. Associar as duas identidades, verificações e assinaturas ao aluguer. Preservar versão, hash, documento assinado, método e resultado de assinatura e carimbos temporais num audit trail exportável. Alterações materiais exigem nova versão e novas assinaturas.

O nível de assinatura simples, avançada ou qualificada será validado com advogado, seguradora e Signicat. Não assumir que verificação de identidade produz por si só uma assinatura qualificada ou garante validade jurídica de todo o contrato.

Manter três camadas documentais ligadas: Termos da Plataforma OutZila, Contrato de Aluguer entre proprietário e arrendatário, e Condições de Seguro aplicáveis à operação. As fotografias/checklists de entrega e devolução são anexos de evidência associados à operação e acessíveis apenas por autorização.

## Processo operacional pretendido

1. Criar conta Supabase e concluir verificação civil através de um dos métodos aceites.
2. Publicar e validar bem, propriedade, valor, condições, compatibilidade e instruções.
3. Escolher datas, pedir aluguer e esclarecer condições no chat privado.
4. Aceitar a reserva, gerar e assinar bilateralmente o contrato; confirmar pagamento e caução no prestador regulado e seguro conforme o momento de ativação acordado.
5. Recolher equipamento após fotografias, checklist e confirmação separada por ambas as partes.
6. Transportar e usar dentro das condições contratadas; comunicar incidentes.
7. Devolver com novo registo de fotografias e confirmação bilateral, idealmente imediata e no máximo em 24 horas após a primeira confirmação, salvo disputa suportada.
8. Concluir autoritativamente e desencadear pagamento/libertação de caução segundo as regras acordadas, ou encaminhar incidente para análise e seguradora quando aplicável.

O prazo de confirmação não garante que dinheiro chegue ao destinatário em 24 horas; liquidação e autorização dependem do prestador. A OutZila não decide unilateralmente danos ou uso da caução sem prova e contraditório; a seguradora decide cobertura e regularização dos sinistros.

## Arquitetura técnica Europe first

Frontend HTML, CSS e JavaScript vanilla; Supabase Auth e PostgreSQL; Vercel para alojamento; GitHub para repositório; domínio e correio profissional Hostinger. Signicat é a preferência para identidade e assinatura, Stripe a referência prevista para pagamentos/cauções, Resend o fornecedor inicial de emails. Seleções previstas não são integrações automaticamente ativas.

Adotar uma arquitetura Europe-first, priorizando processamento e alojamento no EEE para identidade, assinatura e evidência. Confirmar regiões contratadas, subcontratantes, acessos de suporte e transferências antes de afirmar residência europeia completa. Separar integração de identidade da conta Supabase e normalizar resultados dos dois percursos para futura adoção generalizada da EUDI Wallet. Usar divulgação seletiva e pedir só atributos necessários.

Backend valida respostas autenticadas do fornecedor e liga verificações à conta; o browser e user_metadata nunca autorizam identidade, preços, pagamentos ou transições. RLS, verificações de propriedade e RPCs permanecem autoritativos. Credenciais não são expostas no frontend nem no GitHub. Tratar falhas, retomas, eventos duplicados, expiração, revogação e reverificação de dados civis.

## Seguro e economia

Seguro adequado é condição do modelo real pretendido. Solicitar dano acidental, furto/roubo por terceiros, perda total e cobertura expressa de não restituição/apropriação pelo locatário. Transporte, carga, descarga, montagem, uso, avaria e responsabilidade civil dependem de acordo expresso; roubo genérico não comprova cobertura de não devolução.

Hipóteses económicas preservadas: comissão de aluguer de 20%, prémio médio de 10% do aluguer e remuneração de distribuição de 10% do prémio pela seguradora, numa estrutura juridicamente autorizada. Prémio financiado em 70% pelo arrendatário e 30% pela plataforma através da comissão do proprietário. Os cenários base e pessimista e as limitações constam do Dossier v0.9.

Identidade e assinatura acrescentam custos de verificação, reverificação, assinatura e conservação de prova. Não existem tarifas Signicat acordadas; as projeções anteriores não demonstram orçamento validado para estas rubricas. Obter proposta e medir conversão, fraude, custo de suporte e margem por operação antes de rever números ou decidir escala. IA apoia automação, não substitui decisões humanas de sinistro, disputa ou validação jurídica.

## Estado real e limites do piloto

A área /area-utilizador.html exige sessão Supabase e dados reais; ?demo=1 é demonstração isolada. Uma conta pode ser proprietária e arrendatária. O piloto inclui anúncios, pedidos, resposta do proprietário, chat privado e evidência bilateral. Telefone é divulgado apenas nos estados autorizados; email e morada não são expostos à contraparte pelo fluxo atual.

O piloto não processa pagamentos, não bloqueia cauções, não gera contratos jurídicos, não ativa seguros nem Signicat. A exceção reversível de acesso piloto não comprova identidade. Na devolução, duas confirmações concluem imediatamente; sem a segunda, o prazo de 24 horas permite conclusão autoritativa numa atualização autenticada. Não há ainda serviço autónomo de fecho nem libertação financeira integrada ou backoffice funcional de disputas.

Demo externo publicado em https://demo.outzila.com/ com HTTPS; domínio principal e email Hostinger preservados. Supabase mantém os redirects autorizados para localhost, URL Vercel existente e demo. Em 17 de setembro de 2026, updates.outzila.com ficou verificado no Resend e SMTP Auth foi configurado com remetente OutZila; o teste de envio/receção foi adiado pelo utilizador. A fila de emails operacionais de aluguer continua desativada, separada dos emails de autenticação.

## Roadmap e autoridade documental

Antes de produção: contratar e validar identidade/assinatura, rever documentos jurídicos e privacidade, obter seguro expresso, ligar pagamentos/cauções e testar a cadeia completa com duas contas. Só depois remover exceções de piloto e avaliar escala por liquidez, incidentes e margem.

Esta versão e a decisão de identidade são as fontes atuais da estratégia e arquitetura. PROJECT_CONTEXT.txt descreve a visão atual e distingue estado implementado. O Dossier de Produto Segurador v0.9 especifica o seguro solicitado e as hipóteses económicas. DESIGN_RULES.txt regula futuras alterações visuais sem as autorizar por si só. Os ficheiros CleanShare/OutShare anteriores são histórico; preservar, não os usar para repor CMD obrigatória ou o catálogo generalista.
