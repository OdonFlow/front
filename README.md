# OdontoFlow

Frontend de gestão de clínica odontológica, implementado a partir de `docs/odontoflow_wireframes.html` e da identidade visual de `docs/paleta_clinico_moderno.md`.

## Executar

Requer Node.js 22.12+ (ou 24+) e npm.

```sh
npm ci
npm run dev
```

No PowerShell com execução de scripts desabilitada, use `npm.cmd` no lugar de `npm`.

## Páginas e fluxos

- `/agenda`: visão geral e individual por dentista, navegação por data, indicadores, fila de espera, agendamento com validação de conflitos, mudança de status e acesso ao prontuário.
- `/pacientes`: busca, filtros por dentista/status, cadastro e edição em painel lateral, WhatsApp e acesso ao prontuário.
- `/prontuarios`: seleção de paciente, alertas, odontograma FDI permanente com 32 dentes e seis condições, evolução clínica, anamnese, plano de tratamento e prescrições. A impressão inclui o paciente, odontograma e a seção selecionada.
- `/dentistas`: usuários com papel de dentista, cadastro de profissionais e atalhos para sua agenda e pacientes.
- `/configuracoes`: identificação da clínica, contato, expediente e intervalo para novos agendamentos.
- `/configuracoes/identidade-visual`: logomarcas, favicon, paletas, contraste e escala tipográfica com prévia isolada.
- `/servicos`: catálogo categorizado, busca, cadastro e edição lateral, preço base, duração de cadeira, percentual de repasse e inativação.
- `/financeiro`: conferência por turno/data, valores por meio externo, fundo de troco, taxas, repasses, estornos, sangrias e fechamento com borderô.
- `/financeiro/recebimentos`: pendências do prontuário, baixa manual por Pix/débito/crédito/dinheiro, desconto, troco, NSU, parcelas externas e recibo.
- `/gestao-financeira`: dashboard estratégico, metas, evolução, mix de canais, extratos por dentista, ranking de serviços, despesas e DRE.
- `/login`, `/recuperar-senha`, `/redefinir-senha`: autenticação e ativação/recuperação de acesso.
- `/equipe`, `/permissoes`: gestão de colaboradores, convites, limites, privilégios e logs (administradores).
- `/meus-repasses`: extrato restrito ao dentista autenticado.

Agenda, pacientes e prontuário seguem os wireframes. Dentistas e configurações complementam os itens presentes no menu, com a mesma identidade visual.

## Arquitetura

React 19, TypeScript estrito, Vite, Tailwind CSS, Axios, TanStack Query, TanStack Router e Zustand.

```text
src/
  app/                         # Composição, rotas tipadas e layout
  features/
    clinic/model/              # Tipos, regras, API, Query options e fixtures
    agenda/{view,viewmodel}/
    patients/{view,viewmodel}/
    records/{view,viewmodel}/
    dentists/{view,viewmodel}/
    settings/{view,viewmodel}/
    finance/{model,view,viewmodel}/ # Recebimentos, turnos, regras e documentos
    services/{model,view,viewmodel}/ # Catálogo e seleção compartilhada de serviços
    management/{model,view,viewmodel}/ # Indicadores, despesas, extratos e exportação DRE
    access/{model,view,viewmodel}/ # Autenticação, equipe, RBAC, auditoria e sessões
    branding/{model,view,viewmodel}/ # Marca por clínica, imagens, tokens e prévia
  shared/
    components/                # Primitivos de interface
    lib/http/                  # Axios e adaptador da API simulada
    lib/query/                 # Configuração do QueryClient
    stores/                    # Abertura do menu responsivo (Zustand)
  styles/
```

O Model centraliza contratos e acesso à API. Hooks `use<Feature>ViewModel` coordenam consultas, mutações, estado local e navegação. Views renderizam a interface e encaminham eventos. Os dados remotos pertencem ao TanStack Query; filtros, datas e abas compartilháveis pertencem à URL; formulários e diálogos são locais. Apenas o menu global usa Zustand.

## Dados simulados e API real

Por padrão, Axios usa um adaptador local com latência simulada. Usuários são buscados por `GET /users` via TanStack Query, assim como os demais recursos. Não é necessário iniciar um servidor de backend. Os dados iniciais são fictícios; a agenda inicial usa o dia em que a base é criada.

