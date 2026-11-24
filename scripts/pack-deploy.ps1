# Script para empacotar o BEM para envio a VPS Hostinger
$ErrorActionPreference = "Stop"

$destination = "bem-deploy.tar.gz"
$stageDir = "bem-stage"
Write-Host "Empacotando arquivos do projeto BEM em $destination..." -ForegroundColor Cyan

if (Test-Path $destination) {
    Remove-Item $destination -Force
}
if (Test-Path $stageDir) {
    Remove-Item $stageDir -Recurse -Force
}

New-Item -ItemType Directory -Path $stageDir | Out-Null

# Copiar pastas essenciais
Copy-Item -Path "src" -Destination "$stageDir\src" -Recurse
Copy-Item -Path "public" -Destination "$stageDir\public" -Recurse
Copy-Item -Path "scripts" -Destination "$stageDir\scripts" -Recurse

# Copiar prisma excluindo banco de dados local bloqueado (.db, .db-journal)
New-Item -ItemType Directory -Path "$stageDir\prisma" | Out-Null
Copy-Item -Path "prisma\schema.prisma" -Destination "$stageDir\prisma\"
if (Test-Path "prisma\seed.ts") {
    Copy-Item -Path "prisma\seed.ts" -Destination "$stageDir\prisma\"
}

# Copiar arquivos de configuracao
$files = @(
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    "postcss.config.mjs",
    "Dockerfile",
    "docker-compose.yml",
    "nginx.conf.example",
    ".env.example"
)

foreach ($f in $files) {
    if (Test-Path $f) {
        Copy-Item -Path $f -Destination "$stageDir\"
    }
}

# Usar tar nativo do Windows (evita problema de colchetes [id] do PowerShell)
tar -czf $destination -C $stageDir .

Remove-Item $stageDir -Recurse -Force

$roundSize = [math]::Round((Get-Item $destination).Length / 1MB, 2)
Write-Host "Pacote gerado com sucesso: $destination ($roundSize MB)" -ForegroundColor Green
Write-Host "Para enviar a VPS via SCP:" -ForegroundColor Yellow
Write-Host "   scp -P 22 bem-deploy.tar.gz root@SEU_IP_VPS:/home/bem/" -ForegroundColor White
Write-Host "E descompactar na VPS com:" -ForegroundColor Yellow
Write-Host "   tar -xzf bem-deploy.tar.gz; bash scripts/deploy-vps.sh" -ForegroundColor White
