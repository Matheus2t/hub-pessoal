# Desencurtador — preparação para produção

## Classificação

**PRONTO PARA INTEGRAR COM A FERRAMENTA DESATIVADA. NÃO PRONTO PARA PUBLICAÇÃO PÚBLICA.**

O código mantém o padrão atual no Vercel: `404` por padrão. Foram adicionados gates de servidor independentes para preparação futura e uma flag separada de build para mostrar a interface. Esta entrega não configura Vercel, não habilita flags, não integra PRs anteriores e não faz deploy.

## Arquitetura avaliada

| Caminho | Segurança e operação | Custos / limitações | Decisão |
| --- | --- | --- | --- |
| FastAPI na Function Vercel existente | Reutiliza a API. O resolvedor valida todo A/AAAA, rejeita respostas mistas, fixa a conexão em IP validado, preserva Host/SNI e verifica TLS em cada salto. A proteção contra abuso nativa da aplicação ainda é concorrência por instância. | Saída padrão usa IPs dinâmicos. Não foi confirmado controle de egress por destino para o projeto. Rate limiting WAF é por região, portanto não é uma cota global rígida. | Código de candidato, público desabilitado; egress e abuso ainda precisam de decisão operacional. |
| Serviço de resolução isolado com política de egress | Permite limitar tráfego de saída a destinos públicos/portas autorizadas e isolar custos e concorrência do restante da API. | Exige escolher e operar um provedor; pode gerar custo recorrente. Nenhum serviço foi provisionado ou cotado nesta entrega. | Mais forte como isolamento, mas depende de autorização e escolha externa. |

Vercel Static IPs dão endereços de origem estáveis para allowlists; isso não é uma firewall de destinos. Secure Compute oferece controles de rede/egress mais fortes, mas é um recurso Enterprise com preço não confirmado. A ferramenta recebe hostnames arbitrários, então uma lista estática de hosts permitidos não atende ao objetivo.

## Controles implementados e conservados

- Somente HTTP/HTTPS e portas 80/443; rejeita credenciais, hostnames especiais, formatos ambíguos e endereços não públicos.
- Inspeciona todos os resultados DNS; qualquer endereço proibido bloqueia a consulta. Cada redirect repete a validação.
- Conecta diretamente ao IP validado, sem resolver novamente; Host, SNI e validação de certificado usam o hostname original. Sem proxy de ambiente, cookies, autenticação, redirects automáticos ou leitura de conteúdo.
- Máximo de oito redirects, doze segundos de resolução, três segundos de connect/read, até quatro IPs tentados, cabeçalhos de resposta até 16 KiB e body JSON até 4 KiB. A leitura do body tem deadline de três segundos.
- Quatro chamadas simultâneas por processo; concorrência local. Ao saturar, responde HTTP 429 com `Retry-After`. Isso não é rate limit distribuído.
- Logs de erro registram só tipo da exceção. URLs recebidas no body não são persistidas nem logadas pela aplicação. A interface informa que a URL é enviada à API 2T, não abre o destino e não afirma que HTTPS atesta segurança ou reputação.
- `security.reputation_checked` permanece `false`. O Removedor de Fundo continua sem endpoint/upload público e é ocultado fora do loopback.

## Gates e sequência de ativação futura

Flags backend, todas necessárias no ambiente Vercel:

```text
UTILITIES_ENABLED=true
LINK_RESOLVER_ENABLED=true
LINK_RESOLVER_PUBLIC_ENABLED=true
LINK_RESOLVER_PUBLIC_RATE_LIMIT_CONFIRMED=true
LINK_RESOLVER_PUBLIC_EGRESS_CONFIRMED=true
```

Flag para expor a navegação e a interface no build público:

```text
LINK_RESOLVER_PUBLIC_UI_ENABLED=true
```

