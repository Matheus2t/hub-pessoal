# 2T Call — Etapa 3.5: conexão externa preparada

Branch: `codex/2t-call-stage-0`. Base: `dbcdc41`. Avaliação em 03/11/2026.
**Status: infraestrutura preparada e testada localmente; túnel público autorizado
pelo proprietário, com validação externa e homologação física PENDENTES.** Não houve merge, deploy na Vercel, contratação ou cadastro de cartão.
Etapas 0–3 preservadas. Tela/câmera remotas e Etapa 4 não iniciadas.

## Uso no Windows

Na raiz do repositório, com Python/Node e as dependências existentes instaladas:

```powershell
.\scripts\2t-call.ps1 -Mode Check
.\scripts\2t-call.ps1 -Mode Local
```

O segundo comando executa build, pede uma credencial exclusiva (mínimo 32 caracteres,
entrada mascarada), inicia um único Uvicorn em loopback e informa a URL de acesso.
Padrão: `http://127.0.0.1:8001/#/call`. Mantenha a janela aberta.
Use `-SkipBuild` apenas quando o build atual já estiver aprovado.
Não envie a credencial pelo chat nem a compartilhe com convidados.

Para preparar o acesso externo **sem iniciar nenhum processo**:

```powershell
.\scripts\2t-call.ps1 -Mode External
```

Somente depois da autorização explícita do proprietário, feche a sessão local e use:

```powershell
.\scripts\2t-call.ps1 -Mode Stop
.\scripts\2t-call.ps1 -Mode External -ApproveExposure
```

Esse comando autorizado pede **nova credencial própria**, abre um Quick Tunnel e mostra
`https://<hostname-gerado>.trycloudflare.com/#/call`. O endereço só existe após executar
o túnel; nenhum hostname público foi criado nesta preparação.
O anfitrião e o celular devem abrir esse mesmo endereço HTTPS, não localhost.
Antes de apresentar a URL como pronta, o iniciador confere health/HTML por HTTPS
e handshake WSS públicos, sem enviar credencial nem criar participantes.
Crie sala, copie o convite pelo botão, envie-o ao amigo e aprove sua solicitação.
Cada pessoa clica “Entrar na chamada” e ativa o próprio microfone quando quiser falar.

Para encerrar completamente, Ctrl+C na janela do iniciador, ou, em outra janela:

```powershell
.\scripts\2t-call.ps1 -Mode Stop
```

O túnel para antes do servidor. PID, executável e horário de criação são conferidos
para não encerrar processos alheios/reutilizados. Não há kill genérico nem limpeza
recursiva. Erros de início encerram os filhos criados. O iniciador também encerra
tudo automaticamente após 90 minutos (`-Minutes`, entre 5 e 180).
Se a janela for terminada à força, use Stop em outra janela para fechar órfãos.
O script recusa porta ocupada e uma segunda sessão; não reutiliza servidor desconhecido.

## Dependências e limites do túnel

- `cloudflared` portátil **2026.10.7** foi preparado em `.vercel/2t-call/bin`, com SHA256
  conferido contra o digest da release oficial. Executados somente versão e ajuda.
  O binário e seu registro local não são versionados; não houve instalação global.
- O iniciador aceita esse portátil verificado ou `cloudflared.exe` no PATH, na versão
  validada ou posterior. Em outro computador, instale uma vez pelo canal oficial:

```powershell
winget install --id Cloudflare.cloudflared --exact
```

