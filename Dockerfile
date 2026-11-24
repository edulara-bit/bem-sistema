FROM node:20-alpine AS base

# 1. Dependências do sistema (libc6-compat e openssl para Prisma)
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# 2. Compilação (Build)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# 3. Runner de Produção (Super leve e compatível com Easypanel)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Cria diretório prisma para o banco SQLite e persistência do volume
RUN mkdir -p /app/prisma && chown -R nextjs:nodejs /app/prisma

# Copia arquivos públicos e standalone do build
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Script de entrada para aplicar migrações do Prisma no boot se necessário
COPY --chown=nextjs:nodejs <<'EOF' /app/entrypoint.sh
#!/bin/sh
set -e

# Se o banco SQLite não existir no volume persistente, aplica o schema
if [ ! -f /app/prisma/dev.db ]; then
  echo "Inicializando banco de dados no Easypanel..."
  npx prisma db push
fi

exec "$@"
EOF

RUN chmod +x /app/entrypoint.sh
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]
