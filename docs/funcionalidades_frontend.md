# OdontoFlow — Funcionalidades do Front-End

Este documento reúne as funcionalidades implementadas na interface do OdontoFlow, com uma breve explicação de cada recurso. O sistema atende à rotina de recepção, ao acompanhamento clínico e à gestão administrativa e financeira de uma clínica odontológica.

As operações disponíveis variam conforme o perfil e as permissões do usuário. Atualmente, a aplicação pode funcionar com uma API simulada e dados fictícios persistidos no navegador. As limitações desse modo estão descritas ao final.

## 1. Perfis de acesso

| Perfil           | Funcionalidades disponíveis por padrão                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Administrador    | Acesso aos módulos clínicos, operacionais e gerenciais, incluindo equipe, permissões, configurações e DRE.                            |
| Dentista         | Agenda própria, cadastro de pacientes, prontuário clínico, consulta do catálogo e apuração dos próprios repasses.                     |
| Recepção / Caixa | Agenda geral, cadastro de pacientes, leitura de prontuários, consulta do catálogo, recebimentos e despesas dentro do teto autorizado. |

As permissões podem ser restringidas dentro dos limites de cada perfil. A recepção não recebe edição clínica ou acesso à DRE, e dentistas não acessam os resultados financeiros gerais da clínica.

## 2. Autenticação e sessão

**Telas:** `/login`, `/recuperar-senha` e `/redefinir-senha`.

| Funcionalidade               | Breve explicação                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Login                        | Permite entrar com e-mail e senha de uma conta ativa.                                                            |
| Mostrar ou ocultar senha     | Alterna a visibilidade da senha durante o preenchimento.                                                         |
| Lembrar sessão               | Mantém a sessão por até 30 dias, respeitando o limite de inatividade.                                            |
| Redirecionamento por perfil  | Abre a gestão financeira para administradores, a agenda própria para dentistas e a agenda geral para a recepção. |
| Retorno à página solicitada  | Após o login, permite retornar a uma rota protegida compatível com as permissões do usuário.                     |
| Bloqueio de tentativas       | Bloqueia temporariamente a conta por 15 minutos após cinco tentativas incorretas consecutivas.                   |
| Recuperação de senha         | Solicita um link de redefinição sem revelar se o e-mail está cadastrado.                                         |
| Confirmação com máscara      | Mostra uma mensagem genérica e uma versão parcialmente ocultada do endereço informado.                           |
| Link temporário de uso único | Permite redefinir a senha por até 30 minutos; um novo envio invalida o link anterior.                            |
| Criação de nova senha        | Exige confirmação e de 8 a 128 caracteres, com letras maiúsculas, minúsculas e números.                          |
| Revogação após redefinição   | Encerra as sessões anteriores do usuário após a troca de senha.                                                  |
| Encerramento por inatividade | Encerra a sessão após o período configurado; o padrão é de 60 minutos.                                           |
| Logout                       | Encerra o acesso e limpa os dados da sessão no cache da interface.                                               |
| Isolamento entre usuários    | Cancela consultas pendentes e limpa o cache na troca de identidade autenticada.                                  |

## 3. Agenda e recepção

**Tela:** `/agenda`.

| Funcionalidade                 | Breve explicação                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Agenda geral                   | Apresenta as consultas dos profissionais em uma grade de horários, conforme o perfil autorizado.               |
| Agenda individual              | Permite acompanhar os horários de um dentista; o perfil clínico fica restrito à própria agenda.                |
| Navegação por data             | Permite selecionar uma data, avançar ou retroceder um dia e retornar ao dia atual.                             |
| Indicadores do expediente      | Exibe consultas do dia, pacientes aguardando, atendimentos em andamento e consultas concluídas.                |
| Agendamento pela grade         | Abre o formulário a partir de um horário e profissional selecionados.                                          |
| Cadastro de consulta           | Registra paciente, dentista, data, horário, duração, serviço opcional e motivo da consulta.                    |
| Seleção de serviço             | Busca procedimentos do catálogo e sugere a duração do atendimento.                                             |
| Avaliação sem serviço definido | Permite agendar uma avaliação antes de determinar o procedimento clínico.                                      |
| Validação de conflitos         | Verifica sobreposição de horários para o mesmo paciente ou dentista.                                           |
| Validação de expediente        | Verifica se a consulta está dentro do horário de funcionamento da clínica.                                     |
| Remarcação                     | Permite alterar data, horário e duração, respeitando expediente, conflitos e permissões.                       |
| Controle de status             | Registra consulta confirmada, paciente aguardando, atendimento em andamento, conclusão, cancelamento ou falta. |
| Fila de espera                 | Lista os pacientes aguardando, ordenados pela chegada, e informa o tempo de espera.                            |
| Chamada de paciente            | Move um paciente da fila para o atendimento.                                                                   |
| Indicador de horário atual     | Marca a posição do horário atual na grade do dia.                                                              |
| Detalhes do atendimento        | Mostra paciente, procedimento, profissional, duração, motivo e status da consulta.                             |
| Atalho para o prontuário       | Abre o registro clínico do paciente selecionado.                                                               |
| Atalho para o caixa            | Encaminha o atendimento para confirmação dos serviços executados e acerto financeiro.                          |

