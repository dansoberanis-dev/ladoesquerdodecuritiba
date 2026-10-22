<#
  atualizar-site.ps1  -  Lado Esquerdo de Curitiba / SITEARENA
  ------------------------------------------------------------------
  Extrai o ZIP baixado (pasta Downloads) para E:\SITES\LADOESQ\SITEARENA,
  faz backup da versao anterior e opcionalmente abre o site no navegador.

  USO RAPIDO (pega o ZIP mais novo da pasta Downloads):
    cd E:\SITES\LADOESQ\SITEARENA
    powershell -ExecutionPolicy Bypass -File .\atualizar-site.ps1 -Abrir

  USO COM ZIP ESPECIFICO:
    .\atualizar-site.ps1 -Zip "C:\Users\SEU_USUARIO\Downloads\SITEARENA-v3.zip"

  PARAMETROS
    -Zip        Caminho do .zip. Se omitido, usa o SITEARENA*.zip mais recente em Downloads.
    -Dest       Pasta destino. Padrao: E:\SITES\LADOESQ\SITEARENA
    -Espelhar   Remove do destino o que nao existe mais no ZIP (deixa identico ao pacote).
    -SemBackup  Nao cria backup antes de atualizar.
    -Abrir      Abre o index.html no navegador ao terminar.

  OBS.: o proprio atualizar-site.ps1 nunca e sobrescrito pela atualizacao,
        para que uma versao quebrada dentro do ZIP nao derrube o instalador.
#>

[CmdletBinding()]
param(
    [string]$Zip,
    [string]$Dest = "E:\SITES\LADOESQ\SITEARENA",
    [switch]$Espelhar,
    [switch]$SemBackup,
    [switch]$Abrir
)

$ErrorActionPreference = "Stop"
$RaizBackups = Join-Path (Split-Path -Parent $Dest) "_backups"
$TempRoot = [System.IO.Path]::GetTempPath()   # funciona no Windows e tambem no PowerShell Core
$log = Join-Path $TempRoot "sitearena-update.log"
$temp = $null
$aplicado = $false

function Escrever($texto, $cor = "Gray") {
    Write-Host $texto -ForegroundColor $cor
    try { Add-Content -Path $log -Value ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $texto) -Encoding UTF8 } catch {}
}

