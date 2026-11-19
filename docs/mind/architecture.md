# 2T Mente — biblioteca pessoal (V1)

## Objetivo e navegação
A área "Mente" (/#/mente) é um espaço de conhecimento pessoal dentro da 2T, com ícone de conexões neurais no menu superior. Não copia a identidade visual do Obsidian. O design é monocromático, discreto e consistente com as outras áreas.

A primeira entrega implementa:
- Notas em texto simples, editáveis, com título, descrição, assunto e até 12 etiquetas.
- Importação de PDFs de até **25 MiB por arquivo**; valida o cabeçalho de PDF e rejeita arquivos fora do limite.
- Leitura ou download do PDF pelo visualizador do próprio navegador.
- Lista ordenada pela atualização, busca por metadados e conteúdo das notas, filtro por tipo, favoritos e assuntos.
- Exclusão com confirmação.
- Backup JSON com **conteúdo integral dos PDFs** e notas; restauração com validação prévia e mesclagem por ID; limite de 160 MiB para o arquivo de backup.
- Layout responsivo, navegação por teclado e teste Playwright de persistência/backup.

## Limitação de privacidade que não deve ser ocultada
**Não há backend de arquivos, cadastro, login, criptografia ou sincronização.** A V1 usa IndexedDB do navegador e perfil em que o usuário acessou a página. Outros usuários da mesma conta/perfil do navegador podem ler os dados. Modo anônimo, exclusão de dados do site ou mudança de dispositivo podem apagar ou tornar inacessíveis os registros. O uso de storage local não garante retenção permanente, inclusive em dispositivos com armazenamento sob pressão. Portanto, exportar backup é essencial.

Nenhum PDF, anotação, metadado ou arquivo é enviado automaticamente a um servidor. O backup JSON **não é criptografado**, e o conteúdo dos PDFs pode estar codificado em Base64 dentro do backup. Não colocar dados sigilosos em computador compartilhado; guardar backups em local protegido. Não criar endpoints públicos de upload no backend atual.

## Próxima versão: sincronização privada
Antes de oferecer acesso ao mesmo acervo no PC e celular:
1. Definir autenticação real (usuário individual) com sessões verificadas no backend; proteger todas as rotas e arquivos por proprietário. Não usar senha única estática exposta no frontend.
2. Escolher storage privado de documentos (objetos sem URLs públicas), controlar permissões por usuário, assinaturas de download com expiração curta, quotas e orçamento. Proteger contra IDOR, path traversal, malware e uploads abusivos.
3. Guardar metadados em banco privado com índices por assunto, texto, etiquetas e timestamps. Preferir uma camada de API que valide sempre a identidade do proprietário.
4. Planejar migração explícita da IndexedDB, sem upload automático e sem surpreender o usuário com cópia de arquivos pessoais para terceiros.
5. Adicionar política de backup, recuperação, exclusão completa e retenção. Avaliar criptografia em repouso e opção de criptografia ponta-a-ponta para conteúdos mais sensíveis.
6. Somente depois: links entre notas, busca por conteúdo de PDFs, grafos de conhecimento, fontes/citações, versões, anexos adicionais e eventual integração opcional com ChatGPT.

## Critério de liberação
A rota local-first pode ser pública como parte da interface 2T porque **cada visitante vê apenas o próprio armazenamento local**, sem dados iniciais e sem dados compartilhados da conta do proprietário do site. Isso **não** torna os arquivos do proprietário publicamente disponíveis, pois esses arquivos nunca são versionados no repositório. A implantação deve ser comunicada como **Mente V1 local**, nunca como nuvem privada ou "cofre seguro".

Executar typecheck, build e Playwright para testes da Mente. Validar ausência de regressão em homepage/navegação e que nenhum arquivo pessoal foi enviado ou commitado.
