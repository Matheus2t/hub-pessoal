# Checklist de liberação — Utilitários

## Estado desta branch

- [x] Catálogo e protótipos permanecem desabilitados em build público por padrão.
- [x] Flags separadas para catálogo, Desencurtador e Removedor; valores padrão `false`.
- [x] Build Vercel só expõe o Desencurtador com flag de build pública explícita; backend exige gates independentes.
- [x] Rotas locais exigem loopback; query string nunca ativa a prévia.
- [x] Backend permanece fechado no Vercel por padrão; Removedor sem endpoint público.
- [x] Contratos TS/Pydantic e testes automatizados da base incluídos.
- [x] Nenhuma dependência nova ou alteração em `vercel.json`.
- [ ] PR revisado e integrado. (Ainda não integrado por decisão desta entrega.)
- [ ] Publicação das ferramentas. (Não autorizada/não contemplada nesta fase.)

## Antes de ativar qualquer ferramenta publicamente

- [ ] Concluir revisão independente de SSRF e confirmar política de egress compatível com a arquitetura escolhida.
- [ ] Configurar e observar proteção de abuso no projeto Vercel correto; o WAF conta por região, tem limites de plano e pode gerar cobrança.
- [ ] Definir como o serviço falha fechado se os controles operacionais forem removidos ou ficarem indisponíveis.
- [ ] Confirmar orçamento de funções, tráfego de saída e rate limiting; não presumir custo zero.
- [ ] Definir privacidade, retenção, exclusão, limites, custos e suporte operacional.
- [ ] Testar produção no projeto e ambiente corretos; validar falhas e rollback.
- [ ] Confirmar CSP, CORS e configuração de domínio sem confiar em flags frontend como controle de segurança.
- [ ] Homologar apenas URLs externas de teste especificamente autorizadas; nenhum alvo foi fornecido nesta preparação.
- [ ] Fazer aprovação explícita da liberação pública de cada ferramenta, independente da outra.

## Removedor de Fundo

- [ ] Política de upload, formato real, tamanho/dimensões e proteção contra arquivos maliciosos.
- [ ] Storage privado, URLs assinadas curtas, autorização dos trabalhos e limpeza automática comprovada.
- [ ] Worker isolado, limites GPU/CPU/memória/tempo, cancelamento e cotas de custo.
- [ ] Avaliação humana e técnica de qualidade antes de escolher modelo.
