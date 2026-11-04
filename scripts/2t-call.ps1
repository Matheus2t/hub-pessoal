#requires -Version 5.1
[CmdletBinding()]
param(
    [ValidateSet('Local', 'External', 'Stop', 'Check')][string]$Mode = 'Local',
    [switch]$ApproveExposure,
    [switch]$Plan,
    [switch]$SkipBuild,
    [ValidateRange(1024, 65535)][int]$Port = 8001,
    [ValidateRange(5, 180)][int]$Minutes = 90,
    [Security.SecureString]$OwnerCredential
)
$ErrorActionPreference = 'Stop'
$callRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$callWork = Join-Path $callRoot '.vercel\2t-call'
$callState = Join-Path $callWork 'session.json'

function Get-CallCloudflared {
    $portable = Join-Path $callWork 'bin\cloudflared.exe'
    $verification = Join-Path $callWork 'bin\verified.json'
    if ((Test-Path -LiteralPath $portable) -and (Test-Path -LiteralPath $verification)) {
        $record = Get-Content -LiteralPath $verification -Raw | ConvertFrom-Json
        if ($record.Sha256 -notmatch '^[a-f0-9]{64}$' -or
            (Get-FileHash -LiteralPath $portable -Algorithm SHA256).Hash -ne $record.Sha256) {
            throw 'cloudflared portatil com integridade divergente; nao sera executado.'
        }
        return $portable
    }
    $installed = Get-Command cloudflared.exe -ErrorAction SilentlyContinue
    if ($installed) { return $installed.Source }
    return $null
}

function Get-CallTunnelOrigin([string]$Text) {
    $match = [regex]::Match($Text, 'https://[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com\b')
    if (-not $match.Success) { return $null }
    return $match.Value
}

function Get-CallProcessRecord($Process, [string]$Kind, [string]$Executable) {
    $Process.Refresh()
    # Process.Path can briefly be null immediately after Start-Process. Record the
    # exact executable we launched; Stop still checks Path, creation time and CLI.
    if (-not $Executable) { throw 'Executavel iniciado nao identificado.' }
    return @{ Id = $Process.Id; Started = $Process.StartTime.ToUniversalTime().Ticks.ToString();
        Executable = [IO.Path]::GetFullPath($Executable); Kind = $Kind }
}

