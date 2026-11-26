# Homologação local isolada da Mente em Codespaces

Este ambiente testa a migration Google Drive com PostgreSQL 17, Supabase Auth, PostgREST e Storage locais. Ele não se conecta aos projetos hospedados, não usa dados de produção e não altera Vercel.

## Limites e proteção

- A stack só começa quando executado `node scripts/mind-codespaces.mjs up`. O pós-criação instala dependências, mas não inicia Docker nem Supabase.
- O script cria em `tests/mind-codespaces-runtime/` uma configuração descartável, um schema mínimo sintético e uma cópia da migration Drive atual. Não usa nem modifica `supabase link`; não execute `db push` ou `--linked`.
- O harness encaminha somente a API 54321 para o navegador; a porta PostgreSQL 54322 não é encaminhada. Portas 3000, 8000 e 54321 ficam com visibilidade `private` no `devcontainer.json`. Confirme “Private” na aba Ports antes de abrir os serviços.
- Abra o Codespace no VS Code Desktop e use as URLs locais encaminhadas (`localhost:3000`, `localhost:8000` e `localhost:54321`). A prévia `*.app.github.dev` não substitui loopback: a proteção local da Mente a bloqueia deliberadamente.
- Nunca cole `backend/.env`, o arquivo local de login, chaves Supabase ou credenciais Google em issues, logs ou chat. `.env` e arquivos de teste são ignorados pelo Git. O script suprime a saída da CLI que poderia conter chaves.
- A configuração de teste não é uma cópia integral do schema de produção. É válida para executar a migration do Drive e testar Auth/PostgREST usados pelo backend; não substitui uma restauração do schema/dados de produção.

## Custo e recursos

Não crie Codespace até conferir seu plano, consumo e orçamento em GitHub Billing. A franquia pessoal Free publicada pelo GitHub é de 120 core-hours e 15 GB-month; máquinas com mais cores consomem horas na mesma proporção. Organizações Free não recebem franquia de Codespaces. Com meio de pagamento válido, o excedente pode ser cobrado; configure um limite de gastos que interrompa o uso antes de criar o ambiente. A stack Supabase local requer Docker e recomenda pelo menos 7 GB de RAM. Ela não promete custo zero fora das franquias.

## Preparação única

1. Rotacione no Google Cloud o segredo OAuth que foi exposto. Não reutilize o segredo anterior. Mantenha o escopo `drive.file` e o callback autorizado exatamente como abaixo.
2. Em Codespaces Secrets do repositório/conta, configure `TWO_T_GOOGLE_DRIVE_CLIENT_ID` e `TWO_T_GOOGLE_DRIVE_CLIENT_SECRET` com o cliente novo. Depois de confirmar a rotação, configure `TWO_T_GOOGLE_OAUTH_ROTATED=yes`. Esses nomes são lidos pelo script e nunca são enviados ao frontend como variáveis server-side.
3. Crie manualmente um Codespace a partir da branch do PR #203, escolhendo uma máquina compatível com a memória recomendada. O projeto não cria Codespaces automaticamente.
4. No terminal do Codespace, execute:

   ```bash
   node scripts/mind-codespaces.mjs up
   ```

   A CLI iniciará somente os serviços necessários e aplicará a fixture sintética e a migration Drive num projeto Supabase exclusivo do Codespace. O script cria um administrador descartável do Supabase Auth e grava suas credenciais em `backend/.mind-codespaces-admin.json`. O segredo de criptografia local é gerado e persistido em arquivo ignorado. Sem os dois valores OAuth e a confirmação de rotação, o Drive fica desativado.

## Iniciar a aplicação

Em terminais separados no mesmo Codespace:

```bash
backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

```bash
npm run dev
```

Abra `http://localhost:3000/#/mente` pelo encaminhamento privado no VS Code Desktop. Use os dados do administrador descartável localmente; não mostre nem compartilhe o arquivo. O callback OAuth permanece `http://localhost:8000/api/mind-drive/google/callback`.

## Encerrar

Pare frontend e FastAPI com `Ctrl+C`. Depois execute:

```bash
node scripts/mind-codespaces.mjs stop
```

`stop` mantém o volume local; não usa opção de remoção/backup destrutivo. Em seguida, pare ou exclua o Codespace na interface GitHub quando terminar para encerrar compute e controlar o armazenamento cobrado na franquia. Não faça limpeza manual do volume sem decidir antes se a evidência de teste precisa ser preservada.

## O que ainda exige homologação

O código de preparação e seus testes unitários não provam que a stack subiu em Codespaces. Após criar o ambiente, ainda é necessário confirmar os serviços Auth/PostgREST, concluir OAuth com o cliente rotacionado e validar um MP4 descartável: upload real, retomada após interrupção controlada, reprodução pública HTTP 206, exclusão e reconciliação da cota. Não envie arquivos pessoais nem use upload de 5 GB para testar o limite; a fronteira exata é coberta no banco descartável. A publicação também continua condicionada a backup de produção restaurável, revisão final da migration e testes de recuperação. Este ambiente não é Preview Vercel isolado e não valida produção.

## Referências oficiais

- [Supabase: fluxo de desenvolvimento local](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase: configuração da CLI](https://supabase.com/docs/guides/local-development/cli/config)
- [GitHub: consumo incluído por plano](https://docs.github.com/en/billing/reference/product-usage-included)
- [GitHub: cobrança do Codespaces](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces)
- [GitHub: encaminhamento e visibilidade de portas](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)
