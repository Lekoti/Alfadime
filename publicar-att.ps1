# Publicar atualização do Alfadime
# Sobe automaticamente a versão em 1 ponto (patch),
# commita todas as alterações e publica a tag de release.

$ErrorActionPreference = "Stop"

$packagePath = "package.json"
$package = Get-Content -Raw $packagePath | ConvertFrom-Json

$parts = $package.version.Split(".")

if ($parts.Count -ne 3) {
    Write-Host "Versao invalida no package.json: $($package.version)" -ForegroundColor Red
    exit 1
}

$parts[2] = [string]([int]$parts[2] + 1)
$newVersion = $parts -join "."
$tag = "v$newVersion"

$package.version = $newVersion
$package | ConvertTo-Json -Depth 100 | Set-Content -Path $packagePath -Encoding UTF8

Write-Host "Nova versao: $tag" -ForegroundColor Cyan

git add .

$commitMessage = "release: publica atualizacao $tag"
git commit -m $commitMessage

git pull --rebase

git tag $tag
git push origin main
git push origin $tag

Write-Host "Atualizacao $tag publicada." -ForegroundColor Green