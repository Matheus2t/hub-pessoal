# Requisitos de segurança dos Utilitários

Este documento registra controles futuros; não significa que os motores estejam implementados.

## Desencurtador — proteção contra SSRF

- Aceitar somente esquemas HTTP/HTTPS; rejeitar credenciais embutidas, hosts inválidos e endereços IP fora da política.
- Resolver DNS e validar todos os A/AAAA resultantes contra loopback, redes privadas, link-local, multicast, endereços reservados e metadados de nuvem.
- Vincular a validação DNS ao socket/conexão efetiva; não validar um endereço e depois deixar o cliente HTTP resolver o hostname novamente. Revalidar em cada redirecionamento para impedir DNS rebinding e bypass por troca de DNS.
- Desativar redirecionamento automático do cliente; seguir cada salto manualmente, aplicando novamente a política e um limite baixo de saltos.
- Limitar tempo total, conexão, leitura, cabeçalhos e bytes; não baixar corpos de destino. Detectar loops e limitar concorrência e taxa por usuário/IP.
- Restringir portas, normalizar hostnames/IDNs com cuidado e bloquear formas alternativas de IP. Não confiar em `Host`, `Origin` ou reputação como controle contra SSRF.
- Retornar avisos e proveniência. Uma verificação de reputação só pode ser declarada se uma fonte real e autorizada responder; caso contrário, informar que não foi verificada.

## Removedor — upload e inferência

- Validar assinatura real do arquivo e decodificação; não confiar em extensão, nome ou `Content-Type` informado pelo cliente.
- Definir limites publicados de tamanho, dimensões, pixels, quadros, memória, tempo e concorrência antes da implementação. Rejeitar arquivos malformados, bombas de descompressão e formatos não permitidos.
- Processar em worker isolado, sem acesso geral à rede ou ao sistema de arquivos do host; aplicar limites de CPU/GPU e timeout.
- Usar identificadores imprevisíveis e autorização vinculada ao proprietário do trabalho. Não permitir enumerar, consultar, cancelar ou baixar trabalhos alheios.
- Upload e download devem usar URLs assinadas de curta duração, escopo restrito, método e conteúdo fixos; nunca registrar a URL assinada em logs.
- Tornar originais e resultados privados, com exclusão automática verificável e opção de cancelamento/exclusão explícita. Documentar retenção e evitar reutilização para treino.
- Medir custo por trabalho, impor cotas/rate limit e desligar processamento quando os limites financeiros forem atingidos. Não presumir que plano gratuito tenha capacidade ilimitada.

## Proteção estrutural atual

As flags começam desabilitadas. Build Vercel força flags de frontend a `false`; a UI ainda exige hostname loopback. O endpoint de capacidades no FastAPI retorna 404 quando desabilitado ou fora de loopback. O endpoint não aceita URLs, arquivos nem executa processamento. Essas barreiras protegem a prévia atual, mas não substituem autenticação para futuros serviços públicos.
