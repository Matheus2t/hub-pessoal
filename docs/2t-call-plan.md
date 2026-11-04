# 2T Call — Etapa 0: plano técnico econômico

Base: `main` em `72dca7c`. Somente planejamento; nada implementado ou provisionado.
Objetivo: até cinco pessoas, voz, câmera opcional e tela com áudio quando suportado.
R$ 0/mês é uma meta condicionada à infraestrutura e às cotas, não uma garantia.

## 1. Arquitetura recomendada

- Lit + TypeScript e APIs nativas: `RTCPeerConnection`, `getUserMedia` e
  `getDisplayMedia`. SCSS isolado sob `.call-page`, reutilizando temas existentes.
- WebRTC mesh: cada participante mantém até quatro conexões; cinco pessoas
  formam dez pares. Não usar SFU nem transportar mídia pelo FastAPI na V1.
- Mesh é uma hipótese razoável para cinco vozes; validar upload/CPU antes
  de aprovar cinco câmeras e tela simultaneamente. Câmera começa desligada.
- Quem compartilha envia até quatro cópias da tela. Exemplo de dimensionamento:
  um fluxo de 2 Mbit/s exige cerca de 8 Mbit/s de upload, além dos outros fluxos.
- Recomendar uma tela compartilhada por vez na V1, sujeito à confirmação do escopo.
- Frontend e API atuais continuam na Vercel; MySQL/SQLAlchemy/Alembic permanecem
  na plataforma. Salas efêmeras não precisam inicialmente de tabelas ou gravações.
- Sinalizador mínimo: pequeno processo FastAPI/WebSocket, com estado de salas
  em memória e uma única instância persistente. Preferir máquina já disponível
  e acessível por WSS se houver; não presumir que tal máquina existe ou é gratuita.

## 2. Integração e reaproveitamento

Foram inspecionados somente estes oito arquivos existentes:

| Arquivo | Uso futuro |
| --- | --- |
| `frontend/src/catalog.ts` | Incluir `call` em `Page`, `pages` e reconhecimento do hash. |
| `frontend/src/components/app-shell.ts` | Montar host exclusivo apenas na rota Call; título/breadcrumb existentes. |
| `frontend/src/config.ts` | Padrão de configuração; endereço WSS separado, sem credenciais no bundle. |
| `frontend/index.html` | CSP: autorizar somente o endpoint WSS escolhido; avaliar `media-src` para streams. |
| `package.json` | Build esbuild/SCSS existente; avaliar chunk carregado sob demanda. |
| `backend/app/main.py` | FastAPI existente; separar processo de sinalização do atendimento atual. |
| `backend/app/config.py` | Pydantic Settings/SecretStr, configuração sem segredos versionados. |
| `vercel.json` | Build estático atual e função Python atualmente limitada a 60 segundos. |

Entrada futura: `/#/call`; convite pode usar `/#/call/<room>?key=<segredo>`.
O parser deve aceitar somente esse formato, sem cair silenciosamente em Início.
Carregar a área somente ao entrar e destruir recursos ao sair; nenhum menu novo
ou alteração visual das outras páginas é necessário para o primeiro protótipo.
Manter os tokens/tema atuais; não reutilizar estados financeiros ou do Learn.

## 3. Estrutura mínima futura — não criar nesta etapa

- `frontend/src/call/host.ts`: ponto de entrada e carregamento sob demanda.
- `frontend/src/call/page.ts`: pré-entrada, participantes e controles Lit.
- `frontend/src/call/session.ts`: peers, tracks, negociação e encerramento.
- `frontend/src/call/signaling.ts`: transporte, mensagens tipadas e reconexão.
- `frontend/styles/_call.scss`: estilos exclusivos da área.
- `backend/app/call_signaling.py`: app FastAPI separado, salas, admissão e WSS.
- `backend/tests/test_call_signaling.py` e `frontend/tests/call.spec.ts`.
Alterar apenas os pontos de integração indispensáveis na etapa correspondente.

## 4. Conexão e sinalização

1. Anfitrião autenticado cria sala efêmera; convite aleatório autoriza solicitar entrada.
2. Servidor admite no máximo cinco participantes, contando o anfitrião; reserva
   de vaga atômica, heartbeat, expiração, saída e reconexão sem duplicar vagas.
3. Trocar presença, SDP offer/answer e candidatos ICE por WSS; mídia vai pelos peers.
4. Usar trickle ICE e negociação que resolva ofertas simultâneas; renegociar tracks
   de câmera/tela sem reiniciar a sala e reiniciar ICE quando necessário.
5. Ao sair, parar todas as tracks e fechar peers/socket/listeners; sem gravação.

