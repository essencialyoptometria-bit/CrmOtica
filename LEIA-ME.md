# CRM Ótica Líder — instalação e uso

Projeto completo para Nova Olímpia e Tapira, com frontend responsivo, API na Vercel e banco no Google Planilhas. Você faz o build e publica na sua própria conta.

## O que está incluído

- Clientes: nome, telefone com DDD, lente, detalhes e data exata do último óculos.
- Lentes: visão simples, multifocal de entrada e multifocal caro. Lente e data podem ficar vazias quando ainda não conhecidas, por exemplo, em novos leads.
- Etapas: A contatar → Aguardando resposta → Em conversa → Agendado → Comprou → Encerrado sem venda. As etapas são editáveis no cadastro; registrar agendamento ou venda atualiza a etapa correspondente automaticamente.
- Tela do cliente: contatos, observações, agendamentos, vendas, follow-ups, reagendamento e conclusão de retornos. Botão para abrir o WhatsApp; mensagens são enviadas manualmente.
- Metas configuráveis por loja: inicialmente 10 contatos/dia e 50/semana.
- Dashboard por loja ou consolidado, filtros de período, carteira por etapa, metas da semana atual e próximos retornos.
- Origem do cliente e origem da venda independentes. Receita de prospecção ativa e de anúncios separada, sem duplicar uma venda.
- Investimento por loja, campanha e período; receita de anúncios e ROAS.
- Login com senha compartilhada. Não há identificação individual de funcionários.
- Aviso após três dias úteis abaixo da meta diária e resumo por e-mail.

## 1. Preparar o computador

Instale o **Node.js 24 LTS** pelo site https://nodejs.org/ e extraia este ZIP para uma pasta própria, por exemplo `C:\Projetos\crm-otica`.

Abra o PowerShell **dentro da pasta que contém package.json**:

```powershell
node --version
npm install
npm run build
npm test
```

Este projeto usa JavaScript e recursos nativos do Node, sem dependências externas de frontend. `npm run build` prepara `dist` e gera `apps-script/Core.gs`. A pasta `dist` sozinha não é o sistema completo: a API da pasta `api` também precisa estar na Vercel.

## 2. Gerar senha e chaves

```powershell
npm run keys
```

Informe uma senha compartilhada de pelo menos 12 caracteres. Ela ficará visível enquanto você digita no seu terminal. O comando gera:

| Destino | Nome |
| --- | --- |
| Propriedades do Apps Script | API_SECRET |
| Propriedades do Apps Script | LOGIN_PROOF |
| Vercel / .env.local | APPS_SCRIPT_SECRET |
| Vercel / .env.local | LOGIN_SALT |
| Vercel / .env.local | SESSION_SECRET |

Guarde esses valores em local privado. `API_SECRET` e `APPS_SCRIPT_SECRET` devem ser iguais. A senha não fica no frontend nem é salva na planilha. A API deriva uma prova com scrypt e o Apps Script confere essa prova. Nunca use prefixos públicos como `VITE_` para essas chaves.

Para trocar a senha, execute novamente o comando e atualize todos os valores nos dois serviços. Trocar `SESSION_SECRET` invalida as sessões existentes. Após atualizar variáveis na Vercel, faça um novo deploy.

## 3. Criar a planilha e o Apps Script