As alterações ficam no `localStorage`, na chave `odontoflow-demo-v1`. Apague essa chave nas ferramentas do navegador para reiniciar a demonstração. Quando o armazenamento estiver indisponível, os dados duram apenas enquanto a aplicação estiver aberta. Nenhum cadastro é enviado a um serviço externo no modo simulado.

Para integrar o backend, copie `.env.example` para `.env.local` e configure:

```dotenv
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=https://sua-api.exemplo.com
```

O backend deve aceitar os contratos em `src/features/clinic/model/types.ts`:

| Método     | Endpoint                        | Operação                                                   |
| ---------- | ------------------------------- | ---------------------------------------------------------- |
| GET        | `/users`                        | Usuários, incluindo `role: dentist` e `role: receptionist` |
| POST       | `/users`                        | Cadastrar dentista                                         |
| GET / POST | `/patients`                     | Listar / cadastrar pacientes                               |
| PUT        | `/patients/:id`                 | Atualizar paciente                                         |
| GET        | `/appointments?date=YYYY-MM-DD` | Agenda de uma data                                         |
| POST       | `/appointments`                 | Criar consulta                                             |
| PATCH      | `/appointments/:id`             | Alterar status                                             |
| GET / PUT  | `/records/:patientId`           | Buscar / salvar prontuário                                 |
| GET / PUT  | `/settings`                     | Buscar / salvar configurações                              |

Respostas retornam a entidade ou lista diretamente. Erros usam `{ "message": "Descrição" }`. As consultas passam `AbortSignal` ao Axios; mutações não têm repetição automática. Autenticação e controle de acesso têm fluxos e validações no modo simulado; a segurança de produção depende do backend. O modo de demonstração não é destinado ao armazenamento de informações reais de pacientes.

## Fluxo financeiro

Implementado a partir de `docs/odontoflow_fluxo_financeiro.html`. Os pagamentos são realizados fora do OdontoFlow; a recepção confirma o recebimento e registra a baixa. Não há integração com banco, Pix ou adquirente, nem envio automático de recibos por WhatsApp/e-mail.

1. Ao concluir um procedimento no plano de tratamento, ele entra nas pendências. O dentista executor é selecionado no cadastro do procedimento e preservado separadamente do dentista titular do paciente.
2. A recepção escolhe a pendência, informa meio, desconto, destino, data/hora e comprovante. Pix exige confirmação explícita do crédito no banco; dinheiro exige valor entregue suficiente e calcula troco. Apenas crédito aceita de 1 a 12 parcelas externas, quitando o procedimento integralmente.
3. O lançamento registra quitação, taxas, repasse e recibo com identificação do operador. O prontuário exibe “Pago” e oferece acesso ao recibo. Os valores financeiros são representados por centavos inteiros. A provisão da taxa e o repasse são arredondados ao centavo.
4. O caixa separa dinheiro, débito, crédito e Pix. Somente dinheiro afeta a gaveta. Seu saldo é fundo inicial + recebimentos em espécie − estornos em espécie − sangrias; taxas de cartão e repasses são provisões, não retiradas físicas.
5. Sangrias exigem saldo suficiente, destino e justificativa. Estornos exigem justificativa, preservam o registro original e reabrem a pendência. Para devolver dinheiro, é necessário saldo disponível. Procedimentos pagos não podem ser reabertos ou ter seus dados financeiros alterados antes do estorno.
6. O fechamento exige valores conferidos em cada modalidade, nome do responsável e confirmação da conferência. Qualquer diferença por modalidade exige justificativa, mesmo quando diferenças positivas e negativas se compensam. O turno fechado não aceita recebimentos, sangrias ou estornos. É possível abrir outro turno na mesma data.
7. Recibos e borderôs oferecem impressão ou “Salvar como PDF” pelo navegador, com espaço para assinatura manual. O nome informado no fechamento identifica o responsável; não é uma assinatura digital certificada.

A base demonstrativa inclui um turno aberto, fundo de R$ 200 e até quatro recebimentos fictícios derivados dos procedimentos existentes. A atualização de uma base local antiga preserva pacientes e prontuários e inicializa o financeiro uma única vez, na mesma chave `odontoflow-demo-v1`.

As taxas iniciais de exemplo são: débito 1,8%; crédito 3,5% + 0,5 ponto percentual por parcela adicional. Serviços do catálogo usam seu próprio percentual de repasse, preservado no procedimento; lançamentos antigos ou avulsos sem serviço mantêm o percentual por dentista, inicialmente 40%. O repasse incide sobre o valor após desconto e antes das taxas. “Taxas e repasses” permite ajustar taxas e os percentuais de fallback por dentista. Recibos guardam os percentuais e valores aplicados, sem recálculo retroativo. O contrato rejeita combinações de taxa e repasse que excedam o recebido.

