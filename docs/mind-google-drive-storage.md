# Mente: armazenamento de MP4 no Google Drive

## Estado desta branch

Esta implementação substitui R2 no código derivado da integração de Mente do PR #201. O PR #203 está aberto como draft sobre a branch do #201; o PR #202 foi marcado como substituído e fechado sem merge depois que o código novo ficou preservado no PR próprio. Não há configuração em produção. A migração SQL está criada, mas **não foi aplicada**. A prévia real do Google Drive depende de configurar o cliente OAuth e executar um teste com uma conta autorizada.

## Arquitetura

- O administrador autentica na Mente via Supabase Auth; o backend confirma `mind_is_admin()` em cada operação.
- OAuth Google roda no FastAPI. A aplicação pede `drive.file` e identidade básica; o `client_secret` fica no servidor.
- `refresh_token` e URI de sessão retomável são cifrados com AES-GCM, usando chave de 32 bytes em Base64 fora do banco. Estado OAuth é assinado, nonce preso a cookie HttpOnly de 10 minutos, e origem limitada a allowlist HTTPS (HTTP apenas loopback).
- O backend reserva o tamanho de forma serializada no Supabase/Postgres. O limite 2T é exatamente 5.000.000.000 bytes; o envio também exige cota Google consultável. Os blocos são enviados pelo navegador diretamente à URI de upload resumível do Google, em múltiplos de 256 KiB (8 MiB neste cliente), sem encaminhar o conteúdo MP4 pela função Vercel.
- Conclusão compara o objeto real (ID, tamanho, MIME, `appProperties`, pasta e estado) à reserva. Reconciliar o inventário recupera conclusões sem resposta, contabiliza órfãos e expira reservas antigas.
- A publicação aplica `anyone:reader` apenas depois da ação explícita de publicar, e só no arquivo selecionado. O player usa a prévia do Drive e oferece abertura externa; não promete URL direta de mídia, transcodificação, streaming ilimitado nem disponibilidade contínua.

## Variáveis do backend

Configurar somente no ambiente privado do serviço FastAPI:

- `MIND_GOOGLE_DRIVE_ENABLED=true`
- `MIND_SUPABASE_URL` e `MIND_SUPABASE_PUBLISHABLE_KEY`
- `MIND_SUPABASE_SERVICE_ROLE_KEY` (somente servidor)
- `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REDIRECT_URI`
- `MIND_GOOGLE_TOKEN_ENCRYPTION_KEY` (32 bytes em Base64 URL-safe)
- `MIND_GOOGLE_DRIVE_ALLOWED_ORIGINS` e `API_CORS_ORIGINS`, com as mesmas origens HTTPS autorizadas; loopback HTTP só para desenvolvimento local.

No build frontend, `MIND_CLOUD_ENABLED`, `MIND_GOOGLE_DRIVE_ENABLED`, `MIND_SUPABASE_URL` e `MIND_SUPABASE_PUBLISHABLE_KEY` habilitam a interface e acrescentam CSP somente para os hosts usados.