## 4. Gestão de pacientes

**Tela:** `/pacientes`.

| Funcionalidade         | Breve explicação                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| Listagem de pacientes  | Apresenta identificação, contato, dentista responsável, último atendimento e situação cadastral. |
| Busca                  | Localiza pacientes por nome, telefone ou e-mail.                                                 |
| Filtros                | Permite filtrar por dentista responsável e situação ativa ou inativa.                            |
| Cadastro               | Registra nome, nascimento, e-mail, telefone, responsável, convênio e dentista titular.           |
| Edição cadastral       | Atualiza informações do paciente em um painel lateral.                                           |
| Alertas clínicos       | Permite registrar alergias e condições de saúde, conforme a autorização para edição clínica.     |
| Validações de cadastro | Verifica campos obrigatórios, data de nascimento, telefone e formato de e-mail.                  |
| Ativação e inativação  | Controla a disponibilidade do paciente para novos agendamentos.                                  |
| Exclusão lógica        | Permite ao administrador retirar uma ficha da listagem, preservando os registros históricos.     |
| Contato por WhatsApp   | Disponibiliza um atalho para iniciar contato pelo número cadastrado.                             |
| Acesso ao prontuário   | Abre o registro clínico do paciente selecionado, conforme as permissões.                         |

## 5. Prontuário odontológico

**Tela:** `/prontuarios`.

### 5.1. Identificação e odontograma

| Funcionalidade                | Breve explicação                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| Seleção do paciente           | Alterna o prontuário consultado sem misturar os registros dos pacientes.           |
| Resumo cadastral              | Exibe identificação, idade, contato, convênio e dentista titular.                  |
| Alertas de saúde              | Destaca alergias e condições clínicas registradas.                                 |
| Odontograma permanente        | Representa os 32 dentes permanentes utilizando a numeração FDI.                    |
| Condição por dente            | Registra hígido, restauração, canal, extração indicada, prótese/coroa ou implante. |
| Consulta somente para leitura | Permite à recepção consultar os dados sem alterar informações clínicas.            |

### 5.2. Evolução, anamnese e prescrições

| Funcionalidade                | Breve explicação                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Histórico de evoluções        | Exibe os registros clínicos por data e profissional, com os mais recentes primeiro.                |
| Nova evolução                 | Registra a descrição do atendimento e seu autor clínico.                                           |
| Carimbo de autoria            | Preserva nome, CRO, data/hora e identificação do responsável pelo registro.                        |
| Proteção do histórico         | Impede alterar ou excluir evoluções existentes pelo salvamento do prontuário.                      |
| Anamnese                      | Registra queixa principal, medicamentos, cirurgias/tratamentos anteriores e observações clínicas.  |
| Prescrições                   | Registra medicamento, orientações, paciente, data e profissional responsável.                      |
| Identificação nas prescrições | Apresenta nome e CRO do profissional junto às orientações.                                         |
| Impressão do prontuário       | Prepara a identificação, o odontograma e a seção selecionada para impressão ou PDF pelo navegador. |

### 5.3. Plano de tratamento

