# Checklist de liberação — Utilitários

## Estado desta branch

- [x] Catálogo e protótipos existem somente em build local explicitamente habilitado.
- [x] Flags separadas para catálogo, Desencurtador e Removedor; valores padrão `false`.
- [x] Build Vercel força as flags frontend a `false`.
- [x] Rotas verificam loopback; query string não ativa a prévia.
- [x] Backend expõe apenas capacidade local protegida; sem endpoints de resolução, upload ou inferência.
- [x] Contratos TS/Pydantic e testes automatizados da base incluídos.
- [x] Nenhuma dependência nova ou alteração em `vercel.json`.
- [ ] PR revisado e integrado. (Ainda não integrado por decisão desta entrega.)
- [ ] Publicação das ferramentas. (Não autorizada/não contemplada nesta fase.)

## Antes de ativar qualquer ferramenta publicamente

- [ ] Concluir motor e testes de segurança correspondentes; revisão independente de SSRF para links.
- [ ] Implementar autenticação/autorização, rate limit, abuso e observabilidade adequados.
- [ ] Definir privacidade, retenção, exclusão, limites, custos e suporte operacional.
- [ ] Testar produção no projeto e ambiente corretos; validar falhas e rollback.
- [ ] Confirmar CSP, CORS e configuração de domínio sem confiar em flags frontend como controle de segurança.
- [ ] Fazer aprovação explícita da liberação pública de cada ferramenta, independente da outra.

## Removedor de Fundo

- [ ] Política de upload, formato real, tamanho/dimensões e proteção contra arquivos maliciosos.
- [ ] Storage privado, URLs assinadas curtas, autorização dos trabalhos e limpeza automática comprovada.
- [ ] Worker isolado, limites GPU/CPU/memória/tempo, cancelamento e cotas de custo.
- [ ] Avaliação humana e técnica de qualidade antes de escolher modelo.