1. Crie uma planilha Google chamada **CRM Ótica Líder**.
2. Na planilha, abra **Extensões → Apps Script**.
3. Substitua o conteúdo do arquivo `Código.gs` pelo conteúdo de `apps-script/Code.gs` deste projeto.
4. Crie outro arquivo de script chamado **Core** e cole `apps-script/Core.gs`. Não crie duas cópias dos mesmos arquivos.
5. Em **Configurações do projeto**, ative a exibição do manifesto `appsscript.json` no editor e substitua seu conteúdo pelo arquivo de mesmo nome deste pacote. O fuso será `America/Sao_Paulo`.
6. Em **Configurações do projeto → Propriedades do script**, adicione `API_SECRET` e `LOGIN_PROOF` gerados no passo anterior.
7. Salve e execute **setupSheet** no editor. Autorize o acesso solicitado pela sua conta.
8. Verifique a criação das abas: **Clientes, Contatos, FollowUps, Vendas, Agendamentos, Anuncios, HistoricoMetas e Configuracoes**. A aba vazia original pode permanecer. `setupSheet` pode ser executada novamente e não apaga os dados existentes.
9. Execute **instalarAlertas** uma vez e autorize. O agendador verifica os alertas a cada 15 minutos. Executar novamente substitui apenas o agendador desta função.
10. Vá em **Implantar → Nova implantação → Aplicativo da Web**. Execute como **você, proprietário**, com acesso **Qualquer pessoa**. Copie a URL terminada em **/exec**.

O endpoint é acessível publicamente para permitir a comunicação entre servidores, mas todas as operações exigem a chave privada. Não compartilhe a planilha publicamente. Funcionários só precisam da URL do CRM e da senha compartilhada. Se sua organização Google bloquear implantações com acesso “Qualquer pessoa”, será necessário liberar essa opção com o administrador ou usar uma conta permitida.

### Atualizações futuras do Apps Script

Cole os arquivos atualizados, salve e execute `setupSheet` apenas se necessário para criar abas. Depois: **Implantar → Gerenciar implantações → Editar → Nova versão → Implantar**. Salvar o código sem atualizar a versão não atualiza o endpoint /exec.

## 4. Testar no computador

Na pasta do projeto:

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Preencha as quatro variáveis abaixo, sem aspas e sem espaços nas chaves:

```text
APPS_SCRIPT_URL=https://script.google.com/macros/s/SEU_ID/exec
APPS_SCRIPT_SECRET=valor_gerado
SESSION_SECRET=valor_gerado
LOGIN_SALT=valor_gerado
```

`LOGIN_PROOF` é exclusivo do Apps Script. `API_SECRET` no Apps Script corresponde ao mesmo valor de `APPS_SCRIPT_SECRET` aqui.

Execute:

```powershell
npm run dev
```

Abra **http://localhost:3000** e use a senha definida em `npm run keys`. Para encerrar, pressione `Ctrl+C`. Reinicie o servidor quando alterar `.env.local`.

O acesso local usa a mesma planilha configurada; cadastros feitos no teste são reais. Se preferir testar separado, use outra planilha e outra implantação.

## 5. Fazer deploy na Vercel pelo seu computador

A opção mais direta, sem precisar configurar Git:

```powershell
npm run build
npx vercel login
npx vercel
```

No primeiro deploy, escolha sua conta, crie um projeto novo e use a pasta atual (`./`). O arquivo `vercel.json` já define o comando de build e a pasta de saída. Use **Other** se for solicitado um framework. Configure **Node.js 24.x** nas opções do projeto se necessário.

No painel da Vercel, abra **Project → Settings → Environment Variables**. Cadastre estas quatro variáveis em **Production** e **Preview**:

- `APPS_SCRIPT_URL`
- `APPS_SCRIPT_SECRET`
- `SESSION_SECRET`
- `LOGIN_SALT`

Volte ao terminal e publique:

```powershell
npx vercel --prod
```

Abra a URL de produção mostrada pela Vercel. As variáveis só entram em vigor após novo deploy. O primeiro preview pode informar “Configure as variáveis do servidor” enquanto elas ainda não estiverem cadastradas.

Nas próximas atualizações:

```powershell
npm run build
npm test
npx vercel --prod
```

Se optar por GitHub, crie um repositório **dentro desta pasta**, envie o projeto completo e importe-o na Vercel. Não use sua pasta de usuário inteira como raiz do Git. O `.gitignore` exclui senhas e arquivos temporários.

## 6. Primeira configuração e rotina da loja