[Downloads oficiais](https://developers.cloudflare.com/tunnel/downloads/).
Windows não recebe atualização automática do cloudflared; manter a versão é responsabilidade local.
Nenhuma dependência Python/JavaScript nova foi adicionada ao funcionamento do produto.

O [Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)
dispensa conta/domínio, fornece hostname temporário, não tem garantia de disponibilidade
e limita requisições simultâneas a 200. A URL muda a cada execução; computador e
internet precisam permanecer ativos. Não é hospedagem definitiva nem servidor TURN.
[WebSockets são suportados pelo proxy Cloudflare](https://developers.cloudflare.com/network/websockets/).

O frontend oficial continua na Vercel. O túnel serve somente uma **prévia temporária
do build local da branch** para testar o Call; não migra o site ou altera DNS/produção.
Somente shell, assets essenciais e endpoints Call são liberados nesse modo.
Não usar o túnel para navegar ou validar as outras áreas da plataforma.

## Segurança da preparação

- O switch `-ApproveExposure` é obrigatório; sem ele o modo External só descreve o plano.
  O script nunca abre o túnel como consequência de Check, Plan ou Local.
- Credencial em RAM/ambiente do Uvicorn, nunca em argumento, link, log ou arquivo.
  Chaves com prefixo público `test-only-` são recusadas no modo externo.
- O conector não herda variáveis `CALL_*`; segredo TURN não é entregue a ele.
- Porta reservada antes da descoberta do hostname, evitando expor um serviço já ativo.
- `CALL_PUBLIC_ORIGIN` e `CALL_ALLOWED_ORIGINS` recebem a URL HTTPS exata descoberta;
  não há wildcard para `trycloudflare.com` nem relaxamento de Origin.
- `CALL_PROXY_MODE=cloudflare`: aceita cabeçalhos só do conector em loopback,
  usa [CF-Connecting-IP](https://developers.cloudflare.com/fundamentals/reference/http-headers/)
  validado e ignora `X-Forwarded-For` arbitrário.
  Uvicorn roda com **--no-proxy-headers**; não ligar confiança irrestrita em proxies.
- Host exato, redirecionamento HTTP para HTTPS e rejeição de WS inseguro; CSP local
  aponta ao WSS da mesma origem. Origens inválidas falham na configuração.
- Modo público bloqueia módulos financeiros, outros bundles, source maps, .env e APIs
  não relacionadas. Sem cache, indexação ou embedding; câmera permanece desabilitada.
- Permanecem aprovação do anfitrião, cinco vagas atômicas, tokens temporários, limites
  de frequência, heartbeat, expiração e isolamento entre salas.
- Logs de aplicação em warning, sem access log; cloudflared em info, nunca debug.
  Erros de configuração ocultam os valores de entrada para não revelar segredos.
- Estado de processos e logs operacionais ficam ignorados em `.vercel/2t-call`.
  O registro contém modo, URL, PID, executável e horário, sem credencial ou convite.

## STUN, TURN e diagnóstico

STUN padrão: `stun:stun.cloudflare.com:3478`. A sondagem externa, sem microfone ou sala,
obteve **2 candidatos host e 1 srflx**, sem código de erro. A coleta foi encerrada pelo
limite de 12 segundos; houve mapeamento externo, mas não se provou um par entre redes.
Repetição opcional: `node scripts/check-2t-call-stun.cjs`. O script nunca imprime IP/SDP.

Na chamada, abra **Verificar conexão**: cada par mostra Direta, Via relay ou Aguardando.
Copiar diagnóstico inclui somente estados, contadores RTP, perda, jitter, RTT e
tentativas, sem nomes, IDs, endereços, ICE bruto, SDP, credenciais ou convites.
Um caminho direto pode usar host/srflx/prflx; só candidato relay indica uso de TURN.
Os dados são locais e não são enviados para analytics ou persistidos pelo backend.

**TURN real: NÃO CONFIGURADO / NÃO TESTADO.** STUN e HTTPS/WSS não substituem relay.
CGNAT e firewalls podem impedir áudio mesmo com sala/presença funcionando.
O túnel não transporta mídia WebRTC nem publica UDP de um coturn doméstico.

Opções avaliadas, sem criar conta nem adaptar provedor nesta etapa:

- **coturn REST**: o suporte atual de credenciais HMAC temporárias é compatível.
  Só oferece R$ 0 incremental se já houver máquina/IP/acesso/banda adequados.
  Precisa de limites de banda/alocação, manutenção e TLS. Não foi instalado/exposto.
- **Cloudflare TURN gerenciado**: [FAQ oficial](https://developers.cloudflare.com/realtime/turn/faq/)
  informa franquia de 1.000 GB e US$ 0,05/GB posterior. Não é garantia de custo zero
  ou teto automático. Exigiria conta, confirmação das condições e adaptador próprio,
  pois não aceita simplesmente o segredo coturn. Não escolhido/autorizado.

Recomendação: testar primeiro o túnel + STUN. Se houver falha de rota direta,
o proprietário deverá escolher e autorizar um TURN com limite de consumo confirmado.
Não ativar cartão, overage ou relay público compartilhado para contornar a pendência.

## Hospedagem futura recomendada: Render Free, condicional

Somente o sinalizador; frontend permanece na Vercel. Sem Redis, banco ou SFU.

| Aspecto | Condição atual / impacto |
| --- | --- |
| Runtime | FastAPI/Uvicorn; WSS e TLS gerenciado. |
| Compute | Free: 0,1 CPU e 512 MB, sem escala além de uma instância. |
| Ociosidade | Suspende após 15 min sem tráfego; despertar pode levar cerca de 1 min. |
| Horas | 750 horas gratuitas/mês por workspace, compartilhadas. |
| Continuidade | Pode reiniciar a qualquer momento; salas em RAM são perdidas. |
| WebSocket | Sem duração máxima imposta, mas pode cair em reinícios/manutenção. |
| Cotas Hobby atuais | 5 GB de saída e 500 min de build/mês; confirmar plano/conta antes de criar. |

Fontes: [Free](https://render.com/docs/free), [compute](https://render.com/docs/compute-plans),
[WSS](https://render.com/docs/websocket), [bandwidth](https://render.com/docs/outbound-bandwidth),
[planos](https://render.com/docs/platform-features-by-plan).

Heartbeat conta como tráfego durante a sessão; não criar pings artificiais para evitar
suspensão sem uso. Sem método de pagamento, exceder cotas suspende serviços/builds;
com método cadastrado podem existir cobranças adicionais. Aviso não é teto de gasto.
Recomendo Free apenas para uso pessoal tolerante a indisponibilidade e perda de salas,
após confirmar ausência de faturamento e cotas no workspace do proprietário.

Configuração futura, **não executada**: build `pip install -r backend/requirements.txt`,
start `python -m uvicorn backend.app.call_signaling:app --host 0.0.0.0 --port $PORT --workers 1 --ws-max-size 32768 --no-access-log --log-level warning`.
Credencial em variável secreta; `CALL_SERVE_FRONTEND=false`, Origin HTTPS exato do
frontend. Antes do deploy, validar os proxies Render e preparar URL WSS/CSP do
frontend para a origem escolhida. Não inventar endpoint nem usar proxy Cloudflare nesse host.
Somente após autorização serão criados recurso, configuração final e adaptação mínima
do endpoint cliente. Este estágio não publicou Render nem modificou a Vercel.

## Validações desta execução

- Typecheck e build aprovados; diff sem erros.
- **289 testes Python** na suíte completa; incluem 60 de salas/voz/fronteira pública
  e 4 do iniciador (porta ocupada, trava de exposição, PID reutilizado e início/Stop).
- **8 Playwright aprovados sobre HTTPS/WSS reais em loopback**: cinco cenários de voz
  e três de salas/layout. Certificado local descartável; somente cabeçalhos e hop do
  conector foram simulados, não o RTCPeerConnection, WebSocket ou codec.
- Cinco participantes, sexto recusado, reservas simultâneas, áudio sintético recebido
  e reproduzido, mute/unmute, ICE fora de ordem, glare, restart, perda de heartbeat,
  saída, encerramento e limpeza. Diagnóstico seguro e caminho direto verificados.
- Temas/layout desktop e celular inspecionados. Mudanças restritas ao Call/testes/scripts/docs;
  funcionalidades financeiras, Times, Learn, início, banco e configuração Vercel preservados.
- Teste TLS usa `backend/tests/call_tls_harness.py`, certificados ignorados e
  `CALL_TEST_LOCAL_TLS=1` apenas nos testes. Não desabilita TLS na aplicação real.
- Cloudflared teve apenas ajuda/versão executadas; flags verificadas na versão oficial.
  A abertura foi autorizada pelo proprietário após essa preparação; a validação
  do Quick Tunnel real é registrada na retomada abaixo.

## Homologação física — PENDENTE (preencher após autorização)

1. Executar External autorizado com chave nova. Computador no Wi-Fi; celular com
   Wi-Fi desligado e 4G/5G ativo. Usar fones e o mesmo endereço HTTPS do túnel.
2. Criar sala no computador; convidar/aprovar o celular. Ambos entram na chamada,
   ativam o microfone e confirmam fala/escuta nas duas direções.
3. Silenciar cada lado, religar e conferir no outro. Testar ouvir sem microfone e
   liberar autoplay se necessário. Verificar Direta/relay em ambos e copiar diagnósticos.
4. Manter 30 min: anotar perda/jitter/RTT, quedas e qualidade audível. Testar aba em
   segundo plano/bloqueio da tela; não presumir execução contínua em celulares.
5. Derrubar a rede de um dispositivo e restaurar; verificar reconexão ou erro claro.
   Sair/reentrar por convite sem afetar os demais. Depois repetir com cinco pessoas.
6. Encerrar a sala, Stop e confirmar microfones desligados, túnel offline e processos
   encerrados. Se falhar por NAT/firewall, registrar TURN pendente sem culpar a sala.

| Teste real | Resultado |
| --- | --- |
| URL pública / criação / convidados por WSS | PENDENTE — autorizado, inicialização em retomada |
| Wi-Fi ↔ 4G/5G, fala/escuta e mute | PENDENTE — dispositivos do proprietário |
| 30 minutos e reconexões físicas | PENDENTE |
| Cinco pessoas reais | PENDENTE |
| TURN/relay real | PENDENTE — provedor e configuração autorizados |

Nenhum desses itens físicos foi marcado como aprovado por testes sintéticos.

## Retomada em 04/11/2026

- Os 13 arquivos da preparação já estavam preservados nos commits `3b6fb60` e
  `0586411`, disponíveis no GitHub; não havia alterações locais a descartar.
- Não havia túnel, servidor público ou janela anterior ativos. A credencial não
  foi recuperada de arquivo/processo: ela nunca é persistida. É necessário
  redigitá-la somente na nova janela mascarada do proprietário, sem enviá-la ao chat.
- A autorização externa continua válida; não foi solicitada novamente.
- Encontrada corrida Windows: `Process.Path` podia ser nulo logo após iniciar um
  filho, causando recusa indevida do Stop. Corrigido em `ff4fa32`: registrar o caminho
  exato usado no lançamento; preservar a checagem de PID, criação, executável e CLI.
  Novo teste determinístico cobre o caminho nulo. Processo órfão do teste removido
  somente após comprovar a identidade e a porta daquele teste.
- Build/typecheck aprovados; suíte completa: **290 testes Python aprovados**.
  Verificação de arquivos Call não encontrou padrões de chaves privadas/tokens;
  nenhum `.env`, `.pem`, registro de sessão ou log foi versionado. Logs operacionais
  existentes estavam vazios. Isso não substitui a regra de não ler/exibir credenciais.
- A nova janela interativa pede a credencial localmente. Um estado operacional
  ignorado registra apenas fase, PID e eventual tipo/linha de erro, sem mensagens
  de exceção ou valores privados. Em erro transitório, pode repetir sem gravar senha.