Contratos adicionais em `src/features/finance/model/types.ts`:

| Método | Endpoint                         | Operação                                                  |
| ------ | -------------------------------- | --------------------------------------------------------- |
| GET    | `/finance`                       | Pendências, recebimentos, turnos, sangrias e configuração |
| POST   | `/finance/receipts`              | Baixa manual de procedimento concluído                    |
| POST   | `/finance/receipts/:id/reversal` | Estorno auditável e reabertura da pendência               |
| POST   | `/finance/shifts`                | Abrir turno com fundo inicial                             |
| POST   | `/finance/withdrawals`           | Sangria com destino e justificativa                       |
| POST   | `/finance/shifts/:id/closing`    | Conferir modalidades e fechar turno                       |
| PUT    | `/finance/configuration`         | Configurar taxas e repasses futuros                       |

A API real deverá assegurar atomicidade da baixa por procedimento, validação de comprovantes, integridade dos registros e autorização do operador. A implementação atual mantém essas regras no serviço da API simulada, além das validações de formulário; não realiza liquidação, repasse bancário ou movimentação de dinheiro.

## Serviços, agenda e comanda

O fluxo de `docs/odontoflow_servicos_e_fluxos.html` está integrado aos módulos existentes:

- O menu **Serviços** abre o catálogo, com categorias Clínica Geral, Ortodontia, Estética, Cirurgia e Implantodontia. A busca ignora acentos e caixa. O formulário permite preço zero, duração entre 15 e 480 minutos em intervalos de 15 minutos e repasse entre 0% e 100%. A inativação preserva o histórico e impede novas seleções.
- Na agenda, o serviço é opcional. Sem seleção, a consulta é registrada como “Avaliação / A definir”. O autocomplete aceita teclado e busca por nome; selecionar um serviço sugere sua duração, que pode ser ajustada antes da confirmação. Motivo/queixa é registrado separadamente. Os conflitos por paciente e profissional continuam validados. A seleção na agenda não gera cobrança automaticamente.
- O plano de tratamento pode usar o catálogo ou manter procedimentos avulsos. Ao usar o catálogo, o procedimento recebe uma cópia de nome, preço e percentual de repasse. Editar o catálogo posteriormente não altera esse procedimento.
- O acerto pode ser aberto pelo atendimento na agenda, por uma pendência do prontuário ou pela seleção do paciente. O serviço previsto exige confirmação de que foi executado. É possível adicionar e remover serviços, reunir pendências do mesmo paciente, informar quantidades e atribuir cada serviço novo ao seu dentista executor.
- Desconto, alteração de preço/quantidade de pendência e cortesia exigem justificativa e identificação do responsável pela autorização. Essa identificação é registrada para auditoria na demonstração; o backend real deverá aplicar as permissões do operador autenticado. O desconto é rateado proporcionalmente entre os itens pelo método dos maiores restos, preservando todos os centavos. O repasse é calculado por item após o desconto e agrupado por profissional.
- O recebimento pode combinar até quatro formas externas, uma por modalidade. A soma deve ser exatamente igual ao total da comanda. Cada forma preserva valor, comprovante, destino, parcelas e taxa; Pix exige confirmação bancária, e somente a parcela paga em espécie afeta a gaveta e calcula troco.
- Para encerrar uma avaliação gratuita sem serviços, vincule o atendimento e selecione a cortesia. O sistema encerra a consulta e gera comprovante de R$ 0,00 sem taxas, repasses ou movimentação de caixa. Uma cortesia também pode quitar serviços com desconto integral.
- O recibo detalha itens, quantidades, preços, descontos, executores e todas as formas de recebimento. O borderô e a conferência separam as modalidades mesmo em pagamentos mistos. Estornar uma comanda reabre todos os seus procedimentos, devolvendo da gaveta apenas a parcela originalmente paga em dinheiro.

O catálogo inicial contém oito serviços fictícios, incluindo Limpeza (R$ 180 / 40%) e Restauração (R$ 220 / 40%): juntos totalizam R$ 400 e R$ 160 de repasse antes de qualquer desconto. O catálogo é inicializado apenas se ainda não existir na base local; dados clínicos, turnos e recibos anteriores permanecem preservados. Os helpers de leitura financeira aceitam recibos antigos de um único item/meio e os novos recibos com vários itens/meios.