1. Entre no CRM e abra **Configurações**.
2. Confira as metas de cada loja. As metas diária e semanal são independentes: alterar uma não recalcula a outra.
3. Informe o e-mail dos alertas e o horário de fechamento. O padrão é **18h, horário de Brasília**. Deixe o e-mail vazio para desativar apenas o envio; o alerta visual continua funcionando.
4. Selecione a loja e cadastre os clientes do caderno. Use origem **Base do caderno** e a data exata do último óculos.
5. Abra o cliente, clique em WhatsApp, faça a abordagem e use **Registrar contato**. Preencha resultado, observação e próximo follow-up. Abrir o WhatsApp sozinho não conta como contato.
6. Atualize a etapa pelo botão **Editar cliente**. Agendamentos e vendas possuem botões próprios; apenas mudar a etapa para “Comprou” não cria receita.
7. Registre a venda com o valor e confirme a origem sugerida. O sistema sugere a origem do contato mais recente; sem contatos, usa a origem do cliente. Você pode alterar antes de salvar.
8. Consulte **Follow-ups** diariamente e conclua ou reagende cada tarefa. Uma venda não encerra automaticamente tarefas pendentes.
9. Cadastre clientes vindos de anúncios com a origem correspondente e a data de entrada real do lead. Registre os gastos em **Anúncios** sem repetir o mesmo gasto em períodos sobrepostos.

## 7. Regras dos indicadores

- **Semana:** segunda a domingo para filtros; metas e contagens válidas de prospecção consideram apenas segunda a sexta. Sábado e domingo podem ter contatos no histórico, mas não pontuam na meta. Feriados de segunda a sexta continuam contando como dias de trabalho nesta versão.
- **Meta:** cada combinação de cliente + loja + dia vale no máximo uma prospecção, apenas quando a origem do contato é “Prospecção ativa”. Vários contatos ficam no histórico sem multiplicar a meta.
- **Contatos totais:** todos os registros de contato do período, incluindo tentativas repetidas, anúncios e fins de semana. “Clientes únicos” conta pessoas cadastradas contatadas, sem repetir o mesmo cadastro.
- **Consolidado:** soma o trabalho e as metas das duas lojas. Um mesmo telefone pode existir em ambas; cada cadastro é independente. Na mesma loja, telefone duplicado é bloqueado.
- **Meta diária alterada:** começa a valer amanhã. O histórico preserva a meta de cada dia. A meta semanal muda imediatamente. O controle começa na execução inicial de `setupSheet`; não há alerta retroativo por dias anteriores.
- **Alerta:** avalia os três últimos dias de trabalho encerrados. Antes da hora configurada, o dia atual não entra; depois, entra. Se a meta foi cumprida em qualquer um dos três dias, a sequência se rompe. O aviso não zera na virada da semana.
- **E-mail:** um resumo por dia útil quando existir alerta, após o horário escolhido, incluindo a quantidade de follow-ups para hoje e atrasados. O agendador é aproximado e depende das cotas do Google. Alertas já enviados não são retirados se contatos forem lançados depois do fechamento.
- **Follow-ups:** contagem atual de pendências por loja, independente do filtro de período do dashboard.
- **Agendamentos:** contagem pela data marcada, não pela data de registro. A carteira por etapa é uma fotografia atual.
- **Receita:** soma das vendas pela data da venda e origem confirmada. Não representa recebimentos parcelados nem lucro. Uma nova venda não cria um novo cliente.
- **Leads de anúncios:** clientes com origem de anúncio e data de entrada dentro do período.
- **Investimento:** quando o filtro corta parte do período do gasto, o sistema rateia o valor igualmente por dia, incluindo fins de semana. Para maior precisão, registre gastos diários.
- **ROAS:** receita atribuída a anúncios no período ÷ gasto de anúncios no período. Sem gasto, aparece “—”. É uma comparação de período, não atribuição automatizada da Meta nem análise por coorte. A integração com Meta Ads não está incluída; entrada e investimento são manuais.

## 8. Conferência após a implantação

