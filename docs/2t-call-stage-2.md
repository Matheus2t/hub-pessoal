# 2T Call — Etapa 2: salas e sinalização local

Implementação na branch `codex/2t-call-stage-0`, preservando a Etapa 1 (`360ca99`).
Não integrada à main; sem publicação de produção nem infraestrutura provisionada.

## Entrega

- Serviço independente `backend.app.call_signaling:app`, FastAPI/WebSockets nativos.
- Sala criada somente com credencial de proprietário configurada no servidor.
- Convite privado aleatório de 256 bits no fragmento do link; validade padrão 15 min.
- Sala com duração máxima padrão de uma hora, não renovada por atividade/reconexão.
- Anfitrião aprova ou recusa cada pedido. Pedidos expiram em 60 segundos.
- Cinco vagas totais: anfitrião, convidados aprovados e pedidos pendentes reservam vagas.
  Reserva/admissão/reconexão feitas sob um único lock assíncrono.
- Presença real, identificação do anfitrião, saída, encerramento e desconexão.
- Reconexão automática: mesma identidade e credencial, sem duplicar participantes.
  Uma reconexão substitui o socket anterior; mensagens antigas não têm autoridade.
- Vaga desconectada preservada por 20 segundos. Depois é liberada; a perda definitiva
  do anfitrião encerra a sala. Sala encerrada é removida imediatamente da memória.
- Microfone e tela continuam somente locais, com limpeza ao sair/trocar rota/encerrar.
- Não há RTCPeerConnection, envio de mídia, câmera, gravação, chat ou banco de dados.

## Executar no Windows

Na raiz do repositório, com as dependências existentes instaladas:

```powershell
npm run build
$callOwner = Read-Host 'Credencial forte do proprietário (mínimo 32 caracteres)' -AsSecureString
$env:CALL_ADMIN_KEY = [System.Net.NetworkCredential]::new('', $callOwner).Password
$env:CALL_SERVE_FRONTEND = 'true'
python -m uvicorn backend.app.call_signaling:app --host 127.0.0.1 --port 8001 --workers 1 --ws-max-size 32768 --no-access-log --log-level warning
```

Abra `http://127.0.0.1:8001/#/call`. O navegador conecta em `/call/ws`, na mesma origem.
Informe nome e credencial em “Sou o proprietário”; compartilhe o convite copiado.
Convidados informam nome e aguardam aprovação. A credencial não integra o link.
O `npm run dev` na porta 3000, sozinho, não oferece este serviço WebSocket.
O servidor optativo serve o build e autoriza somente sua origem WS na cópia do HTML
entregue localmente. Não modifica `frontend/index.html`, CSP público ou `vercel.json`.

Use credencial aleatória exclusiva; não reutilize senhas pessoais. Não versione o valor.
A aplicação lê variáveis do processo (não carrega automaticamente `.env` neste módulo).
Sem chave com pelo menos 32 caracteres, recusa conexões. Com `VERCEL` definido,
recusa conexões deliberadamente, para impedir uso acidental de RAM distribuída.
Encerrar o processo perde todas as salas; não usar múltiplos workers nem reload.
O exemplo vincula somente ao loopback: convites não funcionam em outro computador.

## Contrato v1

Todas as mensagens são JSON de texto, com `type`, sem campos adicionais.
Python valida entradas com Pydantic; TypeScript espelha os contratos em `protocol.ts`.

| Direção | Mensagem e campos |
| --- | --- |
| Cliente → servidor, primeiro frame | `create {name, admin}`; `join {name, room, invite}`; `resume {room, participant, credential}` |
| Servidor → cliente | `session {room, participant, credential, host, approved, invite, expires, inviteExpires}` |
| Cliente → servidor | `admit/reject {target}`, `leave`, `close`, `ping` |
| Servidor → cliente | `approved`, `presence {participants, reason}`, `requests {participants}` (somente anfitrião), `pong`, `error {code}`, `closed {reason}` |
| Cliente → servidor | `offer/answer {target, sdp}`; `ice {target, candidate}` |
| Servidor → destinatário | `offer/answer {from, sdp}`; `ice {from, candidate}` |

`credential` é emitida uma vez; no resume o campo é `null` e a credencial anterior
continua válida até saída/expiração. `invite` só é entregue ao criador, nunca à lista.
`expires` e `inviteExpires` são segundos Unix. IDs têm 128 bits; segredos têm 256 bits.
O servidor escolhe remetente, sala e papel; só encaminha SDP/ICE para membros
aprovados conectados da mesma sala. ICE aceita objeto RTCIceCandidateInit ou `null`.
Esta etapa prepara o transporte tipado; não cria peers nem negocia mídia.

