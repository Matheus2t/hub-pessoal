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

`sslmode=require` cifra o tráfego PostgreSQL, mas não valida o nome do host contra uma CA local. O domínio é limitado ao pooler Supabase e deve ser copiado do painel; esta etapa não configura pinning de certificado.

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

Depois de configurar o environment e secrets:

1. Abra `Actions → Protected Supabase production backup and restore check`.
2. Clique `Run workflow` e selecione `main`.
3. Aprove o job no environment `production-db-backup`.
4. Aguarde `backup-restore` concluir. Sucesso significa que o CLI conectou ao projeto correto, gerou os dumps, criptografou o pacote e restaurou no Supabase descartável sem diferenças nos fingerprints/metadados comparados.
5. Baixe imediatamente o artifact `mind-production-backup-<run_id>` e armazene-o em um local privado e durável. O artifact expira após 1 dia. Ele contém somente o arquivo `.tar.gz.gpg` e seu checksum; relatórios não são publicados e nenhum SQL plaintext é enviado como artifact. O workflow falha se qualquer arquivo esperado estiver ausente.
6. Mantenha `BACKUP_ENCRYPTION_PASSPHRASE` no GitHub Environment e no gerenciador de senhas. Não envie o artifact ou a senha em um issue público.

O repositório é público: pessoas com acesso de leitura podem baixar artifacts do Actions. Por isso o arquivo é criptografado com AES-256 e a chave aleatória é mantida fora do artifact e do repositório. Trate o artifact como público e preserve a chave privadamente.

O job cria uma stack Supabase efêmera, com Auth e PostgREST locais e sem migrations ou dados semeados, restaura nela em uma única transação e a destrói ao terminar. A restauração nunca se conecta à produção. Um erro de conexão/restore falha o workflow e não autoriza migration ou deploy.

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
