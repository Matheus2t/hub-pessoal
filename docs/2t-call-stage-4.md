# 2T Call — Etapa 4: tela, áudio compartilhado e câmera

Branch: `codex/2t-call-stage-0`. Base: `9c81fd0`.
Implementação de desenvolvimento; sem merge na main ou publicação de produção.
As demais áreas, o build/runtime Vercel e o launcher da Etapa 3.5 foram preservados.

## Funcionalidades

- Uma tela por sala, com nome do transmissor e prévia local silenciada.
- Vídeo e áudio da tela distribuídos aos participantes aprovados da chamada,
  inclusive quem entra depois. Sem trilha de áudio, a interface informa a ausência.
- Microfone e áudio da tela independentes; desligar o microfone não silencia a tela.
- Câmera opcional, desligada inicialmente, solicitada apenas por clique; prévia
  local silenciada e vídeo remoto por participante. Tela e câmera podem coexistir.
- Seleção cancelada, recusa de permissão, dispositivo ausente/ocupado, término
  nativo da captura e retorno tardio de prompts tratados sem reativar captura antiga.
- Desligar a mídia, sair da chamada/sala/rota ou perder a sessão libera capturas.
  Perder o WebSocket interrompe tela/câmera; a retomada não as reativa sozinha.
- A prévia fora da chamada continua exclusivamente local e termina antes de entrar.
- Sem gravação, envio de arquivos, chat, câmera automática ou mídia no backend.

## Arquitetura de mídia e autorização

O mesh existente mantém até quatro PeerConnections por navegador. Não há SFU.
Cada par tem quatro transceptores sendrecv com papéis explícitos:
`microphone`, `screenAudio`, `screenVideo`, `camera`.
Somente o ofertante inicial os cria; o respondente reutiliza os transceptores do
SDP, identificados pelo mapa papel→MID transportado junto da oferta/resposta.
O cliente verifica unicidade, tipo de mídia e estabilidade dos MIDs. A identificação
não depende da ordem de chegada das tracks. Toggles usam replaceTrack, sem recriar PCs.
Perfect Negotiation, glare, ICE antecipado, epochs e recuperação limitada permanecem.
Todos os pares são clientes BUNDLE-aware. `max-bundle` usa um único transporte
ICE/DTLS por par desde a coleta inicial e permanece na atualização de rtc_config.
Isso evita multiplicar candidatos por tipo de mídia na entrada simultânea; o limite
original de 120 mensagens/10 s do servidor não foi aumentado nem desativado.

O sinalizador autentica, aprova e valida mensagens Pydantic estritas; transporta
controle/SDP/ICE, nunca áudio/vídeo. Um lock da sala arbitra a reserva de tela.
Cada tentativa tem nonce e geração do servidor. Só o titular pode iniciar/liberar;
controles antigos não liberam uma reserva nova. A seleção expira em 45 segundos;
a transmissão ativa acompanha a vida da sala. Saída, desconexão e substituição de
sessão liberam a reserva. O receptor só reproduz tela/câmera autorizadas no roster.
As credenciais continuam somente em memória; sem SDP/ICE/segredos nos diagnósticos.

## Qualidade e limites

- Tela: pedido ideal 1920×1080 / 30 FPS, limitado após seleção quando suportado.
- Câmera: ideal 640×360 / 24 FPS, com teto solicitado 1280×720 / 30 FPS.
- Limites best effort por sender: tela 2 Mbit/s e câmera 600 kbit/s. Não são
  garantias de resolução, tráfego ou qualidade; o navegador mantém congestion control.
- Estatísticas a cada 5 s: upload estimado, perda, jitter, RTT, rota direta/relay,
  FPS/dimensões, frames codificados, tempo médio de codificação e motivo de limitação.
- Limitação `cpu`/`bandwidth` reduz bitrate pela metade, FPS a 15 e resolução por 2.
  Três amostras sem limitação permitem restaurar os limites normais.
- O motivo de limitação/tempo do encoder é um indicador de pressão no codificador,
  **não uma medição do uso total de CPU do sistema**. Não há API portátil para isso.
- O transmissor pode enviar quatro cópias; upload, CPU, bateria e aquecimento podem
  limitar o mesh. Um teto de 2 Mbit/s por par pode chegar a ~8 Mbit/s só para tela,
  além de câmera, áudio e overhead. Redes reais ainda precisam de homologação.

