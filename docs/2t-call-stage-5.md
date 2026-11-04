# 2T Call — Etapa 5: integração Render e prévia privada

Data da revisão: 04/11/2026. Branch `codex/2t-call-stage-0`, base `c4c897f` preservada.
**Prévia publicada e testada; publicação definitiva pendente.** O proprietário
implantou o sinalizador no Render. Nesta retomada o agente criou somente uma prévia
no projeto Vercel existente, sem contratação, cartão, merge na main ou alteração de DNS.
O bloqueio de deploy automático da branch em `vercel.json` permanece ativo.

## Integração real validada em 04/11/2026

- Render: https://twot-call.onrender.com; health `/call/health`.
- WSS: `wss://twot-call.onrender.com/call/ws`.
- Prévia: https://matheus2t-h36wjiv6h-matheus2ts-projects.vercel.app/#/call.
- Deployment: `dpl_6NVguYN7JyG6NWreebpyqpP5L4Yp`, ambiente **Preview**, READY.
- Fonte enviada: `b6765a06f4774e921521a4a1e8b8c82a1b91512a`, branch do Call.
- Vercel: projeto `matheus2t`, `prj_nNppFpQ5k2AUn0qNH7Hmrylw5FQ3`, equipe
  `matheus2ts-projects` / `team_dSOvL9KTwoa3AOEZ2YMhQKQa`.
- `CALL_SIGNAL_URL` salvo como **Config**, somente Preview, branch
  `codex/2t-call-stage-0`. Mesmo valor fornecido ao build desta prévia.
- O proprietário confirmou esta lista exata no Render, sem alterar CALL_ADMIN_KEY:

```text
CALL_ALLOWED_ORIGINS=https://matheus2t.com.br,https://matheus2t-h36wjiv6h-matheus2ts-projects.vercel.app
```

| Fronteira testada | Evidência |
| --- | --- |
| Health Render | HTTP 200, status ok, modo single-process, media false |
| WSS com Origin de produção e da prévia | 101; origem indevida recusada com 403 |
| Rotas internas Render | `/.env`, `/docs`, `/api/health`: 404 |
| Criar sala sem autorização | Recusado com unauthorized; nenhuma sala criada |
| Acesso anônimo à prévia | 302 para autenticação Vercel, sem remoção da proteção |
| Prévia autenticada | HTML, call-config.js, bundle.js, styles.css, SVG e API health: 200 |
| Navegador → Render → interface | WSS real, erro de credencial sintética inválida exibido, formulário limpo |
| Criação/aprovação real autenticada | Pendente: proprietário não pôde executar o teste manual nesta sessão |

O teste de prévia usa OIDC temporário somente nos pedidos à sua origem Vercel;
nenhum header de autenticação/cookie foi enviado ao Render. Traces de rede ficam
desligados. O arquivo temporário de OIDC foi removido; nenhum segredo foi versionado.
Não se usou nem se consultou a chave privada do proprietário em automação.

## Arquitetura e implementação

- Site/API financeira continuam na Vercel, com Lit/TS/SCSS/esbuild e FastAPI atuais.
- Call usa um sinalizador independente, um processo Uvicorn/worker/instância, salas
  em RAM, até cinco participantes e nenhum banco, Redis ou mídia no servidor.
- O container dedicado copia somente os módulos Call e executa como usuário sem root.
  A inicialização respeita PORT, limita frames/filas e não imprime erros com segredos.
- Nova aba **2T Call**, rota `/#/call`. Demais páginas e cálculos preservados.
- `CALL_SIGNAL_URL` é configuração pública de build, exata `wss://host/call/ws`.
  `call-config.js` contém somente esse endereço. URLs com credenciais, query ou
  fragmento são recusadas. CSP acrescenta somente o HTTPS/WSS da origem escolhida.
- Site público sem endpoint configurado recusa iniciar Call, em vez de enviar a
  credencial para o backend financeiro. O launcher local mantém configuração própria.
- Origem separada faz GET anônimo de health antes de abrir WSS, somente após ação
  do usuário. Aguarda até 90 s, cancela na saída da rota e trata indisponibilidade.
  Não há pings para evitar a suspensão do provedor.