| Funcionalidade              | Breve explicação                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| Inclusão de procedimentos   | Adiciona tratamentos do catálogo ou procedimentos avulsos.                                       |
| Vinculação clínica          | Associa procedimento, dente quando aplicável, paciente e dentista executor.                      |
| Preço e repasse históricos  | Preserva os parâmetros do serviço utilizados na inclusão do tratamento.                          |
| Acompanhamento de conclusão | Permite concluir ou reabrir procedimentos, quando as regras financeiras permitem.                |
| Totais do plano             | Exibe o valor total planejado e o valor dos procedimentos ainda não concluídos.                  |
| Geração de pendências       | Encaminha procedimentos concluídos e não quitados para o fluxo de recebimento.                   |
| Situação financeira         | Indica procedimentos pagos ou pendentes e oferece os atalhos autorizados para o caixa ou recibo. |
| Proteção de itens pagos     | Exige estorno antes de reabrir ou alterar dados protegidos de um procedimento quitado.           |

## 6. Dentistas

**Tela:** `/dentistas`.

| Funcionalidade             | Breve explicação                                                             |
| -------------------------- | ---------------------------------------------------------------------------- |
| Diretório de profissionais | Lista dentistas com nome, especialidade, CRO e e-mail.                       |
| Busca de profissionais     | Localiza profissionais pelo nome, especialidade ou registro.                 |
| Cadastro de dentista       | Inclui um profissional e gera seu convite de acesso no modo demonstrativo.   |
| Pacientes vinculados       | Informa a quantidade de pacientes sob responsabilidade de cada profissional. |
| Atalhos individuais        | Abre a agenda ou a listagem de pacientes vinculados ao dentista.             |

## 7. Catálogo de serviços

**Tela:** `/servicos`.

| Funcionalidade                  | Breve explicação                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Consulta do catálogo            | Lista procedimentos, categorias, duração, preço base e situação.                                  |
| Busca por nome                  | Localiza serviços sem diferenciar maiúsculas, minúsculas ou acentos.                              |
| Filtro por categoria            | Organiza serviços de Clínica Geral, Ortodontia, Estética, Cirurgia e Implantodontia.              |
| Filtro por situação             | Permite visualizar serviços ativos, inativos ou todos.                                            |
| Cadastro e edição               | Permite ao administrador definir nome, categoria, preço, duração e percentual de repasse.         |
| Validação de parâmetros         | Aceita preço zero, duração entre 15 e 480 minutos em intervalos de 15 e repasse entre 0% e 100%.  |
| Inativação                      | Impede novas seleções do serviço sem apagar o histórico existente.                                |
| Integração com a agenda         | Sugere o procedimento e a duração ao cadastrar uma consulta.                                      |
| Integração clínica e financeira | Fornece parâmetros para tratamentos e comandas, preservando os valores históricos já registrados. |

## 8. Comanda e recebimentos

**Tela:** `/financeiro/recebimentos`.

| Funcionalidade                   | Breve explicação                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| Seleção de paciente              | Inicia o acerto financeiro de um paciente.                                                       |
| Consulta de pendências           | Lista procedimentos concluídos que ainda não foram quitados.                                     |
| Confirmação do serviço executado | Exige confirmar o procedimento previsto no agendamento antes de adicioná-lo ao acerto.           |
| Comanda com vários itens         | Reúne serviços novos e pendências do mesmo paciente em um recebimento.                           |
| Inclusão e remoção de itens      | Permite ajustar os serviços que compõem a comanda antes da confirmação.                          |
| Quantidade e executor por item   | Permite informar quantidades e associar cada serviço novo ao dentista executor.                  |
| Ajustes de preço e descontos     | Registra alterações autorizadas, identificando o responsável e a justificativa.                  |
| Cortesia                         | Permite desconto integral ou encerramento de avaliação gratuita, sem movimentação financeira.    |
| Rateio de descontos              | Distribui o desconto entre os itens proporcionalmente, preservando os centavos.                  |
| Pagamento em dinheiro            | Registra o valor entregue, valida sua suficiência e calcula o troco.                             |
| Pagamento por Pix                | Registra comprovante e destino, exigindo confirmação explícita do crédito bancário.              |
| Pagamento por débito             | Registra os dados do recebimento externo e provisiona a taxa aplicável.                          |
| Crédito parcelado externo        | Registra de 1 a 12 parcelas, quitando integralmente o procedimento no sistema.                   |
| Pagamento dividido               | Combina até quatro modalidades, uma por tipo, com soma igual ao total da comanda.                |
| Comprovantes e destinos          | Preserva os dados de cada modalidade utilizada no pagamento.                                     |
| Apuração de taxas e repasses     | Calcula taxas e comissões por item e modalidade, com visualização conforme as permissões.        |
| Confirmação do acerto            | Registra quitação, atualiza os procedimentos e encerra o atendimento vinculado quando aplicável. |
| Recibo detalhado                 | Apresenta itens, quantidades, preços, descontos, executores e modalidades de recebimento.        |
| Impressão de recibo              | Permite imprimir ou salvar PDF pelo navegador, conforme a autorização.                           |
| Prevenção de duplicidade         | Usa identificação da operação para evitar repetir o mesmo recebimento.                           |

