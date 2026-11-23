# Backup protegido do PostgreSQL de produção da Mente

Este procedimento é manual, somente leitura na produção e limitado à branch `main`. O workflow **não executa migrations nem deploy**. Ele cria um dump lógico dos schemas de aplicação, valida uma restauração no Supabase descartável do runner e publica apenas o arquivo criptografado e seu checksum.

Para impedir deploy acidental, `vercel.json` desativa temporariamente o deploy automático da branch `main`. Essa trava deve permanecer até o backup e as validações de restauração serem concluídos; reative-a somente quando houver autorização para publicar.

## Escopo e limites

- O dump usa o fluxo documentado do Supabase CLI: roles personalizadas e somente os schemas `public` e `private`, com seus objetos e dados.
- A restauração compara, antes/depois, inventário de tabelas, funções, políticas RLS, chaves estrangeiras, definições de objetos e fingerprints de todas as tabelas em `public` e `private`.
- O CLI exclui schemas gerenciados pelo Supabase, como `auth` e `storage`, além dos schemas de extensões. O backup **não** contém bytes de objetos da Storage API. Não trate este artefato como backup integral de Auth, Storage ou arquivos do Drive.
- A validação comprova apenas a recuperação dos schemas de aplicação `public` e `private`; qualquer outro schema personalizado, os dados de Auth/Storage e arquivos da Storage API ficam fora deste procedimento. Não substitui o mecanismo de backup do serviço.
- Antes de qualquer migration, confirme que o artifact foi baixado e guardado fora do prazo curto de retenção. O artifact do Actions expira em 1 dia e tem limite rígido de 100 MiB.

## Proteção no GitHub

No repositório público, crie `Settings → Environments → New environment` com o nome exato `production-db-backup`.

Configure:

1. Deployment branches: somente `main`.
2. Required reviewer: um colaborador confiável diferente de quem dispara o workflow; ative **Prevent self-review**. Com essa opção, o próprio disparador não pode aprovar o job. Se não houver segundo revisor com acesso de leitura, não existe aprovação independente disponível nesta conta; não simule essa proteção.
3. Environment secrets, somente nesse environment:
   - `SUPABASE_DB_URL`
   - `BACKUP_ENCRYPTION_PASSPHRASE`

Não crie esses valores como repository secrets e não os coloque em workflow inputs, arquivos, variables públicos, logs ou chat. O repositório é público; mantenha a execução restrita ao workflow revisado em `main` e à aprovação do environment.

### `SUPABASE_DB_URL`

No painel do projeto Supabase `kadkcuumcahnqrvalloz`, abra `Connect → Session pooler` e copie a URI oferecida. Runners hospedados do GitHub são IPv4; no plano Free, a conexão direta do banco é IPv6. Use o Session pooler em modo de sessão, porta `5432`, nunca o modo transaction na porta `6543`.

Cadastre o valor como uma URI de uma linha, sem aspas ou espaços. Substitua o placeholder pela senha PostgreSQL recém-definida e aplique percent-encoding aos caracteres reservados da senha (`@` vira `%40`, por exemplo). A forma esperada é:

```text
postgresql://postgres.kadkcuumcahnqrvalloz:<senha-percent-encoded>@<host-exato-do-session-pooler>:5432/postgres?sslmode=require
```

Copie o host exatamente do Dashboard; não o deduza da região. O código recusa host que não seja pooler, outro project ref, banco diferente, porta diferente ou ausência de TLS. O valor inteiro, inclusive a senha, vai somente no campo **Secret value** de `SUPABASE_DB_URL`.

O secret existente pode continuar com `sslmode=require`. O script fixa `verify-full` para todas as conexões de origem e valida o hostname com a CA oficial do Supabase. Parâmetros adicionais da URI são descartados antes de chamar os clientes. A senha mantém o percent-encoding original.

### `BACKUP_ENCRYPTION_PASSPHRASE`

Gere uma senha aleatória no PowerShell local:

```powershell
$bytes = New-Object byte[] 48
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```

Cadastre a saída completa (uma linha, 64 caracteres Base64) como **Secret value** de `BACKUP_ENCRYPTION_PASSPHRASE`. Não reutilize a senha do banco. Preserve essa chave em seu gerenciador de senhas: sem ela, o artifact criptografado não pode ser restaurado.

## Execução e custo

Antes da execução, confira `Settings → Billing → Usage`: o plano GitHub Free inclui 500 MB de armazenamento Actions/Packages compartilhado. O job limita o artifact a 100 MiB e o retém por 1 dia; se não houver espaço incluído suficiente, não execute até liberar quota. Standard runners são gratuitos neste repositório público; não há projeto Supabase adicional nem serviço pago.