Vercel já documenta WebSockets em Functions, inclusive FastAPI/ASGI: não afirmar
que a plataforma os proíbe. Porém sockets fecham no limite da função; conexões
podem cair em instâncias diferentes, e RAM não é armazenamento compartilhado.
Não elevar limites nem confiar em afinidade de instância sem prova.
Alternativa ao processo persistente: WSS na Vercel com estado/pub-sub externo
efêmero e reconexão. Isso adiciona dependência, cotas e custos; só escolher após
um teste curto de viabilidade. Polling HTTP também precisaria de estado externo
e geraria requisições; não elimina o problema nem é a opção principal.
Não usar o MySQL local como serviço público nem presumir banco externo disponível.

## 5. Conectividade, privacidade e custos

- STUN auxilia a descoberta de candidatos para atravessar NAT; não retransmite
  mídia e não garante conexão. Servidor público exige verificar política e disponibilidade.
- TURN é o fallback quando não se estabelece rota direta, por exemplo em NATs
  restritivos, CGNAT ou redes que bloqueiam UDP. Prever UDP e alternativas TCP/TLS.
- Sem TURN funcional, declarar conexão limitada e falhar claramente; não anunciar
  confiabilidade entre redes arbitrárias apenas porque funcionou no Wi-Fi local.
- coturn é software livre, mas servidor, IP público, tráfego, energia e manutenção
  podem custar. Provedor gratuito possui franquia, limites e possível suspensão.
- TURN retransmite mídia; 1 Mbit/s contínuo equivale a aproximadamente 0,45 GB/h
  por cópia unidirecional. Conferir como o provedor contabiliza entrada/saída.
- Functions/WSS, estado compartilhado e banda também podem consumir franquias.
  Exigir limite de gasto ou bloqueio real; aviso de consumo não impede cobrança.
- Sem recursos existentes ou cotas suficientes, R$ 0 confiável pode ser inviável.
  Não contratar, cadastrar cobrança ou criar infraestrutura sem autorização.
- HTTPS é obrigatório em produção. Áudio da tela varia por navegador, sistema
  e superfície escolhida; detectar tracks disponíveis, sem prometer áudio universal.
- WebRTC cifra a mídia em trânsito; peers podem conhecer seus IPs. TURN com
  relay obrigatório reduz exposição ao outro peer, com maior consumo/custo.
- Link é uma capacidade de acesso, não prova de identidade: segredo criptográfico
  de pelo menos 128 bits, TTL, revogação e aprovação do anfitrião; sem sala listável.
- Criação autenticada; autorização em toda mensagem, sem escolher outro remetente/sala.
  Validar Origin, tamanho/tipo/frequência; limitar salas, vagas e tentativas.
- Segredo de anfitrião somente no servidor; token de sessão curto e credenciais
  TURN temporárias. Não colocar senha/TURN permanente no bundle ou URL do socket.
- Fragmento do convite não vai no HTTP inicial, mas pode vazar por código cliente:
  sem analytics da rota, logs de tokens/SDP/ICE ou persistência de mídia.
- Acesso a microfone/tela exige ação e consentimento; mostrar estados reais e
  tratar recusa, interrupção do compartilhamento e perda de dispositivo.

## 6. Etapas independentes

1. **Próxima sessão:** decidir hospedagem do sinalizador e fallback TURN; conferir
   cotas, versões compatíveis, estado entre instâncias, prazo da conexão e teto
   de gasto. Qualificar duas redes distintas antes de construir a experiência completa.
2. Sinalização local privada: admissão, cinco vagas, validação, expiração e reconexão;
   testes de isolamento e concorrência. Sem mídia nesta entrega intermediária.
3. Voz mesh com duas pessoas; depois cinco, medindo perdas, CPU, upload e ICE.
4. Tela/áudio e câmera opcional: negociar tracks e testar suporte/fallback por navegador.
5. Interface `/#/call` isolada: pré-entrada, mute, câmera/tela, sair e erros acessíveis.
6. Homologação de cinco pessoas, segurança, limites e consumo; publicação só autorizada
   após comprovar conectividade e custos. SFU fica para reavaliação se mesh falhar.

## 7. Critérios de pronto

- Cinco pessoas em redes distintas conversam; sexta entrada é recusada pelo servidor.
- Tela funciona nos navegadores acordados; áudio é validado onde suportado e
  a ausência dele é informada. Câmera opcional funciona junto ao fluxo aprovado.
- Demonstrar caminho direto e relay TURN real, reconexão e encerramento limpo.
- Testar convites expirados/revogados, mensagens cruzadas e abuso de criação/entrada.
- Verificar desktop/celular, temas, teclado, permissões e consumo em sessão prolongada.
- Aceitar orçamento e limitações explicitamente; nenhuma promessa de gratuidade ilimitada.
- Typecheck/build e testes relevantes aprovados, sem regressão das áreas existentes.

Referências essenciais, consultadas em 03/11/2026:
[Vercel WSS](https://vercel.com/docs/functions/websockets),
[WebRTC/ICE](https://webrtc.org/getting-started/peer-connections),
[TURN](https://webrtc.org/getting-started/turn-server),
[captura de tela](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia).