- Reiniciar o processo perde as salas. O cliente informa sessão indisponível,
  limpa pares/mídia e exige nova sala/convite; não finge persistência entre instâncias.
- Runtime exclusivo atualizado para FastAPI 0.162.0, Starlette 1.10.0, Uvicorn
  0.54.0 e pydantic-settings 2.16.2; httpx 0.28.1 mantido. O backend financeiro
  não teve dependências alteradas. Cleanup WSS protegido da propagação de cancelamento
  AnyIO, liberando tarefas, leases e contadores também no encerramento do ASGI.

## Infraestrutura avaliada na preparação

| Critério | Render Free / Hobby | Koyeb Free / Eco | Oracle Always Free |
| --- | --- | --- | --- |
| Compute gratuito | 0,1 CPU / 512 MB, 750 horas/workspace/mês | 0,1 vCPU / 512 MB / 2 GB, uma instância grátis | A1: até 2 OCPUs / 12 GB no total; confirmar elegibilidade/capacidade |
| Inatividade | Suspende após 15 min sem tráfego de usuário | Grátis suspende após 1 h; conexões mantidas impedem scale-to-zero | Pode recolher VM considerada ociosa numa janela de 7 dias |
| Reativação | Cerca de 1 min, sem garantia medida neste projeto | Docs indicam cold start de VM tipicamente 1–5 s; WS usado para acordar pode durar poucos minutos | Recolhimento não é um simples cold start; pode exigir novo provisionamento |
| 24 h pronto | Não garante | Free não garante; Eco pago exige avaliação | VM enquanto provisionada; sem garantia contra recolhimento/capacidade |
| FastAPI / WSS | Container/processo persistente; TLS gerenciado | Container/Python e conexões persistentes | VM com TLS/proxy/firewall mantidos pelo proprietário |
| Instâncias / reinício | Uma grátis; reinícios/deploys perdem RAM | Uma grátis; restart/scale-zero perde RAM | Fixar uma VM/worker; reinícios perdem RAM |
| Transferência | Hobby inclui 5 GB/mês; build/banda compartilhados no workspace | 100 GB/mês, depois US$0,04/GB | Cota de saída anunciada 10 TB/mês; conferir região e itens elegíveis |
| Cartão / excedente | Só prosseguir sem método de pagamento: cota esgotada suspende serviço/bloqueia novos builds | Exige cartão; FAQ não oferece teto rígido de gasto | Cartão de verificação; não fazer upgrade PAYG ou usar recursos pagos |
| Custos pagos avaliados | 512 MB/0,5 CPU US$7/mês, fora do teto de planejamento | Eco Nano US$1,61/mês antes de câmbio/tributos/banda; ausência de hard cap impede aprovação | Não habilitar plano pago para obter capacidade |
| Região / Brasil | Virginia preparada; sem RTT externo medido | Free Washington ou Frankfurt; sem RTT medido | Home region elegível; verificar disponibilidade no Brasil na conta |
| Limites de app | 1 sala no blueprint, 5 pessoas; limites de sockets/mensagens mantidos | Mesmos limites de app se adotado | Mesmos limites; administração de SO/porta/TLS adicional |
| Operação | Simples, health check e notificações nativas; sem SLA gratuito | Simples, mas cobrança variável e particularidades de wake-up | Mais complexa: SO, patches, backups de config, TLS e capacidade |