## Segurança e limites

- Origin obrigatório e comparado exatamente com `CALL_ALLOWED_ORIGINS` (CSV).
  Padrão: `http://localhost:8001,http://127.0.0.1:8001`; sem wildcard.
- Segredos no primeiro frame, nunca em query/path do socket. Query é recusada.
- Hashes SHA-256 dos tokens em RAM; comparação constante. Chave como SecretStr.
- Cliente mantém credenciais de sessão apenas em RAM; não localStorage/IndexedDB.
  Refresh perde a sessão; solicitar nova entrada ou aguardar liberação da vaga.
- Convite é retirado da barra após ingresso; nomes são escapados pelo Lit.
  Não acrescentar analytics/logs dos frames, SDP, ICE, credenciais ou URLs de convite.
- Limites: 8 salas, 128 sockets, 30 upgrades/IP/minuto, 5 criações/IP/minuto;
  120 mensagens/conexão/10 segundos; fila de saída 64; primeiro frame em até 8 s.
- Texto máximo 32 KiB; SDP até 24 KiB; candidato ICE até 2048 caracteres;
  nome até 40 caracteres, sem controles ou valor vazio.
- Heartbeat de cliente a cada 8 s; silêncio de 30 s encerra o socket.
  Reconexão com espera progressiva, até cinco tentativas dentro da janela de reserva.
- Limites por IP usam peer real, não `X-Forwarded-For` arbitrário. Ajustar proxy
  confiável antes de uso externo. Os limites agrupam usuários sob um mesmo NAT.
- Nenhuma listagem pública de salas; convidados não podem aprovar, encerrar ou
  escolher remetente. Origem não substitui a autorização por tokens.

## Hospedagem e custos

A [documentação atual da Vercel](https://vercel.com/docs/functions/websockets)
suporta FastAPI/ASGI e WebSockets, mas conexões novas podem cair em instâncias
diferentes e são encerradas ao atingir a duração da função. O projeto atual tem
`maxDuration: 60`. Portanto esta implementação em RAM não é adequada à Vercel.

Alternativa mínima: um único processo Uvicorn persistente numa máquina existente,
com proxy HTTPS/WSS e origem explicitamente permitida. A infraestrutura pública,
certificado/proxy, disponibilidade e acesso entre redes ainda não foram configurados.
Host, energia, IP e tráfego podem gerar custos; R$ 0/mês não é garantido.
Usar Vercel futuramente exigiria coordenação/estado externos e nova avaliação de cotas.
Nenhuma conta, serviço pago, Redis, SFU, STUN/TURN ou deploy foi criado nesta etapa.

## Verificação em 03/11/2026

- `npm run build` inclui `tsc --noEmit`: aprovado.
- Pytest direcionado: 24 testes do sinalizador e 7 da API/calculadora existentes.
- Playwright: 3 testes com WebSockets reais no Chrome/Chromium, múltiplas abas,
  cinco participantes, sexto recusado, pedidos concorrentes, aprovação, reconexão,
  saída, encerramento, credencial inválida, rota e temas claro/escuro.
- Layouts 1366, 768, 390 e 320 px sem rolagem horizontal; capturas desktop/mobile.
  Corrigido transbordamento interno da prévia causado pelo aspect-ratio/min-height.
- Regressão local de mídia da Etapa 1: microfone nativo com dispositivo de teste;
  tela simulada via canvas. Permissões, encerramento e respostas assíncronas tardias
  verificados. Hardware real e seletor do sistema continuam exigindo teste manual.
- Sandbox Windows bloqueou socket interno do asyncio; testes passaram fora dessa
  restrição. A primeira falha Playwright era o helper que fechava um details aberto;
  corrigido antes da aprovação final.
- Nenhuma suíte completa desnecessária nem teste de voz entre usuários foi executado.

Para repetir, com servidor local ativo e a mesma chave de teste nas duas janelas:

```powershell
python -m pytest backend/tests/test_call_signaling.py -q --basetemp=.vercel/pytest-call-stage2
$env:CALL_TEST_ADMIN_KEY = $env:CALL_ADMIN_KEY
$env:PW_CHANNEL = 'chrome'
npx playwright test frontend/tests/call.spec.ts
```

Os testes Playwright do Call são ignorados quando `CALL_TEST_ADMIN_KEY` não existe.
Usar serviço limpo para evitar limites por IP de rodadas anteriores. Sem preview
público criado; acesso validado exclusivamente local. Etapa 3 não iniciada.