Todos os valores são `false`/ausentes por padrão. A API exige gates no servidor; a flag frontend sozinha não autoriza requisições. As flags `*_CONFIRMED` são confirmações explícitas de operação, não verificam automaticamente a configuração do painel. Só podem ser ativadas depois de demonstrar que os controles correspondentes estão ativos e monitorados. Se o WAF ou a política de rede forem removidos, o ambiente precisa desligar primeiro os gates públicos.

O Vercel WAF oferece rate limiting por IP com fixed window nos planos documentados; contadores são por região e tráfego em várias regiões pode superar o limite por região. Hobby permite uma regra de rate limit no projeto e inclui uma cota publicada de um milhão de requests permitidos; a documentação também lista US$ 0,50 por milhão de requests permitidos. Confirmar preços atuais/consumo e a regra disponível no projeto antes de habilitar. Uma regra candidata seria somente `POST /api/utilities/links/resolve`, por IP e método, com resposta 429; o valor final por minuto deve ser escolhido após observar tráfego e impacto de NAT compartilhado. Não foi configurado.

## Evidências desta entrega

- `npm run build` e typecheck passaram. `python -m compileall` passou. As suítes focadas de contratos, transporte, segurança, resolver e TLS passaram: 110 testes.
- Playwright local: 13 passaram e 2 foram ignorados por pertencerem ao modo público. Incluiu integração FastAPI/TLS de loopback e responsividade em 320, 390, 768, 1024, 1366 e 1920 px, nos temas claro e escuro.
- Playwright de build público: a rota ficou bloqueada por padrão mesmo com parâmetro de prévia (1 teste); o build explícito exibiu somente o Desencurtador quando capabilities mockadas permitiram (1 teste). Não contatou produção nem comprova a configuração remota do WAF.
- Testes adicionados para gates de produção, Removedor sempre desligado no Vercel, 429 com `Retry-After`, leitura lenta do body, tamanho do body e cabeçalhos excessivos. A suíte também encontrou e corrigiu a ausência de limite explícito para cabeçalhos HTTP grandes.
- `git diff --check` passou. CI da branch final ainda depende do push e do PR.
- Nenhum teste com destino externo foi executado: a especificação exige endpoints especificamente autorizados e não foi fornecida uma lista de URLs/alvos. Não foi enviado tráfego a terceiros.
- A integração TLS existente usa servidor local controlado. Isso prova o handshake e a pinagem no teste, mas não substitui revisão independente de SSRF nem homologação externa.
- O conector Vercel no escopo disponível não encontrou o projeto `matheus2t` pelo nome nem pelo repositório `Matheus2t/hub-pessoal`. Não foi possível verificar o plano, regras WAF, flags, deployment, custo efetivo ou configurações de egress do projeto exato. Não foi consultado outro projeto como substituto.

## Pendências que bloqueiam ativação pública

1. Confirmar escopo e acesso ao projeto Vercel `matheus2t`; verificar plano, rule budget, regra WAF ativa e alertas/observabilidade.
2. Resolver o requisito de egress em camada de rede. A implementação HTTP pinada é forte defesa na aplicação, mas nenhuma política externa de destino foi comprovada nesta hospedagem/projeto.
3. Definir proteção contra abuso com alcance global e comportamento fail-closed se o mecanismo externo desaparecer. O WAF disponível por região é mitigação útil, não garantia global por usuário.
4. Aprovar orçamento de função e rate limiting; a operação não é ilimitada nem se presume gratuita.
5. Fornecer endpoints públicos de teste autorizados (ou ambiente próprio autorizado) para redirecionamentos reais de baixo volume. Sem isso, 301/302/303/307/308 externos, TLS público, timeout, loop e compatibilidade com encurtadores permanecem sem homologação.
6. Executar revisão de segurança independente e checklist de privacidade, CSP/CORS, monitoramento e rollback antes da ativação.

## Referências operacionais

- Vercel WAF Rate Limiting: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
- Vercel Backend Egress: https://vercel.com/academy/optimize-your-vercel-account/backend-egress
- Limites de Functions: https://vercel.com/docs/functions/limitations
- OWASP SSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