## 9. Caixa operacional

**Tela:** `/financeiro`.

| Funcionalidade               | Breve explicação                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Consulta por data e turno    | Permite acompanhar movimentos e conferências de diferentes turnos.                                              |
| Abertura de caixa            | Registra o fundo inicial de dinheiro para troco e identifica o operador.                                        |
| Movimentações por modalidade | Separa dinheiro, Pix, débito e crédito, inclusive em pagamentos divididos.                                      |
| Histórico de lançamentos     | Exibe recebimentos, comprovantes, situação e acesso aos documentos disponíveis.                                 |
| Saldo da gaveta              | Considera fundo inicial, recebimentos e estornos em espécie, descontando sangrias.                              |
| Sangria                      | Registra retirada para cofre ou depósito bancário, exigindo saldo e justificativa.                              |
| Estorno                      | Preserva o lançamento original, registra a justificativa e reabre os procedimentos da comanda.                  |
| Devolução em espécie         | Verifica saldo disponível e devolve somente a parcela originalmente recebida em dinheiro.                       |
| Despesa miúda                | Registra suprimentos para a gestão financeira, respeitando o teto autorizado da recepção.                       |
| Conferência do turno         | Compara os valores informados pelo operador com os valores esperados por modalidade.                            |
| Justificativa de diferenças  | Exige explicação para divergências na conferência de cada modalidade.                                           |
| Fechamento                   | Registra a conferência e o responsável, bloqueando novas operações no turno fechado.                            |
| Novo turno na mesma data     | Permite retomar a operação com uma nova abertura após um fechamento.                                            |
| Borderô                      | Consolida recebimentos, modalidades, comprovantes, sangrias e conferência para impressão ou PDF.                |
| Configuração de taxas        | Permite ao administrador ajustar taxas de cartão e percentuais de repasse de referência para operações futuras. |
| Identificação do operador    | Registra o usuário autenticado como responsável pelas operações financeiras realizadas.                         |

**Regra importante:** taxas e repasses são apurações financeiras e não retiradas automáticas da gaveta. Despesas gerenciais também não geram sangria automaticamente.

## 10. Gestão financeira e DRE

**Tela:** `/gestao-financeira`.

| Funcionalidade                  | Breve explicação                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Filtro de período               | Consulta dia, semana, mês, ano ou intervalo personalizado de até dez anos.                           |
| Filtros combinados              | Restringe os resultados por dentistas, serviços e canais de pagamento.                               |
| Navegação temporal              | Avança ou retrocede o período e permite retornar à referência atual.                                 |
| Receita recebida                | Exibe os valores quitados após descontos e antes das taxas.                                          |
| Repasses apurados               | Apresenta o total das comissões calculadas nos recebimentos.                                         |
| Despesas e taxas                | Consolida custos operacionais e taxas provisionadas de operadoras.                                   |
| Lucro e margem                  | Calcula o resultado gerencial e sua proporção em relação à receita.                                  |
| Comparação com período anterior | Apresenta crescimento da receita ou informa a ausência de base comparável.                           |
| Meta diária e do período        | Permite configurar a meta e acompanhar seu atingimento, considerando dias de segunda a sexta.        |
| Evolução financeira             | Mostra receita, saídas e lucro em gráfico com detalhamento por data e alternativa em tabela.         |
| Ticket médio e volume           | Apresenta o valor médio por recibo, o número de atendimentos quitados e os pacientes únicos.         |
| Mix de recebimentos             | Mostra valor, participação e quantidade de recebimentos por modalidade.                              |
| Desempenho por dentista         | Compara atendimentos, receita, repasse e margem clínica antes de taxas e despesas.                   |
| Extrato por profissional        | Detalha recibos, pacientes, serviços, canais, comissões e custos atribuídos ao dentista.             |
| Ranking de serviços             | Ordena procedimentos por receita ou lucro, informando quantidade e participação na receita.          |
| Cadastro e edição de despesas   | Registra descrição, categoria, data, valor, referência e vínculos opcionais com dentista ou serviço. |
| Categorias de despesa           | Organiza custos fixos, insumos, laboratórios e outras despesas.                                      |
| Cancelamento de despesas        | Retira o custo dos resultados, mantendo registro, motivo, operador e datas.                          |
| Rateio de custos                | Distribui despesas proporcionalmente à receita elegível, respeitando vínculos e centavos.            |
| DRE gerencial                   | Demonstra receita, descontos, repasses, taxas, despesas e resultado do período selecionado.          |
| Exportação Excel                | Gera um arquivo `.xlsx` com DRE, Recebimentos, Despesas, Dentistas, Serviços, Canais e Evolução.     |
| Relatório PDF                   | Prepara a DRE para impressão ou salvamento em PDF, com responsável e campo para assinatura manual.   |

