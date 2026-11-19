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

## Interface local (Fase 3)

- `utility-link-unshortener` consulta as capacidades antes de habilitar a análise e envia a URL informada para `POST /api/utilities/links/resolve`.
- A interface valida formato, esquema, credenciais embutidas e tamanho para orientar o usuário; a política de segurança autoritativa continua no backend.
- Só o estado `resolved` mostra e permite copiar o destino final. Destinos parciais não viram links nem são tratados como confirmação. HTTP 4xx/5xx são apresentados como códigos realmente observados.
- A tela permite cancelar, limita a espera no cliente, impede que uma resposta antiga substitua uma nova e não salva o endereço. O navegador não abre o destino nem faz requisição a ele.
- Exibe o percurso observado, avisos, protocolo e status HTTP. URLs são texto simples renderizado pelo Lit.

## Ativação local e gate para publicação

Por padrão, todas as flags são `false`. Localmente, as flags base e cliente loopback continuam obrigatórios. No Vercel, além das flags base, o servidor requer `LINK_RESOLVER_PUBLIC_ENABLED=true`, `LINK_RESOLVER_PUBLIC_RATE_LIMIT_CONFIRMED=true` e `LINK_RESOLVER_PUBLIC_EGRESS_CONFIRMED=true`. A UI requer `LINK_RESOLVER_PUBLIC_UI_ENABLED=true` durante o build público e consulta as capacidades reais da API. O Removedor de Fundo não aparece no catálogo público e continua sem endpoint público. A rota é omitida do OpenAPI.

As flags de confirmação são uma trava operacional, não detecção automática de WAF ou rede. Só configure-as depois de verificar os controles externos. O WAF do Vercel pode devolver HTTP 429 antes da função; o limite local de quatro consultas simultâneas também responde 429 e `Retry-After`, mas não é distribuído.

Não há persistência, histórico, consulta de reputação, autenticação de salas ou integração com banco.

## Evidência e limitações

Os testes em `backend/tests/test_link_*.py` cobrem política de URL/IP/DNS, backend HTTPCore controlado, redirects, respostas HTTP, loops/limites, timeout/TLS, integração ASGI e bloqueios. Um servidor TLS efêmero em loopback percorre a rota FastAPI, o resolvedor e o transporte com IP fixado: certificado confiado explicitamente valida sucesso; hostname incompatível e cadeia não confiável retornam `tls_error`. O backend do teste redireciona o socket validado para loopback, sem tráfego externo.

O Playwright cobre respostas controladas da API e, em teste separado, inicia a API real local para validar o caminho navegador→FastAPI→handshake TLS em loopback. Isso não é homologação contra destinos públicos. O limite de concorrência é por processo, sem limitador de taxa distribuído. A ferramenta não prova que um link seja benigno ou livre de phishing.
