# 2T Call — Etapa 3: voz WebRTC (homologação externa pendente)

Branch: `codex/2t-call-stage-0`. Base preservada: `2c05831` (Etapa 2).
Não houve merge na main, publicação de produção ou contratação de infraestrutura.

## Entregue

- Voz mesh nativa: cada navegador mantém até quatro RTCPeerConnections.
- A sala privada continua exigindo credencial do proprietário, convite e aprovação.
  Entrar na sala não ativa a voz: o botão “Entrar na chamada” habilita a escuta.
- Microfone só é solicitado após clique. Há participação apenas ouvindo, mute/unmute,
  indicadores locais/remotos e tratamento de recusa/dispositivo indisponível.
- Captura pede cancelamento de eco, redução de ruído e ganho automático ao navegador.
- Um único transceptor sendrecv de áudio por par; microfone trocado com replaceTrack.
  Desligar o microfone para a captura, sem renegociação nem reinício da sala.
- Áudio remoto em elementos audio individuais, sem reproduzir o próprio microfone.
  “Liberar áudio” permite nova tentativa com gesto quando autoplay é bloqueado.
- SDP e trickle ICE pelo sinalizador; áudio segue WebRTC, nunca pelo FastAPI.
- Identidades estáveis e gerações de voz validadas no servidor rejeitam sinais antigos.
- Primeira oferta definida pelo ID; o outro lado reutiliza o transceptor do SDP recebido.
  Renegociação segue Perfect Negotiation: papéis polite/impolite e rollback para glare.
- ICE anterior ao SDP fica em fila limitada; candidatos de gerações diferentes não
  são aplicados à descrição errada. Filas e registros de colisão são limitados.
- Entrada/saída altera somente os pares correspondentes. Reconexão WebSocket preserva
  áudio existente e identidade; a perda definitiva da sala interrompe a captura.
  Cliente limita a primeira resposta a 10 s e detecta silêncio do sinalizador por
  heartbeat, sem depender apenas do evento close do TCP.
- Monitoramento ICE/PeerConnection, até duas recuperações automáticas por incidente,
  ICE restart e botão de nova tentativa. Não há loop infinito de recuperação.
- Sair da chamada, da sala ou da rota fecha pares, remove áudios, cancela timers e
  encerra tracks. Respostas tardias de permissões são descartadas e suas tracks paradas.
- Tela/áudio da tela seguem somente na prévia local, sem sender WebRTC de vídeo/tela.
  Não há câmera, chat, gravação ou funcionalidades da Etapa 4.
- Sem indicador de fala nesta etapa: não há análise contínua adicional do microfone.

## Executar e configurar ICE