O lucro gerencial é calculado como **receita recebida − repasses − taxas − despesas operacionais**. Recibos estornados são excluídos dos indicadores; cortesias não geram receita. Repasse apurado não comprova transferência ao profissional.

## 11. Meus repasses

**Tela:** `/meus-repasses`.

| Funcionalidade       | Breve explicação                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Seleção de intervalo | Permite informar as datas inicial e final da consulta.                                        |
| Produção própria     | Apresenta exclusivamente a receita vinculada ao dentista autenticado.                         |
| Comissão apurada     | Mostra o repasse calculado para a produção do período.                                        |
| Extrato detalhado    | Lista data, recibo, paciente, serviço, receita e repasse sem expor os resultados dos colegas. |

## 12. Equipe e usuários

**Tela:** `/equipe`.

| Funcionalidade                    | Breve explicação                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| Listagem da equipe                | Reúne administradores, dentistas e recepcionistas.                                                 |
| Busca de colaboradores            | Localiza membros por nome, e-mail ou CRO.                                                          |
| Filtros por perfil                | Separa os colaboradores conforme o papel exercido na clínica.                                      |
| Cadastro e edição                 | Registra nome, e-mail, celular, perfil e situação de acesso.                                       |
| Dados específicos do dentista     | Exige CRO com UF e especialidade para o perfil clínico.                                            |
| Convite de primeiro acesso        | Gera um link para o colaborador criar a senha e ativar a conta.                                    |
| Reenvio de convite ou recuperação | Permite ao administrador gerar um novo link de acesso para o colaborador.                          |
| Ativação e inativação             | Controla o acesso, preservando o histórico e revogando sessões de usuários inativados.             |
| Reativação por mudança de e-mail  | Exige uma nova ativação quando o endereço da conta é alterado.                                     |
| Integração com a agenda           | Disponibiliza novos dentistas como profissionais da agenda compartilhada.                          |
| Proteção administrativa           | Impede auto-inativação e remoção do próprio perfil administrador ou do último administrador ativo. |
| Preservação do histórico clínico  | Impede converter o perfil de dentistas com histórico para outro papel.                             |

## 13. Matriz de permissões e auditoria

**Tela:** `/permissoes`.

| Funcionalidade                   | Breve explicação                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Seleção do perfil                | Alterna a configuração de administradores, dentistas e recepção.                                                 |
| Permissões de agenda             | Controla visualização, acesso a todas as cadeiras, agendamento, remarcação, cancelamento e faltas.               |
| Permissões cadastrais e clínicas | Controla consulta, cadastro, edição, exclusão de ficha e acesso ao prontuário.                                   |
| Permissões financeiras           | Controla caixa, recebimentos, emissão de recibos, despesas, DRE e repasses próprios.                             |
| Permissões administrativas       | Controla catálogo, usuários, matriz, configurações e taxas.                                                      |
| Limites estruturais              | Mantém bloqueados os privilégios incompatíveis com cada perfil.                                                  |
| Restauração do padrão            | Repõe as permissões previstas para o perfil selecionado antes de salvar.                                         |
| Configuração de inatividade      | Define o prazo de encerramento automático entre 1 e 240 minutos.                                                 |
| Teto de despesas                 | Define o valor máximo por lançamento de despesa da recepção.                                                     |
| Logs de acesso                   | Apresenta data, hora, usuário, ação, IP e dispositivo das autenticações e operações administrativas registradas. |

## 14. Configurações da clínica

**Tela:** `/configuracoes`.