- Cadastre um cliente em cada loja e confira os filtros.
- Registre duas prospecções no mesmo cliente e dia útil: a meta deve subir só 1.
- Registre um contato de anúncio: ele deve aparecer no histórico sem aumentar a meta ativa.
- Crie e conclua um follow-up; confira a tela do cliente e a lista geral.
- Registre vendas de cada origem e compare as receitas separadas.
- Registre um investimento de anúncios e confira o ROAS.
- Confirme o agendador `enviarAlertas` em **Acionadores** no Apps Script e acompanhe falhas em **Execuções**. Um e-mail só será enviado quando houver três dias elegíveis abaixo da meta; executar a função sem essa condição não envia teste.

## 9. Solução de problemas e manutenção

**“Configure as variáveis do servidor”**: confira os quatro nomes, reinicie o servidor local ou faça novo deploy na Vercel.

**“Acesso não autorizado”**: `API_SECRET` do Apps Script e `APPS_SCRIPT_SECRET` da Vercel devem ser iguais.

**“Senha incorreta”**: confira se `LOGIN_PROOF` e `LOGIN_SALT` vieram da mesma execução de `npm run keys`. Não use o hash como senha na tela.

**Falha de conexão**: confira a URL /exec, o acesso “Qualquer pessoa”, a versão publicada e as autorizações. Após uma falha ao salvar, use “Atualizar” para verificar se o registro já existe antes de repetir. O formulário usa um identificador estável para evitar duplicação em tentativas no mesmo formulário.

**Dados alterados em outro dispositivo**: atualize a página e abra novamente o formulário. O controle de versão evita sobrescrever cadastro, tarefa ou configuração salva por outra pessoa.

**E-mail não chegou**: confira o endereço, horário, existência dos três dias abaixo da meta, o acionador e as execuções. Verifique spam e cotas de envio. O proprietário precisa manter as autorizações do projeto.

**Correção de venda, gasto, contato ou agendamento lançado errado**: esta versão mantém o lançamento financeiro sem formulário de edição. O proprietário pode corrigir a linha correspondente na planilha (por ID), mantendo cabeçalhos e IDs. Faça uma cópia de segurança primeiro e atualize o CRM depois. Se excluir uma venda ou agendamento na planilha, ajuste a etapa do cliente separadamente, pois ela não é recalculada automaticamente. Não renomeie abas nem colunas.

Faça cópias periódicas da planilha. O histórico de versões do Google ajuda a recuperar alterações. Proteja o acesso à conta Google e à Vercel. A senha compartilhada não distingue qual funcionário fez uma alteração. Sessões expiram em 12 horas; “Sair” remove a sessão daquele navegador.

A solução lê os dados da planilha em lote e usa bloqueio de escrita para impedir gravações simultâneas conflitantes. É adequada para operação simples de loja; bases muito grandes e muitos acessos simultâneos podem exigir migração para um banco dedicado. Não edite os dados manualmente enquanto houver cadastros em andamento.

## Estrutura

```text
public/          interface responsiva e regras de métricas
api/crm.js       API da Vercel; autenticação e comunicação com Google
server/          assinatura da sessão
apps-script/     Code.gs, Core.gs e manifesto do Apps Script
scripts/         build, servidor local e gerador de chaves
tests/           testes de regras, API e Apps Script simulado
vercel.json      configuração de publicação
.env.example     modelo de variáveis, sem segredos
```

## Validação desta entrega

Build local e 11 testes automatizados aprovados para métricas, datas, autenticação, cadastro, gravação idempotente, tarefas, metas, vendas e alertas. Também foram verificados no navegador os fluxos de cadastro, contato com follow-up, venda, configuração de metas, investimento, edição de cliente e conclusão de retorno, nas larguras de 1440 px e 390 px, com backend simulado e sem erros JavaScript. O Apps Script foi validado em simulação local de seus serviços; a implantação real na sua conta Google, o envio real de e-mail e o deploy na sua conta Vercel dependem da configuração dos passos acima.

Documentação oficial consultada: [Vercel Node.js](https://vercel.com/docs/functions/runtimes/node-js), [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web), [Acionadores instaláveis](https://developers.google.com/apps-script/guides/triggers/installable).
