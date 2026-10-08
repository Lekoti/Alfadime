# gerar-inventario-alfadime.ps1
# Execute na raiz do projeto AlfaDime pelo terminal integrado do VS Code.
# Gera um TXT com pastas, arquivos, caminhos e conteúdo dos arquivos de texto/código.
# Uso:
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\gerar-inventario-alfadime.ps1
#
# Opcional:
#   .\gerar-inventario-alfadime.ps1 -Saida "alfadime-completo.txt"

[CmdletBinding()]
param(
    [string]$Saida = "alfadime-projeto-completo.txt",
    [int]$LimiteArquivoMB = 10
)

$ErrorActionPreference = "Stop"
$raiz = (Get-Location).Path
$caminhoSaida = Join-Path $raiz $Saida
$limiteBytes = $LimiteArquivoMB * 1MB

$pastasIgnoradas = @(
    "node_modules", ".git", ".hg", ".svn", "dist", "build", "release",
    "out", "coverage", ".cache", ".parcel-cache", ".vite", "venv", ".venv",
    "__pycache__", "bin", "obj", "tmp", "temp"
)

$extensoesTexto = @(
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json", ".html", ".css",
    ".scss", ".sass", ".less", ".md", ".txt", ".xml", ".yml", ".yaml",
    ".env.example", ".gitignore", ".gitattributes", ".editorconfig", ".ini",
    ".conf", ".config", ".sql", ".ps1", ".bat", ".cmd", ".sh", ".svg",
    ".vue", ".svelte", ".graphql", ".prisma", ".properties"
)

function Test-PastaIgnorada([string]$caminho) {
    $partes = $caminho.Substring($raiz.Length).TrimStart([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar).Split([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    foreach ($parte in $partes) {
        if ($pastasIgnoradas -contains $parte) { return $true }
    }
    return $false
}

function Test-ArquivoTexto([IO.FileInfo]$arquivo) {
    if ($arquivo.Length -gt $limiteBytes) { return $false }
    if ($extensoesTexto -contains $arquivo.Extension.ToLowerInvariant()) { return $true }
    if ($arquivo.Name -in @("Dockerfile", "Makefile", "Procfile", ".gitignore", ".npmrc", ".nvmrc")) { return $true }
    return $false
}

$arquivos = Get-ChildItem -LiteralPath $raiz -File -Recurse -Force |
    Where-Object {
        $_.FullName -ne $caminhoSaida -and
        -not (Test-PastaIgnorada $_.FullName)
    } |
    Sort-Object FullName

$linhas = [System.Collections.Generic.List[string]]::new()
$linhas.Add("PROJETO ALFADIME - INVENTÁRIO COMPLETO")
$linhas.Add("Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$linhas.Add("Raiz: $raiz")
$linhas.Add("Arquivos incluídos: $($arquivos.Count)")
$linhas.Add("")
$linhas.Add("PASTAS E ARQUIVOS")
$linhas.Add("==================")

$itens = Get-ChildItem -LiteralPath $raiz -Recurse -Force |
    Where-Object {
        $_.FullName -ne $caminhoSaida -and
        -not (Test-PastaIgnorada $_.FullName)
    } | Sort-Object FullName

foreach ($item in $itens) {
    $relativo = $item.FullName.Substring($raiz.Length).TrimStart([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $tipo = if ($item.PSIsContainer) { "PASTA" } else { "ARQUIVO" }
    $tamanho = if ($item.PSIsContainer) { "" } else { " | $($item.Length) bytes" }
    $linhas.Add("[$tipo] $relativo$tamanho")
}

$linhas.Add("")
$linhas.Add("CONTEÚDO DOS ARQUIVOS")
$linhas.Add("=====================")

foreach ($arquivo in $arquivos) {
    $relativo = $arquivo.FullName.Substring($raiz.Length).TrimStart([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $linhas.Add("")
    $linhas.Add("----------------------------------------------------------------")
    $linhas.Add("ARQUIVO: $relativo")
    $linhas.Add("CAMINHO: $($arquivo.FullName)")
    $linhas.Add("TAMANHO: $($arquivo.Length) bytes")
    $linhas.Add("----------------------------------------------------------------")

    if (Test-ArquivoTexto $arquivo) {
        try {
            $conteudo = Get-Content -LiteralPath $arquivo.FullName -Raw -Encoding UTF8
            if ([string]::IsNullOrEmpty($conteudo)) {
                $linhas.Add("[Arquivo vazio]")
            } else {
                $linhas.Add($conteudo.TrimEnd())
            }
        } catch {
            $linhas.Add("[Não foi possível ler como UTF-8: $($_.Exception.Message)]")
        }
    } else {
        $linhas.Add("[Conteúdo omitido: arquivo binário, extensão não textual ou maior que ${LimiteArquivoMB} MB]")
    }
}

$linhas.Add("")
$linhas.Add("FIM DO INVENTÁRIO")
[IO.File]::WriteAllLines($caminhoSaida, $linhas, [Text.UTF8Encoding]::new($false))

Write-Host "Inventário gerado com sucesso:" -ForegroundColor Green
Write-Host $caminhoSaida
Write-Host "Arquivos listados: $($arquivos.Count)"