## Navegadores

getDisplayMedia exige contexto seguro e gesto do usuário; a seleção pertence ao
navegador e não pode ser feita silenciosamente. A opção audio:true apenas solicita
áudio: abas, janelas e monitores oferecem capacidades diferentes conforme sistema
e navegador. Não há promessa de áudio de todo o sistema, principalmente no móvel.
Chrome/Edge/Brave compartilham Chromium, mas suas permissões/políticas podem diferir.
Firefox e Safari têm diferenças de captura/áudio; não foram homologados nesta etapa.
Em plataformas sem getDisplayMedia, permanece possível receber mídia e usar voz/câmera
quando suportadas. O próprio ambiente deve confirmar suporte e permissões.
Autoplay bloqueado apresenta “Liberar áudio”, com nova tentativa após gesto.
Não há drivers virtuais, extensões ou captura além das permissões nativas.

Referências oficiais:
[captura de tela](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia),
[parâmetros RTP](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/setParameters),
[RTP recebido](https://developer.mozilla.org/en-US/docs/Web/API/RTCInboundRtpStreamStats),
[limitação do encoder](https://developer.mozilla.org/en-US/docs/Web/API/RTCOutboundRtpStreamStats/qualityLimitationReason).
[Política BUNDLE](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#bundlepolicy).

## Validação desta execução

- Python: **305 testes aprovados**, incluindo 15 novos casos de controle de mídia.
  Na conclusão, os **75 testes específicos de sinalização/voz/mídia/infraestrutura**
  foram reexecutados e passaram (subconjunto dos 305, não testes adicionais).
- Typecheck e build de produção aprovados.
- Playwright: **11 testes aprovados** (3 de mídia, 5 regressões de voz, 3 de salas).
  Incluem dois a cinco navegadores, entrada tardia, sexto recusado, reserva simultânea,
  tela sem áudio/áudio encerrado, mute independente, câmera simultânea à tela,
  permissões negadas, captura tardia/cancelada, desconexão, retomada, saída da rota,
  encerramento e limpeza. As regressões incluem glare real, ICE antes do SDP,
  autoplay bloqueado, ICE restart e limite de recuperação automática.
- Redução/restauração: pressão `cpu` injetada em cópias dos relatórios RTP reais
  verificou maxFramerate 15→30 nos quatro senders, sem substituir PCs/MIDs. Essa
  pressão é sintética; não é um teste de saturação física de CPU ou rede. Frames
  recebidos continuaram aumentando durante a redução e após a restauração.
- Com cinco navegadores, quatro receptores reproduziram tela, áudio da tela e
  câmera do transmissor, com pacotes RTP, frames decodificados e energia de áudio.
  Voz continuou durante tela/câmera e após desligar câmera ou terminar a tela.
- Transporte de teste: HTTPS/WSS real em loopback com certificado sintético;
  cabeçalhos do salto Cloudflare→loopback emulados pelo harness já existente.
- Mídia: voz nativa com WAV sintético, tela animada e áudio oscilador, câmera canvas.
  PCs, ICE, RTP, decodificação e reprodução são reais. Não há mock de WebRTC ou WS.
- A câmera fake nativa deste Chrome encerrou sua trilha inclusive em ensaio isolado
  fora da chamada; por isso a validação de transporte usa canvas contínuo. Não se
  confunde essa condição da ferramenta com homologação da câmera física.
- O evento ended é disparado sobre a trilha para representar o término pelo navegador;
  o seletor nativo e sua escolha de superfície/áudio ainda exigem teste manual.
- Layouts em 1366, 768, 390 e 320 px, claro/escuro, com mídia ativa, sem overflow.
  A inspeção corrigiu a coluna estreita do tablet, a quebra excessiva dos estados
  no celular e o esticamento vertical do painel de tela. Estilos restritos a Call.
  Capturas e estatísticas ficam em `.vercel/`, ignoradas pelo Git.
- Instabilidades do teste foram isoladas: espera de animações infinitas substituída
  por espera apenas de animações finitas e limite por etapa; estatísticas readonly
  copiadas antes da injeção de pressão. Não se aumentou o timeout para mascarar falha.
  As capturas finais voltam ao topo para evitar que o screenshot de página inteira
  inclua o link fixo de acessibilidade que está fora da viewport. O link não foi alterado.
- Uma repetição encontrou desconexão real por rate_limited na entrada. A referência
  instrumentada, sem guardar payloads, registrou pico de 91 mensagens/10 s e 84 ICE
  em um participante. A proteção original foi mantida; a correção usa max-bundle,
  com contadores de pico no teste e verificação de renovação da configuração RTC.
  Após a correção, as 11 regressões passaram. Mais três repetições consecutivas
  com cinco participantes passaram, com picos de **45, 41 e 41 mensagens/10 s**,
  quatro pares conectados e recepção real em cada execução. Não houve falha restante.
- As oito capturas finais foram inspecionadas visualmente nos dois temas. Artefatos
  finais: `.vercel/call-stage4-bundled-call-*` e `.vercel/call-stage4-stability`;
  referências anteriores/falhas foram preservadas, incluindo a medição com política balanced.
- `git diff --check` aprovado. Sem alteração nas outras áreas ou dependências.

## Arquivos desta etapa

- Backend: `backend/app/call_protocol.py`, `call_signaling.py`, `call_boundary.py`.
- Python: `backend/tests/test_call_media.py` (novo), `test_call_voice.py`,
  `test_call_signaling.py`, `test_call_infrastructure.py`.
- Frontend: `frontend/src/call/capture.ts` (novo), `page.ts`, `voice.ts`,
  `protocol.ts`, `signaling.ts`; `frontend/styles/_call.scss`.
- Playwright: `frontend/tests/call-media.spec.ts` (novo), `call-voice.spec.ts`.
- Este documento. Nenhuma alteração em Calculadoras, Ações, Renda Fixa, Times ou Learn.
- `vercel.json`: somente bloqueio de deploy Git da branch `codex/2t-call-stage-0`;
  comandos de build, runtime, headers e regras das demais branches preservados.

## Publicação restrita ao GitHub

A consulta remota Vercel retornou 404/403 pelo conector; CLI instalada/autenticada
não estava disponível, e nenhum pacote foi instalado. Para cumprir a restrição de
não publicar mesmo ao fazer push, foi declarada `git.deploymentEnabled` como false
**apenas para esta branch**, conforme a [configuração oficial](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled).
Não se alterou a configuração remota, o DNS ou a main. A limitação de acesso impede
auditar o histórico de previews remotos; não foi executado comando de deploy.
Ao planejar a Etapa 5, revisar essa regra antes de decidir onde homologar/publicar.

## Executar no Windows

Com Node, dependências npm e o ambiente Python das etapas anteriores preparados:

```powershell
powershell -NoProfile -File scripts/2t-call.ps1 -Mode Local
```

O launcher faz o build, solicita a credencial de forma oculta e informa o endereço
local `http://127.0.0.1:8001/#/call`. Crie sala, copie convite e aprove participantes.
Cada pessoa entra na chamada antes de ativar microfone/câmera/compartilhamento.
Para conferir/parar, use o mesmo script com `-Mode Check` / `-Mode Stop`.
Não digite a credencial no chat, no código, na URL ou em parâmetros de linha de comando.

Testes automatizados usam credencial exclusivamente sintética em CALL_TEST_ADMIN_KEY,
CALL_TEST_URL e CALL_TEST_LOCAL_TLS=1 para o certificado de loopback. Não desative
verificação TLS para um servidor público. Rode os arquivos Call isoladamente ou
reinicie o serviço de teste entre suítes para respeitar os limites de criação/upgrade.

## Pendências antes da Etapa 5

O proprietário adiou o teste físico; não foi reaberto túnel público nesta execução.
A preparação HTTPS/WSS e sua verificação externa da Etapa 3.5 continuam preservadas.
Pendentes: duas redes/dispositivos reais, sessão prolongada, seletor nativo, câmera
física, áudio de abas/janelas/sistema e comportamento de bateria/CPU/upload reais.
TURN não está configurado e relay não foi demonstrado. STUN pode ser insuficiente
sob NAT/firewalls restritivos; um relay precisará de configuração e teste concreto.
Não houve contratação, criação de serviços ou cobrança. Túnel temporário não é
hospedagem permanente; TURN pode cobrar banda/servidor e não há garantia de R$0.
A Etapa 5 não foi iniciada e a produção permanece inalterada.
