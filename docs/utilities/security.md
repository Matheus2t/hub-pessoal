# Segurança dos Utilitários

## Desencurtador — controles implementados nesta fase

- Só HTTP/HTTPS e portas 80/443; URLs limitadas a 2048 caracteres. Credenciais, esquemas alternativos, hosts locais e notações ambíguas de IP são rejeitados.
- Literais IPv4/IPv6 e todos os resultados A/AAAA são validados. Se uma resposta DNS misturar IP público e não público, toda a consulta é bloqueada. Redes privadas, loopback, link-local, multicast, não especificadas, reservadas, mapeadas IPv4 e faixas especiais são negadas.
- O resolvedor valida DNS por salto e o transporte conecta diretamente a um dos IPs validados. `httpcore` ainda recebe o hostname original como origem, preservando `Host`, SNI e verificação do certificado. O backend recusa host/porta diferentes do destino validado.
- O cliente não usa proxy de ambiente e não segue redirects automaticamente. HEAD é usado primeiro; GET com `Range: bytes=0-0` é tentado apenas para 405/501. O corpo nunca é iterado.
- Cada destino de redirect passa pela mesma política. Loops, limite configurável de no máximo 8 redirects e deadline total de no máximo 12 segundos são tratados sem seguir o destino bloqueado. Timeout de conexão/leitura é no máximo 3 segundos.
- Corpo HTTP da API limitado a 4 KiB; até quatro chamadas simultâneas por processo. Não há banco, histórico, cookies do usuário nem persistência. O código de log registra só o tipo da falha, sem URL, query, cabeçalhos ou mensagem de exceção.
- A resposta sempre define `reputation_checked=false`; não declara que o destino é seguro. HTTP 404/500 são apresentados como status HTTP final efetivamente observado.
- A API exige `UTILITIES_ENABLED=true`, `LINK_RESOLVER_ENABLED=true`, cliente loopback e Origin loopback quando fornecido. `VERCEL=1` sempre força 404, independentemente das flags. A rota não aparece no OpenAPI.

## Evidência e limites restantes do resolvedor

- Os testes adicionados exercitam URLs/IPs/DNS sintéticos e um backend HTTPCore controlado. O teste de transporte verifica que o socket recebe o IP fixado e que HTTPCore recebe o hostname original para SNI, com `CERT_REQUIRED` e `check_hostname` habilitados.
- O backend controlado não executa handshake TLS criptográfico real. A homologação local desta execução foi limitada pela política do Windows, que negou a criação do socketpair de loopback necessário ao event loop assíncrono; portanto, testes async e tráfego real aguardam execução no CI.
- A lista de DNS é validada integralmente, mas no máximo quatro IPs válidos são tentados por consulta. O limite de concorrência é por processo, não uma taxa global. A API é destinada somente ao loopback e permanece forçada a 404 em Vercel; não é um serviço público.
- Uma alteração de DNS após a validação não muda o IP conectado naquele salto. Cada redirect faz nova resolução e validação. Nenhum resolvedor atesta reputação, benignidade do conteúdo ou segurança da página final.

## Removedor — ainda não implementado

- Validar assinatura real do arquivo e decodificação; não confiar em extensão, nome ou `Content-Type` informado pelo cliente.
- Definir limites de tamanho, dimensões, pixels, quadros, memória, tempo e concorrência antes da implementação. Rejeitar arquivos malformados e bombas de descompressão.
- Processar em worker isolado, sem acesso geral à rede ou ao sistema de arquivos do host, com limites de CPU/GPU e timeout.
- Usar identificadores imprevisíveis e autorização vinculada ao proprietário. Upload e download devem ser privados, assinados, temporários e excluídos com política documentada.
- Medir custo por trabalho, impor cotas e desligar processamento ao atingir limites financeiros. Não presumir que plano gratuito seja ilimitado.

## Proteção estrutural do frontend

As flags começam desabilitadas. Build Vercel força flags de frontend a `false`; o hostname também precisa ser loopback. O backend mantém sua própria proteção e retorna 404 no Vercel. Essas barreiras não substituem autenticação, cotas ou mitigação de abuso caso o produto venha a ser publicado.
