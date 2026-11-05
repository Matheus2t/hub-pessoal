# 2T Call V2

O Call oferece um canal permanente e a chamada privada com convite e aprovação. O canal usa `/#/call/sala/<id>`, com identificador aleatório de 128 bits. Só o proprietário consegue recuperar o link atual pela administração. A consulta de um link válido retorna nome e contagem; a lista de participantes fica disponível após a entrada ou na administração autenticada. O link fica no fragmento do endereço e não é enviado em pedidos HTTP nem anunciado em diretórios públicos.

Entrar no canal inicia a recepção de voz. Microfone e câmera só são ativados por ação do participante. O indicador de fala usa o nível de áudio recebido quando o navegador expõe a medição WebRTC. A sinalização, o limite de cinco pessoas, o compartilhamento de uma tela por vez e o visualizador da tela cheia usam o Call existente. Ao sair, as conexões e mídias do participante são liberadas. A última saída explícita esvazia imediatamente o estado em memória. Uma conexão perdida reserva a vaga somente durante a janela de reconexão.

O proprietário usa a credencial já configurada no Render para cada ação de gerenciamento. Expulsar encerra a sessão atual. Bloquear revoga as sessões do token aleatório daquele navegador e grava seu hash e apelido no banco, com no máximo 100 bloqueios. Limpar dados ou trocar de navegador contorna esse bloqueio. Revogar o link invalida o endereço antigo e desconecta os presentes; o proprietário distribui o novo. Não são usados IP, nome ou fingerprint como identidade permanente.

## Persistência

O Cloudflare D1 guarda uma linha com identificador, nome, data de criação, revisão e bloqueios. Gravações usam parâmetros e atualização condicional para evitar sobrescrever uma alteração concorrente. O Render acessa a API oficial do D1 por HTTPS. O banco recebe a definição do canal e as informações mínimas de bloqueio. Presença, credenciais de sessão, SDP, ICE e mídia continuam transitórios. O TTL de salas privadas não se aplica ao canal.

A configuração do D1 é opcional no sinalizador. Banco ausente, esquema indisponível, erro ou cota esgotada impedem consultas, entradas novas e alterações do canal. Chamadas privadas e mídia já estabelecida continuam independentes da consulta ao banco. O Render Free pode dormir. Ao abrir o link há uma espera limitada de inicialização. Em reinício, os clientes tentam recuperar a sessão e, quando o processo perdeu a sala em memória, entrar novamente pelo mesmo link. Câmera e compartilhamento podem precisar ser ativados de novo. O serviço continua com um worker e TURN desligado.