### Preflight independente da conexão

O run 11 registrou rejeição da senha. Os runs 12 e 13 terminaram com exit 2 do `psql`, sem detalhe suficiente para determinar a camada. O rótulo Docker do run 10 veio de um classificador que também recebia erros do PostgreSQL.

O run 14 falhou na verificação TLS antes de iniciar o `psql`. A mesma falha foi reproduzida no Session Pooler de São Paulo sem autenticação. O pooler respondeu ao PostgreSQL `SSLRequest` e negociou TLS 1.3, mas o OpenSSL rejeitou a cadeia com a lista padrão de CAs. O OpenSSL e o preflight Node passaram ao usar a [CA oficial do Supabase](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt). A CA versionada tem fingerprint SHA-256 `807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa`, conferido nos testes. Ao trocar a CA, obtenha o certificado no painel e confira o fingerprint antes de atualizar o arquivo e o teste.

O preflight agora separa as verificações sem registrar endpoint, IP, usuário, URI ou saída bruta:

1. configuração da URI e modo Session Pooler;
2. resolução DNS e abertura TCP;
3. PostgreSQL `SSLRequest`, negociação TLS 1.2+ e validação do certificado com a CA do Supabase;
4. execução read-only de `SELECT 1` por `psql` usando `verify-full` e a mesma CA usada no dump;
5. classificação do tenant/role Supavisor quando a autenticação retorna uma mensagem compatível.

O run 15 confirmou TLS 1.3 e o certificado no runner. O `psql` no contêiner encerrou depois com exit 2 antes do dump. O preflight e as consultas de verificação da origem usam agora o `psql` nativo do runner, com host, porta, usuário, banco e CA passados separadamente. O libpq recebe a senha decodificada uma vez pela variável `PGPASSWORD`. Isso permite testar a sessão sem a interpretação da URI pelo shell do contêiner e sem baixar imagens para o preflight. O contêiner ainda é usado para a restauração descartável.

Falhas de processo analisam stdout e stderr apenas em memória. Assinaturas conhecidas são convertidas em categorias fixas e SQLSTATE quando disponível. Para falhas desconhecidas, o log contém UUID de diagnóstico, estágio, código de saída, tamanhos dos dois fluxos e código de spawn permitido; nunca imprime o texto original.

`VERBOSITY=verbose` é uma variável válida do `psql`, mas não torna o diagnóstico inicial garantidamente verboso: na inicialização, o hook só chama `PQsetErrorVerbosity` quando já existe uma conexão, enquanto a tentativa inicial ainda está criando essa conexão. Por isso o preflight não depende dessa variável para obter SQLSTATE. As camadas independentes distinguem DNS/TCP/TLS; o `psql` permite classificar autenticação e mensagens Supavisor quando as apresenta. Uma resposta sem assinatura reconhecida continua explicitamente inconclusiva, com UUID e metadados sanitizados.

