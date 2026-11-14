# 2T Learn — Áudio público de Listening

## Escopo e estado

- As atividades legadas de Listening agora usam arquivos MP3 servidos pela mesma origem do site: `/learn/audio/{en|ru}/{exercise-id}.mp3`.
- Foram gerados 60 arquivos: 30 em inglês e 30 em russo (481.244 bytes no total). Os IDs, textos dos estímulos e os 474 exercícios dos catálogos permanecem inalterados.
- Os MP3 são para **estudo**. Todos os itens continuam com `assessmentEnabled: false`; a política continua em zero gravações aprovadas e zero avaliação auditiva. Reprodução completa não é confirmação de pronúncia humana nem prova de compreensão.
- As versões privadas V13/V14/V19 não foram copiadas para o bundle público. A geração ignora e o Git ignora `private/learn-audio-public/`, onde ficam modelos e artefatos locais.

## Geração, proveniência e licença

Os arquivos foram sintetizados localmente com `piper-tts==1.8.0`, sem API hospedada, chave, serviço pago ou modelo no navegador. As vozes são `en_US-joe-medium` (inglês dos EUA, General American) e `ru_RU-denis-medium` (russo). O gerador fixa a revisão `cf910fb` e confere tamanho e hashes SHA-256/SHA-1 dos modelos, configurações e cartões antes da síntese. Ele usa somente os textos `audio` dos exercícios públicos atuais e converte WAV para MP3 mono, 22,05 kHz, 64 kbps, com normalização de loudness. A saída e sua relação com o exercício ficam registradas em `frontend/public/learn/pedagogy-v1/audio-assets.json`.

Os cartões e a lista oficial Piper de vozes marcadas para uso comercial identificam Joe e Denis, e a cadeia de dados associada, como CC0. O runtime Piper tem licença GPL-3.0, mas é instalado apenas no ambiente local de geração e não é distribuído no site. A própria documentação Piper ressalta que a licença do runtime não define a licença de cada modelo ou de todo conteúdo de saída; a classificação dos modelos não substitui uma análise jurídica do áudio gerado. Esta implementação não declara os MP3 como uma decisão jurídica independente. A revisão humana de pronúncia, naturalidade e adequação pedagógica também permanece pendente. Referências oficiais:

- [Licenciamento do Piper](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/LICENSING.md)
- [Vozes Piper indicadas para uso comercial](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/COMMERCIAL_USE.md)
- [CLI Piper](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/CLI.md)

## Reprodução e avaliação

- Listening público não usa `SpeechSynthesis`; o arquivo da atividade é carregado sob demanda (`preload="none"`) pelo player de gravação existente.
- O player oferece reproduzir/retomar, pausa, parar, reiniciar, repetição, progresso, velocidades, volume, estado de carregamento e tentativa após falha. Um registro central interrompe outro player do Learn ao iniciar reprodução, evitando vozes/arquivos sobrepostos.
- Se o manifesto ou MP3 estiver indisponível, a pessoa pode tentar novamente, pular sem registrar tentativa ou entrar explicitamente em estudo com transcrição. A transcrição não aparece antes da escolha. Uma resposta no modo de estudo fica `uncertain`, sem pontuação ou evidência de áudio. Falha de rede não vira erro do estudante.
- Síntese de voz continua somente em modalidades secundárias existentes (por exemplo, ditados sem gravação pública e flashcards). Ela não é fallback para Listening.
- Controle de acesso das experiências privadas não foi afrouxado. O build Vercel permite exatamente os 60 arquivos de estudo, além dos dois catálogos e do manifesto; testes conferem allowlist, hashes e ausência de arquivos privados.

## Regeração local

Requer Node já usado pelo projeto, `uv`, Python compatível com `piper-tts==1.8.0` e `ffmpeg`. Nada disso é necessário para usuários nem para o build de produção: os arquivos prontos são versionados.

```powershell
uv venv private/learn-audio-public/.venv --python <caminho-para-python>
uv --cache-dir private/learn-audio-public/uv-cache pip install --python private/learn-audio-public/.venv/Scripts/python.exe piper-tts==1.8.0
npm run learn:generate-public-audio
npm run learn:validate-audio -- --write
npm run learn:validate-audio
```

O gerador rejeita artefatos com hash/licença divergente e não sobrescreve MP3 existentes sem `--force` explícito. Depois de regenerar, reexecute o build e os testes de áudio.

## Homologação restante

Os 60 arquivos passaram por verificações de origem/hash, estrutura MP3, entrega do build e decodificação automatizada no Chromium. Isso não substitui escuta humana. Ainda é necessária revisão de inteligibilidade, pronúncia, ritmo e adequação didática por falantes competentes de inglês e russo, além de avaliação em Android físico e teste com estudantes antes de habilitar qualquer avaliação auditiva. Enquanto isso, todos os clipes são material de estudo sem nota.

## Validação técnica desta entrega

- `npm run typecheck` e `VERCEL=1 npm run build`: aprovados.
- 16 validadores estruturais do Learn: aprovados; V13: 12 testes aprovados e 1 skip por inventário privado opcional ausente; V14: 10 aprovados.
- Playwright local: 224 testes executados, 223 aprovados e 1 skip. Foram excluídos somente dois casos que verificam a ausência de JSON privado no build Vercel; a expectativa foi validada separadamente no bundle público.
- Playwright do bundle público: 3 testes aprovados, incluindo catálogo legado, recusa de conteúdo editorial privado e bloqueio de rotas por parâmetros de prévia.
- Chromium decodificou os 60 MP3s reais. O inventário do build preservou 474 exercícios e não incluiu arquivos privados.
- O skip é o teste opcional de MP3 V13 regenerado, indisponível neste checkout; não foi tratado como homologação auditiva.
