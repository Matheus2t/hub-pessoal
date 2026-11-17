# Segurança dos Utilitários

## Desencurtador — controles implementados nesta fase

- Só HTTP/HTTPS e portas 80/443; URLs limitadas a 2048 caracteres. Credenciais, esquemas alternativos, hosts locais e notações ambíguas de IP são rejeitados.
- Literais IPv4/IPv6 e todos os resultados A/AAAA são validados. Se uma resposta DNS misturar IP público e não público, toda a consulta é bloqueada. Redes privadas, loopback, link-local, multicast, não especificadas, reservadas, mapeadas IPv4 e faixas especiais são negadas.
- O resolvedor valida DNS por salto e o transporte conecta diretamente a um dos IPs validados. `httpcore` ainda recebe o hostname original como origem, preservando `Host`, SNI e verificação do certificado. O backend recusa host/porta diferentes do destino validado.
- O cliente não usa proxy de ambiente e não segue redirects automaticamente. HEAD é usado primeiro; GET com `Range: bytes=0-0` é tentado apenas para 405/501. O corpo nunca é iterado.
- Cada destino de redirect passa pela mesma política. Loops, limite configurável de no máximo 8 redirects e deadline total de no máximo 12 segundos são tratados sem seguir o destino bloqueado. Timeout de conexão/leitura é no máximo 3 segundos.
- Corpo HTTP da API limitado a 4 KiB, com deadline de leitura de três segundos; cabeçalhos de resposta externa limitados a 16 KiB; até quatro chamadas simultâneas por processo. Não há banco, histórico, cookies do usuário nem persistência. O código de log registra só o tipo da falha, sem URL, query, cabeçalhos ou mensagem de exceção.
- A resposta sempre define `reputation_checked=false`; não declara que o destino é seguro. HTTP 404/500 são apresentados como status HTTP final efetivamente observado.
- A interface envia a URL à API 2T configurada (loopback durante a prévia local), com `credentials: omit`, `cache: no-store` e `referrerPolicy: no-referrer`; cancelamento aborta a requisição. Não abre o destino, não cria link clicável e não persiste a entrada. Respostas são interpoladas como texto pelo Lit.
- Localmente, a API exige as flags base, cliente loopback e Origin loopback quando fornecido. No Vercel, continua 404 por padrão e requer `LINK_RESOLVER_PUBLIC_ENABLED`, `LINK_RESOLVER_PUBLIC_RATE_LIMIT_CONFIRMED` e `LINK_RESOLVER_PUBLIC_EGRESS_CONFIRMED`, além das flags base. As confirmações não verificam por si só a existência do WAF ou da política de egress. A rota não aparece no OpenAPI.

## Evidência e limites restantes do resolvedor

- Os testes exercitam URLs/IPs/DNS sintéticos e um backend HTTPCore controlado. Um servidor TLS efêmero valida handshake real, SNI, Host, verificação de hostname/cadeia e pinagem do IP, sem tráfego externo.
- Em validação anterior à branch, GitHub Actions aprovou a suíte Python completa no Ubuntu (439 aprovados, 5 ignorados) e Windows (443 aprovados, 1 ignorado), além de typecheck, build e browser smoke tests. O sandbox Windows negou o socketpair do event loop padrão; naquele momento, os 104 testes direcionados foram executados com loop sem sockets e transports simulados.
- Nesta branch, typecheck/build passaram; 110 testes Python focados passaram fora do sandbox, com temp em `dist/pytest-temp`; 13 Playwright locais passaram (2 modos públicos ignorados), além dos dois testes públicos isolados. A validação responsiva usou 320, 390, 768, 1024, 1366 e 1920 px em tema claro/escuro. CI desta branch ainda não foi executado.
- A integração com TLS real é exclusivamente loopback; a ferramenta não foi homologada contra destinos públicos. A navegação, o backend e o TLS são verificados por suítes automatizadas distintas e pelo fluxo integrado de teste.
- Os testes do build público usaram fixtures locais e hostname simulado; não há homologação com destinos públicos nem configuração de WAF/egress comprovada.
- A lista DNS é validada integralmente, mas no máximo quatro IPs são tentados por consulta. O limite de concorrência de quatro é por processo, não distribuído. O WAF pode fornecer uma camada de limitação externa, mas seus contadores são por região e não compõem um limite global estrito.
- Uma alteração de DNS após a validação não muda o IP conectado naquele salto. Cada redirect faz nova resolução e validação. Nenhum resolvedor atesta reputação, benignidade do conteúdo ou segurança da página final.

## Removedor — ainda não implementado

- Validar assinatura real do arquivo e decodificação; não confiar em extensão, nome ou `Content-Type` informado pelo cliente.
- Definir limites de tamanho, dimensões, pixels, quadros, memória, tempo e concorrência antes da implementação. Rejeitar arquivos malformados e bombas de descompressão.
- Processar em worker isolado, sem acesso geral à rede ou ao sistema de arquivos do host, com limites de CPU/GPU e timeout.
- Usar identificadores imprevisíveis e autorização vinculada ao proprietário. Upload e download devem ser privados, assinados, temporários e excluídos com política documentada.
- Medir custo por trabalho, impor cotas e desligar processamento ao atingir limites financeiros. Não presumir que plano gratuito seja ilimitado.

## Proteção estrutural do frontend

As flags começam desabilitadas. UI pública e API têm gates independentes. A ativação permanece bloqueada até existir política de egress adequada, proteção contra abuso configurada e observada, orçamento aprovado e teste externo autorizado. O WAF é externo ao código, por região e pode gerar custo após as cotas incluídas.
