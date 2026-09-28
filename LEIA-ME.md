# CRM Ótica Líder — versão 2 / Supabase

## O que mudou

- Banco no projeto Supabase **Crm-Otica** (`dtvhxfrdujcllluqbjqw`).
- Login com **e-mail e senha**: um acesso para Nova Olímpia, um para Tapira e um administrador.
- Acesso de loja: vê e altera apenas os clientes, contatos, follow-ups, vendas, agendamentos e anúncios de sua loja. Pode ajustar suas próprias metas.
- Administrador: visão geral somando as duas lojas, filtros individuais e configuração global dos alertas.
- Clientes: filtro de período pela **entrada na base** ou pelo **último óculos**, combinado com nome, telefone, origem e etapa.
- Clientes: visualização **Lista / Kanban**, com cartões por etapa. Pode arrastar no computador ou usar o seletor do cartão, inclusive no celular.
- Contatos, follow-ups, receitas, anúncios, ROAS e regras de metas foram mantidos.
- Alertas de e-mail continuam pelo Google Apps Script, que agora lê o **Supabase**, sem banco em planilha.

**O banco já foi preparado no seu projeto. Não precisa executar os arquivos SQL de criação novamente.** Ainda é necessário configurar os acessos, as variáveis da Vercel e, se houver dados no sistema anterior, importá-los. Não foram criadas senhas nem contas de loja nesta entrega.

## 1. Preparar a nova versão no computador

Use Node.js **24.x**. Extraia o ZIP em uma pasta nova. Abra o PowerShell dentro da pasta `crm-otica`, onde está `package.json`.

Os comandos usam `npm.cmd` e `npx.cmd` para funcionar mesmo quando o PowerShell bloqueia `npm.ps1`.

```powershell
npm.cmd install
npm.cmd run keys
Copy-Item .env.example .env.local
notepad .env.local
```

O comando `keys` gera **SESSION_SECRET**. Copie o valor gerado para `.env.local`.

O modelo já contém a URL e a chave **publicável** do seu projeto, que não é uma chave administrativa. Confira estas três variáveis:

```text
SUPABASE_URL=https://dtvhxfrdujcllluqbjqw.supabase.co
SUPABASE_PUBLISHABLE_KEY=valor_publicavel_do_modelo
SESSION_SECRET=valor_gerado_por_npm_run_keys
```

`APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET` e `LOGIN_SALT` da versão anterior não são usados. Não copie os valores antigos como credenciais do Supabase.

## 2. Criar os três acessos