function Stop-CallRecordedProcess($Record) {
    $process = Get-Process -Id ([int]$Record.Id) -ErrorAction SilentlyContinue
    if (-not $process) { return }
    # A stale state file must never stop another process that reused a PID.
    if ($process.StartTime.ToUniversalTime().Ticks.ToString() -ne $Record.Started -or
        $process.Path -ne $Record.Executable) { throw 'PID reutilizado: processo preservado.' }
    $command = (Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
    if (($Record.Kind -eq 'server' -and $command -notmatch 'uvicorn backend\.app\.call_signaling:app') -or
        ($Record.Kind -eq 'tunnel' -and [IO.Path]::GetFileName($process.Path) -ne 'cloudflared.exe') -or
        $Record.Kind -notin @('server', 'tunnel')) { throw 'Identidade do processo divergente; processo preservado.' }
    Stop-Process -Id $process.Id
}

if ($Plan -or ($Mode -eq 'External' -and -not $ApproveExposure)) {
    Write-Output 'PREPARACAO: nenhum servidor ou tunel foi iniciado.'
    Write-Output 'Local: .\scripts\2t-call.ps1 -Mode Local'
    Write-Output 'Externo exige autorizacao: .\scripts\2t-call.ps1 -Mode External -ApproveExposure'
    Write-Output 'Acesso externo: Quick Tunnel temporario, HTTPS/WSS, uma origem exata, chave nova e limite de 90 minutos.'
    Write-Output 'Dependencia externa: cloudflared (instalacao manual uma vez, conforme a documentacao).'
    return
}

if ($Mode -eq 'Check') {
    foreach ($name in @('python.exe', 'npm.cmd')) {
        $found = Get-Command $name -ErrorAction SilentlyContinue
        Write-Output ("{0}: {1}" -f $name, $(if ($found) { 'disponivel' } else { 'ausente' }))
    }
    Write-Output ("cloudflared.exe: {0}" -f $(if (Get-CallCloudflared) { 'disponivel' } else { 'ausente' }))
    Write-Output ("Sessao registrada: {0}" -f (Test-Path -LiteralPath $callState))
    return
}

if ($Mode -eq 'Stop') {
    if (-not (Test-Path -LiteralPath $callState)) { Write-Output 'Nenhuma sessao registrada.'; return }
    $state = Get-Content -LiteralPath $callState -Raw | ConvertFrom-Json
    if ($state.Root -ne $callRoot -or $state.Run -notmatch '^[a-f0-9]{32}$') { throw 'Registro de sessao invalido.' }
    # Stop only this launcher's verified children, tunnel first. No broad process kills.
    foreach ($record in @($state.Processes | Sort-Object @{ Expression = { if ($_.Kind -eq 'tunnel') { 0 } else { 1 } } })) {
        Stop-CallRecordedProcess $record
    }
    Remove-Item -LiteralPath $callState
    Write-Output 'Servidor e tunel registrados foram encerrados.'
    return
}

$python = (Get-Command python.exe -ErrorAction Stop).Source
$cloudflared = $null
if ($Mode -eq 'External') {
    $cloudflared = Get-CallCloudflared
    if (-not $cloudflared) { throw 'cloudflared ausente. Consulte docs/2t-call-stage-3-5.md.' }
    $version = & $cloudflared --version
    if ($version -notmatch 'version (\d+\.\d+\.\d+)' -or [version]$Matches[1] -lt [version]'2026.10.7') {
        throw 'Atualize cloudflared para a versao validada 2026.10.7 ou posterior.'
    }
}
if (Test-Path -LiteralPath $callState) { throw 'Existe uma sessao registrada. Use -Mode Stop antes de iniciar outra.' }
if ((Test-Path -LiteralPath (Join-Path $callRoot '.vercel')) -and
    ((Get-Item -LiteralPath (Join-Path $callRoot '.vercel')).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'A pasta de trabalho nao pode ser um link para outro diretorio.'
}

$run = [guid]::NewGuid().ToString('N')
$runDir = Join-Path $callWork $run
$processes = @()
$lease = $null
$originalLocation = Get-Location
$envNames = @('CALL_ADMIN_KEY', 'CALL_SERVE_FRONTEND', 'CALL_ALLOWED_ORIGINS', 'CALL_PUBLIC_ORIGIN', 'CALL_PROXY_MODE')
$savedEnv = @{}
foreach ($name in $envNames) { $savedEnv[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$plain = $null

try {
    Set-Location -LiteralPath $callRoot
    & $python -c 'import uvicorn, fastapi, pydantic_settings'
    if ($LASTEXITCODE -ne 0) { throw 'Instale as dependencias existentes de backend/requirements.txt.' }
    if (-not $SkipBuild) {
        & (Get-Command npm.cmd -ErrorAction Stop).Source run build
        if ($LASTEXITCODE -ne 0) { throw 'Build reprovado; nenhum servico iniciado.' }
    }
    foreach ($asset in @('index.html', 'bundle.js', 'styles.css', '2t-logo.webp', '2t-mark.svg')) {
        if (-not (Test-Path -LiteralPath (Join-Path $callRoot "dist\$asset"))) { throw 'Build incompleto. Execute npm run build.' }
    }
    if (-not $OwnerCredential) { $OwnerCredential = Read-Host 'Credencial exclusiva do proprietario (minimo 32 caracteres; nao reutilize senhas)' -AsSecureString }
    $plain = [Net.NetworkCredential]::new('', $OwnerCredential).Password
    if ($plain.Length -lt 32 -or ($Mode -eq 'External' -and $plain -like 'test-only-*')) {
        throw 'Credencial recusada. Use pelo menos 32 caracteres e nunca uma chave publica de testes externamente.'
    }
    # Reserve loopback before creating the connector, so it cannot expose another
    # service accidentally occupying this port while the temporary URL is assigned.
    $lease = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
    $lease.Start()
    New-Item -ItemType Directory -Path $runDir -Force | Out-Null
    $origin = "http://127.0.0.1:$Port"
    $session = @{ Root = $callRoot; Run = $run; Mode = $Mode; Origin = $origin; Processes = @() }

    if ($Mode -eq 'External') {
        $configPath = Join-Path $runDir 'empty.yml'
        Set-Content -LiteralPath $configPath -Value '{}' -Encoding ascii
        $tunnelOut = Join-Path $runDir 'connector.out.log'
        $tunnelErr = Join-Path $runDir 'connector.err.log'
        # Do not pass any CALL_* secrets/environment to the connector process.
        $connectorEnv = @{}
        foreach ($item in Get-ChildItem Env: | Where-Object Name -like 'CALL_*') {
            $connectorEnv[$item.Name] = $item.Value
            [Environment]::SetEnvironmentVariable($item.Name, $null, 'Process')
        }
        try {
            $tunnel = Start-Process -FilePath $cloudflared -ArgumentList @('tunnel', '--no-autoupdate', '--config', "`"$configPath`"", '--url', "http://127.0.0.1:$Port", '--metrics', '127.0.0.1:0', '--management-diagnostics=false', '--loglevel', 'info') -WorkingDirectory $callRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $tunnelOut -RedirectStandardError $tunnelErr
        } finally {
            foreach ($name in $connectorEnv.Keys) { [Environment]::SetEnvironmentVariable($name, $connectorEnv[$name], 'Process') }
        }
        $processes += $tunnel
        $session.Processes += Get-CallProcessRecord $tunnel 'tunnel' $cloudflared
        $session | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $callState -Encoding utf8
        $deadline = [DateTime]::UtcNow.AddSeconds(45)
        do {
            if ($tunnel.HasExited) { throw 'cloudflared encerrou antes de fornecer a URL. Consulte o log local do conector.' }
            $content = ((Get-Content -LiteralPath $tunnelErr -Raw -ErrorAction SilentlyContinue) + (Get-Content -LiteralPath $tunnelOut -Raw -ErrorAction SilentlyContinue))
            $discovered = Get-CallTunnelOrigin $content
            if ($discovered) { $origin = $discovered; break }
            Start-Sleep -Milliseconds 200
        } while ([DateTime]::UtcNow -lt $deadline)
        if (-not $discovered) { throw 'O tunel nao forneceu uma URL no prazo. Nada sera deixado em execucao.' }
    }

    $env:CALL_ADMIN_KEY = $plain
    $env:CALL_SERVE_FRONTEND = 'true'
    $env:CALL_ALLOWED_ORIGINS = $origin
    $env:CALL_PUBLIC_ORIGIN = $(if ($Mode -eq 'External') { $origin } else { $null })
    $env:CALL_PROXY_MODE = $(if ($Mode -eq 'External') { 'cloudflare' } else { 'none' })
    $lease.Stop(); $lease = $null
    $server = Start-Process -FilePath $python -ArgumentList @('-m', 'uvicorn', 'backend.app.call_signaling:app', '--host', '127.0.0.1', '--port', $Port.ToString(), '--workers', '1', '--no-proxy-headers', '--ws-max-size', '32768', '--no-access-log', '--log-level', 'warning') -WorkingDirectory $callRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runDir 'server.out.log') -RedirectStandardError (Join-Path $runDir 'server.err.log')
    $processes += $server
    foreach ($name in $envNames) { [Environment]::SetEnvironmentVariable($name, $savedEnv[$name], 'Process') }
    $plain = $null
    $session.Processes += Get-CallProcessRecord $server 'server' $python
    $session.Origin = $origin
    $session | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $callState -Encoding utf8
    $healthHeaders = @{}
    if ($Mode -eq 'External') { $healthHeaders = @{ Host = ([uri]$origin).Authority; 'X-Forwarded-Proto' = 'https'; 'CF-Connecting-IP' = '127.0.0.1' } }
    $healthy = $false
    $deadline = [DateTime]::UtcNow.AddSeconds(20)
    do {
        if ($server.HasExited) { throw 'O sinalizador encerrou. Consulte o log local; o tunel sera fechado.' }
        try {
            $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/call/health" -Headers $healthHeaders -TimeoutSec 2
            $healthy = $health.status -eq 'ok'
        } catch { Start-Sleep -Milliseconds 200 }
    } while (-not $healthy -and [DateTime]::UtcNow -lt $deadline)
    if (-not $healthy) { throw 'Sinalizador indisponivel no prazo de inicializacao.' }
    if ($Mode -eq 'External') {
        # Verify the real public route before presenting it as ready. No owner
        # credential is sent and no room/participant is created by these probes.
        $publicReady = $false
        $deadline = [DateTime]::UtcNow.AddSeconds(45)
        do {
            if ($tunnel.HasExited -or $server.HasExited) { throw 'Processo encerrou durante a validacao externa.' }
            try {
                $publicHealth = Invoke-RestMethod -Uri "$origin/call/health" -TimeoutSec 3
                $publicReady = $publicHealth.status -eq 'ok' -and $publicHealth.mode -eq 'single-process'
            } catch { Start-Sleep -Milliseconds 300 }
        } while (-not $publicReady -and [DateTime]::UtcNow -lt $deadline)
        if (-not $publicReady) { throw 'HTTPS publico nao respondeu no prazo; o tunel sera encerrado.' }
        $publicPage = Invoke-WebRequest -Uri "$origin/" -UseBasicParsing -TimeoutSec 5
        if ($publicPage.StatusCode -ne 200 -or $publicPage.Headers['Content-Type'] -notlike '*text/html*' -or $publicPage.Content -notmatch '<app-shell(?:\s|>)') {
            throw 'O tunel nao entregou o frontend HTML esperado.'
        }
        $probe = [Net.WebSockets.ClientWebSocket]::new()
        $cancellation = [Threading.CancellationTokenSource]::new()
        try {
            $probe.Options.SetRequestHeader('Origin', $origin)
            $cancellation.CancelAfter(10000)
            $probe.ConnectAsync([uri]($origin.Replace('https://', 'wss://') + '/call/ws'), $cancellation.Token).GetAwaiter().GetResult()
            if ($probe.State -ne [Net.WebSockets.WebSocketState]::Open) { throw 'WSS publico indisponivel.' }
        } finally {
            $probe.Abort(); $probe.Dispose(); $cancellation.Dispose()
        }
    }
    Write-Output "Abra: $origin/#/call"
    Write-Output "Use a credencial informada; convide pelo botao Copiar convite. Encerramento automatico em $Minutes minutos."
    Write-Output 'Para encerrar tudo: Ctrl+C nesta janela ou .\scripts\2t-call.ps1 -Mode Stop em outra janela.'
    $until = [DateTime]::UtcNow.AddMinutes($Minutes)
    while ([DateTime]::UtcNow -lt $until) {
        $server.Refresh()
        if ($server.HasExited) { break }
        if ($tunnel) { $tunnel.Refresh(); if ($tunnel.HasExited) { break } }
        Start-Sleep -Milliseconds 500
    }
} finally {
    if ($lease) { $lease.Stop() }
    foreach ($process in $processes) { $process.Refresh(); if (-not $process.HasExited) { $process.Kill(); $process.WaitForExit(5000) | Out-Null } }
    if (Test-Path -LiteralPath $callState) {
        $current = Get-Content -LiteralPath $callState -Raw | ConvertFrom-Json
        if ($current.Run -eq $run) { Remove-Item -LiteralPath $callState }
    }
    foreach ($name in $envNames) { [Environment]::SetEnvironmentVariable($name, $savedEnv[$name], 'Process') }
    $plain = $null
    Set-Location -LiteralPath $originalLocation.Path
}
