# 2T Learn — auditoria de segurança (13/11/2026)

**Escopo:** navegação e prévias privadas, entrega de arquivos estáticos, áudios V13/V19, autenticação local de revisores V17, dados do aluno no IndexedDB e backups v1/v2/v3, políticas de avaliação. Base analisada: `main` após PR #144. **A implementação V14 do Codex não foi alterada.**

**Classificação:** revisão estática de código, modelo de ameaças e testes automatizados. Não é teste de intrusão independente, auditoria de todos os serviços do site nem homologação de produção por deploy/SHA. Na tentativa de acessar diretamente `matheus2t.com.br` por este ambiente, as páginas não estavam disponíveis para inspeção remota confiável; o resultado do build e do GitHub Actions não demonstra, por si só, o conteúdo servido pelo domínio.

## 1. Achados reais

| Severidade | Achado | Evidência | Estado |
| --- | --- | --- | --- |
| **Alta — exposição editorial** | O script `scripts/copy-financials.cjs` copiava recursivamente **todos** os documentos `frontend/public/learn` para `dist/learn`. Incluía gabaritos, questões e rubricas de pilotos/diagnósticos ainda bloqueados na interface. A restrição de rota JavaScript não impede download de JSON estático. | `fs.cpSync('frontend/public/learn','dist/learn',{recursive:true})` anterior à correção | **Mitigado nos novos builds Vercel**: allowlist de catálogos `en.json`, `ru.json` e `pedagogy-v1/audio-assets.json`; limpeza de `dist/learn` antes de copiar |
| **Alta — conteúdo no bundle/repositório** | Roteiros, respostas e critérios V16/V17 são importados como TypeScript pelo cliente e chegam ao `learn.js`; diversas propostas/gabaritos V13/V14 também estão no **repositório GitHub público**. Uma tela localhost-only **não torna esses dados secretos**. | `reading-b1-v16-content.ts`, `progression-v17-content.ts`, `docs/learn-listening-v13-*.json`, PR #119 | **Pendente**: separar distribuição de material editorial protegido, mover conteúdo secreto para fonte privada e servir só mediante autorização real, antes de exames avaliativos ou qualquer promessa de sigilo |
| **Média — identidade e integridade da revisão** | O revisor V17 possui sal/verificador PBKDF2 e sessão em memória, mas as contas ficam no `localStorage`; quem controla o dispositivo pode apagar ou adulterar o armazenamento. O backup v3 também é um JSON editável, não um log assinado. | `progression-v17-review-auth.ts`, `backup.ts` e `progression-v17-storage.ts` | **Limite conhecido mantido:** revisão formativa localhost-only; exigiria serviço de identidade, trilha assinada e política de retenção antes de revisão institucional |
| **Média — privacidade dos backups** | Backup local inclui resposta pessoal, tentativas, feedback e nomes dos revisores; arquivo JSON não é criptografado. Pode ser copiado ou divulgado se salvo sem proteção. | `backup-page.ts`, `storage.ts` | **Orientação de risco:** guardar backup em local protegido; não solicitar upload indiscriminado, não tratar backup como dado anônimo |
| **Baixa — prévia de áudio** | V13 e V19 usam servidores presos a loopback, token aleatório, cookie `HttpOnly; SameSite=Strict`, resposta `no-store`, checagem de `Host` e `Sec-Fetch-Site`. Arquivos privados de áudio ficam em `private/learn-audio-v19/` ignorado pelo Git. | `listening-v13-preview.mjs`, `local-study-preview.mjs`, testes Node de V13 | **Controle presente; regressão adicionada**. Não equivale a aprovação auditiva ou comprovação remota do domínio |
| **Baixa — contaminação de avaliação** | O uso de TTS ou gravação não validada não é prova de domínio; respostas abertas seguem `uncertain`; V17 separa histórico por idioma. | `audio-assets.ts`, `progression-v17-assessment.ts`, `progression-v17-storage.ts` | Preservado; não elevar conteúdo técnico não homologado a evidência independente |

## 2. Mitigação implementada

