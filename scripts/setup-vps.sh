#!/bin/bash
# ==============================================================================
# Script de Instalação e Deploy do BEM na VPS Linux Puro (Ubuntu / Debian)
# Domínio: bem.edulara.com.br
# Repositório: https://github.com/edulara-bit/bem-sistema.git
# ==============================================================================
set -e

echo "🚀 Iniciando configuração do BEM na VPS Linux..."

# 1. Atualiza repositórios do sistema
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx certbot python3-certbot-nginx

# 2. Instala Docker e Docker Compose (se não estiver instalado)
if ! command -v docker &> /dev/null; then
    echo "📦 Instalando Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
fi

# 3. Cria diretório do projeto e clona o repositório
APP_DIR="/var/www/bem-sistema"

if [ -d "$APP_DIR" ]; then
    echo "📂 Repositório já existe. Atualizando com git pull..."
    cd $APP_DIR
    git pull origin main
else
    echo "📂 Clonando repositório do GitHub..."
    sudo mkdir -p /var/www
    sudo chown -R $USER:$USER /var/www
    git clone https://github.com/edulara-bit/bem-sistema.git $APP_DIR
    cd $APP_DIR
fi

# 4. Cria arquivo .env se não existir
if [ ! -f "$APP_DIR/.env" ]; then
    echo "⚙️ Configurando .env de produção..."
    cat <<EOF > $APP_DIR/.env
DATABASE_URL="file:/app/prisma/dev.db"
NODE_ENV="production"
PORT=3000
HOSTNAME="0.0.0.0"
ENCRYPTION_KEY="3cf6e7ab221557c4c8180cc3fe14f017d46c0b91f70ae346b4bf494c5d9720e5"
JWT_SECRET="bem_secret_jwt_therapist_platform_2026"
NEXT_PUBLIC_APP_URL="https://bem.edulara.com.br"
EOF
fi

# 5. Build e Inicialização via Docker Compose
echo "🔨 Construindo e iniciando container Docker..."
docker compose down || true
docker compose build --no-cache
docker compose up -d

# 6. Configura Nginx como Proxy Reverso
echo "🌐 Configurando Nginx para bem.edulara.com.br..."
sudo tee /etc/nginx/sites-available/bem.edulara.com.br > /dev/null <<'EOF'
server {
    listen 80;
    server_name bem.edulara.com.br;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Habilita o site no Nginx
sudo ln -sf /etc/nginx/sites-available/bem.edulara.com.br /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default || true
sudo nginx -t
sudo systemctl reload nginx

# 7. Gera Certificado SSL Gratuito (HTTPS)
echo "🔒 Gerando Certificado SSL Let's Encrypt..."
sudo certbot --nginx -d bem.edulara.com.br --non-interactive --agree-tos -m contato@edulara.com.br || true

echo "=========================================================="
echo "✅ BEM implantado com sucesso na VPS Linux!"
echo "Acesse: https://bem.edulara.com.br"
echo "=========================================================="