| Funcionalidade      | Breve explicação                                                        |
| ------------------- | ----------------------------------------------------------------------- |
| Identificação       | Configura o nome exibido no sistema e nos documentos.                   |
| Contatos e endereço | Atualiza telefone, e-mail e endereço da clínica.                        |
| Expediente          | Define os horários de abertura e encerramento para novos agendamentos.  |
| Intervalo da agenda | Configura o intervalo padrão para apresentação e seleção de horários.   |
| Validações          | Verifica os dados de contato e a coerência do horário de funcionamento. |

## 15. Navegação, experiência e recursos compartilhados

| Funcionalidade              | Breve explicação                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Menu por permissão          | Exibe os módulos disponíveis para a identidade autenticada.                                                    |
| Menu móvel                  | Permite abrir e fechar a navegação em telas menores.                                                           |
| Layout responsivo           | Adapta páginas, formulários, cartões e a matriz de permissões a diferentes tamanhos de tela.                   |
| Filtros e abas na URL       | Preserva estados compartilháveis nas páginas que utilizam parâmetros de navegação.                             |
| Carregamento e atualização  | Informa consultas em andamento e sincroniza os dados após alterações.                                          |
| Estados vazios              | Explica quando não existem registros para a busca ou período selecionado.                                      |
| Feedback de operações       | Mostra mensagens de sucesso, validação e erro.                                                                 |
| Nova tentativa de consulta  | Permite repetir carregamentos que falharam.                                                                    |
| Diálogos e painéis laterais | Reúne cadastros, confirmações e detalhes sem perder o contexto da página.                                      |
| Recursos de acessibilidade  | Inclui rótulos de campos, foco visível, controles por teclado, gerenciamento de foco e atalho para o conteúdo. |
| Acesso negado               | A tela `/sem-acesso` informa quando o perfil não pode abrir um recurso.                                        |
| Página não encontrada       | Apresenta orientação para retornar à aplicação ao acessar uma rota inexistente.                                |
| Identidade visual           | Utiliza a paleta Clínico Moderno, com teal, superfícies claras e componentes consistentes.                     |

## 16. Demonstração e integrações

| Recurso                        | Situação atual                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Dados fictícios                | Pacientes, profissionais, consultas, serviços e movimentos iniciais permitem explorar os fluxos.          |
| Persistência local             | Alterações da demonstração ficam no navegador, na chave `odontoflow-demo-v1`.                             |
| Caixa de e-mails demonstrativa | `/emails-demo` apresenta convites e recuperações locais, sem envio externo.                               |
| API simulada                   | Executa validações e operações locais com latência simulada, sem exigir um servidor de backend.           |
| Integração com API real        | Pode ser habilitada por configuração de ambiente, utilizando os contratos existentes.                     |
| Pagamentos externos            | O sistema registra a confirmação de dinheiro, Pix ou cartão; não executa cobrança ou liquidação bancária. |
| WhatsApp e e-mail              | O atalho de contato não representa envio automático de mensagens ou recibos.                              |
| Assinaturas                    | Há carimbo de autoria clínica e campos de assinatura manual; não há assinatura digital certificada.       |
| Segurança em produção          | Depende de backend com autenticação, autorização, sessões, armazenamento e auditoria fora do cliente.     |

O modo demonstrativo não deve armazenar informações reais de pacientes nem ser tratado como uma fronteira de segurança. Os dados locais são editáveis pelo navegador, e os IPs de auditoria são identificados como simulados. Não há integração com bancos, operadoras de cartão, serviço real de e-mails ou validação externa do CRO.

### Acessos iniciais de demonstração

| Perfil        | E-mail                   | Senha inicial |
| ------------- | ------------------------ | ------------- |
| Administrador | `admin@odontoflow.com`   | `Odonto123!`  |
| Dentista      | `camila@odontoflow.com`  | `Odonto123!`  |
| Recepção      | `juliana@odontoflow.com` | `Odonto123!`  |

## 17. Organização técnica

A aplicação utiliza **React 19, TypeScript, Vite e Tailwind CSS**, com arquitetura **MVVM**: Models concentram contratos, regras e acesso aos dados; ViewModels coordenam consultas, ações e estado da interface; Views renderizam as telas.

O **Axios** realiza a comunicação HTTP; o **TanStack Query** gerencia consultas, cache e sincronização; o **TanStack Router** organiza rotas e parâmetros; e o **Zustand** mantém o estado compartilhado do menu. A integração e os contratos da API estão detalhados no [README do projeto](../README.md).

