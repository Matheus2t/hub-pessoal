# 2T Mente — estado operacional da nuvem

Atualizado em 2026-11-19. Este documento descreve o comportamento implantado; não é um
plano para criar outro projeto nem para reconfigurar recursos existentes.

## Recursos atuais

- Supabase existente `2T'Site`, na região `sa-east-1`.
- `public.mind_items`: RLS ativo; visitantes têm SELECT público, sem grants de INSERT,
  UPDATE ou DELETE para `anon`. As três mutações têm políticas de administrador e
  verificação de `owner_id`.
- `private.mind_admins`: uma identidade administrativa autorizada. A função de verificação
  é `SECURITY DEFINER`, fica no schema privado e usa `search_path` vazio.
- Storage `mind-pdfs`: público para leitura; somente a política administrativa pode gravar,
  substituir ou excluir. Limite de 25 MiB e MIME `application/pdf`.
- A interface 2T não implementa cadastro público. A opção de signup no provedor Auth não foi
  inspecionada nesta auditoria; confirme-a no painel antes de futuras mudanças de acesso.
  Credenciais e sessão do administrador nunca são exibidas ou gravadas em backups.

Uma auditoria read-only de 2026-11-19 confirmou o bucket público, RLS, grants e políticas,
uma identidade administrativa configurada, um objeto PDF vinculado ao respectivo registro
e nenhum objeto órfão naquele momento. A auditoria não leu nem reproduziu conteúdo textual
dos documentos. As linhas e os arquivos atuais são públicos por decisão do produto.

## Variáveis da Vercel

O projeto correto é `matheus2t`, associado a `matheus2t.com.br`. As variáveis de produção
necessárias são `MIND_CLOUD_ENABLED`, `MIND_SUPABASE_URL` e
`MIND_SUPABASE_PUBLISHABLE_KEY`. A publishable key é pública e pode estar no bundle; a
`service_role` e senhas nunca podem estar presentes no frontend. A build habilita a Mente
Cloud somente com flag, origem Supabase HTTPS exata e prefixo de publishable key válidos.

O HTML gerado permite essa origem exata em `connect-src` e `frame-src`; a build pública também
omite o modo IndexedDB. Se a configuração cloud faltar, a biblioteca pública falha fechada e
não apresenta dados locais como publicados. Builds de desenvolvimento continuam usando
IndexedDB e mostram o aviso de biblioteca local.

## Fluxos e recuperação

- Leitura de notas/PDFs e download público não enviam bearer token de administrador.
- Antes de mutações, a aplicação consulta o registro com a sessão atual; o resultado ainda é
  protegido por RLS. O login valida identidade e permissão administrativa.
- PDF substituto é enviado para um caminho único; após confirmação da linha, o anterior é
  removido somente se nenhuma linha ainda o referenciar.
- Upload cuja gravação no banco falhe é removido somente após confirmar que não tem vínculo.
  Se a consulta de vínculo falhar, o arquivo é preservado e a UI informa que precisa revisão.
- Exclusões removem primeiro a linha e, depois, o Storage. Se a segunda etapa falhar, a UI
  informa que o arquivo público ficou pendente de limpeza. Não há varredura destrutiva
  automática de objetos órfãos.
- Restauração na nuvem atualiza itens pelos IDs do backup; após falha parcial, mostra quantos
  foram salvos. Reimportar o mesmo backup não duplica IDs. O IndexedDB de origem é mantido.
- Backups contêm notas e bytes completos dos PDFs, não são criptografados e exigem guarda
  segura. O limite do JSON de backup permanece 160 MiB.

## Verificação e pendências

Testes locais Playwright usam uma API simulada e não comprovam credenciais de produção.
Na validação local desta correção: build/typecheck passaram nos modos local, cloud de teste e
público sem cloud; Playwright passou 8 testes locais, 14 testes de cloud simulada e 1 teste
de build público sem cloud; os 4 testes unitários de geração/validação da CSP passaram.
O teste de produção permanece pendente até o deployment desta correção.
Antes desta correção, a produção retornava HTML e PDF válidos, mas sua CSP não autorizava
o host Supabase em `frame-src`, bloqueando o iframe. A resposta real do PDF não incluía
`X-Frame-Options` nem `frame-ancestors` restritivo e tinha MIME `application/pdf`. O smoke
test pós-deploy é somente de leitura: verifica biblioteca anônima, resposta PDF real, prévia,
download e abertura externa. Login real exige interação do administrador e não é automatizado
sem credenciais.

O advisory do Supabase informou que a proteção contra senhas vazadas está desabilitada.
Esse endurecimento deve ser avaliado no painel Auth; não foi alterado pelo código.
Nenhum backup/restore, upload, edição ou exclusão foi executado contra os dados de produção
durante a auditoria.
