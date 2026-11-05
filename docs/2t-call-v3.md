# 2T Call V3

A página do Call mantém os dois painéis do layout publicado. O painel permanente mostra o nome e a contagem da sala na abertura, inclusive vazia. O acesso pelo painel e pelo link abre o mesmo formulário. A chamada privada continua com convite, credencial do proprietário e aprovação.

## Sala, senha e D1

- A definição continua na mesma linha `call_channel` do D1. A V3 lê o JSON da V2 sem alterações. Ao salvar a senha, adiciona `password_hash` à definição existente por atualização condicional, preservando identificador, nome, data e bloqueios. O esquema SQL e as variáveis D1 permanecem os mesmos.
- Salas legadas continuam acessíveis pelo link antigo até o proprietário definir a senha. O painel mostra a sala, mas não divulga seu identificador enquanto o acesso estiver desprotegido. Novas salas criadas na interface V3 exigem senha. Com proteção ativa, o backend exige prova de acesso mesmo que a pessoa conheça o link.
- A senha tem pelo menos 10 caracteres e não pode ser igual à credencial administrativa. O servidor usa Argon2id com salt aleatório, 19 MiB, duas iterações e paralelismo 1. Apenas o hash vai ao D1. A senha trafega no primeiro quadro WSS, sem URL, persistência no navegador ou registro em log. [Parâmetros Argon2id](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- O servidor limita falhas a cinco por token de navegador e 12 por origem de rede confiável em 60 segundos. O Render agrupa o orçamento de rede por serviço. A consulta HTTP de descoberta tem orçamento independente do WebSocket e retorna só nome, contagem, proteção e, quando protegida, endereço.
- Para a reconexão após reinício, o servidor entrega uma prova assinada de 15 minutos em memória, renovada durante sessões ativas. A prova depende da sala, do navegador, da senha atual e da credencial administrativa. Se expirar, a pessoa digita a senha novamente. Alterar a senha preserva o link, encerra as sessões e invalida provas antigas. Revogar o link preserva a senha e invalida o endereço anterior.

## Vídeo

A câmera começa desligada e a primeira ativação prefere a frontal. A troca no celular usa a direção solicitada e libera a câmera anterior quando o hardware só aceita uma captura. No computador, a seleção aparece depois da permissão se houver mais de um dispositivo. Se a troca falhar, o Call tenta manter ou recuperar a câmera anterior.

Cada vídeo de câmera tem um botão próprio de tela cheia. O controle de saída, microfone e câmera fica dentro do visualizador nativo ou expandido. Em aparelhos sem tela cheia para contêineres, a expansão ocupa a área visível do navegador. Trocar a câmera ou silenciar o microfone reaproveita a conexão WebRTC. Desativar a própria câmera enquanto ela está ampliada encerra essa ampliação.

## Homologação e ordem de publicação

1. Preserve a definição D1 existente e confirme os três `CALL_D1_*` no Render `twot-call`. Se o D1 ainda não existir, siga a preparação da V2. Não edite o JSON manualmente para definir senha. [Procedimento D1 da V2](2t-call-v2.md)
2. Em uma janela sem chamadas, implante o SHA validado da V3 no Render. O Dockerfile usa `deploy/call/requirements.txt`, que agora inclui a biblioteca Argon2id. Confirme `/call/health`, `/call/lobby` e a chamada privada com o frontend publicado. O protocolo antigo de chamadas privadas continua aceito.
3. Teste uma prévia Vercel protegida apontada para o Render e autorize apenas a origem exata da prévia no sinalizador. Consulte a sala existente em **Gerenciar sala permanente** e guarde o endereço anterior. Defina a senha diretamente no formulário. Confirme que o endereço permaneceu igual, que ambos os caminhos exigem senha e que um visitante recebe voz e vídeo.
4. Reinicie o Render e compare o campo `boot` no health. Confirme que nome, link, senha e bloqueios persistem no D1 e que o canal se recupera. Teste câmera e tela cheia em dispositivos físicos. Com as verificações essenciais aprovadas, integre o PR e confirme Production / Ready e os fluxos no domínio oficial.

Para rollback, guarde o SHA ativo do Render e o deployment da Vercel antes de publicar. Restaurar só o frontend anterior mantém a Chamada Privada, mas o frontend antigo não consegue entrar em canais protegidos. O leitor da V2 rejeita a definição com campo de senha e desativa a sala permanente. Em qualquer rollback, preserve o hash e a linha no D1 para que a sala continue protegida ao retornar à V3.

Antes da V3, a Vercel servia a `main` `607fbf4f7bb9a9544ef07dd471403dfe344635c3` em `dpl_9R8SjgUsvytgvpgPaF9KVwxx3AH1`. O health do Render respondeu HTTP 200 após a inicialização. A rota `/call/lobby` respondeu 404 nessa versão. No painel do Render, anote o SHA e o deploy Live imediatamente antes de usar **Manual Deploy → Deploy a specific commit**.

## Verificações locais

- Typecheck e build aprovados. 110 testes Python do Call aprovados, incluindo leitura do formato V2, gravação do hash sem senha em texto puro, limite de tentativas e invalidação da prova de reconexão.
- Sala Permanente em Playwright: três casos aprovados em cada um de Chrome, Edge e Firefox. No WebKit para Windows, autenticação e moderação passaram e dois cenários de mídia foram ignorados por ausência das APIs exigidas pelo ambiente. Os testes usam SQLite em arquivo e WebRTC com mídia sintética, incluindo reinício real do processo local.
- As 16 regressões Playwright da Chamada Privada passaram em Chrome. Dois testes identificaram que a altura compacta do lobby também limitava o modo expandido. A regra foi corrigida e a suíte passou novamente.
- A compatibilidade com a forma da linha D1 foi exercitada localmente. A validação da linha real no Render, a prévia integrada e o teste em dispositivos físicos dependem da homologação descrita acima.