Acesse [as chaves do projeto](https://supabase.com/dashboard/project/dtvhxfrdujcllluqbjqw/settings/api-keys). Copie a chave **Secret** (`sb_secret_...`) e adicione **somente no .env.local do seu computador**:

```text
SUPABASE_SECRET_KEY=sb_secret_...
```

Essa chave permite a administração do projeto. Não coloque no frontend nem envie por mensagem. Ela não é necessária nas variáveis da Vercel. O aplicativo normal usa a chave publicável, autenticação e políticas de acesso do banco.

Execute:

```powershell
npm.cmd run users
```

O assistente pede e-mail, perfil e senha. Execute três vezes:

| Perfil | Acesso |
| --- | --- |
| 1 — administrador | Visão geral e ambas as lojas |
| 2 — Nova Olímpia | Somente Nova Olímpia |
| 3 — Tapira | Somente Tapira |

Use **três e-mails distintos que você controla**. A equipe de uma mesma loja pode compartilhar o acesso daquela loja. A senha inicial deve ter ao menos 12 caracteres e fica visível no terminal durante a digitação. O assistente cria a conta confirmada diretamente; **não envia e-mails ou convites**.

Se o usuário já existir no Supabase, o comando pede a palavra `VINCULAR` para associar ou mudar seu perfil; não troca sua senha. Para trocar uma senha posteriormente, use a administração de usuários do Supabase. A troca de perfil passa a valer nas novas requisições, pois a autorização é lida do banco, não de metadados editáveis do usuário.

Depois de terminar o cadastro dos acessos e a importação, você pode remover `SUPABASE_SECRET_KEY` do arquivo local. Ela será necessária novamente apenas para futuras operações administrativas.

## 3. Importar os dados da planilha anterior, se já houver cadastros

**Faça isso antes de começar novos cadastros no Supabase.** A importação é permitida somente com as tabelas operacionais vazias. Ela não apaga uma base que já esteja em uso.

1. Faça uma cópia de segurança da planilha Google.
2. Combine uma pausa nos lançamentos do sistema antigo até concluir a troca. Não use os dois bancos em paralelo durante a migração.
3. Abra o Apps Script **antigo**, que ainda tem o `Code.gs` e o `Core.gs` da primeira versão.
4. Acrescente um arquivo **Exportar** com o conteúdo de `migration/Exportar.gs` deste pacote. Não substitua o código antigo nesse momento.
5. Execute a função **exportarParaSupabase**. Volte à aba da planilha; será aberto um diálogo com **Baixar crm-export.json**.
6. Guarde esse JSON em seu computador. Ele contém dados de clientes: não publique nem envie ao GitHub.
7. Com `SUPABASE_SECRET_KEY` configurada no `.env.local`, execute:

```powershell
npm.cmd run migrate -- "C:\caminho\crm-export.json"
```

8. Confira as quantidades mostradas e digite `IMPORTAR`.
9. Aguarde a confirmação. A importação preserva IDs, nomes, telefones, datas, etapas, contatos, retornos, vendas, agendamentos, investimentos, metas históricas e configurações. Contas de acesso são criadas separadamente no passo 2.
10. Entre no CRM novo e confira o total de clientes por loja e as receitas antes de liberar a equipe.

A importação é uma única transação: se houver dado inválido, o banco reverte o lote inteiro e o terminal mostra o motivo. Corrija o arquivo de origem ou o JSON e tente novamente. Se já houver clientes no Supabase, o comando se recusa a sobrescrever a base; não apague registros para forçar uma importação sem antes conferir o caso.

Se nunca cadastrou dados na versão antiga, pule este passo. Mantenha a planilha antiga como cópia de segurança após a migração.

## 4. Testar e fazer build

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run dev
```

Abra **http://localhost:3000** e entre com um dos e-mails e senhas cadastrados. O teste local usa o banco real configurado, portanto os cadastros feitos ali são reais.

Confira:

- Nova Olímpia vê somente sua loja; Tapira vê somente a dela.
- O administrador pode selecionar “Todas as lojas”.
- O filtro de data funciona tanto em Lista quanto em Kanban.
- Mudar uma etapa persiste após atualizar a página.
- Registrar contato com follow-up cria ambos os registros.
- Vendas de anúncios e prospecção aparecem nas receitas correspondentes.

Use `Ctrl+C` para encerrar o servidor. Se alterar `.env.local`, reinicie-o.

## 5. Atualizar o mesmo projeto na Vercel

No painel do projeto Vercel que você já usa, configure estas três variáveis em **Production** e **Preview**:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SESSION_SECRET`

Remova as antigas `APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET` e `LOGIN_SALT` quando não precisar mais da versão anterior. Não cadastre `SUPABASE_SECRET_KEY` na Vercel: o código de produção não precisa dela.

Para publicar esta pasta pelo terminal:

```powershell
npm.cmd run build
npx.cmd vercel login
npx.cmd vercel link
```

Escolha a sua conta e **vincule ao projeto Vercel existente**, para manter a URL. Em seguida:

```powershell
npx.cmd vercel --prod
```

Se precisar configurar manualmente: framework **Other**, Node.js **24.x**, build **npm run build**, output **dist**. Publique o projeto completo, incluindo `api`, `server` e `package.json`; não publique apenas `dist`.

Se usa GitHub, atualize os arquivos versionados do seu repositório com os deste pacote, preservando sua pasta `.git`. Remova os arquivos de backend antigo que não existem mais no pacote, especialmente `apps-script/Code.gs`. Não inclua `.env.local`, `node_modules` ou o JSON exportado. Faça commit/push na branch vinculada à Vercel e confira o deploy.

Alterar variáveis na Vercel exige **novo deploy**. A senha compartilhada da versão antiga deixa de funcionar: agora cada acesso usa seu e-mail e sua senha do Supabase.

## 6. Manter os alertas por e-mail

O banco foi totalmente migrado para Supabase. O Apps Script permanece **apenas como agendador e remetente de e-mails**, aproveitando a conta Google, sem exigir outro serviço de envio.

1. Crie um **novo projeto de Apps Script** em https://script.google.com/ para os alertas. Assim, mantém o código antigo intacto para exportação e consulta.
2. Cole `apps-script/Alertas.gs` e `apps-script/Core.gs` em dois arquivos.
3. Nas configurações do projeto, habilite a exibição do manifesto e copie `apps-script/appsscript.json`.
4. Nas **Propriedades do script**, adicione `SUPABASE_URL` e `SUPABASE_SECRET_KEY` do seu projeto. A chave fica privada neste projeto administrativo; não dê acesso ao editor para funcionários da loja.
5. Execute **instalarAlertas** e autorize a consulta externa, o envio de e-mail e o agendador.
6. No CRM, entre como administrador e configure o e-mail e o horário em **Configurações**.
7. Após confirmar a configuração nova, remova o acionador `enviarAlertas` do projeto **antigo** para não receber avisos duplicados ou baseados em dados antigos.

Este novo Apps Script **não precisa de implantação como aplicativo da Web**. O agendador consulta o banco a cada 15 minutos. O alerta visual funciona mesmo sem o agendador de e-mail.

O e-mail só é enviado quando há três dias úteis abaixo da meta. Executar manualmente `enviarAlertas` sem essa condição não envia mensagem de teste. Verifique falhas na seção **Execuções** do Apps Script.

## Regras mantidas e detalhes novos

- Metas iniciais: **10 por dia e 50 por semana por loja**, editáveis. As duas metas são independentes.
- Contagem: segunda a sexta; no máximo um contato de prospecção ativa por cliente/loja/dia. Anúncios e tentativas repetidas ficam no histórico, mas não multiplicam a meta. Feriados em dias úteis continuam contando.
- Meta diária alterada vale a partir do dia seguinte; meta semanal muda imediatamente. O histórico diário é preservado.
- Alerta: três últimos dias úteis encerrados abaixo da meta. O horário configurado fecha o dia; antes dele, o dia atual não entra. A sequência atravessa fins de semana. Até um e-mail por dia útil enquanto a condição continuar.
- Origem do cliente e origem de cada venda são independentes; uma venda é atribuída a uma única origem.
- Investimento em anúncios é registrado manualmente por loja, campanha e período. Filtros parciais fazem rateio diário; ROAS compara receita e investimento do período, não lucro.
- Follow-ups pendentes são atuais, independentes do filtro de período dos resultados.
- **Filtro dos clientes:** datas inicial e final inclusivas, podendo preencher só uma. “Entrada do cliente” corresponde à data `acquired`, informada no cadastro, não ao momento técnico em que a linha foi criada. Sem datas, todos aparecem. Com filtro de último óculos, clientes sem essa informação ficam de fora.
- **Kanban:** alterar a etapa não agenda automaticamente um exame nem cria uma venda. Para registrar data de agendamento ou receita, abra o cliente e use o botão correspondente. Mover para “Comprou” sem registrar venda não soma receita.
- O kanban mostra todos os clientes que correspondem aos filtros; a lista pagina de 30 em 30. Em carteiras grandes, use os filtros para reduzir o número de cartões.
- Cadastros duplicados com o mesmo telefone na mesma loja são bloqueados. O mesmo telefone pode ter um cadastro separado em cada loja.
- Dados são atualizados ao entrar, salvar ou clicar em “Atualizar”. Não há sincronização automática em tempo real entre telas abertas.
- Edições simultâneas de cliente, etapa, tarefa ou configuração usam versão para evitar sobrescrita silenciosa.
- Sessões têm limite de 12 horas, com renovação automática do token durante esse período. Os tokens ficam em cookie cifrado HttpOnly. Permissões não dependem do seletor de loja da interface.
- Metas e horário global são parâmetros compartilhados de leitura; dados operacionais são isolados por loja. Só o administrador altera e-mail/horário global.
- Correções de lançamentos financeiros já salvos continuam administrativas: corrija a linha no Table Editor do Supabase, preservando IDs e relacionamentos. Não há exclusão financeira pelo kanban. Alterar/excluir uma venda administrativamente não recalcula a etapa do cliente.

## Arquivos e segurança

- `supabase/schema.sql`: definição das tabelas, índices, permissões e transação do CRM. **Já aplicado no projeto Crm-Otica.**
- `supabase/import-function.sql`: importação transacional exclusiva da chave administrativa. **Já aplicada.**
- `api/crm.js`: login Supabase, sessão e API do sistema.
- `server/`: acesso ao banco, paginação interna e cookie cifrado.
- `public/`: interface, kanban, filtros e indicadores.
- `scripts/users.mjs`: cadastro administrativo dos acessos.
- `scripts/import.mjs`: importação do JSON da versão anterior.
- `migration/Exportar.gs`: exportador para acrescentar ao Apps Script antigo.
- `apps-script/`: somente agendador e núcleo de regras para alertas por e-mail.
- `tests/supabase-rls.sql`: teste transacional de isolamento de lojas; os dados de teste são revertidos ao final. Use apenas em ambiente de teste, pois inclui pressupostos sobre os valores iniciais das metas.

As tabelas expostas têm RLS. O aplicativo usa acesso autenticado de leitura; as gravações passam por uma função transacional que confere a identidade e a loja no banco. Perfis não podem ser promovidos pelo próprio usuário. As chaves secretas não são enviadas ao navegador.

## Validação da entrega

- Build e 11 testes locais de regras, filtros, sessão, API e alertas.
- Testes SQL no projeto Supabase real, com rollback: leitura isolada por loja; bloqueio de alteração cruzada e de promoção de perfil; visão geral de administrador; gravação atômica de contato/follow-up; idempotência; venda e etapa; edição de metas por loja.
- Importação validada com dados fictícios em transação revertida, preservando metas.
- Verificação de segurança do Supabase sem alertas. O relatório de desempenho informou apenas índices ainda não usados, esperado em banco novo; eles foram mantidos para as consultas. [Referência do aviso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
- Navegador: login por perfil, filtros em lista e kanban, arrastar cartões, seletor de etapas, metas por loja e contato com follow-up, em 1440 px e 390 px; sem erros JavaScript ou transbordamento horizontal da página. Esta conferência de interface usou respostas simuladas; o isolamento foi testado separadamente no banco real.
- Dados reais da planilha, contas de login, envio real de e-mail e publicação na Vercel dependem dos passos acima. Nenhum dado de teste foi deixado no banco.

## Problemas comuns

**“Configure as variáveis Supabase…”**: confira os três nomes e faça novo deploy ou reinicie o servidor local.

**“Este usuário ainda não tem acesso ao CRM”**: a conta existe no Auth, mas ainda precisa ser vinculada a um perfil pelo comando `npm.cmd run users`.

**E-mail/senha incorretos**: use a senha da conta Supabase correspondente, não a senha compartilhada antiga nem uma chave API.

**“O banco já tem dados” ao importar**: o importador não sobrescreve operações existentes. Confira se alguém já começou a usar a versão nova. Preserve os dados antes de qualquer correção administrativa.

**Página com dados antigos após deploy**: confira se está na URL correta e atualize o navegador. Verifique se o projeto Vercel está conectado à nova pasta/revisão.

**Erro ao salvar após falha de rede**: use “Atualizar” e confira o histórico antes de repetir um cadastro. Contato, venda, agendamento e investimento usam identificadores de operação para evitar duplicação em reenvios do mesmo formulário.
