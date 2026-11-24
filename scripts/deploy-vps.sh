#!/bin/bash
# Script de implantação do BEM na VPS Hostinger (Ubuntu / Nginx)
# Domínio: bem.edulara.com.br
set -e

echo "=========================================="
echo "🌿 BEM — Plataforma do Terapeuta (Deploy VPS)"
echo "=========================================="

# 1. Parar versão anterior se existir
echo "⏳ Parando containers anteriores..."
docker compose down || true

# 2. Construir imagem leve com limites de RAM
echo "🔨 Construindo imagem Docker otimizada (Max 384MB RAM)..."
docker compose build

# 3. Subir container em background
echo "🚀 Iniciando container bem_app..."
docker compose up -d

# 4. Status
echo "📊 Verificando status do container..."
docker compose ps

echo "=========================================="
echo "✅ Deploy concluído com sucesso!"
echo "Acesse internamente na porta 3002 ou via Nginx em https://bem.edulara.com.br"
echo "=========================================="