Referências: a documentação do [exit status do `psql` 17](https://www.postgresql.org/docs/17/app-psql.html#APP-PSQL-EXIT-STATUS) define 2 como conexão interrompida não interativa; a documentação de [variáveis especiais](https://www.postgresql.org/docs/17/app-psql.html#APP-PSQL-VARIABLES) descreve `VERBOSITY`; e o [código oficial de inicialização do psql](https://doxygen.postgresql.org/bin_2psql_2startup_8c_source.html) mostra que o hook chama `PQsetErrorVerbosity` apenas se `pset.db` já existe. O `psql` cria a conexão inicial antes de ter esse `PGconn` disponível ao hook.

1. Para uma verificação isolada, abra `Actions → Protected Supabase production backup and restore check`, selecione a branch `main` e escolha `preflight`.
2. Aprove o job no environment protegido `production-db-backup`, conforme as regras configuradas nele.
3. O `preflight` executa somente as camadas acima e `SELECT 1`; não usa a chave de criptografia, não inicia Supabase descartável, não faz dump, não grava no banco e não cria artifact.
4. Se falhar, use somente a etapa/categoria/SQLSTATE sanitizados para identificar a correção. Não redefina senha por tentativa e não copie URI ou saída bruta para logs ou chat.
5. A operação `backup` repete o mesmo preflight e só então inicia dump e restauração descartável. Escolha `backup` quando estiver pronto para concluir o fluxo em uma única execução manual; se o preflight falhar, nenhum dump será iniciado.

### Backup e restauração

Na execução `backup`:

1. Abra `Actions → Protected Supabase production backup and restore check`.
2. Clique `Run workflow`, selecione `main` e escolha `backup`.
3. Aprove o job no environment `production-db-backup`.
4. Aguarde `backup-restore` concluir. Sucesso significa que o CLI conectou ao projeto correto, gerou os dumps, criptografou o pacote e restaurou no Supabase descartável sem diferenças nos fingerprints/metadados comparados.
5. Baixe imediatamente o artifact `mind-production-backup-<run_id>` e armazene-o em um local privado e durável. O artifact expira após 1 dia. Ele contém somente o arquivo `.tar.gz.gpg` e seu checksum; relatórios não são publicados e nenhum SQL plaintext é enviado como artifact. O workflow falha se qualquer arquivo esperado estiver ausente.
6. Mantenha `BACKUP_ENCRYPTION_PASSPHRASE` no GitHub Environment e no gerenciador de senhas. Não envie o artifact ou a senha em um issue público.

O repositório é público: pessoas com acesso de leitura podem baixar artifacts do Actions. Por isso o arquivo é criptografado com AES-256 e a chave aleatória é mantida fora do artifact e do repositório. Trate o artifact como público e preserve a chave privadamente.

O job cria uma stack Supabase efêmera, com Auth e PostgREST locais e sem migrations ou dados semeados, restaura nela em uma única transação e a destrói ao terminar. A restauração nunca se conecta à produção. Um erro de conexão/restore falha o workflow e não autoriza migration ou deploy.

A verificação cobre a estrutura e os registros de `public` e `private`. A checagem dos serviços descartáveis confirma que Auth e PostgREST respondem. Para recuperar o projeto inteiro, preserve separadamente os dados e a configuração de Auth, os metadados e bytes do Storage e os arquivos do Google Drive. Referências dos registros restaurados a esses dados só poderão funcionar após a recuperação das fontes correspondentes. Guarde a chave de cifragem do Drive separadamente caso o ledger de tokens já esteja presente no banco.

## Recuperar o artefato depois

O ZIP baixado do Actions contém o backup criptografado e um arquivo `.sha256`. Guarde o ZIP e a senha de criptografia em meios separados, ambos sob seu controle. O artifact temporário do GitHub não substitui essa cópia durável.

No PowerShell, após extrair o ZIP, valide o arquivo antes de descriptografar:

```powershell
$backup = (Resolve-Path .\mind-production-public-private-backup.tar.gz.gpg).Path
$checksum = (Get-Content "${backup}.sha256" -Raw).Trim().Split(' ')[0].ToLowerInvariant()
$actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $backup).Hash.ToLowerInvariant()
if ($actual -ne $checksum) { throw 'Checksum inválido; não restaure este arquivo.' }
```

Crie a pasta de extração e descriptografe com o GPG instalado, que solicitará a senha pelo pinentry (não passe a senha como argumento nem a cole em um comando):

```powershell
New-Item -ItemType Directory -Force .\restaurado | Out-Null
gpg --decrypt --output .\backup.tar.gz $backup
tar -xzf .\backup.tar.gz -C .\restaurado
```

Restaure **somente em um banco descartável/isolado** compatível com PostgreSQL 17 e com os roles do Supabase. Aponte `LOCAL_DB_URL` exclusivamente ao endpoint desse banco e execute o mesmo comando transacional do workflow: `psql "$LOCAL_DB_URL" -X --single-transaction --variable ON_ERROR_STOP=1 --file .\restaurado\roles.sql --file .\restaurado\schema.sql --command 'SET session_replication_role = replica' --file .\restaurado\data.sql`. Confirme que host/porta são os do banco isolado antes de executar. Este artefato e estas instruções não autorizam restauração direta em produção; uma recuperação de produção requer um plano separado, janela aprovada e credenciais/roles revisados.

Apague SQL e dados descriptografados com segurança depois da validação e mantenha apenas o arquivo criptografado, checksum e a senha guardados separadamente. A remoção lógica não garante apagamento físico em SSD; use disco com criptografia integral.

O status local deste runbook não certifica execução remota. Registre aqui o SHA, o resultado do Actions, contagens agregadas sem nomes de tabelas e o resultado da restauração apenas após consultar o run real.

## Fontes oficiais

- [Backup e restauração com Supabase CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Backups Supabase](https://supabase.com/docs/guides/platform/backups)
- [Conexão PostgreSQL e modos IPv4/IPv6](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [GitHub Environments e secrets](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
- [GitHub Actions usage e armazenamento](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