O build local padrão (`npm run build`) ainda copia os JSONs editoriais para permitir as prévias no próprio computador, que já exigem loopback e as flags locais. Já em builds de distribuição (`VERCEL=1` **ou** `LEARN_PUBLIC_BUILD=1`):

1. A pasta `dist/learn` é removida integralmente antes da cópia. Isso impede arquivos antigos sobreviventes em builds incrementais.
2. Apenas `en.json`, `ru.json` e `pedagogy-v1/audio-assets.json` são distribuídos. O manifesto permite exibir o estado das modalidades do legado, mas **não habilita** áudio avaliado nem referencia arquivos de mídia privada.
3. Os outros JSONs de `pedagogy-v1` (pilotos, diagnósticos, rubricas, políticas internas) e `progression-v12.json` **não são publicados por esta etapa**.
4. O script `scripts/learn/audit-learn-public-build.mjs` exige exatamente a allowlist, **474 exercícios do legado**, zero arquivos MP3/WAV e zero endpoints JSON de prévia em `dist`.
5. O teste browser `learn-public-security.spec.ts` inspeciona respostas 404 para arquivos privados e verifica que os dois idiomas continuam navegáveis com seus catálogos. Com hostname público simulado, parâmetros de prévia falsificados não mostram V13/V16/V17/V19.
6. O workflow `.github/workflows/learn-public-security.yml` gera uma distribuição com `VERCEL=1`, valida os arquivos, testa o token local V13 e roda a regressão em Chromium.

**Condição crítica:** o script emite um aviso se os dados de V16/V17 continuarem embutidos em `dist/learn.js`. Isso é uma **pendência assumida**, não um check de segurança aprovado. O manifesto `audio-assets.json` do catálogo também contém textos de referência públicos; apenas os arquivos de mídia não são distribuídos.

## 3. Fronteira de confiança

- **Público:** `learn.js`, catálogos `en.json`/`ru.json` e o manifesto legado de áudio são materiais acessíveis ao navegador e não podem conter segredos. O código e diversos rascunhos estão também em um repositório **público**.
- **Prévia no computador:** o cliente verifica `localhost` e parâmetro de prévia. Isso é uma restrição de UX, **não autenticação**; alguém com controle do computador pode inspecionar o JavaScript ou os arquivos locais.
- **Servidor V13/V19 de áudio:** valida cookies e origem/host em loopback para o acesso HTTP a MP3s, com política `no-store` e manifesto técnico não aprovado.
- **V17:** credenciais e respostas locais são privadas só no sentido de não serem enviadas a um serviço remoto pelo fluxo atual. Elas não protegem contra alguém com acesso ao perfil do navegador/dispositivo, malware local ou outro código na mesma origem.
- **Aluno:** o sistema não pode afirmar proficiência CEFR, aprovação de pronúncia, identidade institucional do revisor ou inviolabilidade do histórico.

## 4. Pendências de segurança para liberação pública futura

1. **Prioridade alta:** decidir se V13/V14/V16/V17 devem conter gabaritos e materiais de avaliação realmente secretos; se sim, mantê-los em armazenamento privado e entregar por API com autenticação/autorização server-side. A **publicidade do repositório** impede confidencialidade dos materiais já commitados, inclusive versões históricas.
2. Autenticação e papel real de revisor, eventos de auditoria à prova de adulteração e política de retenção/consentimento caso o Learn recolha respostas pessoais de estudantes em servidor.
3. Conferir o SHA implantado na Vercel e observar respostas HTTP reais do domínio após merge. Builds e checks `success` são insuficientes para provar a remoção de URLs em produção.
4. Validar a política de cache/CDN e de compartilhamento de backups pessoais no ambiente final; testes locais não representam todos os cenários de produção.
5. Não liberar V14, V16, V17, áudios V13/V19 ou emissão de notas de proficiência por causa desta auditoria.

## 5. Critério de integração

Integrar as correções somente com CI aprovado, preservando as atividades públicas existentes, o uso local de prévias, a compatibilidade de backups e os arquivos privados. **A auditoria técnica da entrega está concluída quando os testes passarem; a segurança integral de uma futura plataforma de avaliação online permanece pendente** até tratar as limitações explicitadas.