Criar um cliente OAuth Web no Google Cloud e registrar exatamente o callback configurado. A aplicação usa o escopo não sensível `drive.file`, que permite criar e gerenciar arquivos criados/abertos pelo app, sem acesso geral ao Drive. A documentação do Google ainda prevê verificação básica de OAuth para aplicações públicas que solicitem escopos de dados; a elegibilidade final do app pessoal depende da configuração do consentimento. Em modo **Testing** para usuário externo de teste, a autorização expira após sete dias, inclusive o refresh token; esse modo não atende a uso contínuo. Consulte [escopos e verificação](https://developers.google.com/workspace/drive/api/guides/api-specific-auth) e [regras de audiência do OAuth](https://support.google.com/cloud/answer/15549945?hl=en).

## Migração, compatibilidade e rollback

`20261120191900_mind_google_drive_storage.sql` é aditiva para credenciais, reservas e inventário; mantém os objetos existentes no Supabase Storage e o limite legado de 50 MB quando Drive está desativado. Não aplicar até a prévia passar e um backup do banco estar disponível. O banco oficial continua Supabase/Postgres nesta área, conforme a implementação já existente.

Backups JSON v1/v2 e MP4/PDF legados continuam sendo lidos. Backup v3 pode conter o identificador e metadados do Drive, mas **não os bytes do vídeo**; `assetsComplete=false` avisa que a cópia não é autossuficiente. Faça cópia independente dos MP4 no Drive.

Para rollback antes da migração, desabilitar a flag e reverter o deployment mantém o caminho legado. Depois de aplicar a migração/publicar vídeos no Drive, não remover colunas, permissões ou a conexão: os registros dependem dos arquivos externos. O PR #202 foi fechado como substituído pelo #203; seu conteúdo R2 não foi incorporado.

## Validações pendentes para homologação real

No desenvolvimento local, mocks verificam a reserva/upload em blocos, retomada protocolar, publicação, cota e limpeza de órfão. Eles **não provam** CORS real do endpoint resumível, OAuth, permissão `anyone:reader`, preview anônimo, limites de conta, transcoding nem reprodução real. O Client ID e o Client Secret estão cadastrados como Sensitive no Preview do projeto Vercel; seus valores não foram consultados. Nenhum fluxo OAuth ou migração foi executado.

Antes de ativar o flag em qualquer ambiente compartilhado: configurar OAuth, aplicar migração em ambiente de teste, conectar conta não sensível, enviar um MP4 pequeno real, confirmar cota, reabrir preview em janela anônima, excluir um órfão de teste e verificar que desconectar não apaga arquivos. Medir também CORS/Range e retomada após interromper a rede. Só então avaliar produção.

## Verificações locais desta branch (2026-11-20)

- Build com as flags de Cloud e Drive ligadas para a fixture Supabase: aprovado; inclui typecheck e build JS/CSS.
- `npm run test:mind`: 6/6 aprovados, incluindo CSP fechada por padrão e opt-in explícito.
- Playwright Edge, `mind-google-drive.spec.ts`: 2/2 aprovados com mocks; cobre painel administrativo/orphan, envio direto em blocos de 8 MiB, publicação e prévia. Não é uma conexão Google real.
- Playwright Edge, `mind-cloud.spec.ts`: 25/25 aprovados com Drive desligado, cobrindo compatibilidade do fluxo Supabase Storage, uploads retomáveis, PDFs, backups e temas/responsividade.
- `git diff --check`: sem erros de whitespace; apenas avisos de conversão LF/CRLF do Git no Windows.
- Os testes Python não foram executados porque não há interpretador Python instalado (o comando aponta para o alias da Microsoft Store). A migration não foi aplicada nem validada em PostgreSQL: `psql` e Supabase CLI não estão disponíveis neste ambiente.
- Sem fluxo OAuth real no Preview, não foram testados sessão/reserva/CORS real do Google, permissão pública, cota real da conta, preview anônimo nem reprodução. A integração permanece sem ativação em produção.

O upload resumível segue o protocolo oficial: blocos em múltiplos de 256 KiB e sessão que expira após uma semana; validar a sessão real antes de operação contínua ([guia de upload](https://developers.google.com/workspace/drive/api/guides/manage-uploads)).

## Retomada da homologação (2026-11-21)

- Corrigido `frontend/tests/mind.spec.ts` para validar o contrato real do backup v3: nome e manifesto, PDF sidecar byte a byte, ausência de bytes falsamente embutidos, exclusão e restauração. A cobertura de v1/v2 e compatibilidade de vídeo está nos testes existentes de `mind-cloud.spec.ts`.
- A Vercel confirma que Client ID/Secret estão no alvo Preview, sem escopo por branch. `MIND_SUPABASE_URL`, publishable key e `MIND_CLOUD_ENABLED` existentes estão restritos à branch do PR #201; não foram copiados. Não há `MIND_SUPABASE_SERVICE_ROLE_KEY` nem ambiente Supabase isolado para a branch Google Drive.
- O projeto `matheus2t` não tinha Preview para `codex/mind-google-drive-5gb`; `vercel.json` agora habilita somente essa branch, mantendo `main` habilitada e o padrão `**` desabilitado. Isso usa `git.deploymentEnabled` oficialmente suportado, não um deploy manual ou bypass. O Preview resultante não deve ser tratado como homologação do backend até receber um banco isolado e variáveis exclusivas de Preview.
- A rota FastAPI `/api/mind-drive/google/callback` corresponde ao caminho OAuth registrado pelo código. Ainda não existe URI de Preview confirmada: só deve ser cadastrada no Google Cloud depois de obter a URL real do deployment.
- A migration `20261120191900` continua sem execução. Não há Docker daemon nem `psql` neste ambiente; criar Supabase branch pode gerar custo e não foi feito. Uma consulta agregada anterior encontrou 2 registros PDF e nenhum conflito com as novas restrições, mas isso não substitui aplicar e testar a migration num PostgreSQL isolado.
- O Supabase Security Advisor sinaliza `private.mind_admins` sem RLS. Não alteramos essa política automaticamente, pois a tabela é preexistente e habilitar RLS sem política validada pode bloquear o acesso administrativo.
- Produção permanece sem alteração. O preview, o OAuth real, upload/retomada, permissão pública, reprodução anônima, exclusão no Drive e liberação de espaço continuam pendentes de staging seguro e teste com um MP4 descartável.
### Testes locais da retomada

- `npm run build` com Mente desativada: aprovado (typecheck + JS/CSS).
- `npm run test:mind`: 6/6 aprovados.
- Playwright Edge `mind.spec.ts`: 8/8 aprovados; inclui backup v3 e restauração do PDF sidecar.
- Playwright Edge `mind-cloud.spec.ts`: 25/25 aprovados, incluindo backup v3, sidecar e importação de backups v1/v2.
- Build com Mente Cloud e Drive habilitados usando projeto/chave fictícios: aprovado (typecheck + JS/CSS).
- Playwright Edge `mind-google-drive.spec.ts`: 2/2 aprovados com interceptação/mocks. Nenhum teste foi conexão Google real.
- Playwright iniciado dentro do sandbox falhou antes dos cenários por encerramento do processo Edge/Crashpad; a mesma suíte foi repetida com a execução autorizada fora do sandbox e passou. Não contabilizado como falha de código.
- Workflow PostgreSQL 17 efêmero recém-adicionado; resultado aguardando execução no GitHub Actions.