| Método | Endpoint            | Operação                                                                                             |
| ------ | ------------------- | ---------------------------------------------------------------------------------------------------- |
| GET    | `/services`         | Listar catálogo, incluindo inativos                                                                  |
| POST   | `/services`         | Cadastrar serviço                                                                                    |
| PUT    | `/services/:id`     | Editar parâmetros ou ativação                                                                        |
| POST   | `/finance/checkout` | Acertar atomicamente a comanda, registrar serviços extras, quitar e encerrar o atendimento vinculado |

Os contratos estão em `src/features/services/model/types.ts` e `src/features/finance/model/types.ts`. `CheckoutInput` envia `requestId`, paciente, turno, atendimento opcional, itens, pagamentos e autorização de ajustes. Repetições com o mesmo `requestId` e os mesmos dados retornam o recibo original; reutilização com outros dados é rejeitada. A API simulada valida todos os itens e pagamentos antes de alterar prontuário ou caixa. A API real deve fornecer a mesma atomicidade e idempotência transacional.

## Dashboard de gestão financeira

Implementa `docs/odontoflow_dashboard_gestao_financeira.html`. Acesse **Gestão financeira** no menu ou pelo atalho na conferência de caixa.

- Períodos dia, semana (segunda a domingo), mês, ano e intervalo personalizado de até dez anos. Referência, filtros combináveis de dentistas/serviços/canais e ordenação do ranking ficam na URL, preservando recarga e navegação do navegador.
- Receita corresponde ao valor quitado depois dos descontos e antes de taxas. Repasses e taxas usam os valores históricos dos recibos, incluindo pagamentos divididos. Cortesias aparecem no volume e nos descontos; recibos estornados são excluídos integralmente, inclusive do período original.
- Lucro gerencial = receita recebida − repasses − taxas provisionadas − despesas operacionais. O percentual de crescimento compara a receita ao período calendário anterior (ou intervalo imediatamente anterior de igual duração). Sem receita anterior, exibe “sem base”, sem inventar percentual.
- Meta diária configurável; a meta do período multiplica o valor pelos dias de segunda a sexta, sem calendário de feriados. A meta permanece da clínica inteira ao filtrar dimensões. Volume conta recibos quitados; pacientes únicos aparecem separadamente. O ticket divide a receita pelo número de recibos.
- Extrato por dentista com paciente, procedimento, recibo, canais e comissão apurada. A margem clínica da tabela deduz somente repasses; o extrato também informa taxas, despesas e resultado atribuído. Apuração não comprova transferência da comissão.
- Ranking de serviços por receita ou lucro, quantidade sem duplicação por pagamento dividido e participação na receita. Gráfico com barras de receita/saídas, linha de lucro, seletor de detalhes e tabela acessível; as saídas incluem repasses, taxas e despesas.
- Despesas permitem cadastro, edição e cancelamento justificado, mantendo o registro cancelado, operador e datas. Categorias: fixos, insumos, laboratórios e outras. Vínculos opcionais com dentista/serviço restringem o rateio proporcional à receita elegível, preservando centavos. Custos sem receita elegível permanecem no resultado geral; filtros só incluem custos atribuíveis ao recorte e informam a ausência de base de rateio. O rateio é recalculado para o período consultado e não representa um centro de custo contábil fixo.
- Despesas gerenciais não geram sangria nem movimentam o caixa físico. A demonstração acrescenta despesas fictícias do mês corrente, até a data de inicialização, e usa os recebimentos existentes; não fabrica receita histórica para preencher gráficos.
- Exportação `.xlsx` real, sem dependências adicionais, com sete abas: DRE, Recebimentos, Despesas, Dentistas, Serviços, Canais e Evolução. Inclui filtros, responsável, data de emissão, fórmulas e valores monetários. Textos externos são células de texto para impedir interpretação como fórmulas. A impressão permite salvar PDF com identificação do responsável e espaço para assinatura manual; não há assinatura digital certificada.

A feature separa agregação/regras/exportação no Model, consultas/mutações/navegação em `useManagementViewModel` e componentes na View. O Query usa `['finance', 'management', filtros]`; baixas e estornos invalidam os indicadores sem duplicar entidades no Zustand.