## 18. Personalização da marca

**Tela:** `/configuracoes/identidade-visual`, acessível pelo módulo de configurações, para administradores.

| Funcionalidade                | Breve explicação                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| Logo horizontal               | Permite carregar, substituir e remover a marca usada no cabeçalho e nos documentos.                 |
| Ícone e favicon               | Configura a imagem compacta do celular e da aba do navegador.                                       |
| Upload por arraste ou seleção | Aceita PNG e SVG de até 2 MB, com validação e prévia do arquivo.                                    |
| Otimização sem perda          | Recomprime PNG preservando pixels e transparência; verifica o conteúdo estático dos SVGs.           |
| Quatro paletas                | Oferece Clínico Teal, Navy Confiança, Sálvia Suave e Bordeaux & Rose.                               |
| Cores livres                  | Permite informar primária, secundária, terciária e hover por seletor ou HEX, com escurecimento automático opcional. |
| Contraste em tempo real       | Informa o contraste dos pares de cores, mantendo o texto branco nos botões com fundo de marca.        |
| Escala de fonte               | Oferece os tamanhos base de 13, 14 e 16px, com escala proporcional e ajuste da densidade da agenda. |
| Simulador ao vivo             | Mostra logo, botões, agendamentos e badges sem alterar a identidade aplicada à equipe.              |
| Aplicar ou descartar          | Salva o rascunho para a clínica ou descarta alterações locais.                                      |
| Restaurar padrão              | Retorna à identidade OdontoFlow após confirmação.                                                   |
| Marca nos documentos          | Inclui a identidade em prescrições, prontuário impresso, recibos, borderôs e DRE em HTML/PDF.       |
| Isolamento de tema            | Vincula marca, arquivos e consultas ao identificador da clínica autenticada.                        |
| Proteção contra conflitos     | Usa revisão para evitar sobrescrever uma alteração feita por outro administrador.                   |
| Falha de armazenamento        | Informa quando não foi possível persistir a marca no navegador e conserva a configuração anterior.  |

Na demonstração, as imagens ficam no armazenamento local. Bucket, CDN e isolamento dos demais dados entre clínicas dependem do backend de produção. A verificação de contraste cobre os pares exibidos, sem certificar a acessibilidade de toda a aplicação.

## 19. Tríade e escolha de layout

| Funcionalidade | Breve explicação |
| --- | --- |
| Tríade institucional | Primária Teal para ações e conclusões, secundária Slate para estrutura e terciária Amber para alertas. As três podem ser personalizadas. |
| Regra 60–30–10 | Prioriza superfícies neutras, estrutura de leitura e pequenos destaques para ações e alertas. |
| Modo Clínico Claro | Mantém menu branco, área de trabalho gelo e cartões claros. |
| Alto Contraste (Tríade) | Usa a secundária no menu lateral, mantendo a área de trabalho clara. |
| Padrão da clínica | O administrador escolhe o layout inicial em Identidade visual. Quem segue o padrão acompanha as alterações da clínica. |
| Preferência pessoal | O ícone de sol/lua junto ao perfil no menu lateral alterna entre claro e escuro, sem recarregar ou afetar colegas. |
| Menu recolhível | No desktop, a seta recolhe o menu para mostrar apenas ícones e libera espaço para o conteúdo. A outra seta expande o menu; a navegação preserva a escolha. |
| Persistência do perfil | Sincroniza a preferência com a API simulada e usa cache LocalStorage separado por usuário e clínica para carregamento rápido. |
| Alertas destacados | Alertas médicos e esperas prolongadas seguem a preferência já salva no perfil, com textos e ícones além da cor. |
| Espera prolongada | Destaca em âmbar os pacientes com pelo menos 15 minutos desde a chegada, com atualização periódica do tempo. |
| Restaurações no odontograma | A cor das restaurações acompanha a primária da clínica. |
| Prévia dos layouts | Mostra as cores e o menu claro/escuro antes de aplicar a identidade à equipe. |
| Preservação das marcas | Acrescenta os novos campos às identidades existentes sem perder imagens, fonte ou cores já salvas. |

As preferências são gerenciadas com TanStack Query e Axios em `features/appearance`, seguindo MVVM. A integração de produção deve persistir o perfil em `GET/PUT /profiles/me/preferences`, conforme o contrato no README.
