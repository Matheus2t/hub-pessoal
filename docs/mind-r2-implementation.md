# Mente — Cloudflare R2: implementação e ativação

## Estado

A integração usa um Worker Cloudflare com binding privado do bucket R2 e um Durable Object SQLite global como ledger de cota. O frontend permanece desativado para R2 até receber `MIND_R2_ENABLED=true` e uma origem HTTPS válida em `MIND_R2_WORKER_URL`. Sem esses valores, MP4s seguem no fluxo Supabase existente, limitado a 50 MB.

**R2 não foi implantado nem testado na conta real.** Esta máquina não tem autenticação Cloudflare/Wrangler, nome do bucket, URL do Worker ou variáveis do projeto Vercel. Não foram criados recursos, alterada produção, aplicada migração remota nem iniciada cobrança.

## Fluxo e garantias

- O navegador autentica pelo Supabase Auth existente. O Worker valida o JWT em `/auth/v1/user` e chama `mind_is_admin()`; nenhum `service_role` ou segredo permanente do R2 chega ao navegador.
- O upload é dividido em partes de 16 MiB, transmitidas ao Worker como streams, sem materializar o arquivo inteiro. O R2 aceita multipart retomável; 16 MiB respeita o mínimo de 5 MiB e fica abaixo do limite de corpo de 100 MiB do Workers Free.
- A retomada guarda somente o idempotency key e um capability aleatório em `sessionStorage`; o mesmo arquivo, conta e item retomam as partes confirmadas. Cada parte tem contagem exata de bytes, trava no ledger e retry. Cancelamento só libera a reserva após o R2 confirmar abort/ausência; estados incertos falham fechados.
- `StorageControl` serializa reservas em transação SQLite: ocupação inventariada + reservas ativas + novo arquivo não podem ultrapassar 5.000.000.000 bytes. A conclusão compara o tamanho real do objeto com o reservado antes de publicá-lo. Uma falha de ledger pode reter espaço a mais, nunca liberar espaço por estimativa.
- O inventário inicial enumera todos os objetos concluídos do bucket, inclusive órfãos, antes de permitir uploads. O bucket precisa ser dedicado. A listagem de objetos não enumera partes multipart incompletas iniciadas por ferramentas externas; use bucket novo/sem multiparts existentes e mantenha a política nativa de expiração. A integração não controla operações feitas diretamente fora do Worker.
- O Worker publica apenas chaves com ledger marcado como publicado e serve `GET`, `HEAD`, `Range`, `206`, `416` e download. Vídeos antigos Supabase e links YouTube/Vimeo mantêm seus caminhos atuais. PDFs, notas, pesquisa, filtros e backups continuam no Supabase/manifesto v3. MP4 R2 nunca é convertido para Base64 nem acumulado em um Blob de backup; o manifesto solicita download separado.
- Exclusão libera a cota somente depois de confirmar ausência no R2 e remover o objeto do ledger. Em caso de falha, a contagem fica conservadora e novos uploads podem ficar bloqueados até reconciliação.

## Arquivos e configuração

- Worker: `workers/mind-r2/src/index.ts`, `protocol.ts`, `wrangler.toml`.
- Cliente: `frontend/src/mind/r2-config.ts`, `r2-upload.ts`, adaptadores em `cloud-auth.ts`, `cloud-store.ts` e `page.ts`.
- Banco: `supabase/migrations/20261120170000_mind_r2_total_storage.sql` acrescenta o provedor e mantém o teto antigo dos arquivos Supabase.
- CSP: `scripts/write-index.cjs` inclui somente a origem HTTPS exata do Worker quando R2 está explicitamente habilitado.

Para ativação, na conta correta:

1. Criar um bucket R2 **novo e exclusivo** para a Mente; não apontar para bucket usado por outras aplicações. Confirmar que não há uploads multipart externos pendentes.
2. Aplicar em preview primeiro a migração Supabase do PR #201 e depois a migração R2 desta branch. Não aplicar à produção antes de validar constraints e o fluxo completo.
3. Instalar/autenticar Wrangler interativamente na conta proprietária e substituir o nome do bucket em `wrangler.toml`. Configurar `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `ALLOWED_ORIGINS` no ambiente Worker. Não configurar `service_role`.
4. Publicar `workers/mind-r2` com Wrangler e registrar a origem `https://<worker>.<subdominio>.workers.dev`. O endpoint `r2.dev` não é usado.
5. Fazer um inventário no deployment de teste e confirmar os objetos, reservas, limite e playback por Range antes de habilitar o frontend.
6. Somente então definir na prévia Vercel `MIND_R2_ENABLED=true` e `MIND_R2_WORKER_URL=https://<worker>.<subdominio>.workers.dev`, permitindo essa origem em `ALLOWED_ORIGINS`; habilitar a migração/deploy após homologação. Não usar wildcard de origem.

## Custos e limites atuais (verificados em 20 nov. 2026)

- R2 Standard inclui atualmente 10 GB-mês, 1 milhão de operações Class A e 10 milhões Class B por mês; egress é gratuito. O teto da aplicação, 5 GB decimal, cabe na franquia de armazenamento se o bucket não tiver outro uso, mas operações podem exceder a franquia e gerar cobrança conforme a conta/configuração.
- Workers Free: 100.000 requisições por dia, 10 ms de CPU por requisição, 128 MB e corpo de requisição máximo de 100 MB. O upload usa partes de 16 MiB. Os limites podem interromper o serviço; não são garantia de tráfego ilimitado.
- Durable Objects SQLite Free: 100.000 requests/dia, 5 milhões de linhas lidas/dia, 100.000 escritas/dia e 5 GB de dados SQLite totais. O ledger guarda metadados, não os vídeos. Exceder franquias pode fazer operações falharem. Não foi configurado limite financeiro/alerta na conta.
- O teto de 5 GB limita espaço gerido pela aplicação, não garante custo total zero. Só habilitar após confirmar as condições de cobrança e monitorar R2, Worker e Durable Object.

## Validações locais

`npm run test:mind` cobre aritmética decimal, inventário e órfãos, reserva concorrente, idempotência, bloqueio de upload acima da cota, locks de partes/cancelamento, Range/206 e rejeição de usuário anônimo, não-admin e origem não autorizada. Também testa o cliente com blocos exatos de 16 MiB, progresso enviado/confirmado, retomada de parte já confirmada, cancelamento confirmado e bloqueio local acima de 5 GB. O Worker transmite fluxos sintéticos de 100 MB e 1 GB através de mocks de R2, completa, publica após referência no banco, responde Range e remove os objetos sem guardar o vídeo inteiro em memória. Esses testes controlados validam o protocolo e o streaming do código, mas não são transferência nem homologação real na Cloudflare. A integração real ainda requer um MP4 descartável pequeno em bucket de teste.

Antes de marcar a funcionalidade operacional ainda faltam: publicar o Worker na conta Cloudflare, criar e inventariar o bucket, aplicar a migração em preview, configurar origem no Vercel preview, testar upload/resume/cancel/playback/delete reais e confirmar métricas e cobrança. A Vercel produção e o domínio oficial não foram alterados.