| Método | Endpoint                                | Operação                                                                                                      |
| ------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| GET    | `/management/dashboard`                 | Agregados e detalhes; parâmetros `period`, `date`, `from`, `to`, `dentists`, `services`, `methods`, `ranking` |
| POST   | `/management/expenses`                  | Cadastrar despesa                                                                                             |
| PUT    | `/management/expenses/:id`              | Editar despesa ativa                                                                                          |
| POST   | `/management/expenses/:id/cancellation` | Cancelar com `{ reason }`                                                                                     |
| PUT    | `/management/settings`                  | Salvar `{ dailyGoalCents }`                                                                                   |

Os contratos estão em `src/features/management/model/types.ts`. Listas dos filtros são enviadas à API separadas por vírgula. No backend real, as agregações devem manter os mesmos critérios e a precisão em centavos.

## Acesso, equipe e permissões

Implementa `docs/odontoflow_acesso_e_permissoes.html`. O acesso inicial agora exige login. Na demonstração, os perfis iniciais usam a senha **`Odonto123!`**:

| Perfil        | E-mail                   | Área inicial                |
| ------------- | ------------------------ | --------------------------- |
| Administrador | `admin@odontoflow.com`   | Gestão financeira           |
| Dentista      | `camila@odontoflow.com`  | Agenda individual de Camila |
| Recepção      | `juliana@odontoflow.com` | Agenda geral                |

- Administradores acessam a equipe, matriz, configurações, catálogo e gestão financeira. Dentistas veem somente sua agenda e os próprios repasses, com edição clínica. A recepção opera cadastros/agendas/caixa e consulta prontuários somente para leitura; DRE, despesas gerais e repasses dos colegas permanecem bloqueados.
- A matriz permite restringir ações dentro dos limites do perfil e restaurar o padrão seguro. Os limites estruturais são fixos: não se pode conceder DRE à recepção ou edição clínica a este perfil. Administradores mantêm todas as permissões; o sistema impede auto-inativação, perda do próprio perfil administrador e remoção do último administrador ativo.
- A proteção é aplicada às rotas, menus, controles e endpoints da API simulada. Consultas de agenda e repasses são filtradas pela identidade autenticada, sem confiar em um `dentistId` enviado pelo cliente. Dados de comissões são omitidos/zerados nas respostas operacionais da recepção, incluindo snapshots de fechamento. A troca de usuário cancela consultas pendentes e limpa o cache para evitar mistura entre sessões.
- Cinco tentativas incorretas consecutivas bloqueiam a conta por 15 minutos. O login bem-sucedido zera o contador. A opção “Lembrar de mim” mantém uma sessão por até 30 dias, sujeita ao limite de inatividade; sem ela, a sessão dura até 24 horas e o cookie é de sessão do navegador. Inatividade padrão: 60 minutos, configurável entre 1 e 240. Interações renovam a atividade com limitação de frequência; consultas de sessão não renovam o prazo. Revogações são verificadas em cada requisição e por consulta periódica de 15 segundos.
- Recuperação mostra confirmação genérica com máscara do e-mail informado, exista ou não uma conta. Links de uso único expiram em 30 minutos; reenviar invalida o link anterior. A nova senha precisa ter de 8 a 128 caracteres, maiúsculas, minúsculas e números. Redefinir a senha revoga todas as sessões do usuário e desbloqueia seu acesso.
- Equipe permite buscar por nome/e-mail/CRO, filtrar por perfil, cadastrar, editar, ativar/inativar e reenviar convite/redefinição. Dentistas exigem CRO com UF e especialidade. O convite cria a primeira senha e ativa o acesso; novas colunas de dentistas aparecem na agenda. Inativar preserva histórico e revoga sessões. Mudança de e-mail requer uma nova ativação. Perfis de dentistas com histórico clínico não podem ser convertidos para outro papel.
- A evolução clínica recebe carimbo imutável com nome, CRO, data/hora e ID do usuário responsável; o dentista autenticado não pode atribuir sua evolução a outro profissional. Evoluções existentes não podem ser alteradas ou removidas pelo salvamento do prontuário. O carimbo não é uma assinatura digital certificada.
- Remarcação de consultas e registro de falta respeitam as permissões e a agenda própria. A exclusão de ficha é restrita ao administrador e é lógica: remove da listagem, inativa o paciente e preserva o histórico.
- A recepção pode lançar suprimentos pelo botão **Lançar despesa miúda**, com teto por lançamento configurável (inicial: R$ 100). O registro integra a DRE, sem movimentar o caixa físico automaticamente.
- Logs registram login aceito/recusado, bloqueios, logout, redefinições, convites, alterações de usuários e permissões com data/hora, IP e dispositivo. O modo local identifica expressamente o IP como simulado.