Os comandos do [serviço local da Etapa 2](2t-call-stage-2.md#executar-no-windows)
continuam válidos. Build: `npm run build`. Página: `http://127.0.0.1:8001/#/call`.
Use credencial forte própria; as credenciais de testes não são para uso pessoal real.
O processo de testes é encerrado ao final da execução; reinicie conforme a documentação.

Variáveis opcionais, exclusivas do processo sinalizador:

| Variável | Padrão / propósito |
| --- | --- |
| `CALL_STUN_URLS` | `stun:stun.cloudflare.com:3478`; CSV. Vazio habilita somente candidatos locais. |
| `CALL_TURN_URLS` | Vazio; CSV de URLs turn/turns de servidor já autorizado. |
| `CALL_TURN_SHARED_SECRET` | Ausente; segredo server-side compatível com coturn REST. |
| `CALL_TURN_SECONDS` | 600 s, intervalo permitido 60–600 s. |

TURN exige URLs e segredo juntos; configuração parcial, URL inválida e segredo curto
falham na inicialização. Não existem credenciais permanentes no bundle ou no protocolo.
Após aprovação, `rtc_config` entrega ICE servers e, se configurado, usuário temporário
`expiração:participante` e HMAC-SHA1/base64. O segredo compartilhado nunca é enviado.
O TTL não ultrapassa o fim da sala; o cliente renova a configuração antes de expirar.
Credenciais emitidas podem continuar válidas até seu TTL mesmo após sair: coturn
deve ter limites de banda/usuários e proteção de peers. Não publicar relay aberto.

O fluxo implementado é para **coturn REST**, não usa diretamente a API proprietária
Cloudflare TURN. Um adaptador gerenciado exigiria avaliação e autorização posteriores.

## Protocolo — acréscimos à Etapa 2

- Cliente: `media {active: boolean, microphone: boolean}`; só membro aprovado.
- `presence.participants[]` inclui `voice`, `microphone` e `voiceEpoch`.
- `voiceEpoch` muda ao entrar/sair da voz; mute e resume não mudam a geração.
- SDP/ICE incluem `epoch` do remetente e `targetEpoch` do destinatário.
  O servidor confere ambas e exige os dois membros na voz da mesma sala.
- Cliente: `rtc_config`; servidor: `rtc_config {iceServers, turnExpires, relayAvailable}`.
  O primeiro config vem automaticamente após criação/aprovação/resume autorizado.
- Nenhum frame transporta mídia. Permanecem os limites da Etapa 2.
- Credenciais, SDP, ICE, endereços IP e áudio não são registrados em logs da aplicação.

## Hospedagem, redes e custos

O sinalizador permanece um processo Uvicorn local, memória efêmera, um worker.
Não está instalado na API pública, continua recusando `VERCEL` e não foi provisionado
host externo. Reinício do processo perde salas; limite padrão da sala: uma hora.
Para duas redes reais será necessário serviço persistente acessível por HTTPS/WSS,
origem autorizada e configuração de proxy confiável. HTTP remoto não habilita microfone.
Não pressupor que múltiplas instâncias Vercel compartilhem a memória das salas.

STUN auxilia NAT; não garante travessia de CGNAT/firewalls. Sem TURN, a interface
avisa a limitação. TURN ainda não foi configurado nem validado com tráfego real.

Opções verificadas em 03/11/2026:

- [Cloudflare STUN/TURN](https://developers.cloudflare.com/realtime/turn/faq/):
  a FAQ declara STUN gratuito e TURN com 1.000 GB de franquia, seguido de US$ 0,05/GB.
  Isso não garante teto de gasto nem disponibilidade ilimitada para a aplicação.
  Não foi criada conta, ativado faturamento ou contratado TURN.
- [coturn](https://github.com/coturn/coturn/blob/master/README.turnserver): software
  aberto compatível com as credenciais temporárias implementadas. Máquina, IP, banda,
  energia e operação podem custar. Exige configuração e autorização antes de exposição.

R$ 0/mês permanece meta, sem garantia. Mesh multiplica upload por até quatro cópias.
Peers podem conhecer endereços de rede; modo relay obrigatório dependeria de TURN.

## Testes e medições

- Base da Etapa 2 revalidada antes das alterações: 24 Python e 3 Playwright.
- Backend atualizado: 34 testes de salas/voz, incluindo credenciais temporárias,
  expiração, autorização, gerações, isolamento e reservas concorrentes.
- Regressão API/calculadora: 7 Python. Typecheck e build aprovados.
- Resultado final: 41 testes Python e 8 cenários Playwright aprovados (5 voz + 3 salas),
  além das repetições do mesh e da regressão direcionada de mídia local da Etapa 1.
  `git diff --check` aprovado; capturas desktop/mobile inspecionadas nos dois temas.
- Cinco cenários novos de voz com RTCPeerConnection/WebSocket/Opus reais no Chrome;
  o microfone de teste é um WAV sintético, não uma pessoa nem RTCPeerConnection mock.
- Verificadas troca e reprodução de áudio de cada peer: RTP, energia recebida,
  currentTime, play e ausência de mute no elemento remoto; não se trata só de ICE conectado.
- Mesh de 2, 3, 4 e 5 contextos/abas do Chrome no mesmo computador, sexto bloqueado, mute/unmute, entrada/saída,
  preservação dos demais pares, resume WebSocket, encerramento e limpeza.
- Ofertas simultâneas e candidatos antes do SDP durante ICE restart reais; recusa
  de autoplay simulada, seguida de reprodução nativa liberada por interação.
- Recusa de microfone e captura tardia simuladas; modo apenas ouvindo e saída de rota.
  Tela sintética com áudio próprio permanece fora dos senders; tracks são encerradas
  na saída. Retomada do áudio exige aumento da energia RTP recebida após unmute/restart.
- ICE restart real com mudança de ufrag; falha persistente simulada para comprovar
  limite de duas recuperações automáticas e nova tentativa manual.
- Perda de respostas heartbeat simulada num WebSocket real: resume preserva o mesmo
  participante e PeerConnection, sem duplicar vagas ou interromper pares existentes.
- Falha inicial identificada: transceptores pré-criados nos dois lados duplicavam
  m-lines durante corridas de negociação. Corrigido; teste exige exatamente um
  transceptor sendrecv por par. Mesh passou três rodadas consecutivas após correção.
- Capturas com cinco participantes em 1366 e 390 px, temas claro/escuro.
  Regressão da sala cobre também 768 e 320 px. Não foram alteradas outras áreas.
- Estatísticas locais por peer a cada 5 s: RTP recebido/perdido, jitter, RTT e relay.
  Artefatos ignorados: `test-results/.../webrtc-stats-2-3-4-5.json`.
  Uma amostra do anfitrião com cinco navegadores teve 267 pacotes recebidos, zero
  perdidos, RTT máximo de 2 ms e jitter máximo de 1 ms. Não extrapolar para a internet.
- Testes locais usam `CALL_STUN_URLS=''`: não comprovam STUN externo, TURN ou redes
  diferentes. Os testes de mídia não substituem ouvir dispositivos físicos.

Para repetir, inicie o servidor com uma chave exclusiva de testes e configure:

```powershell
python -m pytest backend/tests/test_call_signaling.py backend/tests/test_call_voice.py -q --basetemp=.vercel/pytest-call-stage3
$env:CALL_TEST_ADMIN_KEY = $env:CALL_ADMIN_KEY
$env:PW_CHANNEL = 'chrome'
npx playwright test frontend/tests/call-voice.spec.ts
# Em um serviço limpo, para evitar limites acumulados de tentativas:
npx playwright test frontend/tests/call.spec.ts
```

## Homologação manual pendente — antes de produção ou Etapa 4

1. Autorizar e configurar sinalizador HTTPS/WSS persistente e, se necessário, TURN
   com teto de consumo comprovado. Não expor o servidor de testes com sua chave.
2. Usar dois dispositivos físicos, um em Wi-Fi e outro em rede celular/outra conexão.
   Abrir a mesma origem HTTPS, criar sala, convidar/aprovar e entrar na chamada.
3. Usar fones e confirmar fala/escuta bidirecional, ganho/eco, mute e apenas ouvir.
   Registrar navegador, rede, RTT/perda/jitter e se o caminho selecionado é relay.
4. Manter ao menos 30 minutos; testar bloqueio da tela, aba em segundo plano e
   mudança de rede. Conferir limite de uma hora/expiração da sala separadamente.
5. Acrescentar até cinco pessoas reais; retirar/reconectar uma sem interromper as
   demais. Verificar sexto recusado, autoplay, recusa/revogação de microfone e saída.
6. Confirmar liberação de microfone/conexões ao sair e caminho TURN real em rede
   restritiva. Só então avaliar publicação e planejar tela/câmera da Etapa 4.

Esses testes físicos, prolongados e entre redes diferentes **não foram executados**.
Referência da negociação: [MDN Perfect Negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation).