Fontes oficiais: [Render Free](https://render.com/docs/free),
[compute](https://render.com/docs/compute-plans), [preços](https://render.com/pricing),
[banda](https://render.com/docs/outbound-bandwidth), [regiões/blueprint](https://render.com/docs/blueprint-spec),
[WSS](https://render.com/docs/websocket), [Koyeb instâncias](https://www.koyeb.com/docs/reference/instances),
[scale-to-zero](https://www.koyeb.com/docs/run-and-scale/scale-to-zero),
[Koyeb custos/cartão/limites](https://www.koyeb.com/docs/faqs/pricing),
[Oracle cotas/recolhimento](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm),
[Oracle conta gratuita](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm).

**Escolha ativa para homologação:** Render Free, implantado pelo proprietário.
O agente não cadastrou cartão nem consultou dados de cobrança da conta Render.
Precisa aceitar espera inicial e possibilidade de suspensão;
isso não aprova disponibilidade continuamente pronta. Se o cadastro exigir cartão,
não adicioná-lo nem prosseguir sem confirmar contenção real de todos os excedentes.
Nenhuma opção pesquisada comprovou conjuntamente disponibilidade continuamente
pronta, custos rigidamente limitados a R$20 e baixa complexidade. Decisão permanece
pendente; não se faz upgrade silencioso ou carga artificial na Oracle.

## TURN e custo

Cloudflare Realtime TURN anuncia 1.000 GB/mês grátis e US$0,05/GB depois, contabilizando
dados do edge para o cliente TURN, inclusive overhead. STUN é gratuito. A chave de
API não é uma credencial coturn: o adaptador usa o endpoint oficial de geração.
As credenciais são curtas (até 600 s neste app, limitadas à sala), entregues somente
a aprovados. Chamadas HTTP saem do lock, com concorrência limitada, cache e cooldown
de falha; URLs/forma/tamanho são validados e erros não expõem token ou corpo remoto.
API aceita TTL até 48 h, mas o app não usa esse máximo. TURN oferece UDP/TCP/TLS
com portas 3478, 443, 80 e 5349 conforme protocolo/URL retornados pelo provedor.
Encerrar a sala impede novas emissões; credenciais já entregues só expiram no TTL.
A revogação antecipada pela API do provedor não foi implementada.

**TURN real não configurado.** O blueprint usa `CALL_TURN_PROVIDER=none`.
Não foi comprovado hard cap financeiro de Cloudflare TURN. Limites de packets/s ou
Mbit/s por alocação não são limite de fatura; alertas também não. O adaptador está
testado por contrato HTTP sintético, não foi ativado com uma conta paga/gratuita real.
Não adicionar cartão/ativar cobrança variável até comprovar contenção no provedor.

Fontes: [preços/TTL/contabilização](https://developers.cloudflare.com/realtime/turn/faq/),
[gerar/revogar credenciais](https://developers.cloudflare.com/realtime/turn/generate-credentials/),
[portas e limites técnicos](https://developers.cloudflare.com/realtime/turn/).

### Planejamento para cinco participantes — hipóteses, não consumo medido

- Voz: 20 fluxos direcionais × 64 kbit/s de hipótese = 1,28 Mbit/s.
- Uma tela: 4 × 2 Mbit/s = 8 Mbit/s; cinco câmeras: 20 × 0,6 = 12 Mbit/s.
- Áudio da tela: hipótese 4 × 128 kbit/s = 0,512 Mbit/s.
- Total de referência: 21,792 Mbit/s, cerca de 9,81 GB/h antes de overhead e possíveis
  múltiplas pernas de relay. Bitrates são metas best effort, não limites de fatura.
- Margem de planejamento de 2 pernas × 25% overhead: até ~24,52 GB/h. São ~735 GB
  em 30 h/mês e ~1.471 GB em 60 h/mês. A segunda hipótese excederia 1.000 GB em
  ~471 GB, ou ~US$23,55, antes de câmbio, tributos e outros usos da mesma conta.
- Exemplo de estresse, **não cotação atual nem alíquota oficial**: R$6/USD com margem
  de 10% resulta em ~R$155 para esse excedente. Não serve para autorizar contratação.
- Sinalização sem cartão/Free: alvo de R$0, com suspensão ao exceder cotas. Mídia
  não passa no sinalizador; build/minutos e tráfego de controle ainda contam.
- Sem contratação ou upgrade pago pelo agente, gasto novo efetivamente contratado:
  **R$0**. O teto do proprietário é R$20 para tudo; ele não foi convertido em cobrança
  automática. Câmbio/tributos reais devem ser confirmados antes de qualquer plano pago.

## Configuração e segurança

Arquivos: `render.call.yaml`, `deploy/call/Dockerfile`, `deploy/call/requirements.txt`,
`scripts/start_2t_call.py`; código de configuração só dentro dos módulos Call.
O blueprint fixa Free, uma sala, origem `https://matheus2t.com.br`, sem banco,
sem autodeploy e sem TURN. A origem adicional da prévia foi configurada pelo
proprietário no ambiente, sem alterar o blueprint padrão de produção.

- `CALL_PROXY_MODE=render` só inicia no runtime Render com URL gerenciada compatível.
  Host e HTTPS de borda são validados; sem confiança em X-Forwarded-For arbitrário.
  Os usuários desse edge compartilham o limite conservador de admissão; abusar de
  IPs falsos não reinicia as cotas. Health nativo pode usar HTTP interno, sem segredos.
- CORS de GET health somente para origens configuradas; WSS tem validação própria
  de Origin. Não há CORS curinga, cookie, token na URL ou credencial de API no bundle.
- Hosted exige uma credencial de proprietário de pelo menos 48 caracteres, e
  recusa o identificador sintético conhecido dos testes. Usar 64 caracteres aleatórios
  e exclusivos no Secret/Environment do provedor, nunca valores desta conversa/testes.
- Criação autenticada, convite 256 bits/TTL, aprovação, isolamento, epochs, uma tela,
  limites de tamanho/frequência, filas e cleanup das etapas anteriores preservados.
- Diagnostics/logs não incluem nomes, áudio/vídeo, SDP, ICE bruto ou segredos.
- A credencial existente no Render foi preservada: não foi recuperada, exibida,
  alterada ou usada em testes automatizados. Não trocar a chave por uma sintética
  para facilitar testes. O proprietário deve digitá-la somente na interface/painel.

## Execução e monitoramento

Render e prévia já estão ativos. Para uma verificação pontual sem credenciais:

```powershell
python scripts/check_2t_call.py wss://twot-call.onrender.com/call/ws --origin https://matheus2t-h36wjiv6h-matheus2ts-projects.vercel.app
```

A sonda é de execução única,
sem credencial, sala ou mídia: health/CORS, WSS 101, Origin errado 403 e rotas privadas
404. Não agendá-la para manter um plano gratuito acordado. Health expõe somente
status/modo/boot/uptime e ausência de mídia, sem atividade das salas.

Para reconstruir uma prévia, verificar primeiro o projeto/branch e executar:

```powershell
npx --yes vercel@65.11.0 deploy . --environment preview --project prj_nNppFpQ5k2AUn0qNH7Hmrylw5FQ3 --scope matheus2ts-projects --build-env CALL_SIGNAL_URL=wss://twot-call.onrender.com/call/ws --yes
```

Isso gera outra URL: adicionar sua origem exata ao Render antes do teste. A proteção
Vercel e o bloqueio de autodeploy devem permanecer. Não usar --prod/promote nesta etapa.
A proteção da prévia é independente do convite Call: cada dispositivo de homologação
também precisa de acesso autorizado à prévia. Não compartilhar senha da conta Vercel.

Usar health check nativo Render para reinícios e notificações gratuitas de falha,
   e consultar cotas/build/banda no painel. Alertas não substituem limites de cobrança.
   Nenhum dashboard, plataforma de observabilidade ou ping externo foi contratado.

Em reinício/deploy, uma sala existente não migra: as pessoas recebem sessão encerrada.
Criar outra sala e novo convite. Durante sono gratuito, a primeira pessoa espera a
inicialização; não prometer o mesmo comportamento/tempo de loopback em produção.

### Reproduzir os testes locais

```powershell
npm run build
powershell -NoProfile -File scripts/test-2t-call.ps1 -Mode Start -Python .vercel/call-stage5/runtime/Scripts/python.exe
$env:CALL_TEST_URL='https://127.0.0.1:8444'
$env:CALL_TEST_SIGNAL_URL='wss://127.0.0.1:8443/call/ws'
$env:CALL_TEST_LOCAL_TLS='1'
$env:CALL_TEST_ADMIN_KEY='test-only-owner-credential-not-for-production'
$env:CALL_TEST_PYTHON=(Resolve-Path '.vercel/call-stage5/runtime/Scripts/python.exe').Path
$env:PW_CHANNEL='chrome'
npx playwright test frontend/tests/call-external.spec.ts
powershell -NoProfile -File scripts/test-2t-call.ps1 -Mode Stop
```

A chave acima é exclusivamente sintética e o modo hospedado a recusa. Certificado,
logs, estado de processos e resultados ficam ignorados em `.vercel/call-stage5`.
O script verifica PID, caminho, data de criação e módulo antes de parar os processos.
Para suítes Call separadas, reiniciar as fixtures para respeitar limites de admissão.
Certificados de teste usam a ferramenta opcional cryptography já disponível; não são
certificados públicos. Firefox/WebKit foram obtidos pelo Playwright, sem nova biblioteca
de runtime. WebKit de teste não é Safari/iPhone físico.

Na retomada, o Windows PowerShell recusou o `.ps1` sem assinatura. Não houve
`ExecutionPolicy Bypass`, desbloqueio de arquivos ou mudança de política. O motivo
detalhado da recusa automática anterior não estava disponível; o comando composto
recusado não foi repetido. Ambos os scripts PowerShell passaram no parser, sem execução.
As fixtures Python existentes foram iniciadas diretamente via Uvicorn, uma por comando,
somente em 127.0.0.1. O launcher acima depende da política local permitir sua execução.

Alternativa usada para os testes, sem mudar a política: em um terminal definir
`CALL_ADMIN_KEY` com o valor sintético acima, `CALL_SERVE_FRONTEND=true`,
`CALL_STUN_URLS` vazio, `CALL_TURN_PROVIDER=none`,
`CALL_PUBLIC_ORIGIN=https://127.0.0.1:8443`,
`CALL_ALLOWED_ORIGINS=https://127.0.0.1:8443,https://127.0.0.1:8444` e
`CALL_PROXY_MODE=cloudflare`. Executar o Python isolado com:

```powershell
python backend/tests/call_tls_harness.py .vercel/call-stage5/tls
& '.vercel/call-stage5/runtime/Scripts/python.exe' -m uvicorn backend.tests.call_tls_harness:app --host 127.0.0.1 --port 8443 --workers 1 --no-proxy-headers --ssl-keyfile .vercel/call-stage5/tls/key.pem --ssl-certfile .vercel/call-stage5/tls/cert.pem --ws-max-size 32768 --no-access-log --log-level warning
```

Em outro terminal, iniciar `backend.tests.call_frontend_harness:app` com o mesmo
Python/TLS, porta 8444, sem precisar das variáveis privadas do sinalizador. Confirmar
health antes do Playwright e encerrar esses dois processos próprios no final.
São fixtures locais; não são comandos de hospedagem pública. O ambiente isolado
é descartável/ignorado e precisa ser criado a partir de `deploy/call/requirements.txt`.

## Resultados desta retomada — pré-publicação

| Verificação | Resultado atual |
| --- | --- |
| Typecheck + build com CALL_SIGNAL_URL real | Aprovados; configuração/CSP conferidas |
| Python Call no runtime isolado | 96 aprovados, 6,72 s; um aviso TestClient/httpx |
| Playwright de mídia | 3 aprovados, 21,2 s |
| Playwright de voz | 5 aprovados, 20 s |
| Playwright de salas | 3 aprovados, 26,4 s |
| Playwright externo/interface em loopback | 5 aprovados, 28 s, incluindo restart real do processo |
| Regressão direcionada das demais áreas | 39 aprovados, 48,8 s |
| Playwright da prévia contra Render real | 1 aprovado, 9,1 s |
| Auditoria seca do upload | 519 entradas, 17.445.118 bytes; nenhum caminho privado selecionado |

São **56 verificações Playwright aprovadas nesta retomada**, em execuções direcionadas.
Não somar os 96 Python aos 326 históricos como casos diferentes. Nenhuma suíte completa
foi repetida sem necessidade. Não houve falhas nessas execuções atuais.

`call-render-preview.spec.ts` verifica build/configuração, CSP, WSS nativo real,
recusa da credencial sintética inválida, ausência de mixed content e de autenticação
Vercel em pedidos Render, limpeza do formulário e navegação. Larguras 1366/768/390/320
nos dois temas passaram; capturas da prévia em desktop escuro/celular claro foram
inspecionadas. Receber unauthorized não comprova criação/admissão autenticada de sala.

As mídias foram testadas com WebRTC/RTP nativos entre contextos locais, com áudio
decodificado, frames, cinco participantes, uma tela, qualidade e cleanup. Entradas
são sintéticas: **não são testes de câmera/microfone físicos ou de duas redes**.

Após o proprietário salvar a origem da prévia, o Render respondeu com uptime 51 s,
health 200 e WSS 101. Não houve ensaio de chamada ativa atravessando esse restart.
Não se mediu wake-up após suspensão real de 15 min; apenas os cenários controlados
de indisponibilidade/cancelamento/limite de espera da interface.

O proprietário informou que não pode realizar agora o teste manual de criar sala,
abrir o convite noutra aba e aprovar o segundo participante. Ficou pendente, sem
trocar a credencial do serviço ou usá-la na automação. TURN/relay real, cinco pessoas
em redes externas e sessão física de 30 minutos também permanecem pendentes.

CLI 65.11.0 usado após autorização do proprietário. O plugin Vercel enxergava somente
outro projeto; o CLI confirmou o projeto correto. `env run` falhou neste ambiente;
usou-se OIDC temporário obtido pelo fluxo oficial Development, cuja listagem não
continha variáveis privadas. O arquivo ignorado foi removido após os testes.
Servidores próprios em loopback foram encerrados com identidade verificada.

### Fechamento após a interrupção por limite de uso

- HEAD local/remoto conferidos: `b6765a06f4774e921521a4a1e8b8c82a1b91512a`.
  O teste da prévia e a sonda já estavam publicados; somente este documento faltava
  versionar. Nenhuma funcionalidade foi recriada ou modificada nesta retomada.
- A revisão automática anterior não concluiu por limite de uso; não foi um parecer
  de insegurança. Usaram-se comandos separados, com a revisão normal quando exigida,
  sem mudança de políticas ou contorno de aprovação.
- O deployment existente continuou Preview/Ready. O único teste Playwright
  reexecutado passou novamente (caso: 30,4 s; execução: 32,3 s). É repetição de um
  dos 56 casos acima, não um caso adicional. As suítes aprovadas foram preservadas.
- Sonda externa atual: HTTPS 200, modo single-process, WSS 101, Origin indevida 403,
  rotas internas bloqueadas. Uptime observado: 28 s. O tempo maior é compatível com
  inicialização recente; sem logs administrativos não se atribui a causa a uma
  suspensão específica nem se promete disponibilidade continuamente pronta.
- `git fsck --no-dangling` e `git diff --check` aprovados. Nenhum padrão de chave
  privada/token encontrado no documento pendente. Artefatos estão ignorados;
  não há `.env`, `.pem` ou `.key` versionados. Arquivo temporário OIDC removido.
- Sem testes ou servidores locais remanescentes. Não houve novo deployment,
  alteração de Origin, mudança de credencial, merge ou publicação definitiva.

## Histórico da preparação anterior — base e0de535

Os resultados abaixo pertencem à execução anterior e não substituem os testes
atuais acima. São preservados para rastreabilidade, inclusive falhas e bloqueios.

- Typecheck e build: aprovados, repetidos no fechamento. `git diff --check` aprovado.
  Blueprint YAML válido: plano Free, autodeploy desligado, segredo sem valor e TURN none.
- Python completo: **326 aprovados**, reexecutados na retomada (27,05 s), com
  `PYTHONPATH=backend` e basetemp dentro de `.vercel/call-stage5`. A primeira coleta
  sem esse caminho falhou por importação; foi corrigida a execução, sem alterar o app.
- Runtime isolado: **96 testes Call aprovados**, novamente após a atualização
  (7,35 s). São um subconjunto dos 326, não 96 casos adicionais. Python local 3.13.9;
  Requires-Python das dependências aceita o alvo 3.12 do container, ainda não construído.
  Um aviso de depreciação do TestClient/httpx, sem erro de execução do serviço.
- Chrome Call: **16 aprovados** (voz 5, salas 3, mídia 3, externos/interface 5).
  As quatro verificações externas sem áudio passaram juntas; o caso de áudio foi
  revalidado isoladamente após corrigir a ordem de inicialização da fixture sintética.
- Edge Call: **8 aprovados** (mídia 3; externos/interface 5).
- Chrome/Edge: até cinco contextos, RTP nativo, áudio recebido/decodificado e playback,
  tela e câmera com frames decodificados, áudio da tela separado, uma tela por sala,
  ajuste/restauração de qualidade, entradas/saídas, reconexões e limpeza de tracks/pares.
  Entradas são sintéticas; não provam seletor de tela, microfone ou câmera físicos.
- WebKit Windows: **3 aprovados, 1 ignorado**. Interface, WSS, erros/cancelamento e
  feedback de incompatibilidade passaram. O binário instalado não expõe
  RTCPeerConnection, getUserMedia, getDisplayMedia ou canvas.captureStream.
  A tentativa inicial de mídia falhou; a medição identificou ausência das APIs.
  O caso de mídia agora é ignorado explicitamente por capacidade, nunca contado aprovado.
- Firefox 157/Playwright 1555: **bloqueado**. Três tentativas falharam em
  `browserType.launch: spawn UNKNOWN`, antes das asserções. O executável existe,
  está sem assinatura digital e os logs consultados não demonstraram a causa exata
  do erro de criação do processo. Nenhuma proteção foi alterada. Revalidar em ambiente
  compatível/autorizado; não declarar Firefox homologado.
- Layouts Call revisados visualmente em 1366/768/390/320 px nos dois temas, com
  navegação ativa, sem overflow horizontal. Capturas anteriores foram preservadas.
- Sonda local repetida: HTTPS **200**, WSS **101**, Origin proibido **403**, rotas
  internas **404**. Duas origens HTTPS distintas em loopback, não dois acessos à internet.
- STUN público: um candidato srflx, dois host, nenhum erro; prazo de coleta atingido.
  Confirma descoberta reflexiva, não conexão de mídia entre duas redes nem TURN.
- Regressão geral atual, 42 arquivos/270 casos: **268 aprovados, 1 falhou,
  1 ignorado** (343 s). O ignorado é o TradingView live opt-in (`TV_LIVE=1`);
  não foi contado como teste do provedor real aprovado.
  `distributions.spec.ts:3` falhou ao não encontrar a página de proventos após o
  clique em PETR4. Passou na rechecagem direcionada e nas **5 repetições seguintes**
  (16,8 s), sem mudar código/teste financeiro, timeouts ou dados.
  Assim, 269 casos de regressão têm aprovação entre execuções; a integral atual
  não foi uma execução totalmente verde. A causa da intermitência não foi comprovada.
  Falha e artefatos preservados; exigir nova regressão de release antes de publicar.
- Times: cinco comparações visuais passaram sem trocar goldens. O teste oculta
  temporariamente apenas a nova entrada Call da comparação e restaura depois;
  a entrada é testada separadamente. Código/layout dos Times não foi alterado.
- Auditoria `pip-audit` do manifesto dedicado: **zero vulnerabilidades conhecidas**
  na resolução Windows atual, frente a 14 antes da atualização isolada. Não significa
  auditoria da imagem Linux ou de todas as dependências do backend financeiro.
- Revisão dos arquivos alterados: nenhum padrão de chave privada/token detectado;
  nenhuma credencial de proprietário real foi usada nos testes. Chaves TLS, venv,
  logs e resultados permanecem ignorados; nenhum `.env`, `.key` ou `.pem` versionado.
- Servidores próprios de testes encerrados com identidade verificada. Sem listeners
  nas portas 8123/8443/8444/8445 nem Playwright dessas execuções ao terminar.
- Docker CLI existe, mas daemon não estava disponível e Docker Desktop não foi
  encontrado no caminho padrão. Na retomada, `docker version` confirmou ausência
  do pipe `dockerDesktopLinuxEngine`. **Build da imagem bloqueado**, não aprovado.
- Na preparação anterior, Render real, suspensão real, relay real, 30 min e
  dispositivos físicos não tinham sido testados. A integração externa atual está
  registrada acima; as demais homologações não devem ser inferidas dela.

## Roteiro físico indispensável e liberação

Com a infraestrutura e as origens atuais, iniciar a homologação com STUN ativo e
TURN desligado. Se NAT/firewall impedir mídia, registrar a rede e o diagnóstico; não
contratar relay nesta etapa para contornar o problema.

1. PC no Wi-Fi e celular no 4G/5G, fones para evitar feedback; acessar o site autorizado.
2. Criar sala com a credencial existente do proprietário, digitada somente no
   formulário; copiar convite privado e aprovar a segunda pessoa.
3. Confirmar voz nas duas direções, mute/unmute, câmera opcional e início/fim da tela.
   Selecionar aba com áudio quando suportado; confirmar recepção, não somente a prévia.
4. Entrar com mais três amigos (cinco pessoas), rejeitar uma sexta tentativa, testar
   entrada tardia, saída durante tela, perda/retorno de rede e encerramento pelo navegador.
5. Manter uso por 30 min; copiar apenas diagnóstico sanitizado com RTT/jitter/perda,
   frames/FPS/upload. Confirmar dispositivos liberados no fim.
6. Se TURN vier a ser habilitado numa entrega autorizada, testar relay de verdade.
   Credenciais configuradas não bastam: comprovar candidate-pair relay e mídia,
   incluindo redes restritivas, depois de confirmar contenção financeira.

**Bloqueios para produção:** criação/admissão real com proprietário ainda não
homologadas; dispositivos/redes reais e 30 min ausentes; limitações de
STUN/Render/custo ainda sem aceite final; compatibilidade Firefox e
mídia Safari/WebKit pendentes conforme o histórico. Não fazer merge/deploy definitivo
ou retirar a proteção de preview com esses critérios pendentes.

Próximas ações, nesta ordem:

1. Na prévia, o proprietário cria a sala digitando a credencial diretamente no
   formulário, copia o convite noutra aba/dispositivo e aprova a entrada. Confirmar
   Conectado, 2/5 e encerramento. Não mandar chave ou convite para o chat.
2. Executar o roteiro físico acima, incluindo duas redes, mídias, cinco pessoas,
   30 min, reconexão e wake-up real após inatividade. Sem pings para evitar suspensão.
3. Manter TURN desligado enquanto não houver orçamento rigidamente controlado;
   documentar o aceite das redes que falham sem relay. Não contratar para contornar
   falhas. Revalidar os navegadores bloqueados num ambiente compatível/autorizado.
4. Confirmar versão/logs do serviço na conta Render, testar rollback e regressão
   final; só então integrar à main e liberar produção, se os critérios forem atendidos.
   O agente não teve acesso administrativo aos logs/variáveis internas Render.

## Rollback e manutenção

Main observada antes das alterações: `b4405e3717b02802ed778d85dc87a2c32b780478`.
Checkpoint da implementação anterior Call: `c4c897f339a2271d5f650a9f3ce3b01e8b80437d`.
Commits intermediários preservados no GitHub: `c1190b9` (preparação da infraestrutura)
e `e8cc878` (runtime isolado e cleanup WSS). Testes e este relatório seguem na mesma
branch; a main não foi integrada.
Produção confirmada antes e depois da prévia: `dpl_B2V7ZPKjJdPXGsBJgnFYFxyYe3vE`,
URL `https://matheus2t-91rfb87sq-matheus2ts-projects.vercel.app`, SHA main acima.
O domínio `https://matheus2t.com.br/` continuou HTTP 200. Não houve release de produção.

Antes de publicar: registrar ID da produção ativa e SHA, comparar a main atual,
resolver conflitos preservando ambos os históricos e confirmar artefato anterior
disponível. Em falha de navegação/API, vazamento, custo ou conexão relevante, promover
novamente aquele deployment no painel Vercel; nunca reset/force-push na main.
No Render, reimplantar o último commit validado (Free mantém rollback limitado aos
dois deploys anteriores) ou usar Manual Deploy do SHA conhecido. Isso perde salas,
mas não dados financeiros. Ensaiar retorno em homologação antes de liberar produção.

Para retirar apenas esta homologação, excluir somente o deployment Preview
`dpl_6NVguYN7JyG6NWreebpyqpP5L4Yp` pelo painel, retirar sua origem do Render e,
se desejado, remover só a Config CALL_SIGNAL_URL desta branch/Preview. Preservar
as outras origens, o projeto, a chave e as variáveis Production. Nada disso foi apagado.

Não há PR de integração, merge ou deploy definitivo. O Call está disponível apenas
na prévia protegida; `https://matheus2t.com.br/#/call` não foi publicado nesta etapa.