### Demonstração e backend de produção

**O modo simulado não é uma fronteira de segurança para dados reais.** Os e-mails são exibidos em `/emails-demo`, sem envio externo, para testar convites e recuperações. A base demonstrativa, hashes, sessões e mensagens ficam no armazenamento local editável pelo navegador. Senhas são derivadas com PBKDF2/SHA-256, salt aleatório e 100 mil iterações; a senha em texto não é persistida. IDs de sessão aleatórios são guardados como hash na base e enviados por um cookie demonstrativo `SameSite=Strict` (com `Secure` quando servido em HTTPS), que não pode ser `HttpOnly` por ser implementado no navegador. Esse comportamento existe apenas no adaptador simulado.

Com `VITE_USE_MOCK_API=false`, o frontend usa Axios com `withCredentials` e depende de um backend que autentique/autorize todas as operações, armazene credenciais e tokens fora do cliente, emita cookies `HttpOnly`/`Secure`, envie os e-mails e registre o IP real. A caixa demonstrativa não é consultada nesse modo. O backend deve aplicar os mesmos escopos, revogações e limites; esconder controles no frontend não substitui essas verificações.

| Método     | Endpoint                                         | Operação                                                                    |
| ---------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| POST       | `/auth/login`                                    | `{ email, password, remember }` → `{ session }`, com cookie de sessão       |
| GET        | `/auth/session`                                  | Identidade, permissões efetivas, expiração e limites; 401 sem sessão válida |
| POST       | `/auth/activity`, `/auth/logout`                 | Renovar atividade por interação / revogar sessão                            |
| POST       | `/auth/recovery`                                 | `{ email }` → confirmação genérica e máscara do endereço informado          |
| POST       | `/auth/reset`                                    | `{ token, password }` → redefinição e revogação das sessões anteriores      |
| GET / POST | `/team`                                          | Listar / convidar colaborador                                               |
| PUT        | `/team/:id`                                      | Editar dados, perfil ou status                                              |
| POST       | `/team/:id/reset`                                | Enviar convite/redefinição de senha                                         |
| GET / PUT  | `/access/policy`                                 | Consultar / salvar permissões por papel e limites globais                   |
| GET        | `/access/logs`                                   | Auditoria de acesso e administração                                         |
| GET        | `/commissions/own?from=YYYY-MM-DD&to=YYYY-MM-DD` | Produção e repasses exclusivamente da identidade autenticada                |
| POST       | `/finance/expenses`                              | Despesa de suprimentos, respeitando o teto da recepção                      |
| PUT        | `/appointments/:id`                              | Remarcar com validação de expediente, conflito e escopo                     |
| DELETE     | `/patients/:id`                                  | Exclusão lógica restrita ao administrador                                   |

Contratos de sessão, equipe e permissões: `src/features/access/model/types.ts`. No modo simulado, `/auth/demo-mailbox` expõe as mensagens e `/auth/login` também retorna um ID opaco para os testes automatizados. Esses recursos demonstrativos não integram o contrato de produção.

## Personalização da marca

Implementa `docs/odontoflow_personalizacao_marca.html`. Acesse **Configurações → Identidade visual da clínica** com um administrador.

