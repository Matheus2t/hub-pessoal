# 2T Call V4 — UX, salas simples e continuidade no site

## Mudanças

- **Antes de entrar**: a área inicial mostra apenas a sala permanente (ocupação, entrada por senha) e a criação/entrada de sala privada. O palco de tela, a lista de participantes e os controles de mídia ficam ocultos até haver sessão.
- **Sala privada sem credencial master**: qualquer visitante pode abrir uma sala temporária, receber convite, aprovar ou rejeitar convidados e encerrá-la como anfitrião. O backend mantém limites de criação, ocupação, duração, origem, conexão e convites. O token do anfitrião é de sessão e permanece só na memória.
- **Sala permanente**: a administração continua protegida por credencial de proprietário, exclusivamente na tela de gerenciamento. A credencial não é exigida para criar salas privadas. A senha de entrada passa a aceitar 5 a 128 caracteres; Argon2id e rate-limit por falhas continuam ativos. Salas e senhas já existentes no D1 não são modificadas automaticamente.
- **Chamada durante navegação**: o `call-page` fica montado no `app-shell`. Ao abrir Calculadoras, Ações, Learn ou outra rota, a mídia continua conectada e um mini-player de chamada permanece disponível, com status, ação de microfone, retorno e saída. Fechar/recarregar a aba ou encerrar o navegador interrompe a sessão, por limitação da plataforma Web.
- **Design**: layout de entrada mais conciso e responsivo, cartões com melhor hierarquia, ações únicas e palco visível somente durante chamadas. Identidade 2T monocromática e navegação do restante do site preservadas.

## Regras de segurança e compatibilidade

- O campo `admin` em mensagens antigas de criação privada permanece **opcional**, apenas para compatibilidade; nunca concede privilégios de administração de sala permanente.
- O canal permanente ainda exige `CALL_ADMIN_KEY` para operações administrativas. Não remover a proteção do backend.
- Novas salas privadas são limitadas a cinco criações por janela e aos limites de salas e conexões existentes. A produção Render usa um orçamento conservador por borda.
- O compartilhamento de tela, microfone, câmera, WebRTC, limites por sala e D1 não migram para novo banco.
- A credencial do proprietário não é persistida no navegador e é limpa do formulário depois de cada operação administrativa.
- `call-page` permanece vivo apenas durante a navegação interna via hash. Sair explicitamente da chamada, fechar a aba ou recarregar a página ainda libera a mídia.

## Testes e validação

- O PR V4 executa `npm run build` e regressões Python do Call.
- O CI também executa Playwright com certificado TLS local, WebSocket real, SQLite de teste e mídia sintética, cobrindo sala permanente, V4 privada sem chave, alternância de rota e senha de cinco caracteres.
- Testes em celulares físicos, redes diferentes, browser em background em sistemas móveis e compartilhamento de áudio externo exigem validação real.
- Para lançamento, implantar primeiro o backend compatível no Render, verificar `/call/health` e `/call/lobby`, depois promover o frontend na Vercel. Não desativar D1 ou o histórico do GitHub.

## Rollback

Guarde SHA/deployment Live anterior do Render e deployment Production READY anterior da Vercel. V4 backend é compatível com clientes V3.1. Em caso de rollback, volte o frontend antes do backend; não apague o D1 e não publique credenciais.
