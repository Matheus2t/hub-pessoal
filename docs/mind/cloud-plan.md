# 2T Mente — Supabase Cloud, lançamento controlado

## Estado atual

Este PR prepara autenticação única do administrador, RLS, bucket privado, sincronização de
notas e PDFs e migração explícita do IndexedDB. **NÃO HABILITAR A FLAG EM PRODUÇÃO AINDA**.
Os dois projetos Supabase existentes já têm outros objetivos. Criar um projeto dedicado
após definir a organização e confirmar eventual custo. Não aplicar SQL em projetos existentes.

## Provisionamento

1. Criar projeto Supabase EXCLUSIVO para a Mente na região sa-east-1, após autorização da
   organização/custo. Conferir estado ACTIVE_HEALTHY.
2. Desabilitar Sign Up público e autenticação anônima em Authentication > Providers.
   Criar um único usuário administrador pelo painel, sem incluir email/senha em commits.
3. Revisar e executar [supabase-bootstrap.sql](./supabase-bootstrap.sql) no projeto exclusivo;
   depois inserir manualmente o UID deste usuário em private.mind_admins, como indicado no script.
   Não cadastrar outros IDs.
4. Conferir RLS efetivamente habilitado; verificar que requests com anon key e usuários não
   administradores não conseguem listar, gravar ou baixar arquivos.
5. Definir variáveis da Vercel (produção) somente depois dos testes:
   MIND_CLOUD_ENABLED=true
   MIND_SUPABASE_URL=https://REF.supabase.co
   MIND_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... (PÚBLICA, não service_role).
   Rebuild é obrigatório, pois o frontend utiliza valores de compilação.
6. Verificar no site: Mente visível ao visitante, formulários privados não exibidos sem login,
   login da conta única, criar/editar/apagar nota, PDF, download, busca, backups e logout.
7. Migrar dados do IndexedDB SOMENTE mediante clique em "Migrar dados deste navegador" com
   administrador autenticado. A operação copia IDs ausentes e **não exclui os originais**.
   Se houver falha parcial, os dados continuam locais; backup prévio é recomendado.
8. Revisar budget, quotas de Storage e backup da base. Testar em PC e celular usando
   a mesma conta antes de considerar sincronização concluída.

## Limites e segurança

- Sem cadastro público e sem API com service_role no navegador. Admin determinado por tabela
  privada e função SECURITY DEFINER fora do schema exposto, usada por políticas RLS.
- PostgreSQL protege notas; Storage é privado por owner UID. O frontend mostra apenas a
  identificação de um endereço, não possui permissões elevadas.
- Sessão é armazenada por aba em sessionStorage. Tokens são legíveis por JavaScript:
  atualizar a CSP e mitigações de XSS antes de ativar dados confidenciais. A UI não é a
  fronteira de segurança: as regras RLS são obrigatórias.
- Os PDFs são validados por assinatura inicial no navegador, tipo e limite no Storage.
  Isto não equivale a antivírus ou análise de conteúdo. Não usar arquivos não confiáveis.
- O limite de PDF permanece 25 MiB; o plano Supabase também impõe quotas totais.
- A migração de outro projeto Supabase, a sincronização de alterações offline e E2EE não
  estão incluídos nesta primeira etapa. Backup JSON contém conteúdo legível.
- O Desencurtador privado para mais provedores será tratado depois: a autenticação não
  dispensa egress, SSRF e controle de requisições.

## Validação

No CI, rodar primeiro a build pública atual e testes da Mente local (sem alterar produção),
depois recompilar com URL e key **fictícias** para testar em Playwright o gate de login,
autorização negada, sessão da conta única e logout.

Não publicar se os testes falharem ou se o Supabase exclusivo não estiver configurado.