- Upload independente de logo horizontal e ícone/favicon, por seletor de arquivo ou arraste. Recomendações: 280 × 64px para logo e 64 × 64px ou 128 × 128px para ícone. PNG e SVG são aceitos até 2 MB por imagem, incluindo transparência.
- O processamento PNG verifica estrutura/CRC e recomprime os bytes filtrados dos pixels com APIs nativas, sem redimensionamento, conversão por canvas ou perda do canal alfa. Mantém o arquivo original se a recompressão não reduzir o tamanho. SVG aceita um subconjunto vetorial estático, removendo comentários e rejeitando scripts, eventos, entidades, recursos externos e elementos ativos. Arquivos incompatíveis mostram erro sem substituir a marca atual. O decodificador do navegador também verifica a imagem no upload demonstrativo.
- Quatro paletas para a primária: Clínico Teal (`#0D9488`), Navy Confiança (`#1E3A8A`), Sálvia Suave (`#059669`) e Bordeaux & Rose (`#9F1239`). Primária, secundária, terciária e hover podem ser ajustados por seletor ou HEX de seis dígitos; o hover pode ser calculado com 10% de escurecimento.
- Contraste calculado pela luminância relativa sRGB, sem arredondar antes de comparar os limites. O painel avalia branco sobre primária/hover e o texto efetivamente aplicado ao botão: AA normal ≥ 4,5:1, AA grande ≥ 3:1, AAA normal ≥ 7:1. [Critérios WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html). A análise desses pares não é uma certificação de acessibilidade da aplicação inteira. Teal e sálvia com texto branco não atingem AA para texto normal; o sistema mantém o texto branco dos botões conforme o protótipo e informa o contraste para orientar a escolha da cor de fundo.
- Escalas compacta (13px), padrão (14px) e acessível (16px), aplicadas proporcionalmente a textos, controles e densidade vertical da agenda. O expediente e os horários das consultas permanecem os mesmos. As cores semânticas dos alertas e condições clínicas são preservadas.
- A prévia é um simulador isolado: alterações locais não modificam a identidade da equipe até **Salvar e aplicar identidade**. É possível descartar o rascunho. Remover um arquivo na prévia retorna à marca padrão; a remoção é aplicada após salvar.
- A identidade salva é consumida pelo cabeçalho/menu, ícone compacto no celular, login/recuperação, favicon, título/tema da aba, prescrições, impressão do prontuário, recibos, borderôs e DRE em HTML/PDF. Falhas de carregamento das imagens nos componentes de marca retornam ao ícone/texto padrão. O Excel preserva seu formato de planilha e não incorpora as imagens.
- **Restaurar padrão OdontoFlow** abre uma confirmação e salva a tríade Teal/Slate/Amber, menu escuro como padrão da clínica, fonte de 14px e imagens padrão. Revisões impedem que dois administradores sobrescrevam alterações sem perceber; em conflito, o servidor retorna 409 e solicita atualização.
- Tokens CSS são aplicados em `:root`, com limpeza na troca de contexto. Incluem `--color-primary`, `--color-primary-hover`, `--color-secondary`, `--color-tertiary`, `--color-surface`, `--font-size-base`, `--clinic-logo-url` e aliases dos tokens existentes. A prévia define os mesmos tokens somente em seu contêiner.
- `Session.clinicId` identifica o contexto autenticado; as consultas usam `['branding', clinicId]`. A API simulada impede consultar/gravar outro contexto, vincular arquivos de outra clínica ou alterar o vínculo de clínica pelo cadastro de usuário. A marca pública para a tela de login é resolvida pelo contexto da aplicação. Mudanças são atualizadas após salvar, em consultas periódicas e por evento de armazenamento entre abas da demonstração.

### Armazenamento demonstrativo e contrato de produção

A demonstração mantém as marcas separadas por clínica em `Database.branding`, usando a base local existente. Arquivos são representados por URLs de dados; não há bucket ou CDN real. Quando o navegador recusa a persistência de uma alteração de marca, a API simulada retorna 507 e restaura a configuração anterior. Os demais módulos continuam com sua base demonstrativa existente: esta implementação isola a identidade visual, sem converter os dados clínicos/financeiros para uma plataforma multi-tenant de produção.

Em produção, o backend deve resolver a clínica pela sessão e pelo domínio da clínica no acesso público, validar/processar novamente os arquivos, armazená-los em bucket privado por clínica e devolver URLs HTTPS de entrega controlada/CDN. Deve usar URLs versionadas para invalidar cache, verificar revisões e aplicar autorização; o frontend não provisiona armazenamento externo.

| Método | Endpoint                             | Operação                                                                                                     |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| GET    | `/public/branding`                   | Identidade pública da clínica resolvida pelo servidor, para login e recuperação                              |
| GET    | `/clinics/:clinicId/branding`        | Marca da clínica autenticada; retorna `clinicId`, `clinicName`, `config`, `revision` e `updatedAt`           |
| POST   | `/clinics/:clinicId/branding/assets` | Upload administrativo multipart com `kind` (`logo`/`icon`) e `file`; retorna os metadados e a URL do arquivo |
| PUT    | `/clinics/:clinicId/branding`        | Salva cores, escala, referências de logo/ícone e revisão esperada; somente administrador                     |