function Copiar-Arvore {
    param([string]$Origem, [string]$Destino, [switch]$Mirror)

    if (-not (Test-Path -LiteralPath $Destino)) {
        New-Item -ItemType Directory -Path $Destino -Force | Out-Null
    }

    $temRobocopy = $null -ne (Get-Command robocopy.exe -ErrorAction SilentlyContinue)
    if ($temRobocopy) {
        $args = @($Origem, $Destino, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/R:1", "/W:1", "/XF", "atualizar-site.ps1")
        if ($Mirror) { $args += "/MIR" }
        & robocopy.exe @args | Out-Null
        $codigo = $LASTEXITCODE
        # robocopy: 0-7 = sucesso (1 = arquivos copiados); >=8 = erro
        if ($codigo -ge 8) { throw "robocopy falhou com codigo $codigo ao copiar para $Destino" }
        return
    }

    # ---------- alternativa sem robocopy (Windows antigo / PowerShell Core) ----------
    $itens = Get-ChildItem -LiteralPath $Origem -Force -ErrorAction SilentlyContinue
    foreach ($item in $itens) {
        if ($item.Name -eq "atualizar-site.ps1") { continue }
        if ($item.PSIsContainer) {
            $sub = Join-Path $Destino $item.Name
            if (-not (Test-Path -LiteralPath $sub)) { New-Item -ItemType Directory -Path $sub -Force | Out-Null }
            Copiar-Arvore -Origem $item.FullName -Destino $sub -Mirror:$Mirror
        } else {
            Copy-Item -LiteralPath $item.FullName -Destination (Join-Path $Destino $item.Name) -Force
        }
    }

    # espelhar = apagar do destino o que nao existe mais no pacote
    if ($Mirror) {
        $nomesOrigem = @{}
        foreach ($i in $itens) { $nomesOrigem[$i.Name.ToLower()] = $true }
        $nomesOrigem["atualizar-site.ps1"] = $true
        foreach ($existente in @(Get-ChildItem -LiteralPath $Destino -Force -ErrorAction SilentlyContinue)) {
            if (-not $nomesOrigem.ContainsKey($existente.Name.ToLower())) {
                Remove-Item -LiteralPath $existente.FullName -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

$versao = "?"
$arqVersao = Join-Path $Dest "VERSION"
if (Test-Path -LiteralPath $arqVersao) { $versao = (Get-Content -LiteralPath $arqVersao -Raw).Trim() }

Escrever ""
Escrever "==================================================" "DarkYellow"
Escrever "  Lado Esquerdo de Curitiba - atualizar SITEARENA" "DarkYellow"
Escrever ("  instalador 2.1  |  versao instalada: {0}" -f $versao) "DarkGray"
Escrever "==================================================" "DarkYellow"
Escrever ""

try {
    # ---------- 1. localizar o ZIP ----------
    if ([string]::IsNullOrWhiteSpace($Zip)) {
        $perfil = if ($env:USERPROFILE) { $env:USERPROFILE } else { $HOME }
        $pastaDownloads = Join-Path $perfil "Downloads"
        $candidato = Get-ChildItem -Path $pastaDownloads -Filter "SITEARENA*.zip" -ErrorAction SilentlyContinue |
                     Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if (-not $candidato) {
            throw "Nenhum SITEARENA*.zip encontrado em $pastaDownloads. Baixe o ZIP ou use -Zip `"caminho\arquivo.zip`"."
        }
        $Zip = $candidato.FullName
    }

    if (-not (Test-Path -LiteralPath $Zip)) { throw "ZIP nao encontrado: $Zip" }
    $Zip = (Resolve-Path -LiteralPath $Zip).Path
    $infoZip = Get-Item -LiteralPath $Zip
    Escrever ("ZIP:      {0}" -f $Zip) "Cyan"
    Escrever ("Tamanho:  {0:N0} KB   ({1})" -f ($infoZip.Length / 1KB), $infoZip.LastWriteTime) "Cyan"

    # ---------- 2. destino ----------
    if (-not (Test-Path -LiteralPath $Dest)) {
        Escrever "Destino nao existe, criando: $Dest" "Yellow"
        New-Item -ItemType Directory -Path $Dest -Force | Out-Null
    }
    $Dest = (Resolve-Path -LiteralPath $Dest).Path
    Escrever ("Destino:  {0}" -f $Dest) "Cyan"

    # ---------- 3. extrair em pasta temporaria ----------
    $temp = Join-Path $TempRoot ("sitearena_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
    New-Item -ItemType Directory -Path $temp -Force | Out-Null
    Escrever ""
    Escrever "Extraindo pacote..." "Gray"
    Expand-Archive -LiteralPath $Zip -DestinationPath $temp -Force

    # se o ZIP tiver uma pasta raiz unica, entra nela
    $raiz = $temp
    $itensRaiz = @(Get-ChildItem -LiteralPath $temp -Force)
    if ($itensRaiz.Count -eq 1 -and $itensRaiz[0].PSIsContainer) { $raiz = $itensRaiz[0].FullName }

    if (-not (Test-Path -LiteralPath (Join-Path $raiz "index.html"))) {
        throw "O ZIP nao contem index.html na raiz. Nada foi alterado."
    }

    # ---------- 4. backup ----------
    if (-not $SemBackup) {
        $temConteudo = @(Get-ChildItem -LiteralPath $Dest -Force -ErrorAction SilentlyContinue).Count -gt 0
        if ($temConteudo) {
            if (-not (Test-Path -LiteralPath $RaizBackups)) {
                New-Item -ItemType Directory -Path $RaizBackups -Force | Out-Null
            }
            $pastaBackup = Join-Path $RaizBackups ("SITEARENA_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
            New-Item -ItemType Directory -Path $pastaBackup -Force | Out-Null   # <- destino precisa existir
            Escrever ("Backup:   {0}" -f $pastaBackup) "DarkGray"
            Copiar-Arvore -Origem $Dest -Destino $pastaBackup
        }
    }

    # ---------- 5. aplicar ----------
    Escrever ""
    Escrever "Aplicando arquivos..." "Gray"
    Copiar-Arvore -Origem $raiz -Destino $Dest -Mirror:$Espelhar
    $aplicado = $true

    # ---------- 6. resumo ----------
    $arquivos = @(Get-ChildItem -LiteralPath $Dest -Recurse -File)
    $tamanho = ($arquivos | Measure-Object -Property Length -Sum).Sum

    Escrever ""
    Escrever "--------------------------------------------------" "DarkGreen"
    $novaVersao = "?"
    $arqNova = Join-Path $Dest "VERSION"
    if (Test-Path -LiteralPath $arqNova) { $novaVersao = (Get-Content -LiteralPath $arqNova -Raw).Trim() }
    Escrever ("OK! {0} arquivos na pasta ({1:N0} KB)" -f $arquivos.Count, ($tamanho / 1KB)) "Green"
    Escrever ("Versao do site: {0} -> {1}" -f $versao, $novaVersao) "Green"
    Escrever "--------------------------------------------------" "DarkGreen"
    Escrever ("Site:   {0}" -f (Join-Path $Dest "index.html")) "Green"
    Escrever ("Editor: code `"{0}`"" -f $Dest) "DarkGray"
    Escrever ""

    if ($Abrir) {
        try {
            Start-Process (Join-Path $Dest "index.html")
            Escrever "Abrindo no navegador..." "Cyan"
        } catch {
            Escrever "O site foi atualizado, mas nao consegui abrir o navegador automaticamente." "Yellow"
            Escrever ("Abra manualmente: {0}" -f (Join-Path $Dest "index.html")) "Yellow"
        }
    } else {
        Escrever "Para ver o site:  start `"$Dest\index.html`"" "Cyan"
    }
}
catch {
    Escrever ""
    Escrever "ERRO: $($_.Exception.Message)" "Red"
    if ($aplicado) {
        Escrever "Os arquivos ja tinham sido copiados antes deste erro. O backup esta em $RaizBackups." "DarkYellow"
    } else {
        Escrever "A pasta destino nao foi alterada. O backup (se feito) esta em $RaizBackups." "DarkYellow"
    }
    exit 1
}
finally {
    if ($temp -and (Test-Path -LiteralPath $temp)) {
        Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
