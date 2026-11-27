# 2T Mente — arquitetura em produção

## Modelo de acesso

`/#/mente` é uma biblioteca pública com administração privada. Visitantes, sem login,
podem consultar todos os metadados, notas e PDFs publicados. A própria interface avisa
que esse conteúdo é público; links diretos dos PDFs também funcionam sem autenticação.
Publique somente materiais autorizados para distribuição pública.

O projeto Supabase existente `2T'Site` mantém `public.mind_items` com RLS ativo. A política
`mind_public_read` autoriza somente leitura pública. As operações de escrita e o Storage
dependem da identidade autenticada e da função administrativa privada; a UI não é a
fronteira de segurança. O cliente web contém apenas a publishable key. Nunca colocar
`service_role`, senha ou UID administrativo no bundle, nos testes ou neste repositório.

O bucket `mind-pdfs` é público, aceita `application/pdf` e limita arquivos a 25 MiB.
Consequentemente, todo objeto nele pode ser lido por qualquer pessoa que possua o link.
Excluir o item do catálogo também tenta remover o arquivo; se a limpeza falhar, a interface
informa que o PDF ainda pode estar publicado.

## Aplicação e persistência

- Com a configuração de nuvem de produção válida, leitura vem do Supabase sem sessão;
  login administrativo é necessário para criar, editar, favoritar, excluir, migrar ou
  exportar/restaurar backup do acervo publicado.
- A autorização é revalidada no Supabase. Uma conta que não consta na lista privada de
  administradores não recebe controles de escrita, e RLS/Storage continuam bloqueando-a.
- Em desenvolvimento e builds locais, sem configuração da nuvem, a aplicação usa IndexedDB
  e identifica explicitamente **Biblioteca local**. Em build público sem configuração válida,
  falha fechada: não lê rascunhos locais nem oferece controles de edição como se fossem
  conteúdo compartilhado.
- A migração local é explícita, copia IDs ainda ausentes e conserva os originais locais.
- Backups JSON incluem os PDFs, não são criptografados e devem ser guardados com cuidado.

## PDFs

A prévia usa o visualizador PDF nativo do navegador dentro de um `iframe`; os controles
compatíveis do próprio navegador oferecem navegação de páginas e zoom. O botão **Expandir
leitura** amplia o painel e mantém **Voltar à biblioteca** para restaurar a navegação. O build
de nuvem acrescenta à CSP somente a origem Supabase configurada em `connect-src` e `frame-src`.
Antes de criar o iframe, uma requisição HEAD pública valida disponibilidade, MIME e tamanho;
em erro, a interface explica o problema e mantém a abertura externa e o download disponíveis.
O link externo abre o URL público diretamente. O download anônimo busca o PDF público,
valida status, tipo, tamanho e assinatura antes de iniciar o download pelo nome original.
Se a prévia nativa não estiver disponível, o usuário pode abrir o arquivo em uma nova aba.

Uploads de substituição usam um caminho novo no Storage e só depois atualizam o registro;
assim, uma falha de banco não sobrescreve o PDF publicado anterior. A limpeza de objetos
antigos ou não vinculados só ocorre após consulta confirmando que nenhum registro aponta
para eles. Se não for possível confirmar o vínculo, o arquivo é preservado e a interface
indica a pendência, evitando exclusão de um objeto ainda usado.

## Manutenção e limites

- Projeto, banco, bucket e permissões não devem ser copiados de outro projeto Supabase.
- `docs/mind/public-read-admin-write.sql` registra a mudança já aplicada; não executar
  novamente manualmente em produção.
- `docs/mind/supabase-bootstrap.sql` foi desativado como script porque representava o
  modelo privado anterior e tornaria o bucket privado se executado.
- O advisory atual do Supabase também recomenda habilitar a proteção contra senhas vazadas
  no Auth. Essa configuração não foi alterada nesta revisão; verificar no painel antes de
  futuras mudanças de credencial administrativa.