Contratos: `src/features/branding/model/types.ts`. O upload prepara o arquivo para o rascunho; somente o PUT aplica a marca compartilhada. O backend deve ignorar URLs de imagem arbitrárias do cliente e resolver os arquivos pelo ID e pela clínica.

### Tríade de cores e preferência de layout

A identidade institucional inclui primária `#0D9488` (ações e conclusões), secundária `#1E293B` (estrutura, títulos e indicadores) e terciária `#F59E0B` (alertas médicos, espera e pendências de caixa). A distribuição visual segue a referência 60–30–10. As três cores podem ser editadas com seletor/HEX e avaliação dos pares de contraste em **Configurações → Identidade visual**; o hover continua sendo uma propriedade da primária. Restaurações no odontograma acompanham a primária. A espera recebe destaque a partir de 15 minutos desde a chegada, com ícone e descrição além da cor.

O administrador define o layout padrão: **Modo Clínico Claro** ou **Alto Contraste (Tríade)**. O segundo escurece o menu lateral, mantendo o canvas `#F8FAFC` e os cartões claros. O ícone de sol/lua junto ao perfil no menu lateral alterna o tema pessoal e salva a preferência sem recarregar. Novos perfis seguem o padrão da clínica até escolherem seu próprio tema; escolhas pessoais prevalecem sem afetar colegas. A faixa superior de perfil e controles foi removida. Botões preenchidos com a primária preservam texto branco.

`features/appearance` separa contratos/regras e Axios (Model), consultas/mutação otimista com rollback (ViewModel) e botão de tema (View). TanStack Query é o proprietário das preferências; LocalStorage mantém somente um cache de carregamento por clínica/usuário. O menu usa o Zustand existente para abertura no celular e para recolher/expandir a barra no desktop. Recolhido, mostra ícones com rótulos acessíveis e dicas de identificação, mantendo navegação, tema e saída da conta disponíveis. A largura do conteúdo acompanha a barra; a escolha de recolhimento permanece durante a navegação. Não há duplicação de telas nem recarga ao alternar layouts. Identidades antigas recebem os novos campos preservando suas cores, imagens, fonte e revisão.

Na API simulada, `Database.appearance` persiste o perfil junto à base demonstrativa. `GET /profiles/me/preferences` retorna `{ clinicId, userId, preferredLayout, highContrastAlerts }`; `PUT` salva o mesmo contrato. `preferredLayout` aceita `default`, `light_sidebar` ou `dark_sidebar`. Ambos exigem sessão; gravações não podem mudar o perfil ou clínica do ator. O backend de produção deve implementar esses endpoints e persistir os campos no perfil autenticado. `BrandingInput` agora inclui `secondary`, `tertiary` e `defaultLayout`, além dos campos anteriores. Falhas de armazenamento retornam erro e conservam a preferência anterior.

## Verificação

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Os testes usam o executor nativo do Node e cobrem conflitos de agenda, validação de pacientes, consulta de usuários com Axios/TanStack Query e cache, cadastros, atualização da fila, isolamento de prontuários, erros e cancelamento. A suíte financeira cobre arredondamento, parcelas, troco, confirmação Pix, comprovantes, concorrência de baixa, proteção de procedimentos pagos, estorno, sangria, divergências e bloqueios após fechamento.

Com o servidor de desenvolvimento em execução e o Chrome instalado, `npm run test:browser` verifica os principais fluxos das doze páginas administrativas em desktop e celular. Cobre cadastro/edição/inativação e busca de serviços, duração automática na agenda, marcação sem serviço, avaliação gratuita, comanda com dois dentistas e desconto, Pix + cartão, recibo detalhado, baixa no prontuário, estorno, troco, sangria, fechamento, borderô e novo turno. Também verifica personalização de marca, upload, paletas, fontes, prévia isolada e restauração, além de login e redirecionamento por perfil, prontuário somente para leitura, bloqueio de URLs, convites e recuperação, permissões, filtros e períodos da gestão financeira, despesas, meta, extrato, download Excel e geração do PDF, além da apresentação para impressão dos recibos. O teste usa um perfil temporário isolado e imprime os caminhos das capturas. O caminho padrão do Chrome é o de uma instalação Windows; use `CHROME_PATH` para outro executável e `APP_URL` para outro endereço. Não exige instalar Playwright ou outro navegador. `npm run format:check` verifica a formatação.

Para servir o build localmente, execute `npm run preview`. Em hospedagem estática, configure o fallback das rotas para `index.html`.
