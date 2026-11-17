# Motor local do Desencurtador

## Contrato

`POST /api/utilities/links/resolve`

```json
{"url":"https://example.org/short"}
```

A resposta contém `status`, URL original, última URL alcançada, status HTTP final, saltos observados e avisos. Estados: `resolved`, `invalid_url`, `blocked_url`, `timeout`, `redirect_loop`, `redirect_limit`, `tls_error`, `unresolved` e `service_unavailable`. HTTP 4xx/5xx são respostas finais válidas (`resolved`) e o código real aparece em `final_status_code`. `security.reputation_checked` permanece sempre `false`; não é uma avaliação de segurança do destino.

## Política e execução

- HTTP/HTTPS, portas 80/443, URL até 2048 caracteres; body JSON até 4 KiB.
- Valida DNS A/AAAA completo e rejeita a consulta se qualquer resultado não for público. Cada redirect é validado novamente.
- O transporte conecta a um IP validado, mas mantém o hostname original para Host, SNI e verificação TLS. Não usa proxy, não encaminha credenciais/cookies e não segue redirects automaticamente.
- HEAD primeiro; GET com `Range: bytes=0-0` somente para HEAD 405/501. Resposta não é lida. No máximo 8 redirects, 12 s total, 3 s para connect e leitura, 4 chamadas concorrentes por processo.
- URLs não são persistidas nem incluídas em logs. Falhas internas retornam `service_unavailable`; loga-se somente o tipo de exceção.

## Ativação local e publicação

Por padrão, `UTILITIES_ENABLED` e `LINK_RESOLVER_ENABLED` são `false`. Para uso local, ambas precisam estar `true` no processo FastAPI; a requisição ainda precisa vir de cliente loopback e, se houver Origin, ele também precisa ser loopback. Não habilitar fora de máquina local. `VERCEL=1` força 404 independentemente das flags, como defesa adicional. A rota é omitida do OpenAPI.

A interface Lit ainda não consome este endpoint; isso fica para a Fase 3. Não há persistência, histórico, consulta de reputação, autenticação de salas ou integração com banco.

## Evidência e limitações

Os testes em `backend/tests/test_link_*.py` cobrem política de URL/IP/DNS, backend HTTPCore simulado, redirects, resultados HTTP, loop/limites, timeout/TLS, integração ASGI e bloqueios. A verificação do transporte inspeciona o IP usado para conexão, o hostname passado em SNI e os requisitos do SSLContext. Isso testa a configuração e o caminho de rede controlado; não executa handshake TLS criptográfico contra servidor real.

No sandbox Windows local, o event loop padrão não conseguiu criar seu socketpair; 104 testes direcionados passaram com loop sem sockets e transports simulados. No GitHub Actions, a suíte Python completa passou no Ubuntu (439 aprovados, 5 ignorados) e Windows (443 aprovados, 1 ignorado), além de typecheck, build e browser smoke tests. Não houve handshake TLS criptográfico nem tráfego a destinos externos. O limite de concorrência é por processo, sem limitador de taxa distribuído. A ferramenta não prova que um link seja benigno ou livre de phishing.
