# Interface local do Desencurtador — Fase 3

## Fluxo

`Lit (/#/utilitarios/desencurtador) → GET capabilities → POST /api/utilities/links/resolve → política SSRF/DNS → transporte com IP fixado e TLS validado → resposta tipada`

A tela só habilita a análise quando as flags de frontend e backend confirmam a prévia local. A compilação Vercel mantém as flags públicas desativadas; as rotas da API também retornam 404 nesse ambiente.

## Comportamento

- Aceita URL completa HTTP ou HTTPS sem credenciais, até 2.048 caracteres. A validação do backend continua sendo a autoridade da política de rede.
- Enter e botão enviam JSON. Durante a consulta, a ação fica bloqueada contra duplicação; Cancelar e o prazo do cliente abortam o pedido.
- Apenas `resolved` exibe ou copia o destino final. HTTP 4xx/5xx são mostrados como status realmente observado. Estados parciais nunca confirmam um endereço.
- O percurso lista somente saltos observados e apresenta avisos, protocolo e status. URLs não são links, previews nem navegação; não há persistência ou histórico.
- O cliente omite credenciais, cache e referrer. Mensagens usam regiões acessíveis; o resultado recebe foco visível após conclusão, e o percurso nativo `details/summary` funciona por teclado. O indicador de carregamento respeita `prefers-reduced-motion`.

## Layout e testes

SCSS monocromático da área de Utilitários. Formulário empilha em telas estreitas e alinha controles em telas largas. Playwright cobre 320, 390, 768, 1024, 1366, 1440 e 1920 px, em temas claro e escuro, sem overflow horizontal.

Testes automatizados cobrem envio, validação, erros, caminhos parciais, cancelamento, duplicação, clipboard, texto não confiável, foco, movimento reduzido e flags. A validação executada nesta branch inclui typecheck/build, 89 testes Python focados e 12 testes Playwright aprovados (mais 1 teste público não aplicável ao bundle local). Um teste Python usa FastAPI real, resolvedor e transporte com pinagem, incluindo handshake TLS local e rejeição de certificado inválido/nome incompatível. O teste integrado do navegador inicia a API local e confirma o resultado real na tela. O gate público foi verificado em build Vercel: 2 testes aprovados e 2 testes específicos da prévia ignorados.

O harness retorna `93.184.216.34` como valor sintético de DNS para exercitar a validação de IP público; esse endereço não é contatado. `LoopbackTestBackend` aceita apenas esse IP e a porta esperada, e redireciona a conexão validada exclusivamente para `127.0.0.1`. Nenhum site público é contactado.

## Limites

Sem persistência, reputação, classificação de phishing ou execução do conteúdo do destino. O resultado descreve os redirects e o status HTTP observados; não garante segurança. Ativação pública, merge e deploy não fazem parte da Fase 3.