O D1 Free oferece cota de 5 milhões de linhas lidas e 100 mil linhas gravadas por dia, com 5 GB no total no plano. Quando a cota acaba, o serviço recusa operações. O plano Workers Paid tem cobrança de excedentes. A configuração prevista usa o plano Free sem ativar cobrança. [Cotas do D1](https://developers.cloudflare.com/d1/platform/pricing/) · [Consulta do D1 por HTTPS](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/) · [Render Free](https://render.com/docs/free)

## Preparação e publicação

1. Na conta Cloudflare, confirme **Workers Free** e crie um banco D1 dedicado `2t-call`. No Console desse banco, execute:

   ```sql
   CREATE TABLE IF NOT EXISTS call_channel (
       singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
       definition TEXT NOT NULL
   );
   ```

2. Crie um token de API Cloudflare com **Account → D1 → Edit**, limitado à conta do banco. Esse escopo permite editar os bancos D1 da conta selecionada, por isso prefira uma conta dedicada se houver outros bancos sensíveis. Guarde o token somente no ambiente do Render. Os nomes das variáveis são `CALL_D1_ACCOUNT_ID`, `CALL_D1_DATABASE_ID` e `CALL_D1_API_TOKEN`. Nenhum valor deve ir para GitHub, Vercel, chat ou frontend.
3. Após os testes locais, implante o SHA da branch V2 no serviço Render **twot-call** junto das três variáveis. Preserve a origem oficial, a credencial atual, os limites, STUN e TURN desligado. A mudança de processo encerra sessões transitórias em andamento, então escolha um momento em que a sala privada esteja vazia. Confirme `/call/health` e a compatibilidade do Call V1 na produção.
4. Use uma prévia Vercel protegida com `CALL_SIGNAL_URL=wss://twot-call.onrender.com/call/ws` no ambiente Preview da branch. Adicione só a origem exata dessa prévia à lista do Render durante a homologação. No Call da prévia, abra **Gerenciar sala permanente**, consulte com a credencial existente, crie o canal e copie o link. Faça isso no navegador e compartilhe o link só com os convidados. Como a parte persistente é o identificador, após a publicação o mesmo caminho `/#/call/sala/<id>` usará `https://matheus2t.com.br`.
5. Entre com dois navegadores, saia dos dois e confirme `0/5`. Reinicie o processo Render, compare o campo `boot` em `/call/health` antes e depois e verifique que o identificador, nome e bloqueios persistem, que a contagem recomeça vazia e que o link aceita novos participantes. Teste também a retomada de uma sessão ativa e o convite privado. O teste local usa SQLite em arquivo e comprova a separação de processos. A homologação D1 real é um gate adicional.
6. Só então integre o PR à `main`, confirme **Production / Ready** na Vercel e repita a entrada pelo domínio oficial. Remova a origem temporária da prévia após a homologação, em uma janela que não interrompa chamadas.

## Rollback

Registre o SHA ativo no Render e o deployment ativo da Vercel antes de publicar. Se houver problema após a V2, restaure primeiro o frontend V1 na Vercel. Ele funciona com o sinalizador V2. Se necessário, reimplante em seguida o SHA anterior no Render. Preserve o banco e sua linha, pois a volta ao V1 desativa o canal até reimplantar a V2. O último frontend V1 confirmado antes da branch foi `be87222f907ea63db347c8b4706ced51171d8f06`, deployment `dpl_A4LQ38wZtMUfv1gd1LQ3KKA6TpKo`.

## Reproduzir os testes do canal no Windows

Com as dependências do projeto e as do runtime Call instaladas, gere um certificado de teste para loopback e rode o cenário automatizado. O Playwright cria um SQLite por teste, inicia seu próprio servidor em uma porta local livre e encerra o processo no fim.

```powershell
npm run build
python backend/tests/call_tls_harness.py .vercel/call-v2/tls
$env:CALL_CHANNEL_TEST_PYTHON = (Get-Command python.exe).Source
$env:CALL_CHANNEL_TEST_TLS = '.vercel/call-v2/tls'
$env:PW_CHANNEL = 'chrome' # ou 'msedge'
npx playwright test frontend/tests/call-channel.spec.ts --output=.vercel/call-v2/test-results
```

## Validação desta entrega

- Typecheck, build e 107 testes Python do Call aprovados. Os testes cobrem persistência em SQLite entre novas instâncias, limite de vagas, retomada, moderação, permissões e tratamento de falha do adaptador HTTP do D1. O teste do adaptador simula a resposta da Cloudflare.
- Playwright: dois cenários V2 em Chrome e dois em Edge aprovados. O servidor reinicia em outro processo com o mesmo SQLite, o link permanece, os participantes restabelecem a voz e a sala fica vazia após a saída. Mídia sintética percorre conexões WebRTC reais. Layout verificado em 1366, 768, 390 e 320 px nos dois temas, incluindo emulação de toque.
- 16 regressões Playwright da Chamada Privada aprovadas em Chrome, cobrindo salas, voz, câmera, compartilhamento, áudio da tela e tela cheia.
- Firefox e WebKit não estavam instalados. Dispositivos físicos, redes externas, D1 real e reinício no Render ainda precisam de homologação. O proprietário preferiu guardar o código antes de provisionar o banco. A V2 permanece na branch de desenvolvimento, sem link de sala em produção.
