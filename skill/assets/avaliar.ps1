param(
  [Parameter(Mandatory = $true)][string]$Portal,
  [Parameter(Mandatory = $true)][string]$Arquivo
)

# Executa um arquivo .js no portal sem sofrer com o stripping de aspas
# duplas do PowerShell ao passar argumentos para o maestri.exe.
$cli = if ($env:MAESTRI_CLI) { $env:MAESTRI_CLI } else { 'maestri' }
$js = Get-Content -Raw -LiteralPath $Arquivo
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($js))
$loader = "eval(new TextDecoder().decode(Uint8Array.from(atob('$b64'), c => c.charCodeAt(0))))"
& $cli portal evaluate $Portal $loader
