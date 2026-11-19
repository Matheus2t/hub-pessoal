# 2T — Entrega operacional do Desencurtador de Links

**Situação:** código preparado, ferramenta pública **não autorizada**. Esta página registra o que foi verificado, o que ainda depende de acesso externo e a sequência de uma publicação segura. Não substitui `production-readiness.md`.

## Repositório e integração

- Repositório: `Matheus2t/hub-pessoal`.
- Ordem de PRs empilhados: **#179 → #180 → #181 → #185 → #186**.
- O PR #186 contém entrada da homepage em **Acesso rápido**. Quando a flag pública está desligada, exibe **Em preparação** sem link; a navegação e o resolvedor continuam inacessíveis em produção.
- As alterações desta sequência são separadas dos PRs #182–#184 do Removedor de Fundo; **não integrar #182–#184** durante a liberação do Desencurtador.
- O `vercel.json` atual permite deploy automático de pushes para `main`. **Merge mesmo com a ferramenta desativada pode disparar um novo deployment**. Não integrar enquanto não houver condições de monitorar e reverter o site.

## Descoberta de hospedagem — evidência obtida

Consultas de leitura executadas pelo conector Vercel:

| Recurso | Resultado |
| --- | --- |
| Equipe acessível | `matheus2ts-projects` (`team_dSOvL9KTwoa3AOEZ2YMhQKQa`), plano Hobby informado |
| Projetos enumerados nessa conexão | Apenas `dashboard-esportivo` |
| Busca por nome `matheus2t` ou repo `Matheus2t/hub-pessoal` | Sem resultado |
| Domínio `matheus2t.com.br` na equipe | Verificado; aponta para `prj_nNppFpQ5k2AUn0qNH7Hmrylw5FQ3` |
| GET do projeto por esse ID | 404 `Project not found` |
| Listar deployments desse projeto | 403 `forbidden` |
| Consultar regras de firewall | Sem acesso a configuração efetiva |

O registro do domínio **não comprova** permissão para operar o projeto, nem comprova o estado da hospedagem. Não utilizar `dashboard-esportivo` como destino substituto.

**Ação de acesso necessária:** no painel da Vercel, localizar o projeto associado ao domínio e verificar qual conta/equipe o administra. Habilitar para a conexão Vercel do ChatGPT o acesso àquele projeto, inclusive leitura de deployments, variáveis (somente nomes/metadados), firewall e, quando autorizado, edição das configurações relevantes. Não copiar tokens nem valores secretos para conversas, logs ou PRs.

## Portões críticos para produção

1. **Rate limiting e orçamento:** limite distribuído/global apropriado, comportamento fail-closed sob indisponibilidade, proteção contra rajadas, alertas e orçamento. O semáforo de quatro chamadas por processo não implementa esse controle. WAF por região, isoladamente, não é uma cota global rígida.
2. **Egress e SSRF:** revisar independentemente o pinning DNS/IP, TLS e a política real de saída da hospedagem. Endereço de origem estático não equivale a filtragem de destinos; documentar o controle existente ou escolher serviço isolado autorizado.
3. **Homologação:** testes públicos de baixo volume em destinos *explicitamente autorizados* e verificações do serviço real. A suíte em loopback comprova somente o comportamento controlado.
4. **Regressões:** comparar a `main` com a branch final sob **mesmo sistema, navegador e comandos**, com o workflow `.github/workflows/link-browser-regression.yml`. Registrar as falhas novas, corrigir regressões do Desencurtador e não considerar a suíte aprovada enquanto falhas relevantes permanecerem.
5. **Operação:** conferir projeto/branch/domínio, custo, CORS, CSP, privacidade, observabilidade e rollback antes de qualquer alteração de flags.

## Flags de liberação

Todas **falsas por padrão**, inclusive em Vercel:

```text
UTILITIES_ENABLED
LINK_RESOLVER_ENABLED
LINK_RESOLVER_PUBLIC_ENABLED
LINK_RESOLVER_PUBLIC_RATE_LIMIT_CONFIRMED
LINK_RESOLVER_PUBLIC_EGRESS_CONFIRMED
LINK_RESOLVER_PUBLIC_UI_ENABLED
```

As flags `*_CONFIRMED` são declarações manuais, **não** testam se a infraestrutura está realmente protegida. Nunca ativá-las sem a evidência correspondente. O Removedor deve continuar desligado (`BACKGROUND_REMOVER_ENABLED=false`), sem endpoints de upload públicos.

## Sequência segura, após resolver os bloqueios

1. Confirmar equipe, projeto, domínio, plano, variáveis não sensíveis, WAF, egress, disponibilidade e custos reais.
2. Revisar modelo de ameaças; implementar/validar rate limiting distribuído, egress e controles financeiros; homologar endpoints autorizados.
3. Concluir comparação Playwright baseline/candidato, regressões direcionadas, Python, typecheck, build e CI. Tratar novas falhas antes de integrar.
4. Revisar os diffs e HEADs dos PRs. Integrar **na ordem** #179, #180, #181, #185 e #186, reendereçando a base de cada PR para `main` quando seu predecessor tiver sido integrado; sem apagar commits, sem merge de Removedor. Validar deploy de código com o recurso **ainda desligado**.
5. Liberar a API/flag de UI somente depois de confirmação operacional; testar `https://matheus2t.com.br/#/utilitarios/desencurtador` com redirecionamento autorizado.
6. Observar latência, 429, 5xx, volume, consumo e alertas. Para rollback rápido, desativar primeiro as flags públicas; se necessário, reverter o merge e confirmar novo deployment.

## Proibições durante este bloqueio

- Não publicar por outro projeto, domínio ou equipe.
- Não habilitar flags apenas para passar em testes.
- Não tratar firewall/egress presumidos como verificados.
- Não contratar serviços, ativar produtos pagos ou alterar DNS sem autorização.
- Não reproduzir os artefatos locais privados de Learn em commits.

**Estado:** aguardando acesso verificável e homologação de segurança. Nenhuma liberação pública autorizada pela mera presença deste documento.
