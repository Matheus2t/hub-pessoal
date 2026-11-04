# Local synthetic fixtures only. Never uses the owner's credential or a public tunnel.
[CmdletBinding()]
param([ValidateSet('Start','Stop')][string]$Mode='Start')
$ErrorActionPreference='Stop'
$callTestRoot=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$callTestDir=Join-Path $callTestRoot '.vercel/call-stage5'
$callTestState=Join-Path $callTestDir 'servers.json'
if($Mode -eq 'Stop'){
 if(Test-Path -LiteralPath $callTestState){
  foreach($record in (Get-Content -LiteralPath $callTestState -Raw | ConvertFrom-Json)){
   $proc=Get-Process -Id $record.Id -ErrorAction SilentlyContinue
   if(-not $proc){continue}
   $cim=Get-CimInstance Win32_Process -Filter "ProcessId=$($record.Id)"
   if($proc.StartTime.ToUniversalTime().Ticks.ToString() -ne $record.Started -or $cim.ExecutablePath -ne $record.Executable -or $cim.CommandLine -notmatch [regex]::Escape($record.Module) -or $cim.CommandLine -notmatch "--port $($record.Port)"){throw 'Test process identity mismatch; nothing else will be stopped.'}
   Stop-Process -Id $record.Id
  }
  Remove-Item -LiteralPath $callTestState
 }
 exit 0
}
if(Test-Path -LiteralPath $callTestState){throw 'Fixture state exists. Stop it before starting another run.'}
foreach($port in @(8443,8444)){if(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue){throw "Port $port is occupied; existing processes are preserved."}}
New-Item -ItemType Directory -Path $callTestDir -Force | Out-Null
Push-Location $callTestRoot
try{
 $python=(Get-Command python).Source
 & $python backend/tests/call_tls_harness.py .vercel/call-stage5/tls
 if($LASTEXITCODE -ne 0){throw 'Local TLS certificate could not be prepared.'}
 $env:CALL_ADMIN_KEY='test-only-owner-credential-not-for-production'
 $env:CALL_SERVE_FRONTEND='true'; $env:CALL_STUN_URLS=''; $env:CALL_TURN_PROVIDER='none'
 $env:CALL_PUBLIC_ORIGIN='https://127.0.0.1:8443'
 $env:CALL_ALLOWED_ORIGINS='https://127.0.0.1:8443,https://127.0.0.1:8444'
 $env:CALL_PROXY_MODE='cloudflare'
 $records=@()
 foreach($entry in @(@{Port=8443;Module='backend.tests.call_tls_harness:app'},@{Port=8444;Module='backend.tests.call_frontend_harness:app'})){
  $proc=Start-Process -FilePath $python -ArgumentList @('-m','uvicorn',$entry.Module,'--host','127.0.0.1','--port',$entry.Port,'--workers','1','--no-proxy-headers','--ssl-keyfile','.vercel/call-stage5/tls/key.pem','--ssl-certfile','.vercel/call-stage5/tls/cert.pem','--ws-max-size','32768','--no-access-log','--log-level','warning') -WorkingDirectory $callTestRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $callTestDir "$($entry.Port).out.log") -RedirectStandardError (Join-Path $callTestDir "$($entry.Port).err.log")
  $records+=@{Id=$proc.Id;Started=$proc.StartTime.ToUniversalTime().Ticks.ToString();Executable=$python;Module=$entry.Module;Port=$entry.Port}
  ConvertTo-Json -InputObject @($records) -Depth 3 | Set-Content -LiteralPath $callTestState
 }
 foreach($check in @('https://127.0.0.1:8443/call/health','https://127.0.0.1:8444/')){
  curl.exe -sk --fail --retry 5 --retry-connrefused --retry-delay 1 --output NUL $check
  if($LASTEXITCODE -ne 0){throw 'Fixture endpoint unavailable. Run Stop and inspect the local log.'}
 }
 Write-Output 'Local fixtures ready: frontend HTTPS 8444, signal HTTPS/WSS 8443. No public exposure.'
}finally{Pop-Location}
