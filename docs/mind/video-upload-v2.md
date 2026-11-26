# Mente — upload MP4 retomável

## Diagnóstico

O fluxo anterior bloqueava arquivos acima de 25 MiB no cliente, no bucket `mind-videos` e nas constraints de `mind_items`; além disso, fazia upload convencional sem progresso medido nem retomada. A validação da assinatura `ftyp` detecta o contêiner MP4, mas não comprova codecs reproduzíveis. Esses limites explicam a recusa dos arquivos maiores; não foi possível reproduzir a falha original com o arquivo pessoal do administrador, que não foi usado como fixture.

## Implementação

- MP4 usa TUS diretamente no hostname Storage do projeto, em blocos de 6 MiB, com repetição, retomada, cancelamento e token renovado por requisição. O upload local valida decodificação no navegador antes de publicar.
- O teto da aplicação e do bucket `mind-videos` é 50.000.000 bytes (50 MB decimais). A documentação atual do Supabase indica 50 MB como máximo do plano Free; o limite global configurado no projeto deve ser igual ou superior, e ainda precisa ser confirmado no painel. [Limites de upload](https://supabase.com/docs/guides/storage/uploads/file-limits) · [Uploads retomáveis](https://supabase.com/docs/guides/storage/uploads/resumable-uploads).
- A migration `20261120153931_mind_video_resumable_50mb` foi aplicada ao projeto `2T'Site` (`kadkcuumcahnqrvalloz`): bucket de vídeo em 50.000.000 bytes, coluna opcional de poster e constraints específicas para MP4; o bucket e o limite de PDFs continuam em 26.214.400 bytes. RLS e políticas existentes foram preservadas.
- O editor preenche título a partir do nome do arquivo e mostra prévia local, tamanho, duração, progresso por bytes, velocidade/estimativa quando mensuráveis, cancelamento e retomada. Falha de poster não bloqueia publicação. Reprodução e download públicos usam a URL do Storage sem carregar o vídeo inteiro em Blob.
- Backups v3 separam manifesto e arquivos grandes em sidecars; leitores/restauradores v1 e v2 permanecem compatíveis. Vídeos não são silenciosamente omitidos de um backup anunciado como completo.

## Validação e limites

Os testes Playwright usam um fixture H.264/AAC decodificável e um MP4 sintético maior que 25 MB (com caixa `free` preenchida). Cobrem transferência TUS simulada, retomada/cancelamento, retry, HTTP 401/413, publicação, reprodução/download no navegador automatizado, backups v1/v2/v3 e regressões de PDF, links YouTube/Vimeo. Esses mocks não comprovam transferência pelo Supabase real.

Não foi realizado upload autenticado real nem reprodução pública de um MP4 publicado. Antes de merge/produção, o administrador precisa confirmar no painel Storage que o limite global é pelo menos 50 MB e, na prévia Vercel deste PR, autenticar normalmente e enviar um MP4 descartável H.264/AAC de aproximadamente 26 MB. Depois, testar reprodução sem login. Não compartilhar credenciais ou usar arquivos pessoais. Sem essa verificação, a integração real permanece pendente.

O MP4 precisa usar codecs suportados pelo navegador; não há transcodificação. O plano Free não garante velocidade, disponibilidade ou tráfego ilimitados. Não foi contratado serviço pago. A versão continua sem merge e sem publicação de produção até a validação real acima.

## Leitura pública com limite de tamanho

O download de MP4 público aplica o teto de 50.000.000 bytes tanto ao `Content-Length` quanto aos bytes realmente recebidos. A leitura é feita em streaming, cancela ao exceder o teto e limita o tempo sem progresso. Cabeçalho ausente ou menor que o corpo não remove o limite. A validação preserva a assinatura MP4 após a leitura; isso é limite do cliente para downloads da biblioteca e não substitui o limite global do Storage.
